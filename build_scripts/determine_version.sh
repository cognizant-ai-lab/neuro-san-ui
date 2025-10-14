#!/usr/bin/env bash

#
# This script determines the version, deployment environment, and deployment flags
# based on the GitHub event type and ref.
#
# Usage: determine_version.sh <event_name> <ref> [tag_name] [sha]
#
# Arguments:
#   event_name: The GitHub event name (e.g., "release", "push")
#   ref: The GitHub ref (e.g., "refs/heads/main", "refs/heads/feature-branch")
#   tag_name: (Optional) The release tag name (required if event_name is "release")
#   sha: (Optional) The Git SHA (required for non-release events)
#
# Output: Sets GitHub Actions output variables:
#   - version: The version string to use
#   - deploy_env: The deployment environment (dev, staging, prod)
#   - should_build: Whether to build (true/false)
#   - should_deploy: Whether to deploy (true/false)
#

# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errtrace
set -o nounset
set -o pipefail

# Parse arguments
EVENT_NAME="${1:-}"
REF="${2:-}"
TAG_NAME="${3:-}"
SHA="${4:-}"

# Validate required arguments
if [[ -z "$EVENT_NAME" || -z "$REF" ]]; then
    echo "Error: event_name and ref are required arguments" >&2
    echo "Usage: $0 <event_name> <ref> [tag_name] [sha]" >&2
    exit 1
fi

# Determine version and deployment settings based on event type
if [[ "$EVENT_NAME" == "release" ]]; then
    # GitHub release: Deploy to staging with the release tag
    if [[ -z "$TAG_NAME" ]]; then
        echo "Error: tag_name is required for release events" >&2
        exit 1
    fi
    
    VERSION="$TAG_NAME"
    DEPLOY_ENV="staging"
    SHOULD_BUILD="true"
    SHOULD_DEPLOY="true"
    
elif [[ "$EVENT_NAME" == "push" && "$REF" == "refs/heads/main" ]]; then
    # Push to main: Deploy to dev with short SHA
    if [[ -z "$SHA" ]]; then
        echo "Error: sha is required for push events" >&2
        exit 1
    fi
    
    VERSION="${SHA:0:7}"
    DEPLOY_ENV="dev"
    SHOULD_BUILD="true"
    SHOULD_DEPLOY="true"
    
else
    # Any other branch push: Only test, no build or deploy
    if [[ -z "$SHA" ]]; then
        echo "Error: sha is required for push events" >&2
        exit 1
    fi
    
    VERSION="${SHA:0:7}"
    DEPLOY_ENV="dev"
    SHOULD_BUILD="false"
    SHOULD_DEPLOY="false"
fi

# Output results for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
        echo "version=$VERSION"
        echo "deploy_env=$DEPLOY_ENV"
        echo "should_build=$SHOULD_BUILD"
        echo "should_deploy=$SHOULD_DEPLOY"
    } >> "$GITHUB_OUTPUT"
fi

# Also print to stdout for debugging
echo "Version: $VERSION"
echo "Deploy Environment: $DEPLOY_ENV"
echo "Should Build: $SHOULD_BUILD"
echo "Should Deploy: $SHOULD_DEPLOY"
