# Copyright

Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

# neuro-san-ui CI/CD

This directory contains shell scripts used by the GitHub Actions workflows in
`.github/workflows/`. Together they form the CI/CD pipeline for the
neuro-san-ui application and the `@cognizant-ai-lab/ui-common` npm package.

## How the Pipeline Works

All CI/CD is driven by the **Orchestrator** workflow
(`.github/workflows/orchestrator.yml`). It decides what to run based on the
trigger:

| Trigger            | Steps                 | Deploy target |
| ------------------ | --------------------- | ------------- |
| Push to any branch | Test                  | —             |
| Push to `main`     | Test → Build → Deploy | `dev`         |
| GitHub Release     | Test → Build → Deploy | `staging`     |

1. **Test** (`.github/workflows/test.yml`) — ESLint, ShellCheck, Prettier,
   knip, hadolint, Docker build check, TypeScript compilation, and Jest unit
   tests. All checks run with `continue-on-error` and are rolled up at the end
   so every failure is visible in a single run.
2. **Build** (`.github/workflows/build.yml`) — Builds the Docker image and
   pushes it to Amazon ECR. Version tagging is handled by
   `determine_version.sh`.
3. **Deploy** — The Orchestrator sends a `repository_dispatch` event to
   `cognizant-ai-lab/neuro-san-deploy`, which updates the UI image tag in the
   target environment.

### npm Package Publishing

The **Publish UI Common** workflow (`.github/workflows/publish.yml`) publishes
`@cognizant-ai-lab/ui-common` to the public npm registry:

| Trigger                            | Version format            | dist-tag      |
| ---------------------------------- | ------------------------- | ------------- |
| Push to `main` (ui-common changes) | `<base>-main.<sha>.<run>` | `main`        |
| GitHub Release                     | `<release-tag>`           | `latest`      |
| Manual dispatch                    | `<base>-pr.<sha>.<run>`   | user-selected |

After a push-to-main publish, the workflow triggers `cognizant-ai-lab/neuro-ui`
via `repository_dispatch` so it can pick up the new snapshot.

### npm Package Cleanup

The **Cull NPM Packages** workflow (`.github/workflows/cull-npm-packages.yml`)
runs weekly to remove old dev versions of `@cognizant-ai-lab/ui-common`.
Release versions are never deleted. See `cull_npm_packages.sh` for the
retention policy.

## Scripts

| Script                       | Purpose                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `determine_version.sh`       | Computes the image version, deploy environment, and build/deploy flags from the GitHub event type and ref. |
| `compute_publish_version.sh` | Computes the npm package version and dist-tag for `@cognizant-ai-lab/ui-common` publishing.                |
| `set_package_version.sh`     | Writes a version string into a `package.json` file (used before `npm publish`).                            |
| `cull_npm_packages.sh`       | Cleans up old dev npm packages from the npmjs.org registry.                                                |
| `run_eslint.sh`              | Runs ESLint with a zero-warning threshold.                                                                 |
| `run_shellcheck.sh`          | Runs ShellCheck on all `.sh` files in the repo (excluding `node_modules`).                                 |
| `CommitCheck.sh`             | Local pre-commit quality checks (tsc, knip, prettier, eslint, jest).                                       |

## Local Quality Checks

Run `./build_scripts/CommitCheck.sh` from the repo root before committing. It
exercises the same checks as CI so you can catch issues early.

## Legacy Codefresh Files

The `build.yml`, `deploy-trigger.yml`, and `deploy.yml` files in this directory
are remnants of the former Codefresh-based pipeline. They are no longer used and
are retained only for historical reference.
