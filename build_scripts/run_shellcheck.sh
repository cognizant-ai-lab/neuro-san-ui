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
# This script runs "shellcheck" on all¹ the shell scripts found in the current and subdirectories of the project.
# If any issues are found, the exit code is non-zero (typically, 123 from empirical observation of shellcheck).
# Thus any build stages that run this script will fail if any issues are found.
#
# ¹ Scripts within directories that match the names in EXCLUDE_DIRS will not be included.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# These will be excluded if they appear *anywhere* in the path to the shell script
EXCLUDE_DIRS="node_modules"

# Find all shell files recursively from current dir. Exclude any that match the EXCLUDE_DIRS.
# Run shellcheck on what remains.
find . -type f -iname "*.sh" | \
  grep -vFwf <(tr " " "\n" <<< "$EXCLUDE_DIRS") | \
  xargs shellcheck
