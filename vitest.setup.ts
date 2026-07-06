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

    // Just a stub for testing so disable warnings
    /* eslint-disable-next-line
        no-empty-function,@typescript-eslint/no-empty-function,@typescript-eslint/class-methods-use-this */
    unobserve() {}

    // Just a stub for testing so disable warnings
    /* eslint-disable-next-line
        no-empty-function,@typescript-eslint/no-empty-function,@typescript-eslint/class-methods-use-this */
    disconnect() {}
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

// Not available in JSDom. See: https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Make tests fail if any output is sent to the console
failOnConsole({
    shouldFailOnAssert: true,
    shouldFailOnDebug: true,
    shouldFailOnError: true,
    shouldFailOnInfo: true,
    shouldFailOnLog: true,
    shouldFailOnWarn: true,
})
