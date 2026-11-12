"""Validate all required job states and matching current evidence outputs."""

import json
import os

from release_artifacts import validate_release_artifacts

try:
    code = validate_release_artifacts(
        json.loads(os.environ["NEEDS_RESULTS"]),
        os.environ.get("CI_EVIDENCE_DIR", "ci-evidence"),
        os.environ.get("GITHUB_REPOSITORY") or os.environ.get("CI_REPOSITORY"),
        os.environ.get("GITHUB_SHA") or os.environ.get("CI_SOURCE_SHA"),
    )
except Exception as error:
    print("Final gate rejected incomplete evidence: " + type(error).__name__)
    code = 1
raise SystemExit(code)
