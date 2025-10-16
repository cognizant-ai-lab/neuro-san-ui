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
})
