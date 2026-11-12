"""Synthetic artifact tamper fixtures; never modify genuine scanner reports."""

import datetime
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from artifact_evidence import validate_artifacts
from evidence import STEPS


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.kind = "mobile"
        self.repo = "owner/mobile"
        self.sha = "a" * 40
        self.states = {}
        self.contexts = {}
        now = datetime.datetime.now(datetime.UTC)
        for i, mode in enumerate(["quality", "dependencies", "secrets"], 1):
            context = {
                "schema_version": 1,
                "id": str(i) * 32,
                "repository": self.repo,
                "source_sha": self.sha,
                "input_sha256": "b" * 64,
                "mode": mode,
                "kind": self.kind,
                "started_at": (now - datetime.timedelta(seconds=2)).isoformat(),
            }
            self.contexts[mode] = context
            folder = self.root / mode
            folder.mkdir()
            self.states[mode] = {
                "result": "success",
                "outputs": {
                    "evidence_status": "PASS",
                    "evidence_id": context["id"],
                    "evidence_repository": self.repo,
                    "evidence_source_sha": self.sha,
                    "evidence_mode": mode,
                    "evidence_completed_at": now.isoformat(),
                    "evidence_input_sha256": context["input_sha256"],
                    "evidence_manifest_sha256": "c" * 64,
                },
            }
        self.write("quality", "integrity.json", {})
        self.write("quality", "tests.json", {"tests": 1, "failures": 0, "errors": 0, "skipped": 0})
        (self.root / "quality/steps.jsonl").write_text(
            "\n".join(json.dumps({"gate": n, "exit_code": 0}) for n in STEPS[self.kind])
        )
        self.write(
            "dependencies",
            "dependency-gate.json",
            {"status": "PASS", "scanner_exit_code": 0, "findings": 0},
        )
        self.write(
            "dependencies",
            "dependency-audit.json",
            {
                "vulnerabilities": {},
                "metadata": {"vulnerabilities": {"total": 0}, "dependencies": {"total": 1}},
            },
        )
        self.write(
            "secrets",
            "secret-gate.json",
            {
                "status": "PASS",
                "raw_findings": 0,
                "false_positives": 0,
                "open_findings": 0,
                "scopes": [
                    {"scope": s, "status": "PASS", "scanner_exit_code": 0, "findings": 0}
                    for s in ["git", "dir"]
                ],
            },
        )
        self.write("secrets", "secret-scan.json", {"full_history": True, "findings": []})
        for mode in self.states:
            self.seal(mode)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, mode, name, data):
        meta = {
            **self.contexts[mode],
            "created_at": self.states[mode]["outputs"]["evidence_completed_at"],
        }
        (self.root / mode / name).write_text(json.dumps({**data, "_evidence": meta}))

    def seal(self, mode):
        folder = self.root / mode
        receipt = {
            "context": self.contexts[mode],
            "status": "PASS",
            "exit_code": 0,
            "completed_at": self.states[mode]["outputs"]["evidence_completed_at"],
            "reports": [
                {"path": f.name, "sha256": hashlib.sha256(f.read_bytes()).hexdigest()}
                for f in sorted(folder.iterdir())
                if f.name != "job-evidence.json"
            ],
        }
        (folder / "job-evidence.json").write_text(json.dumps(receipt))
        self.bind(mode)

    def bind(self, mode):
        self.states[mode]["outputs"]["evidence_manifest_sha256"] = hashlib.sha256(
            (self.root / mode / "job-evidence.json").read_bytes()
        ).hexdigest()

    def valid(self, actual_sha=None, digest=None):
        with (
            patch("artifact_evidence.detect_kind", return_value=self.kind),
            patch("artifact_evidence.identity", return_value=(self.repo, actual_sha or self.sha)),
            patch("artifact_evidence.input_digest", return_value=digest or "b" * 64),
        ):
            return validate_artifacts(self.states, self.root, self.repo, self.sha)

    def test_current_checkout_sha_mismatch_fails(self):
        self.assertEqual(self.valid(actual_sha="c" * 40), 1)

    def test_current_checkout_input_hash_mismatch_fails(self):
        self.assertEqual(self.valid(digest="c" * 64), 1)

    def test_complete_unchanged_artifacts_pass(self):
        self.assertEqual(self.valid(), 0)

    def test_missing_artifacts_fail(self):
        with patch("artifact_evidence.detect_kind", return_value=self.kind):
            self.assertEqual(
                validate_artifacts(self.states, self.root / "missing", self.repo, self.sha), 1
            )

    def test_report_changed_after_job_fails(self):
        self.write("dependencies", "dependency-audit.json", {"vulnerabilities": {"synthetic": {}}})
        self.assertEqual(self.valid(), 1)

    def test_receipt_changed_even_with_rehashed_report_fails(self):
        self.write("dependencies", "dependency-audit.json", {"vulnerabilities": {"synthetic": {}}})
        previous = self.states["dependencies"]["outputs"]["evidence_manifest_sha256"]
        self.seal("dependencies")
        self.states["dependencies"]["outputs"]["evidence_manifest_sha256"] = previous
        self.assertEqual(self.valid(), 1)

    def test_deleted_report_fails(self):
        (self.root / "quality/tests.json").unlink()
        self.assertEqual(self.valid(), 1)

    def test_resealed_missing_required_report_fails(self):
        (self.root / "quality/tests.json").unlink()
        self.seal("quality")
        self.assertEqual(self.valid(), 1)

    def test_duplicate_receipt_fails(self):
        (self.root / "duplicate").mkdir()
        (self.root / "duplicate/job-evidence.json").write_bytes(
            (self.root / "quality/job-evidence.json").read_bytes()
        )
        self.assertEqual(self.valid(), 1)

    def test_unsafe_report_path_fails(self):
        file = self.root / "quality/job-evidence.json"
        data = json.loads(file.read_text())
        data["reports"][0]["path"] = "../outside.json"
        file.write_text(json.dumps(data))
        self.bind("quality")
        self.assertEqual(self.valid(), 1)

    def test_symlink_report_fails(self):
        file = self.root / "quality/tests.json"
        outside = self.root / "outside.json"
        outside.write_bytes(file.read_bytes())
        file.unlink()
        file.symlink_to(outside)
        self.assertEqual(self.valid(), 1)

    def test_wrong_context_fails(self):
        self.contexts["dependencies"]["repository"] = "wrong/repo"
        self.seal("dependencies")
        self.assertEqual(self.valid(), 1)

    def test_stale_outputs_fail(self):
        self.states["quality"]["outputs"]["evidence_completed_at"] = (
            datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=2)
        ).isoformat()
        self.assertEqual(self.valid(), 1)

    def test_resealed_findings_cannot_be_hidden_by_pass_label(self):
        self.write(
            "dependencies",
            "dependency-audit.json",
            {
                "vulnerabilities": {"synthetic": {}},
                "metadata": {"vulnerabilities": {"total": 1}, "dependencies": {"total": 1}},
            },
        )
        self.seal("dependencies")
        self.assertEqual(self.valid(), 1)

    def test_empty_inventory_fails(self):
        self.write(
            "dependencies",
            "dependency-audit.json",
            {
                "vulnerabilities": {},
                "metadata": {"vulnerabilities": {"total": 0}, "dependencies": {"total": 0}},
            },
        )
        self.seal("dependencies")
        self.assertEqual(self.valid(), 1)

    def test_missing_quality_step_fails(self):
        (self.root / "quality/steps.jsonl").write_text("")
        self.seal("quality")
        self.assertEqual(self.valid(), 1)

    def test_skipped_tests_fail(self):
        self.write("quality", "tests.json", {"tests": 1, "failures": 0, "errors": 0, "skipped": 1})
        self.seal("quality")
        self.assertEqual(self.valid(), 1)

    def test_failed_prerequisite_fails(self):
        self.states["dependencies"]["result"] = "failure"
        self.assertEqual(self.valid(), 1)

    def adapt_kind(self, kind):
        self.kind = kind
        for mode, context in self.contexts.items():
            context["kind"] = kind
            for file in (self.root / mode).glob("*.json"):
                if file.name != "job-evidence.json":
                    data = json.loads(file.read_text())
                    data.pop("_evidence")
                    self.write(mode, file.name, data)
        (self.root / "quality/steps.jsonl").write_text(
            "\n".join(json.dumps({"gate": n, "exit_code": 0}) for n in STEPS[kind])
        )
        if kind == "backend":
            (self.root / "dependencies/dependency-audit.json").unlink()
            self.write(
                "dependencies",
                "dependency-gate.json",
                {
                    "status": "PASS",
                    "scopes": [
                        {
                            "scope": s,
                            "status": "PASS",
                            "scanner_exit_code": 0,
                            "findings": 0,
                            "installed_packages": 1,
                        }
                        for s in ["ci", "production"]
                    ],
                },
            )
            for scope in ["ci", "production"]:
                self.write(
                    "dependencies",
                    "dependency-" + scope + ".json",
                    {"dependencies": [{"name": "synthetic", "version": "1.0", "vulns": []}]},
                )
        for mode in self.states:
            self.seal(mode)

    def test_complete_landing_artifacts_pass(self):
        self.adapt_kind("landing")
        self.assertEqual(self.valid(), 0)

    def test_complete_backend_artifacts_pass(self):
        self.adapt_kind("backend")
        self.assertEqual(self.valid(), 0)

    def test_backend_missing_production_inventory_fails(self):
        self.adapt_kind("backend")
        (self.root / "dependencies/dependency-production.json").unlink()
        self.seal("dependencies")
        self.assertEqual(self.valid(), 1)


if __name__ == "__main__":
    unittest.main()
