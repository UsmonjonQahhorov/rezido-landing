"""Verify downloaded artifacts against trusted prerequisite job outputs."""

import datetime
import hashlib
import json
from pathlib import Path

from evidence import STEPS, detect_kind, identity, input_digest, validate_final


def validate_artifacts(states, root, repository, sha):
    """Fail closed on missing, altered, duplicated or inconsistent local artifacts."""
    if validate_final(states, repository, sha):
        return 1
    try:
        root = Path(root)
        if not root.is_dir() or root.is_symlink():
            return 1
        if identity() != (repository, sha):
            return 1
        if input_digest() != states["quality"]["outputs"]["evidence_input_sha256"]:
            return 1
        root = root.resolve()
        kind = detect_kind()
        receipts = list(root.rglob("job-evidence.json"))
        if len(receipts) != 3:
            return 1
        seen = set()
        for file in receipts:
            if file.is_symlink() or any(p.is_symlink() for p in file.parents):
                return 1
            if not file.resolve().is_relative_to(root) or file.stat().st_size > 20_000_000:
                return 1
            raw = file.read_bytes()
            receipt = json.loads(raw)
            context = receipt["context"]
            mode = context["mode"]
            if mode in seen or mode not in states:
                return 1
            seen.add(mode)
            outputs = states[mode]["outputs"]
            if hashlib.sha256(raw).hexdigest() != outputs["evidence_manifest_sha256"]:
                return 1
            expected = {
                "schema_version": 1,
                "id": outputs["evidence_id"],
                "repository": repository,
                "source_sha": sha,
                "input_sha256": outputs["evidence_input_sha256"],
                "mode": mode,
                "kind": kind,
            }
            if any(context.get(k) != v for k, v in expected.items()):
                return 1
            if receipt["status"] != "PASS" or receipt["exit_code"] != 0:
                return 1
            if receipt["completed_at"] != outputs["evidence_completed_at"]:
                return 1
            start = datetime.datetime.fromisoformat(context["started_at"])
            end = datetime.datetime.fromisoformat(receipt["completed_at"])
            if start > end:
                return 1
            reports = {}
            for entry in receipt["reports"]:
                name = entry["path"]
                if not isinstance(name, str) or "/" in name or "\\" in name or name in {".", ".."}:
                    return 1
                if name in reports or name == "job-evidence.json":
                    return 1
                target = file.parent / name
                if (
                    target.is_symlink()
                    or not target.is_file()
                    or target.stat().st_size > 20_000_000
                ):
                    return 1
                content = target.read_bytes()
                if hashlib.sha256(content).hexdigest() != entry["sha256"]:
                    return 1
                if name == "steps.jsonl":
                    reports[name] = [json.loads(line) for line in content.splitlines()]
                    continue
                data = json.loads(content)
                meta = data["_evidence"]
                if any(meta.get(k) != v for k, v in context.items()):
                    return 1
                created = datetime.datetime.fromisoformat(meta["created_at"])
                if not start <= created <= end:
                    return 1
                reports[name] = data
            if mode == "quality":
                tests = reports["tests.json"]
                reports["integrity.json"]
                steps = reports["steps.jsonl"]
                if tests["tests"] <= 0 or any(tests[k] for k in ["failures", "errors", "skipped"]):
                    return 1
                if len(steps) != len(STEPS[kind]) or {s["gate"] for s in steps} != STEPS[kind]:
                    return 1
                if any(s["exit_code"] != 0 for s in steps):
                    return 1
            elif mode == "dependencies":
                gate = reports["dependency-gate.json"]
                if gate["status"] != "PASS":
                    return 1
                if kind == "backend":
                    scopes = gate["scopes"]
                    if len(scopes) != 2 or {s["scope"] for s in scopes} != {
                        "ci",
                        "production",
                    }:
                        return 1
                    for scope in scopes:
                        deps = reports["dependency-" + scope["scope"] + ".json"]["dependencies"]
                        if not deps or len(deps) != scope["installed_packages"]:
                            return 1
                        if (
                            scope["status"] != "PASS"
                            or scope["scanner_exit_code"] != 0
                            or scope["findings"] != 0
                        ):
                            return 1
                        if any(d["vulns"] for d in deps):
                            return 1
                else:
                    audit = reports["dependency-audit.json"]
                    if gate["scanner_exit_code"] != 0 or gate["findings"] != 0:
                        return 1
                    if (
                        audit["vulnerabilities"]
                        or audit["metadata"]["vulnerabilities"]["total"] != 0
                    ):
                        return 1
                    if audit["metadata"]["dependencies"]["total"] <= 0:
                        return 1
            else:
                gate = reports["secret-gate.json"]
                scan = reports["secret-scan.json"]
                scopes = gate["scopes"]
                if gate["status"] != "PASS" or scan["full_history"] is not True:
                    return 1
                if len(scopes) != 2 or {s["scope"] for s in scopes} != {"git", "dir"}:
                    return 1
                if any(
                    s["status"] not in {"PASS", "FINDINGS"} or s["scanner_exit_code"] not in (0, 1)
                    for s in scopes
                ):
                    return 1
                if gate["raw_findings"] != len(scan["findings"]) or gate["raw_findings"] != sum(
                    s["findings"] for s in scopes
                ):
                    return 1
                if gate["open_findings"] != 0 or gate["false_positives"] != gate["raw_findings"]:
                    return 1
                if any(f["decision"] != "FALSE_POSITIVE" for f in scan["findings"]):
                    return 1
        return int(seen != {"quality", "dependencies", "secrets"})
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        return 1
