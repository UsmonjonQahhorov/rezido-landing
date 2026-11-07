"""Run-scoped evidence receipts. No credentials, raw logs, release or external calls."""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import tomllib
import uuid
from pathlib import Path
from urllib.parse import urlsplit

EXPECTED = {"backend": "rezido-backend", "mobile": "rezido-mobile", "landing": "rezido-landing"}
STEPS = {
    "backend": {
        "clean-install",
        "ci-controller-tests",
        "ruff",
        "mypy",
        "django-check",
        "migration-drift",
        "pip-check",
        "openapi",
        "static-assets",
        "tests",
        "api-runtime",
        "release-producer",
    },
    "mobile": {
        "clean-install",
        "ci-controller-tests",
        "typecheck",
        "lint",
        "tests",
        "expo-config",
        "expo-doctor",
        "expo-compatibility",
        "android-js-export",
        "release-producer",
    },
    "landing": {
        "clean-install",
        "ci-controller-tests",
        "typecheck",
        "lint",
        "tests",
        "production-build",
        "route-api-smoke",
        "release-producer",
    },
}


def utc():
    return datetime.datetime.now(datetime.UTC).isoformat()


def detect_kind():
    if Path("package.json").exists():
        name = json.loads(Path("package.json").read_text())["name"]
    else:
        name = tomllib.loads(Path("pyproject.toml").read_text())["project"]["name"]
    return next(k for k, value in EXPECTED.items() if value == name)


def identity():
    repository = os.environ.get("GITHUB_REPOSITORY") or os.environ.get("CI_REPOSITORY")
    sha = os.environ.get("GITHUB_SHA") or os.environ.get("CI_SOURCE_SHA")
    git = shutil.which("git")
    if Path(".git").exists() and git:
        env = {
            **os.environ,
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "safe.directory",
            "GIT_CONFIG_VALUE_0": str(Path.cwd()),
        }
        actual = subprocess.check_output(  # noqa: S603 - resolved git, fixed read-only argv.
            [git, "rev-parse", "HEAD"], env=env, stderr=subprocess.DEVNULL, text=True
        ).strip()
        if sha and sha != actual:
            raise ValueError("Declared source does not match checkout")
        sha = actual
        if not repository:
            remote = subprocess.check_output(  # noqa: S603 - read-only remote lookup, never emitted.
                [git, "remote", "get-url", "origin"], env=env, stderr=subprocess.DEVNULL, text=True
            ).strip()
            path = urlsplit(remote).path if "://" in remote else remote.split(":", 1)[-1]
            repository = "/".join(path.strip("/").removesuffix(".git").split("/")[-2:])
    if not isinstance(repository, str) or not re.fullmatch(
        r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository
    ):
        raise ValueError("Repository identity missing/invalid")
    if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Source SHA missing/invalid")
    return repository, sha


def input_digest():
    # Bind every versioned/unignored source input, including Docker/EAS/build configs.
    # Generated evidence/build products and dotenv/signing material are not source.
    if Path(".git").exists() and shutil.which("git"):
        env = {
            **os.environ,
            "GIT_CONFIG_COUNT": "1",
            "GIT_CONFIG_KEY_0": "safe.directory",
            "GIT_CONFIG_VALUE_0": str(Path.cwd()),
        }
        names = subprocess.check_output(  # noqa: S603 - resolved git, fixed read-only argv.
            [shutil.which("git"), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            env=env,
        ).decode().split("\0")
        excluded = {"ci-results", "release-payloads", "node_modules", ".next", "__pycache__"}
        digest = hashlib.sha256()
        for name in sorted(set(names) - {""}):
            file = Path(name)
            if set(file.parts) & excluded or file.name.startswith(".env"):
                continue
            if file.suffix in {".pem", ".key", ".p12", ".p8", ".jks", ".keystore"}:
                raise ValueError("Signing/private material cannot be a source input")
            if file.is_symlink() or any(p.is_symlink() for p in file.parents):
                raise ValueError("Source symlinks require explicit review")
            digest.update(name.encode() + b"\0")
            digest.update(
                hashlib.sha256(file.read_bytes()).digest() if file.is_file() else b"deleted"
            )
        return digest.hexdigest()
    roots = [
        ".github",
        "docker",
        "requirements",
        "apps",
        "config",
        "tests",
        "scripts",
        "src",
        "assets",
        "public",
    ]
    files = [
        Path(n)
        for n in [
            "package.json",
            "package-lock.json",
            "pyproject.toml",
            "manage.py",
            "app.config.ts",
            "app.json",
            "metro.config.js",
            "babel.config.js",
            "tsconfig.json",
            "next.config.ts",
            "vitest.config.ts",
            "vitest.config.mts",
            "eas.json",
            ".dockerignore",
        ]
        if Path(n).is_file()
    ]
    for name in roots:
        folder = Path(name)
        if folder.exists():
            files.extend(
                f
                for f in folder.rglob("*")
                if f.is_file()
                and not f.is_symlink()
                and "__pycache__" not in f.parts
                and not f.name.startswith(".env")
            )
    digest = hashlib.sha256()
    for file in sorted(set(files)):
        digest.update(file.as_posix().encode() + b"\0" + hashlib.sha256(file.read_bytes()).digest())
    return digest.hexdigest()


def emit_outputs(values):
    target = os.environ.get("GITHUB_OUTPUT")
    if target:
        with Path(target).open("a", encoding="utf8") as output:
            for name, value in values.items():
                if "\n" in str(value) or "\r" in str(value):
                    raise ValueError("Unsafe job output")
                output.write(name + "=" + str(value) + "\n")


class RunEvidence:
    def __init__(self, mode, kind):
        if mode not in {"quality", "dependencies", "secrets"} or detect_kind() != kind:
            raise ValueError("Repository kind/mode mismatch")
        repository, sha = identity()
        self.mode, self.kind = mode, kind
        self.context = {
            "schema_version": 1,
            "id": uuid.uuid4().hex,
            "repository": repository,
            "source_sha": sha,
            "input_sha256": input_digest(),
            "mode": mode,
            "kind": kind,
            "started_at": utc(),
        }
        self.directory = Path("ci-results") / (mode + "-" + self.context["id"])
        self.directory.mkdir(parents=True, exist_ok=False)
        self.written = set()
        emit_outputs({"evidence_path": self.directory.as_posix()})
        self._receipt("RUNNING", None)

    def stamp(self, data):
        if not isinstance(data, dict):
            raise ValueError("Report object required")
        return {**data, "_evidence": {**self.context, "created_at": utc()}}

    def record(self, name):
        self.written.add(name)

    def report(self, name):
        if name not in self.written:
            raise ValueError("Required report not produced this run")
        data = json.loads((self.directory / name).read_text())
        meta = data.get("_evidence", {})
        if any(meta.get(k) != value for k, value in self.context.items()):
            raise ValueError("Stale/mismatched evidence")
        created = datetime.datetime.fromisoformat(meta["created_at"])
        if (
            not datetime.datetime.fromisoformat(self.context["started_at"])
            <= created
            <= datetime.datetime.now(datetime.UTC)
        ):
            raise ValueError("Evidence timestamp outside current run")
        return data

    def _receipt(self, status, code, error_type=None):
        receipt = {
            "context": self.context,
            "status": status,
            "exit_code": code,
            "completed_at": utc() if code is not None else None,
            "reports": [
                {
                    "path": name,
                    "sha256": hashlib.sha256((self.directory / name).read_bytes()).hexdigest(),
                }
                for name in sorted(self.written)
            ],
        }
        if error_type:
            receipt["error_type"] = error_type
        file = self.directory / "job-evidence.json"
        file.write_text(json.dumps(receipt, indent=2) + "\n")
        return file, receipt

    def finish(self, code, error_type=None):
        status = "FAIL"
        if code == 0:
            if input_digest() != self.context["input_sha256"]:
                raise ValueError("Execution inputs changed during check")
            if self.mode == "quality":
                self.report("integrity.json")
                tests = self.report("tests.json")
                if tests["tests"] <= 0 or any(tests[k] for k in ["failures", "errors", "skipped"]):
                    raise ValueError("Incomplete test execution")
                steps = [
                    json.loads(line)
                    for line in (self.directory / "steps.jsonl").read_text().splitlines()
                ]
                if (
                    {s["gate"] for s in steps} != STEPS[self.kind]
                    or len(steps) != len(STEPS[self.kind])
                    or any(s["exit_code"] != 0 for s in steps)
                ):
                    raise ValueError("Quality prerequisites incomplete")
                self.written.add("steps.jsonl")
            else:
                gate = self.report(
                    "dependency-gate.json" if self.mode == "dependencies" else "secret-gate.json"
                )
                if gate["status"] != "PASS":
                    raise ValueError("Gate status is not PASS")
                if self.mode == "dependencies":
                    for name in (
                        ["dependency-ci.json", "dependency-production.json"]
                        if self.kind == "backend"
                        else ["dependency-audit.json"]
                    ):
                        self.report(name)
                else:
                    scan = self.report("secret-scan.json")
                    if scan["full_history"] is not True:
                        raise ValueError("Full history not verified")
                    scopes = gate["scopes"]
                    if len(scopes) != 2 or {s["scope"] for s in scopes} != {"git", "dir"}:
                        raise ValueError("Secret scan scope incomplete")
                    for scope in scopes:
                        if scope["status"] not in {"PASS", "FINDINGS"} or scope[
                            "scanner_exit_code"
                        ] not in (0, 1):
                            raise ValueError("Secret scanner status invalid")
                    if (
                        gate["raw_findings"] != len(scan["findings"])
                        or gate["raw_findings"] != sum(s["findings"] for s in scopes)
                        or gate["open_findings"] != 0
                        or gate["false_positives"] != gate["raw_findings"]
                        or any(f["decision"] != "FALSE_POSITIVE" for f in scan["findings"])
                    ):
                        raise ValueError("Secret findings/counts inconsistent")
            status = "PASS"
        else:
            gate_name = (
                "dependency-gate.json" if self.mode == "dependencies" else "secret-gate.json"
            )
            if gate_name in self.written:
                status = self.report(gate_name).get("status", "FAIL")
                if status == "PASS":
                    status = "FAIL"
        file, receipt = self._receipt(status, code, error_type)
        release_outputs = {}
        if status == "PASS" and self.mode == "quality":
            from release_contract import seal_envelope

            release_outputs = seal_envelope(self.directory, file, self.context)
        emit_outputs(
            {
                **release_outputs,
                "evidence_status": status,
                "evidence_id": self.context["id"],
                "evidence_repository": self.context["repository"],
                "evidence_source_sha": self.context["source_sha"],
                "evidence_mode": self.mode,
                "evidence_completed_at": receipt["completed_at"],
                "evidence_input_sha256": self.context["input_sha256"],
                "evidence_manifest_sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            }
        )


def validate_final(states, repository, sha):
    required = {"quality", "dependencies", "secrets"}
    if (
        not isinstance(states, dict)
        or set(states) != required
        or not isinstance(repository, str)
        or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository)
        or not isinstance(sha, str)
        or not re.fullmatch(r"[a-f0-9]{40}", sha)
    ):
        return 1
    ids, inputs = set(), set()
    for mode, job in states.items():
        if not isinstance(job, dict) or job.get("result") != "success":
            return 1
        outputs = job.get("outputs", {})
        if not isinstance(outputs, dict):
            return 1
        expected = {
            "evidence_status": "PASS",
            "evidence_repository": repository,
            "evidence_source_sha": sha,
            "evidence_mode": mode,
        }
        if any(outputs.get(k) != value for k, value in expected.items()):
            return 1
        if not re.fullmatch(r"[a-f0-9]{32}", outputs.get("evidence_id", "")):
            return 1
        ids.add(outputs["evidence_id"])
        inputs.add(outputs.get("evidence_input_sha256"))
        for name in ["evidence_input_sha256", "evidence_manifest_sha256"]:
            if not re.fullmatch(r"[a-f0-9]{64}", outputs.get(name, "")):
                return 1
        try:
            completed = datetime.datetime.fromisoformat(outputs["evidence_completed_at"])
            age = (datetime.datetime.now(datetime.UTC) - completed).total_seconds()
            if not 0 <= age <= 3600:
                return 1
        except (KeyError, TypeError, ValueError):
            return 1
    return int(len(ids) != 3 or len(inputs) != 1)
