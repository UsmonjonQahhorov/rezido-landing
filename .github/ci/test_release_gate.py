"""Receipt-only fixtures must never approve a release. No fake app payloads."""

import unittest
from unittest.mock import patch

import test_artifact_evidence as receipt_fixtures
from release_artifacts import validate_release_artifacts


class ReleaseGateTests(unittest.TestCase):
    def setUp(self):
        self.fixture = receipt_fixtures.ArtifactTests()
        self.fixture.setUp()

    def tearDown(self):
        self.fixture.tearDown()

    def rejected(self):
        fixture = self.fixture
        with (
            patch("artifact_evidence.detect_kind", return_value=fixture.kind),
            patch("artifact_evidence.identity", return_value=(fixture.repo, fixture.sha)),
            patch("artifact_evidence.input_digest", return_value="b" * 64),
            patch("release_artifacts.detect_kind", return_value=fixture.kind),
        ):
            self.assertEqual(
                validate_release_artifacts(fixture.states, fixture.root, fixture.repo, fixture.sha),
                1,
            )

    def test_mobile_receipts_without_native_payloads_reject(self):
        self.rejected()

    def test_backend_receipts_without_oci_reject(self):
        self.fixture.adapt_kind("backend")
        self.rejected()

    def test_landing_receipts_without_next_payload_reject(self):
        self.fixture.adapt_kind("landing")
        self.rejected()

    def test_self_reported_manifest_without_payload_reject(self):
        self.fixture.write("quality", "release-artifacts.json", {"schema_version": 1})
        self.fixture.seal("quality")
        self.rejected()


if __name__ == "__main__":
    unittest.main()
