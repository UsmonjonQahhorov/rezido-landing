"""Offline negative checks for the CI controller; never alter application files/workflows."""

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class Gates(unittest.TestCase):
    def setUp(self):
        self.previous = Path.cwd()
        self.temp = tempfile.TemporaryDirectory()
        os.chdir(self.temp.name)
        spec = importlib.util.spec_from_file_location(
            "ci_under_test", Path(__file__).with_name("ci.py")
        )
        self.ci = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.ci)

    def tearDown(self):
        os.chdir(self.previous)
        self.temp.cleanup()

    def test_missing_lock_is_a_failure(self):
        self.assertEqual(self.ci.integrity("mobile"), 1)

    def test_test_failure_is_not_masked_and_build_failure_blocks_smoke(self):
        seen = []

        def command(name, argv, **_kwargs):
            seen.append(name)
            if name == "tests":
                report = next(
                    arg.split("=", 1)[1] for arg in argv if arg.startswith("--outputFile=")
                )
                Path(report).write_text("<testsuite><testcase><failure/></testcase></testsuite>")
            return (1 if name in ["tests", "production-build"] else 0), b""

        Path("package-lock.json").write_text("{}")
        self.ci.write(
            "integrity.json",
            {"lock": "package-lock.json", "sha256": self.ci.hashlib.sha256(b"{}").hexdigest()},
        )
        with (
            patch.object(self.ci, "integrity", return_value=0),
            patch.object(self.ci, "command", side_effect=command),
        ):
            self.assertEqual(self.ci.quality("landing"), 1)
        self.assertNotIn("route-api-smoke", seen)
        self.assertEqual(
            json.loads(Path("ci-results/route-smoke.json").read_text())["status"], "BLOCKED"
        )

    def test_security_scan_error_is_not_ignored(self):
        with (
            patch.object(self.ci, "integrity", return_value=0),
            patch.object(self.ci, "command", side_effect=[(0, b""), (1, b"invalid-json")]),
        ):
            self.assertEqual(self.ci.dependencies("landing"), 1)

    def test_cancelled_skipped_failed_prerequisites_never_pass(self):
        for result in ["failure", "cancelled", "skipped"]:
            with (
                self.subTest(result=result),
                patch.dict(
                    os.environ, {"NEEDS_RESULTS": json.dumps({"quality": {"result": result}})}
                ),
            ):
                self.assertEqual(self.ci.gate(), 1)
        with patch.dict(os.environ, {"NEEDS_RESULTS": '{"quality":{"result":"success"}}'}):
            self.assertEqual(self.ci.gate(), 1)

    def test_secret_artifacts_contain_metadata_only(self):
        value = "never-publish-this-value"
        result = self.ci.safe_findings(
            [
                {
                    "RuleID": "synthetic",
                    "File": "file.txt",
                    "Commit": "abc",
                    "Secret": value,
                    "Match": value,
                    "Message": value,
                }
            ],
            "git",
        )
        self.assertNotIn(value, json.dumps(result))
        self.assertEqual(set(result[0]), {"type", "file", "commit", "scope"})

    def test_junit_rejects_entities_and_never_publishes_raw_messages(self):
        path = Path("raw.xml")
        path.write_text("<!DOCTYPE testsuite><testsuite/>")
        with self.assertRaises(ValueError):
            self.ci.junit(path, "tests")
        path.write_text(
            "<testsuite><testcase><failure>never-publish</failure></testcase></testsuite>"
        )
        self.ci.junit(path, "tests")
        self.assertNotIn("never-publish", Path("ci-results/tests.json").read_text())


if __name__ == "__main__":
    unittest.main()
