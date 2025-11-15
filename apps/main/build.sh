#!/bin/bash -e

# Build the UI/NodeJS Docker image for neuro-san-ui
# Usage:
#   ./build.sh [--no-cache]
#
# By default, this builds for the host platform (no --platform flag).
# To force a specific platform (e.g. linux/amd64 in CI), set:
#   TARGET_PLATFORM=linux/amd64 ./build.sh

export SERVICE_TAG=${SERVICE_TAG:-neuro-san-ui}
export SERVICE_VERSION=${SERVICE_VERSION:-0.0.1}

# Build args from the Dockerfile
export NODEJS_VERSION=${NODEJS_VERSION:-22}
export NEXT_PUBLIC_NEURO_SAN_UI_VERSION=${NEXT_PUBLIC_NEURO_SAN_UI_VERSION:-"dev-${USER}-$(date +'%Y-%m-%d-%H-%M')"}
export NEXT_PUBLIC_ENABLE_AUTHENTICATION=${NEXT_PUBLIC_ENABLE_AUTHENTICATION:-false}

# Determine repo root (two levels up from apps/main)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE="${REPO_ROOT}/apps/main/Dockerfile"

function build_main() {
    CACHE_FLAGS="--rm"
    if [ "${1:-}" == "--no-cache" ]; then
        CACHE_FLAGS="--no-cache --progress=plain"
    fi

    # If TARGET_PLATFORM is set, use it; otherwise let Docker choose native platform.
    PLATFORM_FLAG=""
    if [ -n "${TARGET_PLATFORM:-}" ]; then
        PLATFORM_FLAG="--platform ${TARGET_PLATFORM}"
        echo "Building for explicit platform: ${TARGET_PLATFORM}"
    else
        echo "Building for native host platform (no --platform override)."
    fi

    if [ ! -f "${DOCKERFILE}" ]; then
        echo "Error: Dockerfile not found at ${DOCKERFILE}"
        exit 1
    fi

    echo "Building neuro-san-ui Docker image:"
    echo "  SERVICE_TAG: ${SERVICE_TAG}"
    echo "  SERVICE_VERSION: ${SERVICE_VERSION}"
    echo "  NODEJS_VERSION: ${NODEJS_VERSION}"
    echo "  NEXT_PUBLIC_NEURO_SAN_UI_VERSION: ${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}"
    echo "  NEXT_PUBLIC_ENABLE_AUTHENTICATION: ${NEXT_PUBLIC_ENABLE_AUTHENTICATION}"
    echo "  REPO_ROOT (build context): ${REPO_ROOT}"
    echo "  DOCKERFILE: ${DOCKERFILE}"

    # Build from repo root so COPY paths like "apps/main/..." and "packages/ui-common/..."
    # resolve correctly.
    # shellcheck disable=SC2086
    DOCKER_BUILDKIT=1 docker build \
        -t "${SERVICE_TAG}/${SERVICE_TAG}:${SERVICE_VERSION}" \
        ${PLATFORM_FLAG} \
        --build-arg NODEJS_VERSION="${NODEJS_VERSION}" \
        --build-arg NEXT_PUBLIC_NEURO_SAN_UI_VERSION="${NEXT_PUBLIC_NEURO_SAN_UI_VERSION}" \
        --build-arg NEXT_PUBLIC_ENABLE_AUTHENTICATION="${NEXT_PUBLIC_ENABLE_AUTHENTICATION}" \
        -f "${DOCKERFILE}" \
        ${CACHE_FLAGS} \
        "${REPO_ROOT}"
}

build_main "$@"
