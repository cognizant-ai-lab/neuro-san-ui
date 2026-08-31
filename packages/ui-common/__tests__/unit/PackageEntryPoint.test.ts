/*
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
*/

import {readdir, readFile} from "node:fs/promises"
import path from "node:path"

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "../..")

const IMPORT_PATTERN = /(?:^|\n)\s*(?:import|export)[^\n]*?from\s+"(?<specifier>[^"]+)"/gu

/**
 * Consumers who do not use Next.js must be able to install this package without `next` or `next-auth` and still
 * bundle everything the entry point exposes. A static import of either, anywhere in the graph below `index.ts`,
 * breaks their build regardless of whether the code ever runs. The same goes for Node built-ins, which force
 * polyfill configuration on every consumer that targets the browser.
 */
const FORBIDDEN = [/^next$/u, /^next\//u, /^next-auth/u, /^node:/u]

const readIfPresent = async (filePath: string): Promise<string | undefined> => {
    try {
        return await readFile(filePath, "utf8")
    } catch {
        return undefined
    }
}

const resolveRelativeImport = async (specifier: string, importer: string): Promise<string | undefined> => {
    const base = path.resolve(path.dirname(importer), specifier)
    const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), base]

    for (const candidate of candidates) {
        const contents = await readIfPresent(candidate)
        if (contents !== undefined) {
            return candidate
        }
    }

    return undefined
}

/**
 * Walks the static import graph starting at the package entry point.
 *
 * @returns Every reachable module, mapped to the external packages it imports
 */
const collectReachableModules = async (): Promise<Map<string, string[]>> => {
    const externalsByModule = new Map<string, string[]>()
    const queue = [path.join(PACKAGE_ROOT, "index.ts")]

    while (queue.length > 0) {
        const current = queue.pop()

        if (current !== undefined && !externalsByModule.has(current)) {
            const source = (await readIfPresent(current)) ?? ""
            const specifiers = [...source.matchAll(IMPORT_PATTERN)].map((match) => match.groups?.["specifier"] ?? "")

            const relativeSpecifiers = specifiers.filter((specifier) => specifier.startsWith("."))
            const externalSpecifiers = specifiers.filter((specifier) => !specifier.startsWith("."))

            externalsByModule.set(current, externalSpecifiers)

            for (const specifier of relativeSpecifiers) {
                const resolved = await resolveRelativeImport(specifier, current)
                if (resolved !== undefined) {
                    queue.push(resolved)
                }
            }
        }
    }

    return externalsByModule
}

const relativeToPackage = (filePath: string): string => path.relative(PACKAGE_ROOT, filePath)

const NON_SHIPPED_DIRECTORIES = new Set(["__tests__", "build_scripts", "dist", "node_modules"])

/**
 * @returns Every source file that ships to consumers, whether or not the entry point reaches it
 */
const collectShippedSources = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, {withFileTypes: true})

    const nested = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(directory, entry.name)

            if (entry.isDirectory()) {
                return NON_SHIPPED_DIRECTORIES.has(entry.name) ? [] : collectShippedSources(fullPath)
            }

            return /\.tsx?$/u.test(entry.name) ? [fullPath] : []
        })
    )

    return nested.flat()
}

describe("package entry point", () => {
    it("does not reach next, next-auth, or Node built-ins from any module it exposes", async () => {
        const externalsByModule = await collectReachableModules()

        const offenders = [...externalsByModule]
            .flatMap(([filePath, specifiers]) =>
                specifiers
                    .filter((specifier) => FORBIDDEN.some((pattern) => pattern.test(specifier)))
                    .map((specifier) => `${relativeToPackage(filePath)} imports "${specifier}"`)
            )
            .sort()

        expect(offenders).toEqual([])
    })

    it("does not import Node built-ins anywhere, including modules the entry point does not reach", async () => {
        const sources = await collectShippedSources(PACKAGE_ROOT)

        const offenders: string[] = []
        for (const filePath of sources) {
            const source = (await readIfPresent(filePath)) ?? ""
            const specifiers = [...source.matchAll(IMPORT_PATTERN)].map((match) => match.groups?.["specifier"] ?? "")

            offenders.push(
                ...specifiers
                    .filter((specifier) => specifier.startsWith("node:"))
                    .map((specifier) => `${relativeToPackage(filePath)} imports "${specifier}"`)
            )
        }

        expect(offenders.sort()).toEqual([])
    })

    it("walks the real import graph, so the check above cannot pass vacuously", async () => {
        const externalsByModule = await collectReachableModules()
        const modules = [...externalsByModule.keys()].map((filePath) => relativeToPackage(filePath))

        expect(modules).toContain("components/Common/MUIDialog.tsx")
        expect(modules).toContain("components/ErrorPage/ErrorPage.tsx")
        expect(modules.length).toBeGreaterThan(50)
    })
})
