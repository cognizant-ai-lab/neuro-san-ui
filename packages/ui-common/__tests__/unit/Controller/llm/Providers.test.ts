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

        expect(await isOpenAIKeyValid("fake-key")).toBe(true)
        expect(await isAnthropicKeyValid("fake-key")).toBe(true)

        // Sad response
        global.fetch = mockFetch({}, false)

        expect(await isOpenAIKeyValid("fake-key")).toBe(false)
        expect(await isAnthropicKeyValid("fake-key")).toBe(false)
    })

    it("should handle when fetch throws exceptions", async () => {
        const errorText = "Network error"
        global.fetch = jest.fn().mockRejectedValue(new Error(errorText))
        jest.spyOn(console, "error").mockImplementation()

        expect(await isOpenAIKeyValid("fake-key")).toBe(false)
        expect(await isAnthropicKeyValid("fake-key")).toBe(false)

        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({message: errorText}))
    })
})
