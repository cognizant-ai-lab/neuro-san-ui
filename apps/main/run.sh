#!/bin/bash -e

# Run the neuro-san-ui Docker image locally.
# Usage:
#   ./run.sh [extra docker run args]

export SERVICE_TAG=${SERVICE_TAG:-neuro-san-ui}
export SERVICE_VERSION=${SERVICE_VERSION:-0.0.1}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKERFILE="${REPO_ROOT}/apps/main/Dockerfile"

function main() {
    if [ ! -f "${DOCKERFILE}" ]; then
        echo "Error: Dockerfile not found at ${DOCKERFILE}"
        exit 1
    fi

    # Read the port from the first EXPOSE instruction (default 3000 if none found)
    EXPOSED_PORT=$(grep -m1 '^EXPOSE ' "${DOCKERFILE}" | awk '{print $2}' || true)
    SERVICE_HTTP_PORT=${SERVICE_HTTP_PORT:-${EXPOSED_PORT:-3000}}

    IMAGE="${SERVICE_TAG}/${SERVICE_TAG}:${SERVICE_VERSION}"
    CONTAINER_NAME="${SERVICE_TAG}-local"

    echo "Running neuro-san-ui:"
    echo "  IMAGE: ${IMAGE}"
    echo "  PORT: ${SERVICE_HTTP_PORT}"

    docker run --rm -it \
        --name "${CONTAINER_NAME}" \
        -p "${SERVICE_HTTP_PORT}:${SERVICE_HTTP_PORT}" \
        "$@" \
        "${IMAGE}"
}

main "$@"
