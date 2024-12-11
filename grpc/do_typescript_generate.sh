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

# Check if Github PAT is present
if [ -z "${LEAF_SOURCE_CREDENTIALS:-}" ]; then
  echo "Error: LEAF_SOURCE_CREDENTIALS environment variable must be set to a Github access token."
  exit 1
fi

# Define directories
GENERATED_DIR=./generated
PROTOS_DIR=./proto
NEURO_SAN_PROTO_DIR="${PROTOS_DIR}/neuro-san"

# Define agent protocol version to use
NEURO_SAN_VERSION="0.1.8"

# Create directories if necessary
mkdir -p "${PROTOS_DIR}/internal" "$NEURO_SAN_PROTO_DIR" "${GENERATED_DIR}"

# Copy main project proto files to the protos directory. Some day they will be in a separate repo.
# This is only for the "local dev" case. In the Docker case, the previous steps will have copied these files where they
# need to be so they don't need to be copied here.
if [ -z "$(ls ${PROTOS_DIR}/*.proto)" ]; then
  cp -r ../proto/* "${PROTOS_DIR}/"
fi

# Retrieve neuro-san proto file
echo "Retrieving neuro-san proto files..."
# Define the target local directory and file path
LOCAL_PATH="$NEURO_SAN_PROTO_DIR/neuro_san/api/grpc"

# Create the directory structure
mkdir -p "$LOCAL_PATH"

echo "******* check the pat *********
echo $LEAF_SOURCE_CREDENTIALS
echo "******* end pat check *********

# Get the agent.proto file from the neuro-san repository. Initially just this one file.
curl --header "Authorization: token $LEAF_SOURCE_CREDENTIALS" \
  --header "Accept: application/vnd.github.raw+json" \
  --output "$LOCAL_PATH/agent.proto" \
  --location \
  --show-error \
  --silent \
  "https://api.github.com/repos/leaf-ai/neuro-san/contents/neuro_san/api/grpc/agent.proto?ref=${NEURO_SAN_VERSION}"

echo "******** see what got downloaded ************"
cat "$LOCAL_PATH/agent.proto"
echo "**** end of cat *********"

# Hack: google proto files expect to be in a certain hardcoded location, so we copy them there
cp -r "node_modules/protobufjs/google" "${PROTOS_DIR}/internal"

# More copying of files to work around Google hard-coded paths
OPENAPIV2=protoc-gen-openapiv2
GRPC_ECOSYSTEM_PATH="grpc-ecosystem/grpc-gateway/v2"

# This is a hack to avoid nasty problems with proto files
# import paths and such.
echo "Copying up ${OPENAPIV2} directory"
rm -rf "${PROTOS_DIR:?}/${OPENAPIV2:?}"
cp -R "${PROTOS_DIR}/${GRPC_ECOSYSTEM_PATH}/${OPENAPIV2}" "${PROTOS_DIR}"

# Ordering matters w/rt where generated file is output
PROTO_PATH="--proto_path=${GENERATED_DIR} \
            --proto_path=${PROTOS_DIR} \
            --proto_path=${PROTOS_DIR}/neuro-san \
            --proto_path=./node_modules/protobufjs"

echo "PROTO_PATH=${PROTO_PATH}"
echo "Generating gRPC code in ${GENERATED_DIR}..."

# Clean existing
rm -rf "${GENERATED_DIR:?}"/*

ALL_PROTO_FILES=$(< "${PROTOS_DIR}"/mdserver_proto.txt)

# Generate the Typepscript types for the services
for PROTO_FILE in ${ALL_PROTO_FILES}
do
    # Generate the GRPC code for a single service proto file.
    echo "generating gRPC code for ${PROTO_FILE}."

    # See ts-proto doc (linked at top of this file) for what these various options do
     # shellcheck disable=SC2086    # PROTO_PATH is compilation of cmd line args
    protoc  --plugin=./node_modules/.bin/protoc-gen-ts_proto ${PROTO_PATH} \
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
            --ts_proto_out="${GENERATED_DIR}" "${PROTO_FILE}"
done
