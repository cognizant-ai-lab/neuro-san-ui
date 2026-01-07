#!/bin/bash
#    Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.
#
#    Licensed under the Apache License, Version 2.0 (the "License");
#    you may not use this file except in compliance with the License.
#    You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS,
#    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#    See the License for the specific language governing permissions and
#    limitations under the License.

# ================================================================================
# Cull NPM Packages Script
# ================================================================================
# Purpose: Clean up old non-release npm packages to prevent package proliferation.
#
# Usage: ./cull_npm_packages.sh <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>
#
# Arguments:
#   package_name      - Name of the npm package (e.g., "ui-common")
#   package_owner     - GitHub org/user that owns the package (e.g., "cognizant-ai-lab")
#   cutoff_date       - ISO 8601 date; packages older than this are candidates for deletion
#   dry_run           - "true" or "false"; if true, no packages are actually deleted
#   min_keep_versions - Always keep at least this many most recent non-release versions
#
# Environment:
#   GH_TOKEN - GitHub token with packages:write permission (required)
#
# Retention Policy:
# - Release packages (version format: x.y.z) are NEVER deleted
# - Non-release packages (version format: x.y.z-main.sha.run or x.y.z-pr.sha.run):
#   - The most recent N packages are ALWAYS kept (regardless of age)
#   - Packages older than cutoff_date (beyond the most recent N) are deleted
# ================================================================================

set -euo pipefail

# Parse arguments
PACKAGE_NAME="${1:?Usage: $0 <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>}"
PACKAGE_OWNER="${2:?Usage: $0 <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>}"
CUTOFF_DATE="${3:?Usage: $0 <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>}"
DRY_RUN="${4:?Usage: $0 <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>}"
MIN_KEEP_VERSIONS="${5:?Usage: $0 <package_name> <package_owner> <cutoff_date> <dry_run> <min_keep_versions>}"

echo "Fetching package versions for @${PACKAGE_OWNER}/${PACKAGE_NAME}..."
echo "Retention policy: Keep last $MIN_KEEP_VERSIONS non-release versions, delete others older than $CUTOFF_DATE"

# Create temporary files for storing versions
RELEASE_FILE=$(mktemp)
NON_RELEASE_FILE=$(mktemp)
trap 'rm --force "$RELEASE_FILE" "$NON_RELEASE_FILE"' EXIT

# Fetch all package versions (paginated) and categorize them
PAGE=1
PER_PAGE=100

while true; do
    RESPONSE=$(gh api \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "/orgs/${PACKAGE_OWNER}/packages/npm/${PACKAGE_NAME}/versions?per_page=${PER_PAGE}&page=${PAGE}" \
        2>/dev/null || echo "[]")

    if [ "$RESPONSE" = "[]" ] || [ -z "$RESPONSE" ]; then
        break
    fi

    # Categorize each version as release or non-release
    echo "$RESPONSE" | jq -c '.[]' | while read -r VERSION_JSON; do
        VERSION_ID=$(echo "$VERSION_JSON" | jq -r '.id')
        VERSION_NAME=$(echo "$VERSION_JSON" | jq -r '.name')
        CREATED_AT=$(echo "$VERSION_JSON" | jq -r '.created_at')

        # Check if this is a release version (format: x.y.z without any suffix)
        if echo "$VERSION_NAME" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
            echo "$VERSION_ID|$VERSION_NAME|$CREATED_AT" >> "$RELEASE_FILE"
        else
            echo "$VERSION_ID|$VERSION_NAME|$CREATED_AT" >> "$NON_RELEASE_FILE"
        fi
    done

    # Check if there are more pages
    VERSION_COUNT=$(echo "$RESPONSE" | jq 'length')
    if [ "$VERSION_COUNT" -lt "$PER_PAGE" ]; then
        break
    fi
    PAGE=$((PAGE + 1))
done

# Initialize counters
TOTAL_VERSIONS=0
RELEASE_VERSIONS=0
KEPT_VERSIONS=0
DELETED_VERSIONS=0
WOULD_DELETE_VERSIONS=0

# Process release versions (always keep)
echo ""
echo "=== Release Versions (always kept) ==="
if [ -s "$RELEASE_FILE" ]; then
    RELEASE_VERSIONS=$(wc -l < "$RELEASE_FILE" | tr -d ' ')
    TOTAL_VERSIONS=$((TOTAL_VERSIONS + RELEASE_VERSIONS))
    while IFS='|' read -r VERSION_ID VERSION_NAME CREATED_AT; do
        echo "KEEP (release): $VERSION_NAME (created: $CREATED_AT)"
    done < "$RELEASE_FILE"
else
    echo "No release versions found"
fi

# Process non-release versions
echo ""
echo "=== Non-Release Versions ==="
if [ -s "$NON_RELEASE_FILE" ]; then
    # Sort by creation date (newest first) and save to a new temp file
    # The created_at field is ISO 8601 format, so lexicographic sort works
    SORTED_FILE=$(mktemp)
    sort -t'|' -k3 -r "$NON_RELEASE_FILE" > "$SORTED_FILE"
    NON_RELEASE_COUNT=$(wc -l < "$SORTED_FILE" | tr -d ' ')
    TOTAL_VERSIONS=$((TOTAL_VERSIONS + NON_RELEASE_COUNT))
    echo "Found $NON_RELEASE_COUNT non-release versions"
    echo "Keeping at least $MIN_KEEP_VERSIONS most recent versions regardless of age"
    echo ""

    # Process each version - reading from file avoids subshell counter issues
    VERSION_INDEX=0
    while IFS='|' read -r VERSION_ID VERSION_NAME CREATED_AT; do
        VERSION_INDEX=$((VERSION_INDEX + 1))

        # Always keep the first N versions (most recent)
        if [ "$VERSION_INDEX" -le "$MIN_KEEP_VERSIONS" ]; then
            echo "KEEP (min-keep #$VERSION_INDEX): $VERSION_NAME (created: $CREATED_AT)"
            KEPT_VERSIONS=$((KEPT_VERSIONS + 1))
            continue
        fi

        # For versions beyond the minimum keep count, apply age-based rule
        if [[ "$CREATED_AT" < "$CUTOFF_DATE" ]]; then
            if [ "$DRY_RUN" = "true" ]; then
                echo "WOULD DELETE: $VERSION_NAME (created: $CREATED_AT)"
                WOULD_DELETE_VERSIONS=$((WOULD_DELETE_VERSIONS + 1))
            else
                echo "DELETING: $VERSION_NAME (created: $CREATED_AT)"
                gh api \
                    --method DELETE \
                    -H "Accept: application/vnd.github+json" \
                    -H "X-GitHub-Api-Version: 2022-11-28" \
                    "/orgs/${PACKAGE_OWNER}/packages/npm/${PACKAGE_NAME}/versions/${VERSION_ID}" \
                    2>/dev/null || echo "Failed to delete version $VERSION_NAME"
                DELETED_VERSIONS=$((DELETED_VERSIONS + 1))
            fi
        else
            echo "KEEP (recent): $VERSION_NAME (created: $CREATED_AT)"
            KEPT_VERSIONS=$((KEPT_VERSIONS + 1))
        fi
    done < "$SORTED_FILE"
    rm --force "$SORTED_FILE"
else
    echo "No non-release versions found"
fi

# Output summary
echo ""
echo "=== Summary ==="
echo "Total versions processed: $TOTAL_VERSIONS"
echo "Release versions (kept): $RELEASE_VERSIONS"
echo "Non-release versions kept: $KEPT_VERSIONS"
if [ "$DRY_RUN" = "true" ]; then
    echo "Versions that would be deleted: $WOULD_DELETE_VERSIONS"
else
    echo "Versions deleted: $DELETED_VERSIONS"
fi

# Output results for GitHub Actions (if GITHUB_OUTPUT is set)
if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
        echo "total=$TOTAL_VERSIONS"
        echo "release=$RELEASE_VERSIONS"
        echo "kept=$KEPT_VERSIONS"
        echo "deleted=$DELETED_VERSIONS"
        echo "would_delete=$WOULD_DELETE_VERSIONS"
    } >> "$GITHUB_OUTPUT"
fi
