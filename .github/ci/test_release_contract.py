"""Component/negative fixtures only. No fixture is real release-positive evidence."""

import datetime
import hashlib
import io
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from evidence import input_digest
from release_artifacts import fingerprint, payload_manifest, verify_payload
from release_contract import (
    safe_member,
    seal_envelope,
    tar_inventory,
    validate_android,
    validate_backend,
    validate_ios,
    validate_next,
    validate_record,
    verify_contract,
)
from release_producer import android, ios, produce


class ContractComponents(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.original = Path.cwd()

    def tearDown(self):
        os.chdir(self.original)
        self.temporary.cleanup()

    def test_archive_paths_reject_escape_and_controls(self):
        for name in ["../bad", "/bad", "bad/../x", "a\\bad", "C:/bad", ".", "bad\x00x", "a//b"]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                safe_member(name)

    def test_archive_missing_is_not_valid(self):
        with self.assertRaises(OSError):
            tar_inventory(self.root / "absent.tar")

    def test_empty_archive_rejects(self):
        path = self.root / "empty.tar"
        with tarfile.open(path, "w"):
            pass
        with self.assertRaises(ValueError):
            tar_inventory(path)

    def test_duplicate_and_symlink_archive_reject(self):
        for mode in ["duplicate", "symlink"]:
            path = self.root / (mode + ".tar")
            with tarfile.open(path, "w") as archive:
                info = tarfile.TarInfo("test-only")
                info.size = 1
                archive.addfile(info, io.BytesIO(b"x"))
                if mode == "symlink":
                    info = tarfile.TarInfo("link")
                    info.type = tarfile.SYMTYPE
                    info.linkname = "../outside"
                archive.addfile(info, io.BytesIO(b"x") if mode == "duplicate" else None)
            with self.assertRaises(ValueError):
                tar_inventory(path)

    def test_fake_image_and_next_packages_do_not_validate(self):
        path = self.root / "component-only.tar"
        with tarfile.open(path, "w") as archive:
            item = tarfile.TarInfo("unrelated.txt")
            item.size = 1
            archive.addfile(item, io.BytesIO(b"x"))
        for validator in [validate_backend, validate_next]:
            with self.assertRaises(ValueError):
                validator(path, {})

    def test_source_digest_includes_docker_and_eas_inputs(self):
        os.chdir(self.root)
        subprocess.run([shutil.which("git"), "init", "--quiet"], check=True)  # noqa: S603
        Path("package.json").write_text('{"name":"rezido-mobile"}')
        before = input_digest()
        Path("Dockerfile").write_text("# component input\n")
        docker = input_digest()
        self.assertNotEqual(before, docker)
        Path("eas.json").write_text("{}")
        self.assertNotEqual(docker, input_digest())

    def test_generated_evidence_does_not_rehash_source(self):
        os.chdir(self.root)
        subprocess.run([shutil.which("git"), "init", "--quiet"], check=True)  # noqa: S603
        Path("package.json").write_text("{}")
        before = input_digest()
        Path("ci-results").mkdir()
        Path("ci-results/test.json").write_text('{"unit_fixture":true}')
        self.assertEqual(before, input_digest())

    def test_native_debug_and_unsigned_records_reject(self):
        with self.assertRaises(ValueError):
            validate_android(self.root / "missing.apk", {"artifact_type": "debug-apk"})
        with self.assertRaises(ValueError):
            validate_ios(self.root / "missing.ipa", {"artifact_type": "unsigned-ipa"})

    def test_ios_producer_blocks_without_macos(self):
        with patch("release_producer.sys.platform", "win32"), self.assertRaises(ValueError):
            ios(self.root, {}, [])

    def test_android_producer_rejects_debug_signing_before_build(self):
        os.chdir(self.root)
        Path("android/app").mkdir(parents=True)
        Path("android/app/build.gradle").write_text(
            "release { signingConfig signingConfigs.debug }"
        )
        with patch("release_producer.installed_node_graph"), self.assertRaises(ValueError):
            android(self.root, {}, [])

    def test_missing_required_family_never_passes(self):
        with self.assertRaises(ValueError):
            verify_contract(
                {"producer_records": {}},
                self.root,
                {},
                self.root,
                self.root / "receipt.json",
                {},
                {"android": "mobile/android.apk"},
            )

    def test_incomplete_record_rejects(self):
        with self.assertRaises(ValueError):
            validate_record({}, self.root, {}, "backend-oci")

    def test_declared_sha_without_git_is_not_build_provenance(self):
        os.chdir(self.root)
        with (
            patch.dict(os.environ, {"CI_REPOSITORY": "unit/test", "CI_SOURCE_SHA": "a" * 40}),
            self.assertRaisesRegex(ValueError, "verified Git"),
        ):
            produce("backend-oci", self.root, {})

    def test_envelope_digest_is_acyclic_component_only(self):
        # This is explicitly a unit receipt fixture, not actual quality/release evidence.
        receipt = self.root / "job-evidence.json"
        receipt.write_text('{"unit_fixture":true,"status":"NOT_REAL_EVIDENCE"}')
        context = {"id": "unit-context"}
        (self.root / "release-artifacts.json").write_text(json.dumps({"producer_records": {}}))
        original = receipt.read_bytes()
        outputs = seal_envelope(self.root, receipt, context)
        envelope = json.loads((self.root / "release-envelope.json").read_text())
        self.assertEqual(receipt.read_bytes(), original)
        self.assertEqual(envelope["quality_receipt_digest"], hashlib.sha256(original).hexdigest())
        self.assertEqual(
            outputs["release_envelope_sha256"],
            fingerprint(self.root, "release-envelope.json")["sha256"],
        )

    def test_boolean_schema_version_rejects(self):
        import datetime

        file = self.root / "fixture.bin"
        file.write_bytes(b"component fixture, not application release")
        now = datetime.datetime.now(datetime.UTC)
        context = {
            "id": "unit",
            "repository": "unit/test",
            "source_sha": "a" * 40,
            "input_sha256": "b" * 64,
            "started_at": now.isoformat(),
        }
        targets = {"unit": "fixture.bin"}
        manifest = payload_manifest(self.root, targets, context)
        manifest["schema_version"] = True
        with self.assertRaises(ValueError):
            verify_payload(manifest, self.root, targets, context, now.isoformat())

    @unittest.skipUnless(os.name == "posix", "POSIX openat/no-follow regression")
    def test_parent_swap_race_is_rejected_before_escape(self):
        inside = self.root / "public"
        inside.mkdir()
        (inside / "payload.bin").write_bytes(b"component fixture")
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "payload.bin").write_bytes(b"outside fixture; not real private data")
        real_open = os.open
        triggered = []

        def swapped(path, flags, *args, **kwargs):
            if path == "public" and "dir_fd" in kwargs and not triggered:
                triggered.append(True)
                inside.rename(self.root / "original-public")
                inside.symlink_to(outside, target_is_directory=True)
            return real_open(path, flags, *args, **kwargs)

        # Preserve the supports_dir_fd membership check when replacing os.open.
        with (
            patch("release_artifacts.os.open", swapped),
            patch("release_artifacts.os.supports_dir_fd", {*os.supports_dir_fd, swapped}),
            self.assertRaises((ValueError, OSError)),
        ):
            fingerprint(self.root, "public/payload.bin")
        self.assertTrue(triggered)

    def test_distinct_stable_stat_and_fstat_clocks_component(self):
        file = self.root / "clock-fixture.bin"
        file.write_bytes(b"component fixture")
        real = os.fstat

        def metadata(fd):
            info = real(fd)
            names = [
                "st_mode",
                "st_nlink",
                "st_size",
                "st_dev",
                "st_ino",
                "st_mtime_ns",
                "st_ctime_ns",
            ]
            result = types.SimpleNamespace(**{name: getattr(info, name) for name in names})
            result.st_ctime_ns += 100
            return result

        with patch("release_artifacts.os.fstat", metadata):
            self.assertEqual(fingerprint(self.root, file.name)["size"], len(b"component fixture"))

    def test_handle_metadata_change_still_rejects(self):
        file = self.root / "changed-clock.bin"
        file.write_bytes(b"component fixture")
        real = os.fstat
        calls = []

        def metadata(fd):
            info = real(fd)
            names = [
                "st_mode",
                "st_nlink",
                "st_size",
                "st_dev",
                "st_ino",
                "st_mtime_ns",
                "st_ctime_ns",
            ]
            result = types.SimpleNamespace(**{name: getattr(info, name) for name in names})
            calls.append(1)
            result.st_ctime_ns += len(calls)
            return result

        with patch("release_artifacts.os.fstat", metadata), self.assertRaises(ValueError):
            fingerprint(self.root, file.name)

    def docker_component_fixture(self, all_empty=False):
        empty = io.BytesIO()
        with tarfile.open(fileobj=empty, mode="w"):
            pass
        source = b"component-only source fixture; never release-positive evidence"
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode="w") as tar:
            if not all_empty:
                item = tarfile.TarInfo("app/manage.py")
                item.size = len(source)
                tar.addfile(item, io.BytesIO(source))
        layers = [empty.getvalue(), data.getvalue()]
        config = {
            "os": "linux",
            "architecture": "amd64",
            "rootfs": {
                "type": "layers",
                "diff_ids": ["sha256:" + hashlib.sha256(x).hexdigest() for x in layers],
            },
            "config": {
                "Labels": {
                    "org.opencontainers.image.revision": "a" * 40,
                    "io.rezido.input-sha256": "b" * 64,
                    "io.rezido.build-id": "unit-component",
                }
            },
        }
        raw = json.dumps(config).encode()
        config_name = hashlib.sha256(raw).hexdigest() + ".json"
        members = {
            config_name: raw,
            "manifest.json": json.dumps(
                [{"Config": config_name, "Layers": ["one.tar", "two.tar"]}]
            ).encode(),
            "one.tar": layers[0],
            "two.tar": layers[1],
        }
        path = self.root / "docker-component-fixture.tar"
        with tarfile.open(path, "w") as tar:
            for name, content in members.items():
                item = tarfile.TarInfo(name)
                item.size = len(content)
                tar.addfile(item, io.BytesIO(content))
        record = {
            "artifact_type": "docker-image-archive",
            "source_commit_sha": "a" * 40,
            "source_input_sha256": "b" * 64,
            "build_identifier": "unit-component",
            "image_config_digest": "sha256:" + hashlib.sha256(raw).hexdigest(),
            "source_file_digests": {"manage.py": hashlib.sha256(source).hexdigest()},
        }
        return path, record

    def test_valid_empty_layer_inside_nonempty_image_component(self):
        path, record = self.docker_component_fixture()
        self.assertTrue(validate_backend(path, record))

    def test_all_empty_layers_do_not_make_application_image(self):
        path, record = self.docker_component_fixture(all_empty=True)
        with self.assertRaises(ValueError):
            validate_backend(path, record)

    def test_reported_image_identity_cannot_replace_actual_config_digest(self):
        path, record = self.docker_component_fixture()
        record["image_config_digest"] = "sha256:" + "0" * 64
        with self.assertRaises(ValueError):
            validate_backend(path, record)


class IOSProfileComponents(unittest.TestCase):
    """Public metadata fixtures; no native release-positive assertion."""

    def setUp(self):
        self.team = "TEAM000001"
        self.package = "test.component"
        self.profile = {
            "TeamIdentifier": [self.team],
            "ExpirationDate": datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1),
            "Entitlements": {
                "get-task-allow": False,
                "application-identifier": self.team + "." + self.package,
            },
        }
        self.entitlements = {
            "get-task-allow": False,
            "application-identifier": self.team + "." + self.package,
            "com.apple.developer.team-identifier": self.team,
        }
        self.details = (
            "TeamIdentifier=TEAM000001\nAuthority=Apple Distribution: Component Fixture\n"
        )

    def verify(self):
        from release_contract import validate_ios_profile_metadata

        validate_ios_profile_metadata(
            self.profile, self.entitlements, self.details, self.team, self.package
        )

    def test_public_distribution_metadata_component(self):
        self.verify()

    def test_profile_debugging_rejects(self):
        self.profile["Entitlements"]["get-task-allow"] = True
        with self.assertRaises(ValueError):
            self.verify()

    def test_other_team_profile_rejects(self):
        self.profile["TeamIdentifier"] = ["OTHER00001"]
        with self.assertRaises(ValueError):
            self.verify()

    def test_expired_profile_rejects(self):
        self.profile["ExpirationDate"] = datetime.datetime.now(datetime.UTC) - datetime.timedelta(
            days=1
        )
        with self.assertRaises(ValueError):
            self.verify()

    def test_adhoc_or_developer_signature_rejects(self):
        self.details = "TeamIdentifier=TEAM000001\nSignature=adhoc\n"
        with self.assertRaises(ValueError):
            self.verify()


if __name__ == "__main__":
    unittest.main()
