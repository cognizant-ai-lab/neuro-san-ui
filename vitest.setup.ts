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

// eslint-disable-next-line max-classes-per-file
import "@testing-library/jest-dom/vitest"
import {createElement} from "react"
import failOnConsole from "vitest-fail-on-console"

// Next hack: allows us to test react-flow components.
// See: https://github.com/xyflow/xyflow/issues/716#issuecomment-1246602067
// eslint-disable-next-line no-shadow
class ResizeObserver {
    callback: globalThis.ResizeObserverCallback

    constructor(callback: globalThis.ResizeObserverCallback) {
        this.callback = callback
    }

    observe(target: Element) {
        this.callback([{target} as globalThis.ResizeObserverEntry], this)
    }

    unobserve() {
        return this
    }

    disconnect() {
        return this
    }
}

global.ResizeObserver = ResizeObserver

// eslint-disable-next-line no-shadow
class DOMMatrixReadOnly {
    m22: number

    constructor(transform: string) {
        const scale = /scale\((?<group>[1-9.])\)/u.exec(transform)?.[1]
        this.m22 = scale === undefined ? 1 : Number(scale)
    }
}
// @ts-expect-error For testing only
global.DOMMatrixReadOnly = DOMMatrixReadOnly

Object.defineProperties(global.HTMLElement.prototype, {
    offsetHeight: {
        get: () => 1,
    },
    offsetWidth: {
        get: () => 1,
    },
})

/**
 * Global mock for MUI icons. Why? Because in a couple of places in the code we import the whole MUI Icons barrel
 * via `import * as Icons from "@mui/icons-material"` in order to choose icons dynamically at runtime. This is slow
 * for tests and unnecessary, so we mock the whole module here.
 */

// Tests should use this constant to test for invalid icon names.
export const INVALID_MUI_ICON_NAME = "NonExistentIcon"

vi.mock("@mui/icons-material", () => {
    const moduleBase = {
        __esModule: true,
    }

    const iconCache = new Map<string, unknown>()

    const createMockMuiIcon = (iconName: string) => {
        const MockMuiIcon = (props: Record<string, unknown>) =>
            createElement("svg", {
                ...props,
                "data-testid": (props["data-testid"] as string | undefined) ?? `${iconName}Icon`,
            })

        MockMuiIcon.displayName = `${iconName}Icon`

        return MockMuiIcon
    }

    const getMockIcon = (iconName: string) => {
        if (iconName === INVALID_MUI_ICON_NAME) {
            return undefined
        }

        if (!iconCache.has(iconName)) {
            iconCache.set(iconName, createMockMuiIcon(iconName))
        }

        return iconCache.get(iconName)
    }

    return new Proxy(moduleBase, {
        get: (target, prop) => {
            if (prop === "then") {
                return undefined
            }

            if (prop in target) {
                return target[prop as keyof typeof target]
            }

            return typeof prop === "string" ? getMockIcon(prop) : undefined
        },

        has: (target, prop) => {
            if (prop === "then") {
                return false
            }

            return prop in target || typeof prop === "string"
        },

        getOwnPropertyDescriptor: (target, prop) => {
            // Return undefined for "then" to avoid treating the module as a Promise
            if (prop === "then") {
                return undefined
            }

            return {
                configurable: true,
                enumerable: true,
                value:
                    prop in target
                        ? target[prop as keyof typeof target]
                        : typeof prop === "string"
                          ? getMockIcon(prop)
                          : undefined,
            }
        },
    })
})

// Make tests fail if any output is sent to the console
failOnConsole({
    shouldFailOnAssert: true,
    shouldFailOnDebug: true,
    shouldFailOnError: true,
    shouldFailOnInfo: true,
    shouldFailOnLog: true,
    shouldFailOnWarn: true,
})
