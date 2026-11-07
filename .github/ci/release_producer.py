"""Real local producers. Never install dependencies, sign with fake keys or publish.

Raw build output is kept only in an anonymous temporary stream; diagnostics contain
exit codes/hashes, never environment/signing values. Use a private output directory.
"""

import argparse
import datetime
import hashlib
import json
import os
import platform
import plistlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path

from evidence import detect_kind, identity, input_digest
from release_artifacts import TARGETS, fingerprint, payload_manifest
from release_contract import VALIDATORS, validate_record


def execute(argv, journal, cwd=None):
    start = datetime.datetime.now(datetime.UTC).isoformat()
    with tempfile.TemporaryFile() as stream:
        result = subprocess.run(argv, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, check=False)  # noqa: S603
        stream.seek(0)
        h = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    journal.append(
        {
            "argv": argv,
            "cwd": str(cwd or Path.cwd()),
            "started_at": start,
            "exit_code": result.returncode,
            "output_sha256": h.hexdigest(),
            "raw_output": "not retained: may contain private build data",
        }
    )
    if result.returncode:
        raise ValueError("Producer command failed (exit " + str(result.returncode) + ")")


def dependency_digest(kind):
    paths = (
        ["package-lock.json"]
        if kind != "backend"
        else [
            ".github/ci/production-requirements.txt",
            "requirements/base.txt",
            "requirements/production.txt",
        ]
    )
    values = {n: hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in paths}
    primary = values[paths[0]]
    return primary, values


def installed_node_graph():
    lock = json.loads(Path("package-lock.json").read_text())
    rows = {}
    for name, meta in lock["packages"].items():
        if not name:
            continue
        file = Path(name) / "package.json"
        if not file.is_file():
            if meta.get("optional") or meta.get("devOptional") or meta.get("os") or meta.get("cpu"):
                continue
            raise ValueError("Required installed package missing: " + name)
        installed = json.loads(file.read_text())["version"]
        if installed != meta.get("version"):
            raise ValueError("Installed package/lock mismatch: " + name)
        rows[name] = installed
    return hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest()


def source_paths(include_deleted=False):
    git = shutil.which("git")
    env = {
        **os.environ,
        "GIT_CONFIG_COUNT": "1",
        "GIT_CONFIG_KEY_0": "safe.directory",
        "GIT_CONFIG_VALUE_0": str(Path.cwd()),
    }
    raw = subprocess.check_output(  # noqa: S603
        [git, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        env=env,
    )
    excluded = {"ci-results", "release-payloads", "node_modules", ".next", "__pycache__"}
    return [
        Path(n)
        for n in sorted(set(raw.decode().split("\0")) - {""})
        if not Path(n).name.startswith(".env")
        and not set(Path(n).parts) & excluded
        and (Path(n).is_file() or include_deleted)
    ]


def backend(root, context, base_image, journal):
    if not base_image or not re.fullmatch(r"[A-Za-z0-9_.:/@-]+", base_image):
        raise ValueError("A reviewed immutable installed-runtime base image is required")
    docker = shutil.which("docker")
    if not docker:
        raise ValueError("Docker unavailable")
    base_id = subprocess.check_output(  # noqa: S603
        [docker, "image", "inspect", "--format", "{{.Id}}", base_image],
        text=True,
    ).strip()
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", base_id):
        raise ValueError("Invalid base image identity")
    # Names/versions only. No Config.Env, secrets or application initialization.
    code = (
        "import importlib.metadata as m,json,platform;"
        "print(json.dumps({'packages':{d.metadata['Name'].lower().replace('_','-'):"
        "d.version for d in m.distributions()},'python':platform.python_version(),"
        "'system':platform.system(),'machine':platform.machine()}))"
    )
    runtime = json.loads(
        subprocess.check_output(  # noqa: S603
            [
                docker,
                "run",
                "--pull=never",
                "--network",
                "none",
                "--read-only",
                "--entrypoint",
                "/opt/venv/bin/python",
                base_id,
                "-c",
                code,
            ],
            text=True,
        )
    )
    actual = runtime["packages"]
    if runtime["system"] != "Linux" or not runtime["python"].startswith("3.12."):
        raise ValueError("Backend build requires reviewed Linux/Python3.12 runtime")
    for line in Path(".github/ci/production-requirements.txt").read_text().splitlines():
        match = re.match(r"([A-Za-z0-9_.-]+)(?:\[[^]]+\])?==([^\s;]+)", line.strip())
        if match and actual.get(match[1].lower().replace("_", "-")) != match[2]:
            raise ValueError("Base installed dependency differs from production snapshot")
    tag = "rezido-phase611:backend-" + context["id"]
    alias = "rezido-phase611:base-" + context["id"]
    execute([docker, "tag", base_id, alias], journal)
    with tempfile.TemporaryDirectory(prefix="rezido-source-build-") as temporary:
        directory = Path(temporary)
        source = directory / "source"
        source.mkdir()
        files = source_paths()
        source_hashes = {
            file.as_posix(): hashlib.sha256(file.read_bytes()).hexdigest() for file in files
        }
        for file in files:
            dest = source / file
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, dest)
        # This removes inherited source ONLY inside a NEW build layer, never a live
        # container/data volume. The immutable reviewed base and all live services stay intact.
        recipe = (
            "FROM " + alias + "\nUSER root\n"
            "RUN python -c \"import shutil;shutil.rmtree('/app')\"\n"
            "WORKDIR /app\nCOPY --chown=app:app source/ /app/\n"
            "RUN chmod +x /app/docker/entrypoint.sh\nUSER app\n"
            "RUN python manage.py collectstatic --noinput --settings=config.settings.base\n"
            'LABEL org.opencontainers.image.revision="' + context["source_sha"] + '"\n'
            'LABEL io.rezido.input-sha256="' + context["input_sha256"] + '"\n'
            'LABEL io.rezido.build-id="' + context["id"] + '"\n'
        )
        (directory / "Dockerfile").write_text(recipe)
        recipe_sha = hashlib.sha256(recipe.encode()).hexdigest()
        execute(
            [docker, "build", "--network=none", "--pull=false", "-t", tag, str(directory)], journal
        )
    image_id = subprocess.check_output(  # noqa: S603
        [docker, "image", "inspect", "--format", "{{.Id}}", tag],
        text=True,
    ).strip()
    if image_id == base_id:
        raise ValueError("Old base image is not a new build")
    dest = root / TARGETS["backend"]["backend-oci"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    execute([docker, "image", "save", "--output", str(dest), tag], journal)
    # Docker's reported Id may identify an OCI index/manifest, not its config.
    # Compute the actual config digest from exported bytes, without parsing Env.
    with tarfile.open(dest, "r:*") as archive:
        manifest = json.load(archive.extractfile("manifest.json"))
        if len(manifest) != 1:
            raise ValueError("Ambiguous exported image")
        stream = archive.extractfile(manifest[0]["Config"])
        h = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
        config_digest = "sha256:" + h.hexdigest()
    return {
        "artifact_type": "docker-image-archive",
        "image_config_digest": config_digest,
        "docker_reported_image_id": image_id,
        "base_image_local_id": base_id,
        "build_recipe_sha256": recipe_sha,
        "static_assets": (
            "Generated by collectstatic in new network-isolated build layer; "
            "runtime settings unchanged"
        ),
        "dependency_install": "NONE — verified existing installed runtime reused as immutable base",
        "source_file_count": len(files),
        "source_file_digests": source_hashes,
        "runtime_environment": {k: v for k, v in runtime.items() if k != "packages"},
        "installed_runtime_dependencies": actual,
    }


def next_build(root, context, journal):
    graph = installed_node_graph()
    npm = shutil.which("npm")
    if not npm:
        raise ValueError("npm unavailable")
    execute([npm, "run", "build"], journal)
    dest = root / TARGETS["landing"]["landing-next"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    members = [".next", "node_modules", "package.json", "package-lock.json", "next.config.ts"]
    if Path("public").exists():
        members.append("public")
    cwd = Path.cwd().resolve()
    for name in members:
        for file in [Path(name), *Path(name).rglob("*")]:
            if file.is_symlink() and not file.resolve().is_relative_to(cwd):
                raise ValueError("External symlink in Next runtime")
    # Runtime-private files remain in private build storage. No values parsed/logged.
    with tarfile.open(dest, "w", dereference=True) as archive:
        for name in members:
            archive.add(
                name,
                arcname=name,
                filter=lambda info: None
                if (
                    info.name.startswith(".next/cache/")
                    or info.name == ".next/cache"
                    or info.name.startswith("node_modules/.cache/")
                    or info.name == "node_modules/.cache"
                )
                else info,
            )
    return {
        "artifact_type": "next-node-runtime-tar",
        "installed_graph_digest": graph,
        "cache_scope": "Build caches retained privately, not required next-start runtime payload",
        "private_runtime_material": (
            "Present by framework design; custody NOT VERIFIED; not public evidence"
        ),
    }


def android(root, context, journal):
    installed_node_graph()
    build = Path("android/app/build.gradle")
    if not build.is_file():
        raise ValueError("BLOCKED — OWNER ACTION REQUIRED: reviewed native release project absent")
    text = build.read_text()
    release = text.split("release {", 1)[-1].split("packagingOptions", 1)[0]
    if "signingConfigs.debug" in release or ".development'" in text:
        raise ValueError("BLOCKED — OWNER ACTION REQUIRED: debug signing/development package")
    tracked = subprocess.run(  # noqa: S603 - fixed read-only source-provenance check.
        [shutil.which("git"), "ls-files", "--error-unmatch", "android/app/build.gradle"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if tracked.returncode:
        raise ValueError(
            "BLOCKED: ignored/generated native project lacks reviewed source provenance"
        )
    certificate = os.environ.get("CI_RELEASE_ANDROID_CERT_SHA256", "")
    if not re.fullmatch(r"[a-f0-9]{64}", certificate):
        raise ValueError(
            "BLOCKED — OWNER ACTION REQUIRED: approved PUBLIC release certificate identity"
        )
    signer, analyzer = shutil.which("apksigner"), shutil.which("apkanalyzer")
    if not signer or not analyzer:
        raise ValueError("BLOCKED — OWNER ACTION REQUIRED: Android SDK verification tools")
    native = Path("android").resolve()
    wrapper = native / ("gradlew.bat" if os.name == "nt" else "gradlew")
    execute([str(wrapper), "--offline", ":app:assembleRelease", "--no-daemon"], journal, cwd=native)
    source = native / "app/build/outputs/apk/release/app-release.apk"
    # Public package/signature metadata only, never keystore contents/passwords.
    signature = subprocess.check_output(  # noqa: S603 - resolved verifier; public certificate metadata.
        [signer, "verify", "--verbose", "--print-certs", str(source)], text=True
    )
    match = re.search(r"certificate SHA-256 digest:\s*([a-fA-F0-9]{64})", signature)
    if not match or match[1].lower() != certificate or "CN=Android Debug" in signature:
        raise ValueError("APK has wrong/debug signing certificate")
    manifest = subprocess.check_output([analyzer, "manifest", "print", str(source)], text=True)  # noqa: S603
    if re.search(r'android:debuggable\s*=\s*"true"', manifest):
        raise ValueError("Debuggable APK")
    package = subprocess.check_output(  # noqa: S603 - resolved verifier and fixed metadata argv.
        [analyzer, "manifest", "application-id", str(source)], text=True
    ).strip()
    version = subprocess.check_output(  # noqa: S603 - resolved verifier and fixed metadata argv.
        [analyzer, "manifest", "version-name", str(source)], text=True
    ).strip()
    if package.endswith((".development", ".debug")):
        raise ValueError("Development APK identity")
    dest = root / TARGETS["mobile"]["android"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, dest)
    return {
        "artifact_type": "signed-release-apk",
        "build_variant": "release",
        "package_identifier": package,
        "application_version": version,
        "platform_validation": {
            "debuggable": False,
            "signature_verified": True,
            "public_certificate_sha256": certificate,
        },
    }


def ios(root, context, journal):
    if sys.platform != "darwin" or not shutil.which("xcodebuild"):
        raise ValueError("BLOCKED — OWNER ACTION REQUIRED: macOS/Xcode runner unavailable")
    team = os.environ.get("CI_RELEASE_IOS_TEAM_ID", "")
    if not re.fullmatch(r"[A-Z0-9]{10}", team):
        raise ValueError("BLOCKED — OWNER ACTION REQUIRED: approved PUBLIC iOS Team ID")
    installed_node_graph()
    scheme = os.environ.get("CI_RELEASE_IOS_SCHEME", "")
    options = os.environ.get("CI_RELEASE_IOS_EXPORT_OPTIONS", "")
    workspaces = list(Path("ios").glob("*.xcworkspace"))
    if not re.fullmatch(r"[A-Za-z0-9_-]+", scheme) or not options or len(workspaces) != 1:
        raise ValueError(
            "BLOCKED — OWNER ACTION REQUIRED: reviewed workspace/scheme/export-options reference"
        )
    tracked = subprocess.run(  # noqa: S603 - fixed read-only native source inventory.
        [shutil.which("git"), "ls-files", "ios"],
        capture_output=True,
        check=False,
    )
    if not tracked.stdout.strip() or not Path("ios/Podfile.lock").is_file():
        raise ValueError("BLOCKED: reviewed native source and CocoaPods lock provenance required")
    # Existing owner-managed keychain/profile only; no provisioning downloads or credentials.
    with tempfile.TemporaryDirectory(prefix="rezido-ios-build-") as temporary:
        staging = Path(temporary)
        archive = staging / "Release.xcarchive"
        export = staging / "export"
        execute(
            [
                "xcodebuild",
                "-workspace",
                str(workspaces[0]),
                "-scheme",
                scheme,
                "-configuration",
                "Release",
                "-disableAutomaticPackageResolution",
                "-onlyUsePackageVersionsFromResolvedFile",
                "-archivePath",
                str(archive),
                "archive",
            ],
            journal,
        )
        apps = list((archive / "Products/Applications").glob("*.app"))
        if len(apps) != 1:
            raise ValueError("Missing iOS archive application")
        execute(["codesign", "--verify", "--deep", "--strict", str(apps[0])], journal)
        info = plistlib.loads((apps[0] / "Info.plist").read_bytes())
        package = info["CFBundleIdentifier"]
        if package.endswith((".development", ".debug")):
            raise ValueError("Development iOS identity")
        execute(
            [
                "xcodebuild",
                "-exportArchive",
                "-archivePath",
                str(archive),
                "-exportOptionsPlist",
                options,
                "-exportPath",
                str(export),
            ],
            journal,
        )
        files = list(export.glob("*.ipa"))
        if len(files) != 1:
            raise ValueError("Missing exported IPA")
        unpacked = staging / "verified-export"
        unpacked.mkdir()
        with zipfile.ZipFile(files[0]) as ipa:
            from release_contract import extract_verified_zip, safe_member

            for member in ipa.infolist():
                safe_member(member.filename)
                if (member.external_attr >> 16) & 0o170000 == 0o120000:
                    raise ValueError("Link in exported IPA")
            extract_verified_zip(ipa, unpacked)
        exported_apps = list((unpacked / "Payload").glob("*.app"))
        if len(exported_apps) != 1:
            raise ValueError("Invalid exported IPA")
        execute(["codesign", "--verify", "--deep", "--strict", str(exported_apps[0])], journal)
        from release_contract import verify_ios_profile

        verify_ios_profile(exported_apps[0], team)
        dest = root / TARGETS["mobile"]["ios"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(files[0], dest)
    return {
        "artifact_type": "signed-release-ipa",
        "build_variant": "Release",
        "package_identifier": package,
        "application_version": info["CFBundleShortVersionString"],
        "platform_validation": {
            "codesign_verified": True,
            "public_team_identifier": team,
            "profile_verified": True,
            "basis": (
                "successful owner-configured archive/export and exported codesign verification"
            ),
        },
    }


PRODUCERS = {"backend-oci": backend, "landing-next": next_build, "android": android, "ios": ios}


def produce(family, root, context, base_image=None):
    if not Path(".git").exists() or not shutil.which("git"):
        raise ValueError(
            "A verified Git checkout is required; declared SHA alone is not provenance"
        )
    repository, commit = identity()
    before = input_digest()
    if (repository, commit, before) != (
        context["repository"],
        context["source_sha"],
        context["input_sha256"],
    ):
        raise ValueError("Producer checkout/context mismatch")
    kind = detect_kind()
    paths = source_paths(include_deleted=True)
    source_hashes = {
        p.as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file()
    }
    deleted = [p.as_posix() for p in paths if not p.is_file()]
    if family not in TARGETS[kind]:
        raise ValueError("Wrong artifact family for repository")
    root = Path(root)
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Private output root must already exist and be a regular directory")
    target = root / TARGETS[kind][family]
    if target.exists() or target.is_symlink():
        raise ValueError("Refuse pre-existing/stale artifact: use a new private build directory")
    for parent in [target.parent, *target.parent.parents]:
        if parent.is_symlink() or getattr(parent, "is_junction", lambda: False)():
            raise ValueError("Link in producer output path")
    lock, inputs = dependency_digest(kind)
    journal = []
    try:
        extra = (
            backend(root, context, base_image, journal)
            if family == "backend-oci"
            else PRODUCERS[family](root, context, journal)
        )
        if input_digest() != before or dependency_digest(kind) != (lock, inputs):
            raise ValueError("Source/dependency inputs changed during build")
        actual = fingerprint(root, TARGETS[kind][family])
        record = {
            "schema_version": 2,
            "artifact_family": family,
            "source_repository_identity": repository,
            "source_commit_sha": commit,
            "source_input_sha256": before,
            "source_file_digests": source_hashes,
            "source_deleted_paths": deleted,
            "source_revision_scope": (
                "Verified HEAD plus exact working-tree input digest; uncommitted changes included"
            ),
            "build_identifier": context["id"],
            "build_timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "build_environment": {
                "os": platform.system(),
                "architecture": platform.machine(),
                "python": platform.python_version(),
                "dependency_install": False,
            },
            "artifact_relative_path": actual["path"],
            "artifact_size": actual["size"],
            "sha256": actual["sha256"],
            "dependency_lockfile_digest": lock,
            "dependency_inputs": inputs,
            "quality_receipt_identity": context["id"],
            "quality_receipt_digest": "NOT_APPLICABLE until post-receipt release envelope",
            "build_exit_code": 0,
            "validation_result": "PRODUCER_TEST_PASS",
            **extra,
        }
        record["payload_files"] = VALIDATORS[family](root / actual["path"], record)
        validate_record(record, root, context, family)
        return record, journal
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        error.producer_journal = journal
        raise


def for_quality(kind, root, context):
    records = {}
    for family in TARGETS[kind]:
        records[family], _journal = produce(
            family, root, context, os.environ.get("CI_RELEASE_BASE_IMAGE")
        )
    return {**payload_manifest(root, TARGETS[kind], context), "producer_records": records}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    family_group = parser.add_mutually_exclusive_group(required=True)
    family_group.add_argument("--family", choices=list(PRODUCERS))
    family_group.add_argument("--quality-kind", choices=list(TARGETS))
    parser.add_argument("--context", type=Path, required=True)
    parser.add_argument("--private-output-root", type=Path, required=True)
    parser.add_argument("--record", type=Path, required=True)
    parser.add_argument("--base-image")
    args = parser.parse_args()
    try:
        context = json.loads(args.context.read_text())
        if args.quality_kind:
            package = for_quality(args.quality_kind, args.private_output_root, context)
            args.record.write_text(json.dumps(package, indent=2) + "\n")
        else:
            record, journal = produce(
                args.family, args.private_output_root, context, args.base_image
            )
            args.record.write_text(
                json.dumps({"record": record, "commands": journal}, indent=2) + "\n"
            )
        print(
            "PRODUCER_TEST_PASS: "
            + str(args.family or args.quality_kind)
            + "; not release approval"
        )
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        args.record.write_text(
            json.dumps(
                {
                    "status": "BLOCKED",
                    "reason": str(error),
                    "commands": getattr(error, "producer_journal", []),
                },
                indent=2,
            )
            + "\n"
        )
        print("Producer BLOCKED: " + str(error))
        raise SystemExit(1) from None
