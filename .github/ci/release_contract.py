"""Independent real-format validation and acyclic quality-receipt binding.

Producer records are quality-report inputs. The post-receipt envelope is anchored
by a trusted job output, never by hashing itself into its own quality receipt.
"""

import datetime
import gzip
import hashlib
import json
import plistlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from release_artifacts import fingerprint, read_json, unique_object

FAMILIES = {
    "backend-oci": "backend",
    "landing-next": "landing",
    "android": "mobile",
    "ios": "mobile",
}


def safe_member(name):
    p = PurePosixPath(name)
    if (
        not name
        or name in {".", ".."}
        or any(ord(c) < 32 for c in name)
        or p.is_absolute()
        or "\\" in name
        or ":" in name
        or any(part in {".", ".."} for part in p.parts)
        or p.as_posix() != name.rstrip("/")
    ):
        raise ValueError("Unsafe archive member")
    return name.rstrip("/")


def tar_inventory(path):
    rows = {}
    with tarfile.open(path, "r:*") as archive:
        for member in archive:
            name = safe_member(member.name)
            if (
                name in rows
                or member.issym()
                or member.islnk()
                or not (member.isfile() or member.isdir())
            ):
                raise ValueError("Duplicate/link/special archive member")
            if member.isdir():
                continue
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Unreadable archive member")
            h = hashlib.sha256()
            size = 0
            for block in iter(lambda stream=stream: stream.read(1024 * 1024), b""):
                size += len(block)
                h.update(block)
            if size != member.size:
                raise ValueError("Truncated archive member")
            rows[name] = {"path": name, "size": size, "sha256": h.hexdigest()}
    if not rows:
        raise ValueError("Empty archive")
    return rows


def tar_json(path, name):
    with tarfile.open(path, "r:*") as archive:
        member = archive.getmember(name)
        if not member.isfile() or member.size > 5_000_000:
            raise ValueError("Invalid format metadata")
        return json.load(archive.extractfile(member), object_pairs_hook=unique_object)


def validate_backend(path, record):
    if record.get("artifact_type") != "docker-image-archive":
        raise ValueError("Wrong backend archive type")
    rows = tar_inventory(path)
    if "manifest.json" not in rows:
        raise ValueError("Missing Docker image manifest")
    manifests = tar_json(path, "manifest.json")
    if not isinstance(manifests, list) or len(manifests) != 1:
        raise ValueError("Ambiguous image")
    image = manifests[0]
    config_name = safe_member(image["Config"])
    if config_name not in rows or not image["Layers"]:
        raise ValueError("Incomplete image")
    for layer in image["Layers"]:
        if safe_member(layer) not in rows or rows[layer]["size"] <= 0:
            raise ValueError("Missing image layer")
    config = tar_json(path, config_name)
    if config.get("os") != "linux" or config.get("architecture") not in {"amd64", "arm64"}:
        raise ValueError("Unexpected image platform")
    if config.get("rootfs", {}).get("type") != "layers":
        raise ValueError("Missing image root filesystem")
    diff_ids = config["rootfs"]["diff_ids"]
    if len(diff_ids) != len(image["Layers"]):
        raise ValueError("Image layer inventory mismatch")
    expected_source = record.get("source_file_digests")
    if not isinstance(expected_source, dict) or not expected_source:
        raise ValueError("Missing source-to-image file binding")
    observed_source = {}
    has_filesystem_entries = False
    with tarfile.open(path, "r:*") as archive:
        for layer, expected in zip(image["Layers"], diff_ids, strict=True):
            stream = archive.extractfile(layer)
            magic = stream.read(2)
            stream.close()
            stream = archive.extractfile(layer)
            raw = gzip.GzipFile(fileobj=stream) if magic == b"\x1f\x8b" else stream
            h = hashlib.sha256()
            for block in iter(lambda raw=raw: raw.read(1024 * 1024), b""):
                h.update(block)
            if "sha256:" + h.hexdigest() != expected:
                raise ValueError("Image uncompressed layer digest mismatch")
            raw.close()
            with tarfile.open(fileobj=archive.extractfile(layer), mode="r|*") as filesystem:
                # Empty filesystem layers are valid inside a nonempty Docker image.
                # Still validate their diff-ID; never accept an empty release payload.
                for entry in filesystem:
                    has_filesystem_entries = True
                    name = entry.name.removeprefix("./")
                    if name == ".wh.app" or name == "app/.wh..wh..opq":
                        observed_source.clear()
                    elif name.startswith("app/"):
                        relative = name[4:]
                        if "/.wh." in name or relative.startswith(".wh."):
                            parent, _, leaf = relative.rpartition("/")
                            removed = (
                                parent
                                if leaf == ".wh..wh..opq"
                                else ((parent + "/" if parent else "") + leaf.removeprefix(".wh."))
                            )
                            observed_source = {
                                k: v
                                for k, v in observed_source.items()
                                if k != removed and not k.startswith(removed + "/")
                            }
                        elif relative in expected_source and entry.isfile():
                            stream = filesystem.extractfile(entry)
                            h = hashlib.sha256()
                            for block in iter(lambda stream=stream: stream.read(1024 * 1024), b""):
                                h.update(block)
                            observed_source[relative] = h.hexdigest()
                        elif relative in expected_source:
                            raise ValueError("Source path overwritten by link or directory")
    if not has_filesystem_entries or observed_source != expected_source:
        raise ValueError("Image filesystem does not match actual source snapshot")
    labels = config["config"]["Labels"]
    for key, expected in {
        "org.opencontainers.image.revision": record["source_commit_sha"],
        "io.rezido.input-sha256": record["source_input_sha256"],
        "io.rezido.build-id": record["build_identifier"],
    }.items():
        if labels.get(key) != expected:
            raise ValueError("Image source/build label mismatch")
    if "sha256:" + rows[config_name]["sha256"] != record["image_config_digest"]:
        raise ValueError("Image config digest mismatch")
    # Hash all OCI-addressed blobs when present; Docker save may expose both layouts.
    for name, row in rows.items():
        if name.startswith("blobs/sha256/") and row["sha256"] != name.rsplit("/", 1)[-1]:
            raise ValueError("Corrupt OCI blob")
    return rows


def validate_next(path, record):
    rows = tar_inventory(path)
    required = {
        ".next/BUILD_ID",
        ".next/build-manifest.json",
        ".next/routes-manifest.json",
        ".next/prerender-manifest.json",
        ".next/server/app-paths-manifest.json",
        "package.json",
        "package-lock.json",
        "node_modules/next/package.json",
    }
    if not required <= rows.keys() or any(rows[n]["size"] <= 0 for n in required):
        raise ValueError("Missing required Next runtime output")
    if not any(n.startswith(".next/static/") for n in rows):
        raise ValueError("Missing Next static output")
    if rows["package-lock.json"]["sha256"] != record["dependency_lockfile_digest"]:
        raise ValueError("Next packaged lock mismatch")
    if not isinstance(tar_json(path, ".next/build-manifest.json").get("pages"), dict):
        raise ValueError("Invalid Next build manifest")
    if not isinstance(tar_json(path, ".next/routes-manifest.json").get("version"), int):
        raise ValueError("Invalid Next routes manifest")
    if not isinstance(tar_json(path, ".next/server/app-paths-manifest.json"), dict):
        raise ValueError("Invalid Next app path manifest")
    package = tar_json(path, "node_modules/next/package.json")
    lock = tar_json(path, "package-lock.json")
    if (
        package.get("name") != "next"
        or package.get("version") != lock["packages"]["node_modules/next"]["version"]
    ):
        raise ValueError("Next packaged runtime version mismatch")
    return rows


def validate_android(path, record):
    if record["artifact_type"] != "signed-release-apk" or record["build_variant"] != "release":
        raise ValueError("Not a release APK")
    if record["package_identifier"].endswith((".development", ".debug")):
        raise ValueError("Development package is not a production release")
    proof = record["platform_validation"]
    if proof.get("debuggable") is not False or proof.get("signature_verified") is not True:
        raise ValueError("Android release verification missing")
    if not re.fullmatch(r"[a-f0-9]{64}", proof.get("public_certificate_sha256", "")):
        raise ValueError("Missing verified public signing certificate identity")
    signer, analyzer = shutil.which("apksigner"), shutil.which("apkanalyzer")
    if not signer or not analyzer:
        raise ValueError("Independent Android verification tools unavailable")
    certificate = subprocess.check_output(  # noqa: S603
        [signer, "verify", "--verbose", "--print-certs", str(path)],
        text=True,
    )
    match = re.search(r"certificate SHA-256 digest:\s*([a-fA-F0-9]{64})", certificate)
    if (
        not match
        or match[1].lower() != proof["public_certificate_sha256"]
        or "CN=Android Debug" in certificate
    ):
        raise ValueError("Independent APK certificate mismatch/debug signing")
    manifest = subprocess.check_output([analyzer, "manifest", "print", str(path)], text=True)  # noqa: S603
    package = subprocess.check_output(  # noqa: S603 - resolved verifier and fixed metadata argv.
        [analyzer, "manifest", "application-id", str(path)], text=True
    ).strip()
    if package != record["package_identifier"] or re.search(
        r'android:debuggable\s*=\s*"true"', manifest
    ):
        raise ValueError("Independent APK identity/debuggable mismatch")
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate APK paths")
        for name in names:
            safe_member(name)
        if not {"AndroidManifest.xml", "classes.dex"} <= set(names) or archive.testzip():
            raise ValueError("Incomplete/corrupt APK")
    return {}


def validate_ios(path, record):
    if record["artifact_type"] != "signed-release-ipa" or record["build_variant"] != "Release":
        raise ValueError("Not a release IPA")
    proof = record["platform_validation"]
    if proof.get("codesign_verified") is not True or proof.get("profile_verified") is not True:
        raise ValueError("iOS signing/profile verification missing")
    if sys.platform != "darwin" or not shutil.which("codesign"):
        raise ValueError("Independent iOS validation requires macOS/codesign")
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate IPA paths")
        for name in names:
            safe_member(name)
        if any((item.external_attr >> 16) & 0o170000 == 0o120000 for item in archive.infolist()):
            raise ValueError("Link in exported IPA")
        if not any(n.startswith("Payload/") and n.endswith(".app/Info.plist") for n in names):
            raise ValueError("Missing iOS application")
        if not any(".app/_CodeSignature/CodeResources" in n for n in names) or archive.testzip():
            raise ValueError("Missing/corrupt iOS signature payload")
        with tempfile.TemporaryDirectory(prefix="rezido-independent-ipa-") as temporary:
            extract_verified_zip(archive, Path(temporary))
            apps = list((Path(temporary) / "Payload").glob("*.app"))
            if len(apps) != 1:
                raise ValueError("Ambiguous IPA")
            subprocess.run(  # noqa: S603 - fixed verifier, no credential values.
                [
                    shutil.which("codesign"),
                    "--verify",
                    "--deep",
                    "--strict",
                    "-R=anchor apple generic",
                    str(apps[0]),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            info = plistlib.loads((apps[0] / "Info.plist").read_bytes())
            if (
                info["CFBundleIdentifier"] != record["package_identifier"]
                or info["CFBundleShortVersionString"] != record["application_version"]
            ):
                raise ValueError("Independent IPA identity mismatch")
            verify_ios_profile(apps[0], proof["public_team_identifier"])
    return {}


def verify_ios_profile(app, team):
    """Inspect public signed-app/profile metadata only; never open a keychain/key."""
    if not isinstance(team, str) or not re.fullmatch(r"[A-Z0-9]{10}", team):
        raise ValueError("Approved public iOS Team ID required")
    signer, security = shutil.which("codesign"), shutil.which("security")
    if not signer or not security:
        raise ValueError("Native signature/profile verification tools unavailable")
    profile_file = app / "embedded.mobileprovision"
    if not profile_file.is_file() or profile_file.is_symlink():
        raise ValueError("Embedded distribution profile missing")
    details = subprocess.run(  # noqa: S603 - fixed public signature metadata command.
        [signer, "--display", "--verbose=4", str(app)],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    profile = plistlib.loads(
        subprocess.check_output(  # noqa: S603 - public CMS profile metadata.
            [security, "cms", "-D", "-i", str(profile_file)],
            stderr=subprocess.DEVNULL,
        )
    )
    entitlements = plistlib.loads(
        subprocess.check_output(  # noqa: S603 - signed public entitlements.
            [signer, "--display", "--entitlements", "-", "--xml", str(app)],
            stderr=subprocess.DEVNULL,
        )
    )
    info = plistlib.loads((app / "Info.plist").read_bytes())
    validate_ios_profile_metadata(profile, entitlements, details, team, info["CFBundleIdentifier"])


def validate_ios_profile_metadata(profile, entitlements, details, team, package):
    """Conservative distribution-profile checks, independent of export exit status."""
    if not re.search(r"^TeamIdentifier=" + re.escape(team) + r"$", details, re.MULTILINE):
        raise ValueError("iOS signer team mismatch")
    if not re.search(
        r"^Authority=(?:Apple Distribution|iPhone Distribution):", details, re.MULTILINE
    ):
        raise ValueError("Development/ad-hoc signature is not a distribution signature")
    if profile.get("TeamIdentifier") != [team]:
        raise ValueError("iOS profile team mismatch")
    expiration = profile.get("ExpirationDate")
    if not isinstance(expiration, datetime.datetime):
        raise ValueError("Profile expiration missing")
    if expiration.replace(tzinfo=datetime.UTC) <= datetime.datetime.now(datetime.UTC):
        raise ValueError("Expired provisioning profile")
    identity = team + "." + package
    permitted = profile.get("Entitlements", {})
    if permitted.get("get-task-allow") is not False:
        raise ValueError("Profile permits debugging or lacks distribution proof")
    if permitted.get("application-identifier") not in {identity, team + ".*"}:
        raise ValueError("Profile does not authorize package")
    if (
        entitlements.get("get-task-allow") is not False
        or entitlements.get("application-identifier") != identity
        or entitlements.get("com.apple.developer.team-identifier") != team
    ):
        raise ValueError("Signed application entitlements do not match distribution profile")


def extract_verified_zip(archive, root):
    """Write only validated regular entries into a new private staging directory."""
    root = root.resolve()
    seen = set()
    for member in archive.infolist():
        name = safe_member(member.filename)
        if name.casefold() in seen or (member.external_attr >> 16) & 0o170000 == 0o120000:
            raise ValueError("Duplicate/link in ZIP")
        seen.add(name.casefold())
        target = root.joinpath(*PurePosixPath(name).parts)
        if not target.resolve().is_relative_to(root):
            raise ValueError("ZIP escape")
        if member.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("xb") as dest:
                shutil.copyfileobj(source, dest)


VALIDATORS = {
    "backend-oci": validate_backend,
    "landing-next": validate_next,
    "android": validate_android,
    "ios": validate_ios,
}


def validate_record(record, root, context, family):
    required = {
        "schema_version",
        "artifact_family",
        "source_repository_identity",
        "source_commit_sha",
        "source_input_sha256",
        "build_identifier",
        "build_timestamp",
        "build_environment",
        "artifact_type",
        "artifact_relative_path",
        "artifact_size",
        "sha256",
        "dependency_lockfile_digest",
        "quality_receipt_identity",
        "build_exit_code",
        "validation_result",
        "payload_files",
        "source_file_digests",
        "source_deleted_paths",
    }
    if (
        not required <= record.keys()
        or type(record["schema_version"]) is not int
        or record["schema_version"] != 2
    ):
        raise ValueError("Incomplete producer schema")
    if type(record["build_exit_code"]) is not int or type(record["artifact_size"]) is not int:
        raise ValueError("Invalid numeric producer fields")
    if not re.fullmatch(r"[a-f0-9]{64}", record["dependency_lockfile_digest"]):
        raise ValueError("Invalid dependency identity")
    expected = {
        "artifact_family": family,
        "source_repository_identity": context["repository"],
        "source_commit_sha": context["source_sha"],
        "source_input_sha256": context["input_sha256"],
        "build_identifier": context["id"],
        "quality_receipt_identity": context["id"],
        "build_exit_code": 0,
        "validation_result": "PRODUCER_TEST_PASS",
    }
    if any(record.get(k) != v for k, v in expected.items()):
        raise ValueError("Producer identity/build mismatch")
    source_files = record["source_file_digests"]
    deleted = record["source_deleted_paths"]
    if not isinstance(source_files, dict) or not isinstance(deleted, list):
        raise ValueError("Invalid source snapshot")
    if len(set(deleted)) != len(deleted) or set(source_files) & set(deleted):
        raise ValueError("Conflicting source snapshot")
    source_hash = hashlib.sha256()
    for name in sorted(set(source_files) | set(deleted)):
        safe_member(name)
        source_hash.update(name.encode() + b"\0")
        if name in source_files:
            if not re.fullmatch(r"[a-f0-9]{64}", source_files[name]):
                raise ValueError("Invalid source file digest")
            source_hash.update(bytes.fromhex(source_files[name]))
        else:
            source_hash.update(b"deleted")
    if source_hash.hexdigest() != context["input_sha256"]:
        raise ValueError("Source file inventory does not match actual checkout digest")
    built = datetime.datetime.fromisoformat(record["build_timestamp"])
    started = datetime.datetime.fromisoformat(context["started_at"])
    if not started <= built <= datetime.datetime.now(datetime.UTC):
        raise ValueError("Stale/future producer")
    actual = fingerprint(root, record["artifact_relative_path"])
    if actual["sha256"] != record["sha256"] or actual["size"] != record["artifact_size"]:
        raise ValueError("Producer payload mismatch")
    rows = VALIDATORS[family](Path(root) / actual["path"], record)
    if rows != record["payload_files"]:
        raise ValueError("Payload file inventory mismatch")
    if fingerprint(root, record["artifact_relative_path"]) != actual:
        raise ValueError("Payload changed during format validation")


def seal_envelope(directory, receipt_path, context):
    manifest = read_json(Path(directory) / "release-artifacts.json")
    records = manifest["producer_records"]
    receipt = fingerprint(directory, Path(receipt_path).name)
    envelope = {
        "schema_version": 2,
        "quality_receipt_identity": context["id"],
        "quality_receipt_digest": receipt["sha256"],
        "families": {
            family: {**record, "quality_receipt_digest": receipt["sha256"]}
            for family, record in records.items()
        },
    }
    file = Path(directory) / "release-envelope.json"
    file.write_text(json.dumps(envelope, indent=2) + "\n")
    return {"release_envelope_sha256": fingerprint(directory, file.name)["sha256"]}


def verify_contract(manifest, root, context, directory, receipt_path, outputs, targets):
    records = manifest["producer_records"]
    if not isinstance(records, dict) or set(records) != set(targets):
        raise ValueError("Required platform producer absent")
    for family, record in records.items():
        if record["artifact_relative_path"] != targets[family]:
            raise ValueError("Producer path mismatch")
        validate_record(record, root, context, family)
    envelope_path = Path(directory) / "release-envelope.json"
    if fingerprint(directory, envelope_path.name)["sha256"] != outputs.get(
        "release_envelope_sha256"
    ):
        raise ValueError("Untrusted/missing release envelope")
    envelope = read_json(envelope_path)
    receipt_sha = fingerprint(directory, Path(receipt_path).name)["sha256"]
    if envelope != {
        "schema_version": 2,
        "quality_receipt_identity": context["id"],
        "quality_receipt_digest": receipt_sha,
        "families": {
            family: {**r, "quality_receipt_digest": receipt_sha} for family, r in records.items()
        },
    }:
        raise ValueError("Quality receipt/build envelope mismatch")
