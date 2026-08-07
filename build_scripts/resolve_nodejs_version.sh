#!/usr/bin/env bash
#
# Resolve the Node.js major version from the package.json engines field.
#
# This script is used by GitHub Actions workflows to determine the Node.js
# major version without relying on repository variables, which are not
# available to workflows triggered by pull_request events from forks.
#
# Usage: resolve_nodejs_version.sh [path/to/package.json]
# Output: major Node.js version (e.g. 26)

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html
set -o errtrace
set -o nounset
set -o pipefail

PACKAGE_JSON="${1:-package.json}"

if [[ ! -f "$PACKAGE_JSON" ]]; then
    echo "Error: $PACKAGE_JSON not found" >&2
    exit 1
fi

NODEJS_VERSION=$(jq -r '.engines.node' "$PACKAGE_JSON" | grep -oE '[0-9]+' | head -n 1)

if [[ -z "$NODEJS_VERSION" ]]; then
    echo "Error: Could not resolve Node.js major version from $PACKAGE_JSON" >&2
    exit 1
fi

echo "$NODEJS_VERSION"
