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
#
#
# Arguments:
#
#
#

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

# Parse arguments
PACKAGE_JSON="${1:-}"
VERSION="${2:-}"

# Validate required arguments
if [[ -z "$PACKAGE_JSON" || -z "$VERSION" ]]; then
    echo "Error: Both package.json path and version are required arguments" >&2
    echo "Usage: $0 <path-to-package.json> <version>" >&2
    echo "Example: $0 packages/ui-common/package.json 1.2.4-pr.abc123.456" >&2
    exit 1
fi

if [[ ! -f "$PACKAGE_JSON" ]]; then
    echo "Error: File not found: $PACKAGE_JSON" >&2
    exit 1
fi

if command -v jq &> /dev/null; then
    TMP_FILE="$(mktemp)"
    if jq --arg v "$VERSION" '.version = $v' "$PACKAGE_JSON" > "$TMP_FILE"; then
        mv "$TMP_FILE" "$PACKAGE_JSON"
        echo "Successfully set version to $VERSION in $PACKAGE_JSON (using jq)"
    else
        rm -f "$TMP_FILE"
        echo "Error: Failed to update version using jq" >&2
        exit 1
    fi
else
    if command -v node &> /dev/null; then
        node -e "
            const fs = require('fs');
            const file = process.argv[1];
            const version = process.argv[2];
            try {
                const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
                pkg.version = version;
                fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
                console.log('Successfully set version to ' + version + ' in ' + file + ' (using Node.js)');
            } catch (err) {
                console.error('Error: Failed to update version using Node.js:', err.message);
                process.exit(1);
            }
        " "$PACKAGE_JSON" "$VERSION"
    else
        echo "Error: Neither jq nor node is available. Cannot update package.json" >&2
        exit 1
    fi
fi
