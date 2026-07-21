/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {isAnthropicKeyValid, isOpenAIKeyValid} from "../../../../controller/llm/Providers"

describe("Providers controller", () => {
    withStrictMocks()

    it("should validate keys", async () => {
        // Happy response
        global.fetch = mockFetch({})

        expect(await isOpenAIKeyValid("fake-key")).toEqual({ok: true})
        expect(await isAnthropicKeyValid("fake-key")).toEqual({ok: true})

        // Sad response
        global.fetch = mockFetch({}, false)

        expect(await isOpenAIKeyValid("fake-key")).toMatchObject({ok: false})
        expect(await isAnthropicKeyValid("fake-key")).toMatchObject({ok: false})
    })

    it("should surface the error details from a failed response", async () => {
        // Shape used by Anthropic: top-level type and a nested error
        global.fetch = mockFetch(
            {
                type: "error",
                error: {type: "authentication_error", message: "invalid x-api-key"},
            },
            false
        )

        expect(await isAnthropicKeyValid("fake-key")).toMatchObject({
            ok: false,
            errorType: "authentication_error",
            message: "invalid x-api-key",
        })
    })

    it("should fall back gracefully when the error body is not valid JSON", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error("not json")),
        })

        expect(await isOpenAIKeyValid("fake-key")).toEqual({ok: false, status: 500})
    })

    it("should handle when fetch throws exceptions", async () => {
        const errorText = "Network error"
        global.fetch = vi.fn().mockRejectedValue(new Error(errorText))
        vi.spyOn(console, "error").mockImplementation(vi.fn())

        expect(await isOpenAIKeyValid("fake-key")).toMatchObject({ok: false, message: errorText})
        expect(await isAnthropicKeyValid("fake-key")).toMatchObject({ok: false, message: errorText})

        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({message: errorText}))
    })

    it("should stringify a non-Error rejection", async () => {
        global.fetch = vi.fn().mockRejectedValue("boom")
        vi.spyOn(console, "error").mockImplementation(vi.fn())

        expect(await isOpenAIKeyValid("fake-key")).toEqual({ok: false, message: "boom"})
    })
})
