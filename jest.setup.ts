// eslint-disable-next-line max-classes-per-file
import "@testing-library/jest-dom"
import failOnConsole from "jest-fail-on-console"
// eslint-disable-next-line no-shadow
import {ReadableStream} from "node:stream/web"
import {createElement} from "react"
/*
This next part is a hack to get around "ReferenceError: TextEncoder is not defined" errors when running Jest.
See: https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
 */
// eslint-disable-next-line no-shadow
import {TextDecoder, TextEncoder} from "util"

Object.defineProperties(globalThis, {
    ReadableStream: {value: ReadableStream},
})

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// End of hack

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
        get() {
            return parseFloat(this.style.height) || 1
        },
    },
    offsetWidth: {
        get() {
            return parseFloat(this.style.width) || 1
        },
    },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global.SVGElement as any).prototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
})

// End of hack

// We need to mock the next/config module because it's not available in Jest
jest.mock("next/config", () => () => ({
    publicRuntimeConfig: {
        enableAuthentication: false,
        buildTarget: "all", // Can't use ALL_BUILD_TARGET here due to circular dependency
    },
}))

// Cheesy mock implementation of structuredClone since it's not available in jsdom
// See: https://github.com/jsdom/jsdom/issues/3363
// eslint-disable-next-line unicorn/prefer-structured-clone
global.structuredClone = (val: object) => JSON.parse(JSON.stringify(val))

/* Have to mock these up due to https://github.com/remarkjs/react-markdown/issues/635
 Summary from that ticket:
 "As part of the the version 7 release, the react-markdown is packaged as standard ESM. Despite ESM being standard
 for JavaScript, some tools, including Jest and Electron require some configuration to use ESM."
 And we can't even fix it using `transformIgnorePatterns` due to https:github.com/vercel/next.js/issues/35634 */
/* eslint-disable react/display-name, react/no-multi-comp */
jest.mock(
    "react-markdown",
    () =>
        ({children}) =>
            createElement("div", null, children)
)
jest.mock(
    "rehype-raw",
    () =>
        ({children}) =>
            createElement("div", null, children)
)
jest.mock(
    "rehype-slug",
    () =>
        ({children}) =>
            createElement("div", null, children)
)
jest.mock(
    "remark-gfm",
    () =>
        ({children}) =>
            createElement("div", null, children)
)

/* eslint-enable react/display-name, react/no-multi-comp */

// Doesn't play nicely with jest
jest.mock("pretty-bytes", () => jest.fn((bytes) => `${bytes} bytes`))

// Not available in JSDom. See: https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = jest.fn()

// Polyfill SVGPathElement for testing SVG stuff
if (global.SVGPathElement === undefined) {
    class FakeSVGPathElement {
        // eslint-disable-next-line @typescript-eslint/class-methods-use-this
        getTotalLength(): number {
            return 100
        }

        getPointAtLength(len: number): DOMPoint {
            return {
                x: len,
                y: len,
                z: 0,
                w: 1,
                matrixTransform: () => this as unknown as DOMPoint,
                toJSON: () => ({x: len, y: len, z: 0, w: 1}),
            }
        }
    }

    global.SVGPathElement = FakeSVGPathElement as unknown as typeof SVGPathElement
}

// Make tests fail if any output is sent to the console
failOnConsole({
    shouldFailOnAssert: true,
    shouldFailOnDebug: true,
    shouldFailOnError: true,
    shouldFailOnInfo: true,
    shouldFailOnLog: true,
    shouldFailOnWarn: true,
})
