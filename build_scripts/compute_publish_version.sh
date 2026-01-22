#!/usr/bin/env bash

#  Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

#
# Computes the npm package version and dist-tag for publishing @cognizant-ai-lab/ui-common.
#
# Usage: compute_publish_version.sh <event_name> <sha> <run_number> <package_json_path> [release_tag] [dist_tag_input]
#
# Arguments:
#   event_name:       The GitHub event name (push, release, workflow_dispatch)
#   sha:              The full Git SHA
#   run_number:       The GitHub Actions run number
#   package_json_path: Path to the package.json file to read base version from
#   release_tag:      (Optional) The release tag name (required if event_name is "release")
#   dist_tag_input:   (Optional) User-selected dist-tag for workflow_dispatch
#
# Output: Sets GitHub Actions output variables:
#   - version:   The computed npm package version
#   - dist_tag:  The npm dist-tag to use
#   - sha:       The full Git SHA (passed through)
#   - short_sha: The short (7-char) Git SHA
#
# Version formats by trigger:
#   - push to main:      <base>-main.<short_sha>.<run_number>  with dist-tag "main"
#   - release:           <release_tag> (without v prefix)      with dist-tag "latest"
#   - workflow_dispatch: <base>-pr.<short_sha>.<run_number>    with dist-tag from input
#

set -o errtrace
set -o nounset
set -o pipefail

# Parse arguments
EVENT_NAME="${1:-}"
SHA="${2:-}"
RUN_NUMBER="${3:-}"
PACKAGE_JSON_PATH="${4:-}"
RELEASE_TAG="${5:-}"
DIST_TAG_INPUT="${6:-prerelease}"

# Validate required arguments
if [[ -z "$EVENT_NAME" || -z "$SHA" || -z "$RUN_NUMBER" || -z "$PACKAGE_JSON_PATH" ]]; then
    echo "Error: event_name, sha, run_number, and package_json_path are required" >&2
    echo "Usage: $0 <event_name> <sha> <run_number> <package_json_path> [release_tag] [dist_tag_input]" >&2
    exit 1
fi

# Validate package.json exists
if [[ ! -f "$PACKAGE_JSON_PATH" ]]; then
    echo "Error: package.json not found at $PACKAGE_JSON_PATH" >&2
    exit 1
fi

# Compute short SHA (first 7 characters)
SHORT_SHA="${SHA:0:7}"

# Read base version from package.json and strip any prerelease suffix
BASE_VERSION=$(node --eval "console.log(require('./$PACKAGE_JSON_PATH').version)")
BASE_VERSION="${BASE_VERSION%%-*}"

# Compute version and dist-tag based on event type
if [[ "$EVENT_NAME" == "push" ]]; then
    # Push to main: snapshot version with "main" dist-tag
    VERSION="${BASE_VERSION}-main.${SHORT_SHA}.${RUN_NUMBER}"
    DIST_TAG="main"
    echo "Publishing merge snapshot: $VERSION with dist-tag: $DIST_TAG"

elif [[ "$EVENT_NAME" == "release" ]]; then
    # Release: use release tag for version, "latest" dist-tag
    if [[ -z "$RELEASE_TAG" ]]; then
        echo "Error: release_tag is required for release events" >&2
        exit 1
    fi
    # Strip 'v' prefix if present
    VERSION="${RELEASE_TAG#v}"
    DIST_TAG="latest"
    echo "Publishing release version: $VERSION with dist-tag: $DIST_TAG"

else
    # Manual workflow_dispatch: prerelease version with user-selected dist-tag
    VERSION="${BASE_VERSION}-pr.${SHORT_SHA}.${RUN_NUMBER}"
    DIST_TAG="$DIST_TAG_INPUT"
    echo "Publishing manual version: $VERSION with dist-tag: $DIST_TAG"
fi

# Output results for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
        echo "version=$VERSION"
        echo "dist_tag=$DIST_TAG"
        echo "sha=$SHA"
        echo "short_sha=$SHORT_SHA"
    } >> "$GITHUB_OUTPUT"
fi

# Also print summary to stdout for debugging
echo "Version: $VERSION"
echo "Dist-tag: $DIST_TAG"
echo "SHA: $SHA"
echo "Short SHA: $SHORT_SHA"
