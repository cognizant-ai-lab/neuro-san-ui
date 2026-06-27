#!/usr/bin/env bash

#  Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.
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
# This script updates the coverage thresholds in vitest.config.ts based on the latest test run results.
# It runs the tests with coverage, extracts the counts from the summary report, then updates vitest.config.ts with the
# new uncovered counts. Note that it adjusts the counts up or down depending on whether coverage improved or worsened.
#
# This scripts makes some opinionated assumptions: that vitest.config.ts is the config file for vitest, that there is a
# coverage.thresholds block in the config file, and that tools like sed and jq are available.
# It also makes no attempt to "tread lightly" and will happily overwrite the current coverage values in vitest.config.ts.
# After it runs, it is up to the developer what he or she wants to do with the updated vitest.config.ts file: add it
# their PR, roll it back, etc.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail
set -o errexit

# Handle differences in sed -i syntax between GNU and BSD (macOS) versions of sed.
if sed --version >/dev/null 2>&1; then
    sed_inplace=(-i) # GNU sed
else
    sed_inplace=(-i '') # BSD sed (macOS)
fi

main() {
    # If vitest.config.ts not present, exit with error
    if [ ! -f vitest.config.ts ]; then
        echo "Error: vitest.config.ts not found. Please run this script from the root of the repository." >&2
        exit 1
    fi

    # if jq not present, exit
    if ! command -v jq &>/dev/null; then
        echo "Error: jq is not installed. Please install it and try again." >&2
        exit 1
    fi

    local overwrite=false

    while [ "$#" -gt 0 ]; do
        case "$1" in
        --overwrite)
            overwrite=true
            ;;
        --overwrite=*)
            if parse_bool "${1#*=}"; then
                overwrite=true
            else
                overwrite=false
            fi
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Error: Unknown argument '$1'" >&2
            usage >&2
            exit 2
            ;;
        esac
        shift
    done

    # Create a temporary directory for coverage output and ensure it gets cleaned up on exit
    local output_dir=""
    if [ "${overwrite}" = true ]; then
        output_dir="./coverage"
        mkdir -p "${output_dir}"
    else
        output_dir="$(mktemp -d)"
        trap 'if [ -n "${output_dir:-}" ] && [ -d "${output_dir}" ]; then rm -rf "${output_dir}"; fi' EXIT
    fi

    local coverage_summary
    local new_coverage_values

    coverage_summary="${output_dir}/coverage-summary.json"
    new_coverage_values="${output_dir}/new_coverage_values.txt"

    # Run the tests with coverage
    if ! yarn vitest run --coverage \
             --coverage.reporter=json-summary \
             --coverage.thresholds='{}' \
             --coverage.reportsDirectory="${output_dir}" ; then
        # If vitest failed, don't update
        echo "Tests failed. Coverage not updated." >&2
        exit 1
    fi

    # If coverage summary file doesn't exist, exit with error
    if [ ! -f "${coverage_summary}" ]; then
        echo "Error: Coverage file \"${coverage_summary}\" not found. Unable to proceed." >&2
        exit 1
    fi

    # Use jq to extract the uncovered counts and format them as a new thresholds block for vitest.config.ts.
    jq -r '
    "                statements: -\(.total.statements.total - .total.statements.covered),",
    "                branches: -\(.total.branches.total - .total.branches.covered),",
    "                functions: -\(.total.functions.total - .total.functions.covered),",
    "                lines: -\(.total.lines.total - .total.lines.covered),"
  ' "${coverage_summary}" >"${new_coverage_values}"

    # Regex for locating the thresholds block in vitest.config.ts.
    thresholds_block_range='/^[[:space:]]*thresholds:[[:space:]]*{/,/^[[:space:]]*},[[:space:]]*$/'

    # Extract old and new uncovered counts for each metric.
    metrics=(statements branches functions lines)

    # Helper: extract metric value from a block file line like "statements: -12,"
    extract_metric_value() {
        local metric="$1"
        local file="$2"
        sed -nE "s/^[[:space:]]*${metric}:[[:space:]]*(-?[0-9]+),[[:space:]]*$/\1/p" "${file}" | head -n1
    }

    # Capture the existing thresholds block into a temp file for parsing and comparison.
    old_coverage_values="${output_dir}/old_coverage_values.txt"
    sed -n "${thresholds_block_range}p" vitest.config.ts > "${old_coverage_values}"

    worsened_counts=0
    improved_counts=0
    unchanged_count=0

    for metric in "${metrics[@]}"; do
        old_val="$(extract_metric_value "${metric}" "${old_coverage_values}")"
        new_val="$(extract_metric_value "${metric}" "${new_coverage_values}")"

        if [ -z "${old_val}" ] || [ -z "${new_val}" ]; then
            echo "Error: Unable to parse ${metric} coverage values." >&2
            exit 1
        fi

       if [ "${new_val}" -gt "${old_val}" ]; then
          improved_counts=$((improved_counts + 1))
      elif [ "${new_val}" -lt "${old_val}" ]; then
          worsened_counts=$((worsened_counts + 1))
      else
          unchanged_count=$((unchanged_count + 1))
      fi
    done

    # No changes: exit with message
    if [ "${unchanged_count}" -eq 4 ]; then
        echo "🤷 Coverage values unchanged."
        exit 0
    fi

    # Something changed. Clarify how.
    msg=""
    if [ "${worsened_counts}" -gt 0 ] && [ "${improved_counts}" -gt 0 ]; then
        msg="😐 Mixed coverage changes (some improved, some worsened). Updated vitest.config.ts."
    elif [ "${worsened_counts}" -gt 0 ] && [ "${improved_counts}" -eq 0 ]; then
        msg="😢 Coverage worsened across all changed metrics. Updated vitest.config.ts"
    elif [ "${improved_counts}" -gt 0 ] && [ "${worsened_counts}" -eq 0 ]; then
        msg="🎉 Coverage improved across all changed metrics. Updated vitest.config.ts."
    fi

    # Update coverage numbers in vitest.config.ts.
    if sed "${sed_inplace[@]}" "${thresholds_block_range}{
        /^[[:space:]]*thresholds:[[:space:]]*{/p
        /^[[:space:]]*thresholds:[[:space:]]*{/r ${new_coverage_values}
        /^[[:space:]]*},[[:space:]]*$/p
        d
        }" vitest.config.ts; then
        echo "$msg"
    else
        echo "Error: Failed to update coverage in vitest.config.ts" >&2
        exit 1
    fi
}

# Parse boolean-ish CLI values commonly used in Linux tools.
parse_bool() {
    local raw="${1:-}"
    local val
    val="$(printf '%s' "${raw}" | tr '[:upper:]' '[:lower:]')"
    case "${val}" in
    1|true|t|yes|y|on)  return 0 ;;
    0|false|f|no|n|off) return 1 ;;
    *)
        echo "Error: Invalid boolean value '${raw}'. Use true/false, 1/0, yes/no, on/off." >&2
        exit 2
        ;;
    esac
}

usage() {
    cat <<'EOF'
Usage: build_scripts/vitest/UpdateCoverage.sh [--overwrite[=BOOL]]

Options:
  --overwrite            Overwrite ./coverage (same as --overwrite=true)
  --overwrite=BOOL       BOOL: true/false, 1/0, yes/no, on/off
  -h, --help             Show this help
EOF
}

main "$@"