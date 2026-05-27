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
# This script updates the coverage thresholds in jest.config.ts based on the latest test run results.
# It runs the tests with coverage, extracts the counts from the summary report, then updates jest.config.ts with the
# new uncovered counts. Note that it adjusts the counts up or down depending on whether coverage improved or worsened.
#
# This scripts makes some opinionated assumptions: that jest.config.ts is the config file for jest, that there is a
# coverageThreshold block in the config file with a global section, and that tools like sed and jq are available.
# It also makes no attempt to "tread lightly" and will happily overwrite the current coverage values in jest.config.ts.
# After it runs, it is up to the developer what he or she wants to do with the updated jest.config.ts file: add it
# their PR, roll it back, etc.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

# Handle differences in sed -i syntax between GNU and BSD (macOS) versions of sed.
if sed --version >/dev/null 2>&1; then
    sed_inplace=(-i) # GNU sed
else
    sed_inplace=(-i '') # BSD sed (macOS)
fi

main() {
    # If jest.config.ts not present, exit with error
    if [ ! -f jest.config.ts ]; then
        echo "Error: jest.config.ts not found. Please run this script from the root of the repository." >&2
        exit 1
    fi

    # if jq not present, exit
    if ! command -v jq &>/dev/null; then
        echo "Error: jq is not installed. Please install it and try again." >&2
        exit 1
    fi

    # remove old coverage summary
    rm -f coverage/coverage-summary.json

    # Run the tests with coverage
    if ! jest --config ./jest_quiet.config.ts --coverage --coverageReporters=json-summary --coverageThreshold '{}'; then
        # If jest failed, don't update
        echo "Tests failed. Coverage not updated." >&2
        exit 1
    fi

    # If coverage summary file doesn't exist, exit with error
    if [ ! -f coverage/coverage-summary.json ]; then
        echo "Error: Coverage file \"coverage/coverage-summary.json\" not found. Unable to proceed." >&2
        exit 1
    fi

    # Use jq to extract the uncovered counts and format them as a new global block for jest.config.ts.
    jq -r '
  "        global: {",
  "            statements: -\(.total.statements.total - .total.statements.covered),",
  "            branches: -\(.total.branches.total - .total.branches.covered),",
  "            functions: -\(.total.functions.total - .total.functions.covered),",
  "            lines: -\(.total.lines.total - .total.lines.covered),",
  "        },"
' coverage/coverage-summary.json >/tmp/new_global_block.txt

    # Update coverage numbers in jest.config.ts.
    if sed --version >/dev/null 2>&1; then
        sed_inplace=(-i) # GNU sed
    else
        sed_inplace=(-i '') # BSD sed (macOS)
    fi

    if sed "${sed_inplace[@]}" '/^[[:space:]]*global:[[:space:]]*{/,/^[[:space:]]*},[[:space:]]*$/{
  /^[[:space:]]*global:[[:space:]]*{/r /tmp/new_global_block.txt
  d
}' jest.config.ts; then
        echo "Coverage updated successfully in jest.config.ts"
    else
        echo "Error: Failed to update coverage in jest.config.ts" >&2
        rm -f /tmp/new_global_block.txt
        exit 1
    fi

    rm -f /tmp/new_global_block.txt
}

main