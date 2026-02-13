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
# Cull NPM Packages Script (npmjs.org)
# ================================================================================
# Purpose: Clean up old dev (non-release) npm packages from the npmjs.org registry
#          to prevent package proliferation.
#
# Usage: ./cull_npm_packages.sh <scoped_package_name> <retention_days> <dry_run> <min_keep_versions>
#
# Arguments:
#   scoped_package_name - Full scoped npm package name (e.g., "@cognizant-ai-lab/ui-common")
#   retention_days      - Number of days; packages older than this are candidates for deletion
#   dry_run             - "true" or "false"; if true, no packages are actually deleted
#   min_keep_versions   - Always keep at least this many most recent dev versions
#
# Environment:
#   NODE_AUTH_TOKEN - npmjs.org access token with read and write permission (required)
#
# Retention Policy:
# - Release packages (version format: x.y.z) are NEVER deleted
# - Dev packages (version format: x.y.z-main.sha.run or x.y.z-pr.sha.run):
#   - The most recent N packages are ALWAYS kept (regardless of age)
#   - Packages older than cutoff_date (beyond the most recent N) are unpublished
#   - If unpublish fails (e.g., 72-hour policy), the version is deprecated instead
# ================================================================================

set -euo pipefail

# ================================================================================
# Global Variables (set by parse_args and setup functions)
# ================================================================================
SCOPED_PACKAGE_NAME=""
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
DEPRECATED_VERSIONS=0

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
    command -v npm jq >/dev/null 2>&1 || die "Missing required commands: npm and jq must be installed"
}

check_auth() {
    if [ -z "${NODE_AUTH_TOKEN:-}" ]; then
        die "NODE_AUTH_TOKEN environment variable is not set"
    fi
    npm config set //registry.npmjs.org/:_authToken "${NODE_AUTH_TOKEN}"
}

is_release_version() {
    local version="$1"
    echo "$version" | grep --quiet --extended-regexp '^[0-9]+\.[0-9]+\.[0-9]+$'
}

# ================================================================================
# Argument Parsing and Setup
# ================================================================================

parse_args() {
    SCOPED_PACKAGE_NAME="${1:?Usage: $0 <scoped_package_name> <retention_days> <dry_run> <min_keep_versions>}"
    RETENTION_DAYS="${2:?Usage: $0 <scoped_package_name> <retention_days> <dry_run> <min_keep_versions>}"
    DRY_RUN="${3:?Usage: $0 <scoped_package_name> <retention_days> <dry_run> <min_keep_versions>}"
    MIN_KEEP_VERSIONS="${4:?Usage: $0 <scoped_package_name> <retention_days> <dry_run> <min_keep_versions>}"
}

compute_cutoff_date() {
    CUTOFF_DATE=$(date --date "$RETENTION_DAYS days ago" --utc +%Y-%m-%dT%H:%M:%SZ)
    log "Cutoff date: $CUTOFF_DATE"
    log "Packages published before this date will be considered for deletion"
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
    DEPRECATED_VERSIONS=0
}

# ================================================================================
# npmjs.org Registry Functions
# ================================================================================

fetch_and_categorize_versions() {
    local versions_json time_json version published_at

    log "Fetching package versions for ${SCOPED_PACKAGE_NAME}..."
    log "Retention policy: Keep last $MIN_KEEP_VERSIONS dev versions, delete others older than $CUTOFF_DATE"

    versions_json=$(npm view "${SCOPED_PACKAGE_NAME}" versions --json 2>/dev/null) || die "Failed to fetch versions for ${SCOPED_PACKAGE_NAME}"
    time_json=$(npm view "${SCOPED_PACKAGE_NAME}" time --json 2>/dev/null) || die "Failed to fetch publish times for ${SCOPED_PACKAGE_NAME}"

    for version in $(echo "$versions_json" | jq --raw-output '.[]'); do
        published_at=$(echo "$time_json" | jq --raw-output --arg v "$version" '.[$v] // empty')

        if [ -z "$published_at" ]; then
            log "WARNING: No publish time found for $version, skipping"
            continue
        fi

        if is_release_version "$version"; then
            echo "$version|$published_at" >> "$RELEASE_FILE"
        else
            echo "$version|$published_at" >> "$DEV_FILE"
        fi
    done
}

unpublish_version() {
    local version="$1"

    if npm unpublish "${SCOPED_PACKAGE_NAME}@${version}" 2>/dev/null; then
        log "  -> Unpublished successfully"
        return 0
    else
        log "  -> Unpublish failed (likely 72-hour policy or dependents)"
        return 1
    fi
}

deprecate_version() {
    local version="$1"

    if npm deprecate "${SCOPED_PACKAGE_NAME}@${version}" "Culled: old dev version superseded by newer builds" 2>/dev/null; then
        log "  -> Deprecated successfully"
        return 0
    else
        log "  -> Deprecation failed for $version"
        return 1
    fi
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

        while IFS='|' read -r version published_at; do
            log "KEEP (release): $version (published: $published_at)"
        done < "$RELEASE_FILE"
    else
        log "No release versions found"
    fi
}

process_dev_versions() {
    local version_index=0
    local dev_count
    local version published_at

    log ""
    log "=== Dev Versions ==="

    if [ -s "$DEV_FILE" ]; then
        SORTED_FILE=$(mktemp)
        sort --field-separator='|' --key=2 --reverse "$DEV_FILE" > "$SORTED_FILE"

        dev_count=$(wc --lines < "$SORTED_FILE" | tr --delete ' ')
        TOTAL_VERSIONS=$((TOTAL_VERSIONS + dev_count))

        log "Found $dev_count dev versions"
        log "Keeping at least $MIN_KEEP_VERSIONS most recent versions regardless of age"
        log ""

        while IFS='|' read -r version published_at; do
            version_index=$((version_index + 1))

            if [ "$version_index" -le "$MIN_KEEP_VERSIONS" ]; then
                log "KEEP (min-keep #$version_index): $version (published: $published_at)"
                KEPT_VERSIONS=$((KEPT_VERSIONS + 1))
                continue
            fi

            if [[ "$published_at" < "$CUTOFF_DATE" ]]; then
                if [ "$DRY_RUN" = "true" ]; then
                    log "WOULD DELETE: $version (published: $published_at)"
                    WOULD_DELETE_VERSIONS=$((WOULD_DELETE_VERSIONS + 1))
                else
                    log "DELETING: $version (published: $published_at)"
                    if unpublish_version "$version"; then
                        DELETED_VERSIONS=$((DELETED_VERSIONS + 1))
                    else
                        deprecate_version "$version"
                        DEPRECATED_VERSIONS=$((DEPRECATED_VERSIONS + 1))
                    fi
                fi
            else
                log "KEEP (recent): $version (published: $published_at)"
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
        log "Versions unpublished: $DELETED_VERSIONS"
        log "Versions deprecated (unpublish blocked): $DEPRECATED_VERSIONS"
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
            echo "deprecated=$DEPRECATED_VERSIONS"
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
    check_auth
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
