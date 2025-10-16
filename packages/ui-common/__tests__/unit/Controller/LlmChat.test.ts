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

import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {sendLlmRequest} from "../../../controller/llm/LlmChat"

describe("LlmChat", () => {
    withStrictMocks()

    let originalFetch: typeof global.fetch

    beforeEach(() => {
        originalFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it("should invoke the callback for each chunk received", async () => {
        const mockChunks = [new TextEncoder().encode("chunk1"), new TextEncoder().encode("chunk2")]
        let readIndex = 0

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            body: {
                getReader: () => ({
                    async read() {
                        if (readIndex < mockChunks.length) {
                            const returnValue = {done: false, value: mockChunks[readIndex]}
                            readIndex += 1
                            return returnValue
                        }
                        return {done: true, value: undefined}
                    },
                }),
            },
        })

        const callback = jest.fn()
        const result = await sendLlmRequest(callback, null, "dummy URL", {}, "dummy query", [], "dummyUserId")

        // For callbacks, the function returns null
        expect(result).toBeNull()

        expect(callback).toHaveBeenCalledTimes(mockChunks.length)
        expect(callback).toHaveBeenNthCalledWith(1, "chunk1")
    })

    it("should throw if fetch throws", async () => {
        const exceptionText = "Network error"
        global.fetch = jest.fn().mockImplementationOnce(() => {
            throw new Error(exceptionText)
        })
        await expect(sendLlmRequest(null, null, "dummy URL", {}, "dummy query", [], "dummyUserId")).rejects.toThrow(
            exceptionText
        )
    })

    it("should throw if fetch returns an error status", async () => {
        const errorStatus = httpStatus.INTERNAL_SERVER_ERROR
        const errorMessage = "Expected error message"
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: errorStatus,
            statusText: errorMessage,
        })
        await expect(sendLlmRequest(null, null, "dummy URL", {}, "dummy query", [], "dummyUserId")).rejects.toThrow(
            new RegExp(`${errorMessage}.*${errorStatus}`, "u")
        )
    })

    it("should return the JSON payload if no callback supplied", async () => {
        const jsonResult = {result: "success"}
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(jsonResult),
        })

        const result = await sendLlmRequest(null, null, "dummy URL", {}, "dummy query", [], "dummyUserId")
        expect(result).toEqual({result: "success"})
    })
})
