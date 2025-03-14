#!/usr/bin/env bash

# This script generates gRPC stubs for Typescript from the definitions in the ./proto directory. The script needs
# to be run when initially setting up a dev environment, and any time there are changes to the protobuf definitions.
#
# Pre-requisites:
# 1) Install the protoc compiler
# 2) Install the ts-proto plugin https://github.com/stephenh/ts-proto/
# 3) Get a Personal Access Token from Github and set it in the LEAF_SOURCE_CREDENTIALS environment variable.
# This token must have at least read access to the leaf-ai/neuro-san repository.
#
# This script must be run from the nextfront directory, which is in line with the Docker build which runs from the
# nextfront directory.
#
# The agent (neuro-san) protobuf files reside in a separate Github repository. This script retrieves those and saves
# them to an appropriate location where the protoc compiler can find them.

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

# Define Neuro AI protocol version to use
NEURO_AI_VERSION="2.6.0"

# Define agent protocol version to use
NEURO_SAN_VERSION="0.4.5"

# Define directories
GENERATED_DIR=./generated
PROTOS_DIR=./proto
NEURO_SAN_PROTO_DIR="${PROTOS_DIR}/neuro-san/neuro_san/api/grpc"

# Define the path to the proto manifest file
PROTO_MANIFEST="${PROTOS_DIR}/mdserver_proto.txt"

# Make sure we have the pre-requisites to run the script
check_pre_reqs() {
  # Check if Github PAT is present
  if [ -z "${LEAF_SOURCE_CREDENTIALS:-}" ]; then
    echo "Error: LEAF_SOURCE_CREDENTIALS environment variable must be set to a Github access token."
    exit 1
  fi
}

# Prepare directories for generated files and proto files
prepare_dirs() {
  # Clean proto and generated directories
  rm -rf "${GENERATED_DIR:?}"/*
  rm -rf "${PROTOS_DIR:?}"/*

  # Create directories if necessary
  mkdir -p "${PROTOS_DIR}/internal" "${NEURO_SAN_PROTO_DIR}" "${GENERATED_DIR}"

  # Hack: google proto files expect to be in a certain hardcoded location, so we copy them there
  cp -r "node_modules/protobufjs/google" "${PROTOS_DIR}/internal"
}

# Checkout a specific path from a git repository. Only retrieves proto files.
checkout_repo_path() {
  local repo="$1"
  local version="$2"
  local sparse_path="$3"
  local destination="$4"

  # Create a temp dir and capture the path
  local temp_dir
  temp_dir=$(mktemp -d)

  git clone --quiet --no-checkout --depth=1 --filter=tree:0 "$repo" "$temp_dir"
  pushd "$temp_dir" >/dev/null

  git sparse-checkout set --no-cone -- "$sparse_path" >/dev/null

  # Fetch the specific tag and check it out
  git fetch --depth=1 origin "refs/tags/${version}:refs/tags/${version}" &>/dev/null
  git checkout --quiet "tags/${version}" &>/dev/null

  popd >/dev/null

  # Move the contents from the sparse_path to the destination
  mv "$temp_dir/$sparse_path/"* "$destination/"

  # Clean up
  rm -rf "$temp_dir"
}

# Generate the Typepscript types for the services
generate_typescript_grpc_code() {
  # Ordering matters with respect to where generated file is output
  local proto_path="--proto_path=${GENERATED_DIR} \
            --proto_path=${PROTOS_DIR} \
            --proto_path=${PROTOS_DIR}/neuro-san \
            --proto_path=./node_modules/protobufjs"

  local all_proto_files=""
  all_proto_files=$(<"${PROTO_MANIFEST}" grep -v "^#")

  # Generate the gRPC code for each proto file
  for proto_file in ${all_proto_files}; do
    echo "generating gRPC code for ${proto_file}."
    # shellcheck disable=SC2086 # PROTO_PATH is compilation of cmd line args
    protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto ${proto_path} \
      --ts_proto_opt=comments=false \
      --ts_proto_opt=esModuleInterop=true \
      --ts_proto_opt=forceLong=number \
      --ts_proto_opt=lowerCaseServiceMethods=true \
      --ts_proto_opt=outputClientImpl=false \
      --ts_proto_opt=outputEncodeMethods=false \
      --ts_proto_opt=outputJsonMethods=true \
      --ts_proto_opt=outputServices=false \
      --ts_proto_opt=removeEnumPrefix=true \
      --ts_proto_opt=snakeToCamel=keys \
      --ts_proto_opt=stringEnums=true \
      --ts_proto_opt=useSnakeTypeName=false \
      --ts_proto_out="${GENERATED_DIR}" "${proto_file}"
  done
}

# Main entry point of the script
main() {
  echo "Generating gRPC code for Typescript in ${GENERATED_DIR}..."

  # Check pre-requisites
  check_pre_reqs

  # Prepare directories
  prepare_dirs

  # Get Neuro AI proto files
  checkout_repo_path "https://$LEAF_SOURCE_CREDENTIALS@github.com/leaf-ai/unileaf.git" "${NEURO_AI_VERSION}" \
    "/proto" "./proto"

  # Get Neuro-san proto files
  checkout_repo_path "https://$LEAF_SOURCE_CREDENTIALS@github.com/leaf-ai/neuro-san.git" "${NEURO_SAN_VERSION}" \
    "neuro_san/api/grpc" "${NEURO_SAN_PROTO_DIR}"

  generate_typescript_grpc_code

  echo "Script completed."
}

# Execute main
main
