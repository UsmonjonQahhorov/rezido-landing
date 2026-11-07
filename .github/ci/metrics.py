"""Count advisory records/aliases/packages independently; unresolved data never becomes PASS."""

from __future__ import annotations

import re


def alias_groups(records):
    parent = {}

    def find(value):
        parent.setdefault(value, value)
        if parent[value] != value:
            parent[value] = find(parent[value])
        return parent[value]

    for record in records:
        ids = record["ids"]
        for value in ids:
            root = find(value)
            parent[root] = find(ids[0])
    groups = {}
    for value in parent:
        groups.setdefault(find(value), set()).add(value)
    return [sorted(ids) for ids in groups.values()]


def pip_metrics(data):
    records = [{"ids": [v["id"], *v["aliases"]]} for d in data["dependencies"] for v in d["vulns"]]
    groups = alias_groups(records)
    return {
        "raw_advisory_records": len(records),
        "unique_advisories": len(groups),
        "unique_affected_packages": sum(bool(d["vulns"]) for d in data["dependencies"]),
        "package_count": len(data["dependencies"]),
        "findings": [
            {"advisory_ids": ids, "final_action": "NEEDS_MANUAL_REVIEW"} for ids in groups
        ],
    }


def npm_metrics(data):
    records = []
    paths = set()
    for item in data["vulnerabilities"].values():
        paths.update(item["nodes"])
        for via in item["via"]:
            if isinstance(via, dict):
                ghsa = re.search(r"GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}", via["url"])
                ids = ["npm:" + str(via["source"])]
                if ghsa:
                    ids.append(ghsa[0])
                records.append({"ids": ids})
    groups = alias_groups(records)
    if data["vulnerabilities"] and not groups:
        raise ValueError("Unclassified dependency findings")
    return {
        "raw_advisory_records": len(records),
        "unique_advisories": len(groups),
        "unique_affected_packages": len(data["vulnerabilities"]),
        "affected_installation_paths": len(paths),
        "package_count": data["metadata"]["dependencies"]["total"],
        "findings": [
            {"advisory_ids": ids, "final_action": "NEEDS_MANUAL_REVIEW"} for ids in groups
        ],
    }
