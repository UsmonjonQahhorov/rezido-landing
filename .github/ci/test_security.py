"""Security controller regressions; synthetic metadata only, no credentials/providers."""

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from security import (
    exception_schema,
    false_positive,
    npm_report,
    pip_report,
    scan_status,
    secret_report,
)


class SecurityGates(unittest.TestCase):
    def setUp(self):
        self.old = Path.cwd()
        self.temp = tempfile.TemporaryDirectory()
        os.chdir(self.temp.name)
        spec = importlib.util.spec_from_file_location(
            "security_ci_under_test", Path(__file__).with_name("ci.py")
        )
        self.ci = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.ci)

    def tearDown(self):
        os.chdir(self.old)
        self.temp.cleanup()

    def entry(self):
        Path("probe.txt").write_text("synthetic context\n")
        return {
            "fingerprint": "probe.txt:generic-api-key:1",
            "rule": "generic-api-key",
            "file": "probe.txt",
            "commit": "",
            "scope": "dir",
            "start_line": 1,
            "end_line": 1,
            "context_sha256": hashlib.sha256(b"synthetic context").hexdigest(),
            "classification": "TEST_FIXTURE",
            "reason": "Synthetic fixture in this isolated regression test.",
            "reviewed_on": "2026-11-02",
        }

    def test_missing_scanner_binary_fails(self):
        code, _ = self.ci.command("missing-scanner", [str(Path.cwd() / "does-not-exist")])
        self.assertNotEqual(code, 0)
        self.assertEqual(scan_status(code, 0), "SCANNER_ERROR")

    def test_scanner_runtime_failure_fails(self):
        code, _ = self.ci.command("broken-scanner", [sys.executable, "-c", "raise SystemExit(2)"])
        self.assertEqual(scan_status(code, 0), "SCANNER_ERROR")
        self.assertEqual(scan_status(1, 0), "SCANNER_ERROR")

    def test_dependency_finding_blocks_and_clean_complete_inventory_passes(self):
        report = {
            "dependencies": [
                {
                    "name": "demo",
                    "version": "1.0",
                    "vulns": [
                        {
                            "id": "SYNTHETIC-1",
                            "aliases": [],
                            "fix_versions": [],
                            "description": "Synthetic advisory",
                        }
                    ],
                }
            ]
        }
        count = pip_report(report, {"demo": "1.0"})
        self.assertEqual(scan_status(1, count), "FINDINGS")
        self.assertEqual(scan_status(0, count), "FINDINGS")
        report["dependencies"][0]["vulns"] = []
        self.assertEqual(scan_status(0, pip_report(report, {"demo": "1.0"})), "PASS")

    def test_empty_partial_and_skipped_pip_inventory_never_pass(self):
        for report in [
            {},
            {"dependencies": []},
            {"dependencies": [{"name": "demo", "version": "2.0", "vulns": []}]},
            {
                "dependencies": [
                    {"name": "demo", "version": "1.0", "skip_reason": "unavailable", "vulns": []}
                ]
            },
        ]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                pip_report(report, {"demo": "1.0"})

    def test_incomplete_npm_report_never_passes(self):
        for report in [
            {},
            {"vulnerabilities": {}},
            {
                "auditReportVersion": 2,
                "vulnerabilities": {},
                "metadata": {
                    "dependencies": {"total": 0},
                    "vulnerabilities": {
                        "total": 0,
                        "info": 0,
                        "low": 0,
                        "moderate": 0,
                        "high": 0,
                        "critical": 0,
                    },
                },
            },
        ]:
            with self.subTest(report=report), self.assertRaises(ValueError):
                npm_report(report, {"packages": {"": {}}})
        clean = {
            "auditReportVersion": 2,
            "vulnerabilities": {},
            "metadata": {
                "dependencies": {"total": 1},
                "vulnerabilities": {
                    "total": 0,
                    "info": 0,
                    "low": 0,
                    "moderate": 0,
                    "high": 0,
                    "critical": 0,
                },
            },
        }
        lock = {"packages": {"": {}, "node_modules/demo": {"version": "1.0"}}}
        self.assertEqual(npm_report(clean, lock), 0)
        for group, value in [("dependencies", True), ("vulnerabilities", False)]:
            malformed = json.loads(json.dumps(clean))
            malformed["metadata"][group]["total"] = value
            with self.assertRaises(ValueError):
                npm_report(malformed, lock)
        lock["packages"]["node_modules/missing"] = {"version": "1.0"}
        with self.assertRaises(ValueError):
            npm_report(clean, lock)

    def test_secret_finding_remains_open_without_exact_review(self):
        row = self.entry()
        self.assertFalse(false_positive(row, [], git="git", env={}))
        self.assertEqual(scan_status(1, 1), "FINDINGS")

    def test_proven_false_positive_is_exact_and_context_bound(self):
        entry = self.entry()
        entries = exception_schema({"schema_version": 1, "entries": [entry]})
        self.assertTrue(false_positive(entry, entries, git="git", env={}))
        neighbor = {
            **entry,
            "fingerprint": "probe.txt:generic-api-key:2",
            "start_line": 2,
            "end_line": 2,
        }
        self.assertFalse(false_positive(neighbor, entries, git="git", env={}))
        Path("probe.txt").write_text("changed candidate on the same line\n")
        self.assertFalse(false_positive(entry, entries, git="git", env={}))

    def test_invalid_exception_schema_and_wildcards_fail(self):
        entry = self.entry()
        for payload in [
            {},
            {"schema_version": 2, "entries": []},
            {"schema_version": True, "entries": []},
            {"schema_version": 1, "entries": [{**entry, "file": "tests/*"}]},
            {"schema_version": 1, "entries": [{**entry, "classification": "INCONCLUSIVE"}]},
            {"schema_version": 1, "entries": [{**entry, "context_sha256": "bad"}]},
        ]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                exception_schema(payload)

    def test_artifact_creation_failure_is_nonzero(self):
        Path("ci-results").rmdir()
        Path("ci-results").write_text("artifact directory unavailable")
        result = subprocess.run(  # noqa: S603 - fixed helper and synthetic local cwd.
            [
                sys.executable,
                str(Path(__file__).with_name("ci.py")),
                "dependencies",
                "--kind",
                "mobile",
            ],
            capture_output=True,
        )
        self.assertNotEqual(result.returncode, 0)

    def test_corrupt_or_missing_lockfile_is_a_failure(self):
        self.assertEqual(self.ci.integrity("mobile"), 1)
        Path("package-lock.json").write_text("not JSON")
        Path("package.json").write_text("{}")
        self.assertEqual(self.ci.integrity("mobile"), 1)

    def test_final_gate_rejects_security_failure(self):
        for result in ["failure", "cancelled", "skipped"]:
            states = {
                "quality": {"result": "success"},
                "dependencies": {"result": result},
                "secrets": {"result": "success"},
            }
            with patch.dict(os.environ, {"NEEDS_RESULTS": json.dumps(states)}):
                self.assertEqual(self.ci.gate(), 1)

    def test_malformed_secret_report_and_unreviewed_config_fail(self):
        with self.assertRaises(ValueError):
            secret_report({}, "dir")
        Path(".gitleaksignore").write_text("unreviewed")
        with self.assertRaises(ValueError):
            self.ci.secrets()


if __name__ == "__main__":
    unittest.main()
