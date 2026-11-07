"""Fail-closed scanner validation and exact, context-bound secret false positives."""

from __future__ import annotations

import datetime
import hashlib
import re
import subprocess
from pathlib import Path, PurePosixPath


def canonical(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def scan_status(code, findings):
    if code not in (0, 1) or (code == 1 and findings == 0):
        return "SCANNER_ERROR"
    return "FINDINGS" if findings else "PASS"


def npm_report(data, lock):
    if not isinstance(data, dict) or data.get("auditReportVersion") != 2 or data.get("error"):
        raise ValueError("Invalid npm audit report")
    vulns = data.get("vulnerabilities")
    meta = data.get("metadata", {})
    packages = lock.get("packages", {})
    if (
        not isinstance(vulns, dict)
        or not packages
        or type(meta.get("dependencies", {}).get("total")) is not int
        or meta["dependencies"]["total"] <= 0
        or meta["dependencies"]["total"] != len(packages) - 1
        or type(meta.get("vulnerabilities", {}).get("total")) is not int
        or meta.get("vulnerabilities", {}).get("total") != len(vulns)
    ):
        raise ValueError("Incomplete npm audit report")
    severities = {"info", "low", "moderate", "high", "critical"}
    counts = meta["vulnerabilities"]
    if any(type(counts.get(level)) is not int or counts[level] < 0 for level in severities):
        raise ValueError("Missing severity count metadata")
    if any(
        counts[level] != sum(v.get("severity") == level for v in vulns.values())
        for level in severities
    ):
        raise ValueError("Inconsistent severity counts")
    for name, item in vulns.items():
        if (
            item.get("name") != name
            or item.get("severity") not in {"info", "low", "moderate", "high", "critical"}
            or not isinstance(item.get("via"), list)
            or not item["via"]
            or not isinstance(item.get("nodes"), list)
            or not item["nodes"]
            or any(node not in packages for node in item["nodes"])
        ):
            raise ValueError("Incomplete npm finding")
        for via in item["via"]:
            if isinstance(via, str):
                if via not in vulns:
                    raise ValueError("Dangling vulnerable dependency reference")
            elif isinstance(via, dict):
                if (
                    any(
                        not isinstance(via.get(field), str) or not via[field]
                        for field in ["name", "title", "url", "range"]
                    )
                    or via.get("severity") not in severities
                    or type(via.get("source")) is not int
                    or via["source"] <= 0
                ):
                    raise ValueError("Incomplete npm advisory")
            else:
                raise ValueError("Unknown npm advisory schema")
    return len(vulns)


def pip_report(data, expected):
    if not isinstance(data, dict) or not isinstance(data.get("dependencies"), list) or not expected:
        raise ValueError("Incomplete pip-audit report")
    observed = {}
    count = 0
    for dep in data["dependencies"]:
        if (
            not isinstance(dep, dict)
            or not isinstance(dep.get("name"), str)
            or not isinstance(dep.get("version"), str)
            or not isinstance(dep.get("vulns"), list)
            or dep.get("skip_reason")
        ):
            raise ValueError("Skipped/malformed installed package")
        name = canonical(dep["name"])
        if name in observed:
            raise ValueError("Duplicate package inventory")
        observed[name] = dep["version"]
        for vuln in dep["vulns"]:
            if not isinstance(vuln.get("id"), str) or not vuln["id"]:
                raise ValueError("Invalid advisory")
            if (
                any(
                    not isinstance(vuln.get(field), list)
                    or any(not isinstance(value, str) or not value for value in vuln[field])
                    for field in ["aliases", "fix_versions"]
                )
                or not isinstance(vuln.get("description"), str)
                or not vuln["description"]
            ):
                raise ValueError("Incomplete pip advisory")
        count += len(dep["vulns"])
    if observed != expected:
        raise ValueError("Scanner inventory differs from installed packages")
    return count


def exception_schema(data):
    if (
        not isinstance(data, dict)
        or set(data) != {"schema_version", "entries"}
        or type(data["schema_version"]) is not int
        or data["schema_version"] != 1
        or not isinstance(data["entries"], list)
    ):
        raise ValueError("Invalid false-positive schema")
    required = {
        "fingerprint",
        "context_sha256",
        "rule",
        "file",
        "scope",
        "commit",
        "start_line",
        "end_line",
        "classification",
        "reason",
        "reviewed_on",
    }
    seen = set()
    for entry in data["entries"]:
        if (
            not isinstance(entry, dict)
            or set(entry) != required
            or any(not isinstance(entry[k], str) for k in required - {"start_line", "end_line"})
        ):
            raise ValueError("Invalid false-positive entry")
        if entry["classification"] not in {
            "TEST_FIXTURE",
            "TEMPLATE_PLACEHOLDER",
            "DOCUMENTATION_EXAMPLE",
            "PUBLIC_IDENTIFIER",
            "HIGH_ENTROPY_FALSE_POSITIVE",
        }:
            raise ValueError("Unreviewed classification cannot be excluded")
        if (
            entry["scope"] not in {"git", "dir"}
            or not re.fullmatch(r"[a-f0-9]{64}", entry["context_sha256"])
            or not entry["reason"].strip()
        ):
            raise ValueError("False-positive context missing")
        datetime.date.fromisoformat(entry["reviewed_on"])
        validate_location(entry)
        identity = (entry["scope"], entry["fingerprint"])
        if identity in seen:
            raise ValueError("Duplicate false-positive entry")
        seen.add(identity)
    return data["entries"]


def validate_location(item):
    path = PurePosixPath(item["file"])
    if path.is_absolute() or ".." in path.parts or "\\" in item["file"] or not path.parts:
        raise ValueError("Unsafe finding path")
    if any(c in item["file"] or c in item.get("fingerprint", "") for c in "*?[]"):
        raise ValueError("Wildcard false-positive locations are forbidden")
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", item["rule"]):
        raise ValueError("Invalid detector")
    if item["scope"] == "git" and not re.fullmatch(r"[a-f0-9]{40}", item["commit"]):
        raise ValueError("Invalid historical commit")
    if item["scope"] == "dir" and item["commit"]:
        raise ValueError("Directory finding has commit")
    if (
        type(item["start_line"]) is not int
        or type(item["end_line"]) is not int
        or not 0 < item["start_line"] <= item["end_line"]
    ):
        raise ValueError("Invalid finding lines")


def secret_report(data, scope):
    if not isinstance(data, list):
        raise ValueError("Secret report must be an array")
    rows = []
    for finding in data:
        if not isinstance(finding, dict):
            raise ValueError("Invalid secret finding")
        row = {
            "rule": finding["RuleID"],
            "file": finding["File"],
            "commit": finding.get("Commit", ""),
            "scope": scope,
            "start_line": finding["StartLine"],
            "end_line": finding["EndLine"],
            "fingerprint": finding["Fingerprint"],
        }
        validate_location(row)
        if not isinstance(row["fingerprint"], str) or not row["fingerprint"]:
            raise ValueError("Missing fingerprint")
        rows.append(row)
    return rows


def false_positive(row, entries, *, git, env):
    matches = [
        e
        for e in entries
        if all(
            e[k] == row[k]
            for k in ["fingerprint", "rule", "file", "commit", "scope", "start_line", "end_line"]
        )
    ]
    if not matches:
        return False
    if row["scope"] == "git":
        result = subprocess.run(  # noqa: S603 - verified git, immutable commit, validated relative path.
            [git, "show", row["commit"] + ":" + row["file"]],
            env=env,
            capture_output=True,
            check=True,
        )
        raw = result.stdout
    else:
        file = Path(row["file"]).resolve()
        if not file.is_relative_to(Path.cwd().resolve()):
            raise ValueError("Finding symlink escapes checkout")
        raw = file.read_bytes()
    if len(raw) > 20_000_000:
        raise ValueError("Oversized context")
    lines = raw.decode().splitlines()
    if row["end_line"] > len(lines):
        raise ValueError("Finding outside source")
    context = "\n".join(lines[row["start_line"] - 1 : row["end_line"]])
    return hashlib.sha256(context.encode()).hexdigest() == matches[0]["context_sha256"]
