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
# Purpose: Clean up old dev (non-release) npm packages to prevent package proliferation.
#
# Usage: ./cull_npm_packages.sh <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>
#
# Arguments:
#   package_name      - Name of the npm package (e.g., "ui-common")
#   package_owner     - GitHub org/user that owns the package (e.g., "cognizant-ai-lab")
#   retention_days    - Number of days; packages older than this are candidates for deletion
#   dry_run           - "true" or "false"; if true, no packages are actually deleted
#   min_keep_versions - Always keep at least this many most recent dev versions
#
# Environment:
#   GH_TOKEN - GitHub token with packages:write permission (required)
#
# Retention Policy:
# - Release packages (version format: x.y.z) are NEVER deleted
# - Dev packages (version format: x.y.z-main.sha.run or x.y.z-pr.sha.run):
#   - The most recent N packages are ALWAYS kept (regardless of age)
#   - Packages older than cutoff_date (beyond the most recent N) are deleted
# ================================================================================

set -euo pipefail

# ================================================================================
# Global Variables (set by parse_args and setup functions)
# ================================================================================
PACKAGE_NAME=""
PACKAGE_OWNER=""
RETENTION_DAYS=""
DRY_RUN=""
MIN_KEEP_VERSIONS=""
CUTOFF_DATE=""
RELEASE_FILE=""
DEV_FILE=""
SORTED_FILE=""

TOTAL_VERSIONS=0
RELEASE_VERSIONS=0
KEPT_VERSIONS=0
DELETED_VERSIONS=0
WOULD_DELETE_VERSIONS=0

# ================================================================================
# Utility Functions
# ================================================================================

log() {
    echo "$*"
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

check_deps() {
    command -v gh jq >/dev/null 2>&1 || die "Missing required command: gh and jq must be installed"
}

is_release_version() {
    local version="$1"
    echo "$version" | grep --quiet --extended-regexp '^[0-9]+\.[0-9]+\.[0-9]+$'
}

# ================================================================================
# Argument Parsing and Setup
# ================================================================================

parse_args() {
    PACKAGE_NAME="${1:?Usage: $0 <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>}"
    PACKAGE_OWNER="${2:?Usage: $0 <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>}"
    RETENTION_DAYS="${3:?Usage: $0 <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>}"
    DRY_RUN="${4:?Usage: $0 <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>}"
    MIN_KEEP_VERSIONS="${5:?Usage: $0 <package_name> <package_owner> <retention_days> <dry_run> <min_keep_versions>}"
}

compute_cutoff_date() {
    CUTOFF_DATE=$(date --date "$RETENTION_DAYS days ago" --utc +%Y-%m-%dT%H:%M:%SZ)
    log "Cutoff date: $CUTOFF_DATE"
    log "Packages created before this date will be considered for deletion"
}

cleanup() {
    rm --force "${RELEASE_FILE:-}" "${DEV_FILE:-}" "${SORTED_FILE:-}"
}

setup_temp_files() {
    RELEASE_FILE=$(mktemp)
    DEV_FILE=$(mktemp)
    trap cleanup EXIT
}

init_counters() {
    TOTAL_VERSIONS=0
    RELEASE_VERSIONS=0
    KEPT_VERSIONS=0
    DELETED_VERSIONS=0
    WOULD_DELETE_VERSIONS=0
}

# ================================================================================
# GitHub API Functions
# ================================================================================

fetch_versions_page() {
    local page="$1"
    local per_page="$2"
    gh api \
        --header "Accept: application/vnd.github+json" \
        --header "X-GitHub-Api-Version: 2022-11-28" \
        "/orgs/${PACKAGE_OWNER}/packages/npm/${PACKAGE_NAME}/versions?per_page=${per_page}&page=${page}" \
        2>/dev/null || echo "[]"
}

categorize_version() {
    local version_json="$1"
    local version_id version_name created_at

    version_id=$(echo "$version_json" | jq --raw-output '.id')
    version_name=$(echo "$version_json" | jq --raw-output '.name')
    created_at=$(echo "$version_json" | jq --raw-output '.created_at')

    if is_release_version "$version_name"; then
        echo "$version_id|$version_name|$created_at" >> "$RELEASE_FILE"
    else
        echo "$version_id|$version_name|$created_at" >> "$DEV_FILE"
    fi
}

fetch_and_categorize_versions() {
    local page=1
    local per_page=100
    local response version_count

    log "Fetching package versions for @${PACKAGE_OWNER}/${PACKAGE_NAME}..."
    log "Retention policy: Keep last $MIN_KEEP_VERSIONS dev versions, delete others older than $CUTOFF_DATE"

    while true; do
        response=$(fetch_versions_page "$page" "$per_page")

        if [ "$response" = "[]" ] || [ -z "$response" ]; then
            break
        fi

        echo "$response" | jq --compact-output '.[]' | while read -r version_json; do
            categorize_version "$version_json"
        done

        version_count=$(echo "$response" | jq --raw-output 'length')
        if [ "$version_count" -lt "$per_page" ]; then
            break
        fi
        page=$((page + 1))
    done
}

delete_version() {
    local version_id="$1"
    local version_name="$2"

    gh api \
        --method DELETE \
        --header "Accept: application/vnd.github+json" \
        --header "X-GitHub-Api-Version: 2022-11-28" \
        "/orgs/${PACKAGE_OWNER}/packages/npm/${PACKAGE_NAME}/versions/${version_id}" \
        2>/dev/null || log "Failed to delete version $version_name"
}

# ================================================================================
# Version Processing Functions
# ================================================================================

process_release_versions() {
    log ""
    log "=== Release Versions (always kept) ==="

    if [ -s "$RELEASE_FILE" ]; then
        RELEASE_VERSIONS=$(wc --lines < "$RELEASE_FILE" | tr --delete ' ')
        TOTAL_VERSIONS=$((TOTAL_VERSIONS + RELEASE_VERSIONS))

        while IFS='|' read -r version_id version_name created_at; do
            log "KEEP (release): $version_name (created: $created_at)"
        done < "$RELEASE_FILE"
    else
        log "No release versions found"
    fi
}

process_dev_versions() {
    local version_index=0
    local dev_count
    local version_id version_name created_at

    log ""
    log "=== Dev Versions ==="

    if [ -s "$DEV_FILE" ]; then
        SORTED_FILE=$(mktemp)
        sort --field-separator='|' --key=3 --reverse "$DEV_FILE" > "$SORTED_FILE"

        dev_count=$(wc --lines < "$SORTED_FILE" | tr --delete ' ')
        TOTAL_VERSIONS=$((TOTAL_VERSIONS + dev_count))

        log "Found $dev_count dev versions"
        log "Keeping at least $MIN_KEEP_VERSIONS most recent versions regardless of age"
        log ""

        while IFS='|' read -r version_id version_name created_at; do
            version_index=$((version_index + 1))

            if [ "$version_index" -le "$MIN_KEEP_VERSIONS" ]; then
                log "KEEP (min-keep #$version_index): $version_name (created: $created_at)"
                KEPT_VERSIONS=$((KEPT_VERSIONS + 1))
                continue
            fi

            if [[ "$created_at" < "$CUTOFF_DATE" ]]; then
                if [ "$DRY_RUN" = "true" ]; then
                    log "WOULD DELETE: $version_name (created: $created_at)"
                    WOULD_DELETE_VERSIONS=$((WOULD_DELETE_VERSIONS + 1))
                else
                    log "DELETING: $version_name (created: $created_at)"
                    delete_version "$version_id" "$version_name"
                    DELETED_VERSIONS=$((DELETED_VERSIONS + 1))
                fi
            else
                log "KEEP (recent): $version_name (created: $created_at)"
                KEPT_VERSIONS=$((KEPT_VERSIONS + 1))
            fi
        done < "$SORTED_FILE"

        rm --force "$SORTED_FILE"
        SORTED_FILE=""
    else
        log "No dev versions found"
    fi
}

# ================================================================================
# Output Functions
# ================================================================================

print_summary() {
    log ""
    log "=== Summary ==="
    log "Total versions processed: $TOTAL_VERSIONS"
    log "Release versions (kept): $RELEASE_VERSIONS"
    log "Dev versions kept: $KEPT_VERSIONS"

    if [ "$DRY_RUN" = "true" ]; then
        log "Versions that would be deleted: $WOULD_DELETE_VERSIONS"
    else
        log "Versions deleted: $DELETED_VERSIONS"
    fi
}

emit_github_output() {
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        {
            echo "cutoff_date=$CUTOFF_DATE"
            echo "total=$TOTAL_VERSIONS"
            echo "release=$RELEASE_VERSIONS"
            echo "kept=$KEPT_VERSIONS"
            echo "deleted=$DELETED_VERSIONS"
            echo "would_delete=$WOULD_DELETE_VERSIONS"
        } >> "$GITHUB_OUTPUT"
    fi
}

# ================================================================================
# Main
# ================================================================================

main() {
    check_deps
    parse_args "$@"
    compute_cutoff_date
    setup_temp_files
    init_counters

    fetch_and_categorize_versions
    process_release_versions
    process_dev_versions
    print_summary
    emit_github_output
}

main "$@"
