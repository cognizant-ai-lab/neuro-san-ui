#!/bin/bash -e

# Copyright © 2025 Cognizant Technology Solutions Corp
#
# END COPYRIGHT

# Script used to build the neuro-san-ui container
# Usage:
#   build.sh [--no-cache]
#
# The script must be run from the neuro-san-ui/apps/main directory.

export SERVICE_TAG=${SERVICE_TAG:-neuro-san-ui}
export SERVICE_VERSION=${SERVICE_VERSION:-0.0.1}

export NODEJS_VERSION=${NODEJS_VERSION:-22}
export NEXT_PUBLIC_NEURO_SAN_UI_VERSION=${NEXT_PUBLIC_NEURO_SAN_UI_VERSION:-"dev-${USER}-$(date +'%Y-%m-%d-%H-%M')"}
export NEXT_PUBLIC_ENABLE_AUTHENTICATION=${NEXT_PUBLIC_ENABLE_AUTHENTICATION:-false}

function build_main() {
    # Outline function which delegates most work to other functions

    # Parse for a specific arg when debugging
    CACHE_OR_NO_CACHE="--rm"
    if [ "$1" == "--no-cache" ]
    then
        CACHE_OR_NO_CACHE="--no-cache --progress=plain"
    fi

    # Determine platform, defaulting to linux/amd64
    if [ -z "${TARGET_PLATFORM}" ]
    then
        TARGET_PLATFORM="linux/amd64"
    fi
    echo "Target Platform for Docker image generation: ${TARGET_PLATFORM}"

    # Locate repo root and Dockerfile
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
    DOCKERFILE="${REPO_ROOT}/apps/main/Dockerfile"

    echo "DOCKERFILE is ${DOCKERFILE}"

    # Build the docker image
    # DOCKER_BUILDKIT needed for secrets / caching
    # shellcheck disable=SC2086
    DOCKER_BUILDKIT=1 docker build \
        -t ${SERVICE_TAG}/${SERVICE_TAG}:${SERVICE_VERSION} \
        --platform ${TARGET_PLATFORM} \
        --build-arg NODEJS_VERSION="${NODEJS_VERSION}" \
        --build-arg NEXT_PUBLIC_NEURO_SAN_UI_VERSION="${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}" \
        --build-arg NEXT_PUBLIC_ENABLE_AUTHENTICATION="${NEXT_PUBLIC_ENABLE_AUTHENTICATION}" \
        -f "${DOCKERFILE}" \
        ${CACHE_OR_NO_CACHE} \
        "${REPO_ROOT}"
}

# Call the build_main() outline function
build_main "$@"
