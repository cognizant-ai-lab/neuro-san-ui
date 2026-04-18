#!/usr/bin/env bash

# This script generates a JSON object containing the ESLint rules for different file types.
#
# It uses `yarn eslint --print-config` to get the ESLint configuration for each file type, then sorts the keys
# recursively and aggregates the results into a single JSON object.
#
# The output is a JSON object where each key is a file extension (e.g., "js", "ts", "tsx") and the value is the
# corresponding ESLint rules for that file type.
#
# Usage: ./build_scripts/eslint_list_rules.sh > eslint_rules.json (or simply yarn lint-rules)
#
# Requires `jq` to be installed for JSON processing.
#
# The idea of this script is to generate the currently active linter rules for each file type, so that when changes
# are made to the ESLint version, plugin versions, or configuration, it is possible to see what rules are impacted
# by the change. For example, you might run this utility on the new branch with the changes, and then on the main
# branch, and compare the outputs to see what rules have changed.

FILE_TYPES=("js" "ts" "tsx" "mjs" "cjs")

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed. Please install jq to use this script."
    exit 1
fi

echo "{"
first=true
for ext in "${FILE_TYPES[@]}"; do
    # The inline function fed to jq sorts the keys of the JSON object recursively, to reduce diff noise when comparing.
    config=$(yarn eslint --print-config "dummy.$ext" | jq '."rules" | def sortkeys_recursive:
                                                            . as $in |
                                                            if type == "object" then
                                                              to_entries | sort_by(.key) | map({ (.key): (.value | sortkeys_recursive) }) | add
                                                            elif type == "array" then
                                                              map(sortkeys_recursive)
                                                            else
                                                              .
                                                            end;
                                                          sortkeys_recursive')
    if [ -n "$config" ]; then
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        printf '  "%s": %s' "$ext" "$config"
    fi
done
echo ""
echo "}"