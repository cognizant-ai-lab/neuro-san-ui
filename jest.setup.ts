// eslint-disable-next-line max-classes-per-file
import "@testing-library/jest-dom"

/*
This next part is a hack to get around "ReferenceError: TextEncoder is not defined" errors when running Jest.
See: https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
 */

// eslint-disable-next-line no-shadow
import {TextDecoder, TextEncoder} from "util"
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// End of hack

// Next hack: allows us to test react-flow components.
// See: https://github.com/xyflow/xyflow/issues/716#issuecomment-1246602067
// eslint-disable-next-line no-shadow
class ResizeObserver {
    // eslint-disable-next-line no-undef
    callback: globalThis.ResizeObserverCallback

    // eslint-disable-next-line no-undef
    constructor(callback: globalThis.ResizeObserverCallback) {
        this.callback = callback
    }

    observe(target: Element) {
        // eslint-disable-next-line no-undef
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
    },
}))

// Cheesy mock implementation of structuredClone since it's not available in jsdom
// See: https://github.com/jsdom/jsdom/issues/3363
global.structuredClone = (val) => JSON.parse(JSON.stringify(val))
