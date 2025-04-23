#!/usr/bin/env bash

# This script removes files from the working directory in preparation for a custom Docker build.
# To run it, make sure your working dir is clean (because it wants to delete directories) and set the
# BUILD_TARGET environment variable to the name of the build target you want to use.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

check_clean_working_dir() {
  if [ -n "$(git status --porcelain)" ]; then
  echo "Working directory not clean. Refusing to proceed."
  echo "Commit your changes or reset your working directory and try again."
    exit 1
  fi
}

list_build_targets() {
   find build_scripts/customBuilds/buildTargets -type f -name \*.txt -print0 | \
        xargs --null --max-args 1 basename | \
        sed 's/\.txt$//'
}
check_env_var() {
  # if BUILD_TARGET is not set, exit with an error
  if [ -z "${BUILD_TARGET:-}" ]; then
    echo "Error: BUILD_TARGET environment variable must be set. Available build targets are:"
    list_build_targets
    exit 2
  fi
}

check_build_target() {
  local build_target="$1"
  
  # If there isn't a file named build_target under the buildTargets directory, exit with an error
  if [ ! -f "build_scripts/customBuilds/buildTargets/${build_target}.txt" ]; then
    echo "Error: No build target found for '${build_target}'. Available build targets are:"
    list_build_targets
    exit 2
  fi
}

prune_files() {
  local build_target="$1"
  local file="build_scripts/customBuilds/buildTargets/${build_target}.txt"
  

  echo "📢 Bash version: $BASH_VERSION"
  echo "📁 PWD: $(pwd)"
  echo "📄 File: $file"
  ls -l "$file" || echo "⚠️ Missing file"

  echo "📄 BEGIN FILE CONTENTS"
  cat "$file"
  echo "📄 END FILE CONTENTS"

  command -v realpath || echo "❗ realpath missing"

  
  echo "Pruning files for build target: ${build_target}"
  
  while IFS= read -r path || [[ -n "$path" ]]; do
    echo "➡️ Raw path A: '$path'"
    # Skip empty lines
    [[ -z "$path" ]] && continue
    echo "➡️ Raw path B: '$path'" 
    # Skip lines starting with #
    [[ "$path" =~ ^# ]] && continue
    echo "➡️ Raw path C: '$path'"
    # Skip dangerous path(s)
    if [[ "$path" =~ ^/ ]]; then
      echo "Skipping: Dangerous path -> $full_path"
      continue
    fi
    echo "➡️ Raw path D: '$path'"
    # Resolve absolute path
    realpath -m "$path"
    echo "➡️ Raw path D.2: '$path'"
    ####full_path=$(realpath -m "$path" 2>/dev/null)
    full_path="$(cd "$(dirname "$path")" && pwd)/$(basename "$path")"
    echo "➡️ Raw path E: '$path'"  
    echo "Deleting: $full_path"
    rm -rf -- "$full_path"
  done < "$file"
    
}


# Main entry point of the script
main() {
  check_clean_working_dir
  check_env_var
  check_build_target "${BUILD_TARGET}"
  prune_files "${BUILD_TARGET}"
}
  
# Execute main
main

