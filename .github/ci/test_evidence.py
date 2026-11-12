"""Freshness, identity, prerequisite and alias regressions; synthetic local evidence only."""

import datetime
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from evidence import RunEvidence, validate_final
from metrics import alias_groups, pip_metrics
from security import npm_report, pip_report


class EvidenceTests(unittest.TestCase):
    def test_receipt_preserves_paths_and_hashes_as_separate_fields(self):
        run = RunEvidence("dependencies", "mobile")
        for name in ["secret-gate.json", "secret-scan.json"]:
            (run.directory / name).write_text('{"synthetic": true}')
            run.record(name)
        _, receipt = run._receipt("FAIL", 1)
        self.assertEqual(
            [item["path"] for item in receipt["reports"]],
            ["secret-gate.json", "secret-scan.json"],
        )
        self.assertEqual(len(receipt["reports"]), 2)
        self.assertEqual(receipt["reports"][0]["sha256"], receipt["reports"][1]["sha256"])
        for item in receipt["reports"]:
            self.assertEqual(set(item), {"path", "sha256"})
            self.assertEqual(len(item["sha256"]), 64)

    def setUp(self):
        self.original = Path.cwd()
        self.temp = tempfile.TemporaryDirectory()
        os.chdir(self.temp.name)
        Path("package.json").write_text('{"name":"rezido-mobile"}')
        self.env = patch.dict(
            os.environ,
            {"CI_REPOSITORY": "owner/rezido-mobile", "CI_SOURCE_SHA": "a" * 40},
            clear=True,
        )
        self.env.start()

    def tearDown(self):
        self.env.stop()
        os.chdir(self.original)
        self.temp.cleanup()

    def success(self):
        return {
            mode: {
                "result": "success",
                "outputs": {
                    "evidence_status": "PASS",
                    "evidence_id": str(i) * 32,
                    "evidence_repository": "owner/rezido-mobile",
                    "evidence_source_sha": "a" * 40,
                    "evidence_mode": mode,
                    "evidence_completed_at": datetime.datetime.now(datetime.UTC).isoformat(),
                    "evidence_input_sha256": "b" * 64,
                    "evidence_manifest_sha256": "c" * 64,
                },
            }
            for i, mode in enumerate(["quality", "dependencies", "secrets"], 1)
        }

    def valid(self, states):
        return validate_final(states, "owner/rezido-mobile", "a" * 40)

    def test_complete_current_receipts_pass(self):
        self.assertEqual(self.valid(self.success()), 0)

    def test_missing_job_never_passes(self):
        for mode in ["quality", "dependencies", "secrets"]:
            states = self.success()
            states.pop(mode)
            self.assertEqual(self.valid(states), 1)

    def test_missing_evidence_and_unknown_status_fail(self):
        for value in [{}, None, {"evidence_status": "UNKNOWN"}]:
            states = self.success()
            states["dependencies"]["outputs"] = value
            self.assertEqual(self.valid(states), 1)

    def test_failed_skipped_cancelled_jobs_fail(self):
        for status in ["failure", "skipped", "cancelled", "unknown"]:
            states = self.success()
            states["secrets"]["result"] = status
            self.assertEqual(self.valid(states), 1)

    def test_stale_future_or_wrong_identity_fail(self):
        for field, value in [
            (
                "evidence_completed_at",
                (datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=2)).isoformat(),
            ),
            (
                "evidence_completed_at",
                (datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=2)).isoformat(),
            ),
            ("evidence_repository", "different/repo"),
            ("evidence_source_sha", "d" * 40),
            ("evidence_mode", "quality"),
        ]:
            states = self.success()
            states["dependencies"]["outputs"][field] = value
            self.assertEqual(self.valid(states), 1)

    def test_duplicate_receipt_and_different_input_fail(self):
        states = self.success()
        states["secrets"]["outputs"]["evidence_id"] = states["quality"]["outputs"]["evidence_id"]
        self.assertEqual(self.valid(states), 1)
        states = self.success()
        states["secrets"]["outputs"]["evidence_input_sha256"] = "d" * 64
        self.assertEqual(self.valid(states), 1)

    def test_missing_repository_identity_fails(self):
        os.environ.pop("CI_REPOSITORY")
        with self.assertRaises(ValueError):
            RunEvidence("quality", "mobile")

    def test_mismatched_repository_kind_fails(self):
        with self.assertRaises(ValueError):
            RunEvidence("quality", "landing")

    def test_old_root_report_is_not_current_evidence(self):
        Path("ci-results").mkdir()
        Path("ci-results/dependency-gate.json").write_text('{"status":"PASS"}')
        run = RunEvidence("dependencies", "mobile")
        with self.assertRaises(ValueError):
            run.finish(0)

    def test_report_with_wrong_nonce_fails(self):
        run = RunEvidence("dependencies", "mobile")
        data = run.stamp({"status": "PASS"})
        data["_evidence"]["id"] = "0" * 32
        (run.directory / "dependency-gate.json").write_text(json.dumps(data))
        run.record("dependency-gate.json")
        with self.assertRaises(ValueError):
            run.finish(0)

    def test_input_change_during_execution_fails(self):
        run = RunEvidence("dependencies", "mobile")
        Path("package.json").write_text('{"name":"rezido-mobile","version":"changed"}')
        with self.assertRaises(ValueError):
            run.finish(0)

    def test_new_run_uses_a_different_directory(self):
        first = RunEvidence("quality", "mobile")
        second = RunEvidence("quality", "mobile")
        self.assertNotEqual(first.directory, second.directory)

    def test_missing_or_empty_test_results_cannot_pass(self):
        run = RunEvidence("quality", "mobile")
        for name, data in [
            ("integrity.json", {}),
            ("tests.json", {"tests": 0, "failures": 0, "errors": 0, "skipped": 0}),
        ]:
            (run.directory / name).write_text(json.dumps(run.stamp(data)))
            run.record(name)
        with self.assertRaises(ValueError):
            run.finish(0)

    def test_alias_bridge_merges_components_not_package_names(self):
        groups = alias_groups(
            [
                {"ids": ["CVE-1", "GHSA-1"]},
                {"ids": ["PYSEC-1", "VENDOR-1"]},
                {"ids": ["GHSA-1", "PYSEC-1"]},
                {"ids": ["CVE-2"]},
            ]
        )
        self.assertEqual(len(groups), 2)
        self.assertIn(["CVE-1", "GHSA-1", "PYSEC-1", "VENDOR-1"], groups)

    def test_alias_counts_separate_records_packages_and_unique_advisories(self):
        data = {
            "dependencies": [
                {
                    "name": "demo",
                    "version": "1.0",
                    "vulns": [
                        {
                            "id": "CVE-1",
                            "aliases": ["GHSA-1"],
                            "fix_versions": [],
                            "description": "Synthetic issue",
                        },
                        {
                            "id": "GHSA-1",
                            "aliases": ["CVE-1"],
                            "fix_versions": [],
                            "description": "Same synthetic issue",
                        },
                    ],
                }
            ]
        }
        self.assertEqual(pip_report(data, {"demo": "1.0"}), 2)
        counts = pip_metrics(data)
        self.assertEqual(
            (
                counts["raw_advisory_records"],
                counts["unique_advisories"],
                counts["unique_affected_packages"],
            ),
            (2, 1, 1),
        )

    def test_incomplete_advisory_fields_are_rejected(self):
        for missing in ["aliases", "fix_versions", "description"]:
            finding = {
                "id": "SYNTHETIC-1",
                "aliases": [],
                "fix_versions": [],
                "description": "Synthetic issue",
            }
            finding.pop(missing)
            with self.assertRaises(ValueError):
                pip_report(
                    {"dependencies": [{"name": "demo", "version": "1.0", "vulns": [finding]}]},
                    {"demo": "1.0"},
                )

    def test_inconsistent_severity_counts_are_rejected(self):
        data = {
            "auditReportVersion": 2,
            "vulnerabilities": {},
            "metadata": {
                "dependencies": {"total": 1},
                "vulnerabilities": {
                    "total": 0,
                    "info": 0,
                    "low": 0,
                    "moderate": 0,
                    "high": 1,
                    "critical": 0,
                },
            },
        }
        with self.assertRaises(ValueError):
            npm_report(data, {"packages": {"": {}, "node_modules/demo": {"version": "1.0"}}})


if __name__ == "__main__":
    unittest.main()
