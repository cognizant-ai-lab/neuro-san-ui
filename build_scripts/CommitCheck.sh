#!/usr/bin/env bash

#
# This script runs a series of checks on the codebase to ensure code quality and consistency.
# It is intended to be run locally by devs before committing code.
# It overlaps somewhat with the test.yml Action and at some point we may want to consolidate.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

# Colors and symbols
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
CHECK_MARK="✓"
CROSS_MARK="✗"

run_check() {
    local name="$1"
    shift
    echo -n "${name}... "
    
    if "$@" > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK_MARK}${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK}${NC}"
        return 1
    fi
}

# Run checks
run_check "tsc" yarn tsc
run_check "knip" yarn knip
run_check "prettier" yarn check-format
run_check "eslint" yarn lint --max-warnings 0
run_check "jest" jest '__tests__/components' '__tests__/pages' '__tests__/unit' --config ./jest_quiet_config.ts