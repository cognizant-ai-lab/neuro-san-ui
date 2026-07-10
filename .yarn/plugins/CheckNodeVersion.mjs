#!/usr/bin/env node

/**
 * This script checks if the current Node.js major version matches the required major version(s) specified
 * in package.json.
 * If the versions do not match, it logs an error message and exits the process with a non-zero status code.
 *
 * Yarn invokes this plugin before running any scripts, so it will apply to all yarn commands, including
 * `yarn install`, `yarn build`, and `yarn start`.
 *
 * It is required because newer yarn versions (berry+) no longer enforce the `engines` check from `package.json`.
 * This is a bug: https://github.com/yarnpkg/berry/issues/1177
 * Once that is fixed, this plugin can be removed.
 *
 * Note: the parsing is intentionally simple-minded. It will only handle versions like `^a.b.c` or `^x.y.z || ^a.b.c`.
 */

// eslint-disable-next-line unicorn/no-exports-in-scripts, no-shadow -- required for yarn plugin
export const name = "enforce-node-version"

// eslint-disable-next-line unicorn/no-exports-in-scripts -- required for yarn plugin
export const factory = (
    /** @type {(name: string) => {MessageName: {UNNAMED: string}}} */
    // eslint-disable-next-line no-shadow -- required for yarn plugin
    require
) => {
    // @ts-expect-error -- supplied internally by yarn
    const {MessageName} = require("@yarnpkg/core")

    return {
        hooks: {
            validateProject: async (
                /** @type {{topLevelWorkspace: {manifest: {raw: {engines?: {node?: string}}}}}} */
                project,
                /** @type {{reportError: (name: string, message: string) => void}} */
                report
            ) => {
                const nodeRange = project.topLevelWorkspace.manifest.raw.engines?.node

                if (!nodeRange) {
                    return
                }

                const nodeMajorActual = Number(process.versions.node.split(".", 1)[0])

                const nodeMajorsRequired = [
                    ...new Set(
                        nodeRange
                            .split("||")
                            .map(
                                (/** @type {string} */ range) =>
                                    range.trim().match(/^\^?(?<version>\d+)\./u)?.groups?.["version"]
                            )
                            .filter(Boolean)
                            .map(Number)
                    ),
                ]

                if (!nodeMajorsRequired.includes(nodeMajorActual)) {
                    report.reportError(
                        MessageName.UNNAMED,
                        `Node.js major version ${nodeMajorsRequired.join(" or ")} is required. ` +
                            `Current version: ${process.version}`
                    )
                }
            },
        },
    }
}
