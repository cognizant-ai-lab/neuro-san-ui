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
# This script runs the ESLint linter on the current directory and all subdirectories.
# It will lint all javascript-ish and Typescript-ish type source files.
#
# We have an error and warning threshold (the status quo) and if a check-in causes more errors or warnings
# to be generated than this threshold, this script will complain and exist with non-zero status, breaking the build.
# On failure, warnings and errors are spewed to stdout to help diagnose what went wrong. On success, the script is
# silent.
#

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

yarn lint --version  # Display version for troubleshooting

# Run EsLint. As of today (Oct 2022) we run "clean" with zero errors and zero warnings. Any newly-introduced issues
# will result in a non-zero exit code and presumably fail the build.
yarn lint --max-warnings 0 2>&1

# Exit code is whatever code 'yarn lint' reported.

