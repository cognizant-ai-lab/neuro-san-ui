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

import {act, renderHook} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {useLocalStorage} from "../../../utils/useLocalStorage"

type Cyclic = {self?: Cyclic}

describe("useLocalStorage", () => {
    withStrictMocks()

    beforeEach(() => {
        window.localStorage.clear()
    })

    it("should return initial value if localStorage is empty", () => {
        const initialValue = "init"
        const {result} = renderHook(() => useLocalStorage("key", initialValue))
        expect(result.current[0]).toBe(initialValue)
    })

    it("should return value from localStorage if present", () => {
        const storedValue = "stored"
        const itemKey = "key"
        window.localStorage.setItem(itemKey, JSON.stringify(storedValue))
        const {result} = renderHook(() => useLocalStorage(itemKey, "init"))
        expect(result.current[0]).toBe(storedValue)
    })

    it("should update localStorage when setValue is called", () => {
        const itemKey = "key"
        const {result} = renderHook(() => useLocalStorage(itemKey, "init"))
        const newValue = "newValue"
        act(() => {
            result.current[1](newValue)
        })
        expect(window.localStorage.getItem(itemKey)).toBe(JSON.stringify(newValue))
        expect(result.current[0]).toBe(newValue)
    })

    it("should support functional updates", () => {
        const itemKey = "key"
        const initialValue = 1
        const {result} = renderHook(() => useLocalStorage(itemKey, initialValue))
        act(() => {
            result.current[1]((prev: number) => prev + 1)
        })
        expect(window.localStorage.getItem(itemKey)).toBe(JSON.stringify(initialValue + 1))
        expect(result.current[0]).toBe(2)
    })

    it("should return initial value and not throw when localStorage contains invalid JSON", () => {
        const itemKey = "bad-json"
        const initialValue = {a: 1}
        // Put invalid JSON into localStorage
        window.localStorage.setItem(itemKey, "not-a-json")

        const consoleSpy = jest.spyOn(console, "error").mockImplementation()
        const {result} = renderHook(() => useLocalStorage(itemKey, initialValue))
        expect(result.current[0]).toEqual(initialValue)
        // If JSON.parse throws, the hook should catch and log the error
        expect(consoleSpy).toHaveBeenCalled()

        const firstArg = consoleSpy.mock.calls[0][0]
        // Should log the parse error (SyntaxError)
        expect(firstArg).toBeInstanceOf(SyntaxError)
        // Message can vary between environments, so check for known fragments
        expect(firstArg.message).toMatch(/not-a-json|Unexpected token/u)
    })

    it("should catch and log when localStorage.setItem throws during setValue", () => {
        const itemKey = "throw-set"
        const initialValue = "init"

        // Use a cyclic value so JSON.stringify will throw and the catch block runs
        const consoleSpy = jest.spyOn(console, "error").mockImplementation()

        const {result} = renderHook(() => useLocalStorage(itemKey, initialValue))

        const cyclic: Cyclic = {}
        cyclic.self = cyclic

        act(() => {
            // This will set state but JSON.stringify(cyclic) will throw, hitting the catch
            result.current[1](cyclic)
        })

        // state should update to the cyclic object (stored in memory)
        expect(result.current[0]).toBe(cyclic)
        // console.error should have been called because JSON.stringify threw
        expect(consoleSpy).toHaveBeenCalled()

        const errArg = consoleSpy.mock.calls[0][0]
        // JSON.stringify circular structure throws (TypeError in many environments)
        expect(errArg).toBeInstanceOf(Error)
        expect(errArg.message).toMatch(/circular|Converting|circular structure|JSON/u)
    })
})
