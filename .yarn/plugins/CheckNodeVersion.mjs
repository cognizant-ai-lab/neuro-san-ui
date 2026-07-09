#!/usr/bin/env node

/**
 * This script checks if the current Node.js major version matches the required major version(s) specified
 * in package.json.
 * If the versions do not match, it logs an error message and exits the process with a non-zero status code.
 *
 * This is called automatically by yarn as part of the install process.
 *
 * It is required because newer yarn versions (berry+) no longer enforce the `engines` check from `package.json`.
 * This is a bug: https://github.com/yarnpkg/berry/issues/1177
 * Once that is fixed, this plugin can be removed.
 */
import pkg from "../../package.json" with {type: "json"}

const nodeMajorActual = Number(process.versions.node.split(".", 1)[0])

const nodeMajorsRequired = [
    ...new Set(
        pkg.engines.node
            .split("||")
            .map((range) => range.trim().match(/^\^?(?<temp1>\d+)\./u)?.[1])
            .filter(Boolean)
            .map(Number)
    ),
]

if (!nodeMajorsRequired.includes(nodeMajorActual)) {
    console.error(
        `Node.js major version ${nodeMajorsRequired.join(" or ")} is required. Current version: ${process.version}`
    )
    process.exit(1)
}
