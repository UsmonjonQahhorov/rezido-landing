"""Fail-closed payload binding, in addition to the existing CI-report validator.

Trusted prerequisite outputs must anchor the quality receipt and its payload manifest.
This checks bytes, not native signing, OCI provenance, secret custody or release approval.
Current workflows do not produce complete release payloads; they must therefore reject.
"""

import datetime
import hashlib
import json
import os
import re
import stat
from pathlib import Path, PurePosixPath

from artifact_evidence import validate_artifacts
from evidence import detect_kind

TARGETS = {
    "backend": {"backend-oci": "backend/production.oci.tar"},
    "landing": {"landing-next": "landing/next-release.tar"},
    "mobile": {"android": "mobile/android.apk", "ios": "mobile/ios.ipa"},
}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    if path.stat().st_size > 20_000_000:
        raise ValueError("Manifest too large")
    return json.loads(path.read_bytes(), object_pairs_hook=unique_object)


def safe_file(root, name):
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_./+-]+", name):
        raise ValueError("Invalid payload path")
    relative = PurePosixPath(name)
    if (
        relative.is_absolute()
        or str(relative) != name
        or any(p in {".", ".."} for p in relative.parts)
    ):
        raise ValueError("Noncanonical payload path")
    root = Path(root).absolute()
    target = root.joinpath(*relative.parts)
    for path in [target, *target.parents]:
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise ValueError("Link in payload path")
    if not target.resolve(strict=True).is_relative_to(root.resolve(strict=True)):
        raise ValueError("Payload escape")
    info = target.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_size <= 0 or info.st_nlink != 1:
        raise ValueError("Missing, empty, linked or special payload")
    return target


def fingerprint(root, name):
    target = safe_file(root, name)
    path_before = target.lstat()
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0)
    boundary = Path(root).absolute()
    parents = [target.parent]
    while parents[-1] != boundary:
        parents.append(parents[-1].parent)

    def directory_state():
        return [
            (p.stat().st_dev, p.stat().st_ino, p.stat().st_mtime_ns, p.stat().st_ctime_ns)
            for p in parents
        ]

    directory_before = directory_state()
    if os.open in os.supports_dir_fd:
        # Walk every directory by handle, never following a swapped parent symlink.
        directory = os.open(boundary.anchor, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            parts = target.parts[1:]
            for part in parts[:-1]:
                child = os.open(
                    part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory
                )
                os.close(directory)
                directory = child
            descriptor = os.open(parts[-1], flags, dir_fd=directory)
        finally:
            os.close(directory)
    else:
        descriptor = os.open(target, flags)
    with os.fdopen(descriptor, "rb") as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
            raise ValueError("Payload changed before open")
        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
        after = os.fstat(stream.fileno())
    current = safe_file(root, name).lstat()

    def state(info):
        return info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns

    # Windows fstat reports change-time while path lstat may report birth-time
    # in st_ctime. Compare each API's metadata clock with itself, and compare
    # descriptor/path by stable device/file identity, size and last-write time.
    if (
        state(before) != state(after)
        or state(path_before) != state(current)
        or state(after)[:4] != state(current)[:4]
        or directory_before != directory_state()
    ):
        raise ValueError("Payload changed during verification")
    return {"path": name, "size": after.st_size, "sha256": digest.hexdigest()}


def payload_manifest(root, targets, context):
    """Inventory actual files only; caller must supply a trusted build context.

    No PASS, job output, signing/provenance attestation or approval is manufactured.
    A trusted producer must call this after its real build and artifact scans.
    """
    return {
        "schema_version": 1,
        "build_id": context["id"],
        "repository": context["repository"],
        "source_sha": context["source_sha"],
        "input_sha256": context["input_sha256"],
        "artifacts": [
            {"target": key, **fingerprint(root, name)} for key, name in sorted(targets.items())
        ],
    }


def verify_payload(manifest, root, targets, context, completed_at):
    """Component integrity only; targets come from reviewed code, never manifest input."""
    if (
        type(manifest["schema_version"]) is not int
        or manifest["schema_version"] != 1
        or any(
            manifest[key] != context[key] for key in ["repository", "source_sha", "input_sha256"]
        )
        or manifest["build_id"] != context["id"]
    ):
        raise ValueError("Build/source identity mismatch")
    start = datetime.datetime.fromisoformat(context["started_at"])
    completed = datetime.datetime.fromisoformat(completed_at)
    now = datetime.datetime.now(datetime.UTC)
    if not start <= completed <= now or not 0 <= (now - completed).total_seconds() <= 3600:
        raise ValueError("Stale/future build evidence")
    entries = manifest["artifacts"]
    if not isinstance(entries, list) or len(entries) != len(targets) or not entries:
        raise ValueError("Incomplete target inventory")
    seen = set()
    for entry in entries:
        key = entry["target"]
        if key not in targets or key in seen or entry["path"] != targets[key]:
            raise ValueError("Unexpected target/path")
        seen.add(key)
        actual = fingerprint(root, targets[key])
        if (
            type(entry["size"]) is not int
            or entry["size"] != actual["size"]
            or entry["sha256"] != actual["sha256"]
        ):
            raise ValueError("Payload bytes do not match trusted manifest")
    # A partial inventory must not hide extra payloads/private material.
    actual_files = set()
    for path in Path(root).rglob("*"):
        if path.is_symlink() or getattr(path, "is_junction", lambda: False)():
            raise ValueError("Link in payload inventory")
        if not path.is_dir():
            name = path.relative_to(root).as_posix()
            safe_file(root, name)
            actual_files.add(name)
    if actual_files != set(targets.values()) or seen != set(targets):
        raise ValueError("Unmanifested/missing payload")


def validate_release_artifacts(states, root, repository, sha):
    if validate_artifacts(states, root, repository, sha):
        return 1
    try:
        root = Path(root)
        quality = None
        for file in root.rglob("job-evidence.json"):
            receipt = read_json(file)
            if receipt["context"]["mode"] == "quality":
                quality = (file, receipt)
        if quality is None:
            return 1
        file, receipt = quality
        # Existing validator anchors this report to the trusted job-output receipt hash.
        reports = [row for row in receipt["reports"] if row["path"] == "release-artifacts.json"]
        if len(reports) != 1:
            return 1
        manifest_path = safe_file(file.parent, "release-artifacts.json")
        if fingerprint(file.parent, "release-artifacts.json")["sha256"] != reports[0]["sha256"]:
            return 1
        manifest = read_json(manifest_path)
        verify_payload(
            manifest,
            root / "release-payloads",
            TARGETS[detect_kind()],
            receipt["context"],
            receipt["completed_at"],
        )
        from release_contract import verify_contract

        verify_contract(
            manifest,
            root / "release-payloads",
            receipt["context"],
            file.parent,
            file,
            states["quality"]["outputs"],
            TARGETS[detect_kind()],
        )
        return 0
    except (OSError, ValueError, TypeError, KeyError, AttributeError, RuntimeError):
        return 1
