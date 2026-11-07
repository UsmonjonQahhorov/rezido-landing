"""Repository-local CI gates. No deploy/release, credentials, raw logs or raw secret reports."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path

from evidence import RunEvidence, detect_kind
from metrics import npm_metrics, pip_metrics
from release_artifacts import validate_release_artifacts
from security import (
    canonical,
    exception_schema,
    false_positive,
    npm_report,
    pip_report,
    scan_status,
    secret_report,
)

ACTIVE = None
OUT = Path("ci-results")
OUT.mkdir(exist_ok=True)


def write(name, data):
    if ACTIVE is not None:
        data = ACTIVE.stamp(data)
    (OUT / name).write_text(json.dumps(data, indent=2) + "\n")
    if ACTIVE is not None:
        ACTIVE.record(name)


def retain_raw(name, raw):
    target = os.environ.get("CI_LOCAL_AUDIT_DIR")
    if target:
        folder = Path(target)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / name).write_bytes(raw)


def safe_findings(items, mode):
    return [
        {
            "type": item["RuleID"],
            "file": item["File"],
            "commit": item.get("Commit", ""),
            "scope": mode,
        }
        for item in items
    ]


def command(name, argv, *, env=None, timeout=1200):
    start = time.monotonic()
    # Raw tool output can include payloads/credentials: never upload or print it.
    with tempfile.TemporaryFile() as output:
        try:
            result = subprocess.run(  # noqa: S603 - fixed gate argv, no shell/user interpolation.
                argv, stdout=output, stderr=subprocess.STDOUT, env=env, timeout=timeout
            )
            code = result.returncode
        except (OSError, subprocess.TimeoutExpired):
            code = 124
        output.seek(0)
        content = output.read()
    with (OUT / "steps.jsonl").open("a") as f:
        f.write(
            json.dumps(
                {"gate": name, "exit_code": code, "seconds": round(time.monotonic() - start, 2)}
            )
            + "\n"
        )
    if ACTIVE is not None:
        ACTIVE.record("steps.jsonl")
    # Opt-in local debugging only; never set in hosted workflows or upload this directory.
    if os.environ.get("CI_LOCAL_DIAGNOSTICS_DIR"):
        debug = Path(os.environ["CI_LOCAL_DIAGNOSTICS_DIR"])
        debug.mkdir(parents=True, exist_ok=True)
        (debug / (name + ".log")).write_bytes(content)
    print(f"{name}: exit={code}", flush=True)
    return code, content


def junit(path, label):
    if not path.exists():
        raise ValueError("Expected JUnit report is missing")
    raw = path.read_bytes()
    if len(raw) > 20_000_000 or b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("Unsafe JUnit input")
    # Count tags without an XML parser: entities are never interpreted/expanded.
    if not re.search(rb"<testsuites?\b", raw):
        raise ValueError("Malformed JUnit report")
    cases = re.findall(rb"<testcase\b", raw)
    write(
        label + ".json",
        {
            "tests": len(cases),
            "failures": len(re.findall(rb"<failure\b", raw)),
            "errors": len(re.findall(rb"<error\b", raw)),
            "skipped": len(re.findall(rb"<skipped\b", raw)),
        },
    )
    # Only counts are publishable; raw JUnit can contain captured secrets in failure text.


def integrity(kind):
    lock = Path("requirements/ci.txt" if kind == "backend" else "package-lock.json")
    if not lock.is_file() or not lock.stat().st_size:
        print("Required lock/snapshot is missing", flush=True)
        return 1
    if kind != "backend":
        try:
            data = json.loads(lock.read_bytes())
            manifest = json.loads(Path("package.json").read_bytes())
            if data.get("lockfileVersion") != 3 or "" not in data.get("packages", {}):
                raise ValueError("Invalid lockfile structure")
            for group in ["dependencies", "devDependencies"]:
                if data["packages"][""].get(group, {}) != manifest.get(group, {}):
                    raise ValueError("Manifest/lock drift")
        except (ValueError, TypeError, KeyError, OSError):
            print("Lockfile is malformed or inconsistent with the manifest")
            return 1
    if sys.version_info[:3] != (3, 12, 16):
        print("CI helper requires Python3.12.16")
        return 1
    if kind == "backend":

        def pins(path):
            values = {}
            for line in path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("-r "):
                    values.update(pins(path.parent / line[3:].strip()))
                    continue
                match = re.match(r"([A-Za-z0-9_.-]+)(?:\[[^]]+\])?==([^\s;]+)", line)
                if not match:
                    raise ValueError("Exact requirement pin required")
                values[re.sub(r"[-_.]+", "-", match[1]).lower()] = match[2]
            return values

        for roots, snapshot in [
            ("requirements/local.txt", "requirements/ci.txt"),
            ("requirements/production.txt", ".github/ci/production-requirements.txt"),
        ]:
            resolved = pins(Path(snapshot))
            if any(resolved.get(name) != version for name, version in pins(Path(roots)).items()):
                print("Requirement snapshot is inconsistent with application direct pins")
                return 1
    if kind != "backend":
        versions = [
            subprocess.check_output([bin, "--version"], text=True).strip()  # noqa: S603 - fixed node/npm names.
            for bin in ["node", "npm"]
        ]
        if versions != ["v22.22.2", "10.9.7"]:
            print("Node/npm version mismatch")
            return 1
    write(
        "integrity.json",
        {"lock": str(lock), "sha256": hashlib.sha256(lock.read_bytes()).hexdigest()},
    )
    return 0


def quality(kind):
    if integrity(kind):
        return 1
    before = json.loads((OUT / "integrity.json").read_text())
    install = (
        [sys.executable, "-m", "pip", "install", "--no-deps", "-r", "requirements/ci.txt"]
        if kind == "backend"
        else ["npm", "ci"]
    )
    if command("clean-install", install)[0]:
        return 1
    with tempfile.TemporaryDirectory() as temporary:
        report = Path(temporary) / "tests.xml"
        if kind == "backend":
            commands = [
                ("ruff", ["ruff", "check", "."]),
                ("mypy", ["mypy", "."]),
                ("django-check", [sys.executable, "manage.py", "check"]),
                (
                    "migration-drift",
                    [sys.executable, "manage.py", "makemigrations", "--check", "--dry-run"],
                ),
                ("pip-check", [sys.executable, "-m", "pip", "check"]),
                (
                    "openapi",
                    [
                        sys.executable,
                        "manage.py",
                        "spectacular",
                        "--validate",
                        "--fail-on-warn",
                        "--file",
                        str(Path(temporary) / "openapi.yml"),
                    ],
                ),
                ("static-assets", [sys.executable, "manage.py", "collectstatic", "--noinput"]),
                ("tests", ["pytest", "-q", "--junitxml=" + str(report)]),
                ("api-runtime", [sys.executable, ".github/ci/runtime_smoke.py"]),
            ]
        else:
            commands = [
                ("typecheck", ["npm", "run", "typecheck"]),
                ("lint", ["npm", "run", "lint"]),
                (
                    "tests",
                    [
                        "npm",
                        "test",
                        "--",
                        "--reporter=default",
                        "--reporter=junit",
                        "--outputFile=" + str(report),
                    ],
                ),
            ]
            if kind == "mobile":
                commands += [
                    ("expo-config", [sys.executable, ".github/ci/mobile_config.py"]),
                    ("expo-doctor", ["npx", "--yes", "expo-doctor@1.21.5"]),
                    ("expo-compatibility", ["npx", "expo", "install", "--check"]),
                    (
                        "android-js-export",
                        [
                            "npx",
                            "expo",
                            "export",
                            "--platform",
                            "android",
                            "--dev",
                            "--no-bytecode",
                            "--max-workers",
                            "2",
                            "--output-dir",
                            str(Path(temporary) / "android-js"),
                        ],
                    ),
                ]
            else:
                commands += [
                    ("production-build", ["npm", "run", "build"]),
                    ("route-api-smoke", [sys.executable, ".github/ci/landing_smoke.py"]),
                ]
        failed = False
        build_ok = False
        commands.insert(
            0,
            (
                "ci-controller-tests",
                [
                    sys.executable,
                    "-m",
                    "unittest",
                    "discover",
                    "-s",
                    ".github/ci",
                    "-p",
                    "test_*.py",
                ],
            ),
        )
        for name, argv in commands:
            if name == "route-api-smoke" and not build_ok:
                write(
                    "route-smoke.json", {"status": "BLOCKED", "reason": "production build failed"}
                )
                failed = True
                continue
            # Independent diagnostics run after a prior failure; final exit retains all failures.
            code, _ = command(name, argv)
            failed |= code != 0
            if name == "production-build":
                build_ok = code == 0
            if name == "tests":
                junit(report, "tests")
        if hashlib.sha256(Path(before["lock"]).read_bytes()).hexdigest() != before["sha256"]:
            print("Lockfile drift detected")
            failed = True
        if not failed:
            context_path = OUT / "producer-context.json"
            context_path.write_text(json.dumps(ACTIVE.context))
            payloads = OUT / "release-payloads"
            payloads.mkdir(exist_ok=False)
            record_path = OUT / "producer-record.json"
            code, _ = command("release-producer", [
                sys.executable, ".github/ci/release_producer.py", "--quality-kind", kind,
                "--context", str(context_path), "--private-output-root", str(payloads),
                "--record", str(record_path),
            ])
            failed |= code != 0
            if code == 0:
                write("release-artifacts.json", json.loads(record_path.read_text()))
        return int(failed)


def dependencies(kind):
    write("dependency-gate.json", {"status": "SCANNER_ERROR", "reason": "Scan did not complete"})
    if integrity(kind):
        write(
            "dependency-gate.json",
            {"status": "CONFIGURATION_ERROR", "reason": "Runtime/lock integrity failed"},
        )
        return 1
    if kind != "backend":
        if command("clean-install", ["npm", "ci"])[0]:
            write(
                "dependency-gate.json",
                {"status": "INSTALL_ERROR", "reason": "Clean install failed"},
            )
            return 1
        code, raw = command("npm-audit", ["npm", "audit", "--json", "--audit-level=low"])
        try:
            data = json.loads(raw)
            lock_data = json.loads(Path("package-lock.json").read_text())
            count = npm_report(data, lock_data)
            status = scan_status(code, count)
            metrics = npm_metrics(data)
            retain_raw("npm-audit.json", raw)
            write(
                "dependency-gate.json",
                {
                    "status": status,
                    "scanner_exit_code": code,
                    "findings": count,
                    "scanner": {"name": "npm-audit", "version": "10.9.7"},
                    "metrics": metrics,
                },
            )
            lock = lock_data["packages"]
            safe = {}
            for name, finding in data["vulnerabilities"].items():
                safe[name] = {
                    key: finding.get(key)
                    for key in [
                        "name",
                        "severity",
                        "isDirect",
                        "range",
                        "nodes",
                        "fixAvailable",
                        "via",
                    ]
                }
                safe[name]["installed_versions"] = sorted(
                    {
                        lock[node]["version"]
                        for node in finding.get("nodes", [])
                        if node in lock and "version" in lock[node]
                    }
                )
            write(
                "dependency-audit.json",
                {"metadata": data.get("metadata", {}), "vulnerabilities": safe},
            )
        except (ValueError, TypeError):
            write(
                "dependency-gate.json",
                {"status": "SCANNER_ERROR", "reason": "Malformed/incomplete scanner output"},
            )
            print("Security scan failed or returned malformed output")
            return 1
        return int(status != "PASS")
    if command(
        "clean-install",
        [sys.executable, "-m", "pip", "install", "--no-deps", "-r", "requirements/ci.txt"],
    )[0]:
        write("dependency-gate.json", {"status": "INSTALL_ERROR", "reason": "Clean install failed"})
        return 1
    tools = Path(tempfile.mkdtemp(prefix="ci-audit-"))
    try:
        import venv

        venv.create(tools, with_pip=True)
        if command(
            "audit-tool-install",
            [
                str(tools / "bin/python"),
                "-m",
                "pip",
                "install",
                "--require-hashes",
                "-r",
                ".github/ci/security-requirements.txt",
            ],
        )[0]:
            return 1
        import sysconfig

        production = tools / "production"
        venv.create(production, with_pip=True)
        if command(
            "production-install",
            [
                str(production / "bin/python"),
                "-m",
                "pip",
                "install",
                "--no-deps",
                "-r",
                ".github/ci/production-requirements.txt",
            ],
        )[0]:
            return 1
        failed = False
        statuses = []
        targets = [
            ("ci", sysconfig.get_paths()["purelib"]),
            ("production", str(production / "lib/python3.12/site-packages")),
        ]
        for scope, target in targets:
            report = tools / (scope + "-audit.json")
            code, _ = command(
                "pip-audit-" + scope,
                [
                    str(tools / "bin/pip-audit"),
                    "--path",
                    target,
                    "--format",
                    "json",
                    "--output",
                    str(report),
                    "--progress-spinner",
                    "off",
                ],
            )
            failed |= code != 0
            try:
                data = json.loads(report.read_bytes())
                import importlib.metadata

                expected = {
                    canonical(d.metadata["Name"]): d.version
                    for d in importlib.metadata.distributions(path=[target])
                }
                count = pip_report(data, expected)
                metrics = pip_metrics(data)
                retain_raw("pip-audit-" + scope + ".json", report.read_bytes())
                status = scan_status(code, count)
                statuses.append(
                    {
                        "scope": scope,
                        "status": status,
                        "scanner_exit_code": code,
                        "findings": count,
                        "installed_packages": len(expected),
                        "metrics": metrics,
                    }
                )
                failed |= status != "PASS"
                write(
                    "dependency-" + scope + ".json",
                    {
                        "dependencies": [
                            {
                                "name": dep["name"],
                                "version": dep["version"],
                                "vulns": [
                                    {
                                        key: vuln.get(key)
                                        for key in ["id", "fix_versions", "aliases"]
                                    }
                                    for vuln in dep.get("vulns", [])
                                ],
                            }
                            for dep in data["dependencies"]
                        ]
                    },
                )
            except (ValueError, TypeError, KeyError, OSError):
                print("Security scan failed or returned incomplete output")
                statuses.append({"scope": scope, "status": "SCANNER_ERROR"})
                failed = True
        overall = (
            "SCANNER_ERROR"
            if any(x["status"] == "SCANNER_ERROR" for x in statuses)
            else "FINDINGS"
            if failed
            else "PASS"
        )
        write(
            "dependency-gate.json",
            {
                "status": overall,
                "scopes": statuses,
                "scanner": {"name": "pip-audit", "version": "2.10.1"},
            },
        )
        return int(failed)
    finally:
        shutil.rmtree(tools)


def secrets():
    write("secret-gate.json", {"status": "SCANNER_ERROR", "reason": "Scan did not complete"})
    config = Path(".github/ci/secret-false-positives.json")
    entries = exception_schema(
        json.loads(config.read_text()) if config.exists() else {"schema_version": 1, "entries": []}
    )
    if Path(".gitleaks.toml").exists() or Path(".gitleaksignore").exists():
        raise ValueError("Unreviewed scanner configuration/ignore file")
    env = os.environ.copy()
    env.pop("GITLEAKS_CONFIG", None)
    env.pop("GITLEAKS_CONFIG_TOML", None)
    env.update(
        GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0="safe.directory", GIT_CONFIG_VALUE_0=str(Path.cwd())
    )
    git = shutil.which("git")
    if git is None:
        raise ValueError("Git executable missing")
    shallow = subprocess.run(  # noqa: S603 - resolved executable and fixed argv; no shell.
        [git, "rev-parse", "--is-shallow-repository"], env=env, capture_output=True, text=True
    )
    if shallow.returncode or shallow.stdout.strip() != "false":
        print("Full Git history required (fetch-depth:0)")
        return 1
    with tempfile.TemporaryDirectory() as temporary:
        folder = Path(temporary)
        archive = folder / "gitleaks.tar.gz"
        urllib.request.urlretrieve(
            "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz",
            archive,
        )
        if (
            hashlib.sha256(archive.read_bytes()).hexdigest()
            != "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
        ):
            print("Scanner checksum mismatch")
            return 1
        with tarfile.open(archive) as package:
            member = package.extractfile("gitleaks")
            if member is None:
                raise ValueError("scanner archive invalid")
            binary = folder / "gitleaks"
            binary.write_bytes(member.read())
            binary.chmod(0o700)
        findings = []
        failed = False
        scan_results = []
        empty_ignores = folder / "empty-ignore"
        empty_ignores.mkdir()
        for mode in ["git", "dir"]:
            target = folder / (mode + ".json")
            argv = [
                str(binary),
                mode,
                ".",
                "--redact=100",
                "--ignore-gitleaks-allow",
                "--gitleaks-ignore-path=" + str(empty_ignores),
                "--no-banner",
                "--log-level=error",
                "--report-format=json",
                "--report-path=" + str(target),
            ]
            if mode == "git":
                argv.append("--log-opts=--all")
            code, _ = command("secret-" + mode, argv, env=env)
            if code not in [0, 1] or not target.exists():
                failed = True
                scan_results.append(
                    {"scope": mode, "status": "SCANNER_ERROR", "scanner_exit_code": code}
                )
                continue
            rows = secret_report(json.loads(target.read_text()), mode)
            raw_status = scan_status(code, len(rows))
            if code == 0 and rows:
                raw_status = "SCANNER_ERROR"
            failed |= raw_status == "SCANNER_ERROR"
            scan_results.append(
                {
                    "scope": mode,
                    "status": raw_status,
                    "scanner_exit_code": code,
                    "findings": len(rows),
                }
            )
            for row in rows:
                excluded = false_positive(row, entries, git=git, env=env)
                findings.append(
                    {
                        "type": row["rule"],
                        "file": row["file"],
                        "commit": row["commit"],
                        "scope": mode,
                        "start_line": row["start_line"],
                        "end_line": row["end_line"],
                        "decision": "FALSE_POSITIVE" if excluded else "OPEN",
                    }
                )
        # No Match/Secret/author/message/snippet fields may leave the temporary directory.
        write(
            "secret-scan.json",
            {"findings": findings, "scanner": "gitleaks8.30.1", "full_history": True},
        )
        open_count = sum(x["decision"] == "OPEN" for x in findings)
        status = "SCANNER_ERROR" if failed else "FINDINGS" if open_count else "PASS"
        write(
            "secret-gate.json",
            {
                "status": status,
                "raw_findings": len(findings),
                "false_positives": len(findings) - open_count,
                "open_findings": open_count,
                "scopes": scan_results,
            },
        )
        return int(status != "PASS")


def gate():
    states = json.loads(os.environ["NEEDS_RESULTS"])
    return validate_release_artifacts(
        states,
        Path(os.environ.get("CI_EVIDENCE_DIR", "ci-evidence")),
        os.environ.get("GITHUB_REPOSITORY") or os.environ.get("CI_REPOSITORY"),
        os.environ.get("GITHUB_SHA") or os.environ.get("CI_SOURCE_SHA"),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["quality", "dependencies", "secrets", "gate"])
    parser.add_argument("--kind", choices=["backend", "mobile", "landing"])
    args = parser.parse_args()
    try:
        if args.mode != "gate":
            ACTIVE = RunEvidence(args.mode, args.kind or detect_kind())
            OUT = ACTIVE.directory
        code = (
            gate()
            if args.mode == "gate"
            else secrets()
            if args.mode == "secrets"
            else quality(args.kind)
            if args.mode == "quality"
            else dependencies(args.kind)
        )
        if ACTIVE is not None:
            ACTIVE.finish(code)
    except Exception as error:
        print("CI failed safely: " + type(error).__name__)
        code = 1
        if ACTIVE is not None:
            try:
                ACTIVE.finish(1, type(error).__name__)
            except (ValueError, OSError, KeyError, TypeError):
                print("Failure evidence could not be published")
    raise SystemExit(code)
