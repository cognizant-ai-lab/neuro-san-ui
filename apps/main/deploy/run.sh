#!/usr/bin/env bash

# Copyright © 2025 Cognizant Technology Solutions Corp, www.cognizant.com.
#
# END COPYRIGHT

# Script that runs the neuro-san-ui docker container locally
# Usage: run.sh
#

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

function check_directory() {
    working_dir=$(pwd)
    if [ "main" == "$(basename "${working_dir}")" ]
    then
        echo "We are in the neuro-san-ui/apps/main directory."
    fi
}

function run() {

    check_directory

    CONTAINER_VERSION="0.0.1"
    echo "Using CONTAINER_VERSION ${CONTAINER_VERSION}"
    echo "Using args '$*'"

    #
    # Host networking only works on Linux. Get the OS we are running on
    #
    OS=$(uname)
    echo "OS: ${OS}"

    # Using a default network of 'host' is convenient when locally testing,
    # but allow this to be changeable by env var.
    network=${NETWORK:="host"}
    echo "Network is ${network}"

    SERVICE_NAME="neuro-san-ui"
    # Assume the first port EXPOSE instruction in the Dockerfile is the service port
    DOCKERFILE=$(find . -name Dockerfile | sort | head -1)
    echo "DOCKERFILE is ${DOCKERFILE}"
    SERVICE_HTTP_PORT=$(grep ^EXPOSE < "${DOCKERFILE}" | head -1 | awk '{ print $2 }')
    echo "SERVICE_HTTP_PORT: ${SERVICE_HTTP_PORT}"

    # Run the docker container in interactive mode
    docker_cmd="docker run --rm -it \
        --name=$SERVICE_NAME \
        --network=$network \
        --publish $SERVICE_HTTP_PORT:$SERVICE_HTTP_PORT \
        --env LOGO_SERVICE_TOKEN \
        --env NEURO_SAN_SERVER_URL \
        --env OPENAI_API_KEY \
        --env SUPPORT_EMAIL_ADDRESS \
        neuro-san-ui/neuro-san-ui:$CONTAINER_VERSION"

    if [ "${OS}" == "Darwin" ];then
        # Host networking does not work for non-Linux operating systems
        # Remove it from the docker command
        docker_cmd=${docker_cmd/--network=$network/}
    fi

    echo "${docker_cmd}"
    $docker_cmd
}

function main() {
    run "$@"
}

# Pass all command line args to function
main "$@"
