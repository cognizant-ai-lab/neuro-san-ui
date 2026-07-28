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

import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {
    isAnthropicKeyValid,
    isKeyValidationFailure,
    isOpenAIKeyValid,
    KeyValidationResult,
} from "../../../../controller/llm/Providers"

interface FailedResponseCase {
    vendor: string
    validate: typeof isOpenAIKeyValid
    body: Record<string, unknown>
    expectedMessage: string
}

const FAKE_KEY = "fake-key"
const OK_FALSE = {ok: false}

const spyOnConsoleError = () => vi.spyOn(console, "error").mockImplementation(vi.fn())

describe("Providers controller", () => {
    withStrictMocks()

    it("should return ok for a successful response", async () => {
        global.fetch = mockFetch({})

        const success = {ok: true}
        expect(await isOpenAIKeyValid(FAKE_KEY)).toEqual(success)
        expect(await isAnthropicKeyValid(FAKE_KEY)).toEqual(success)
    })

    it.each<FailedResponseCase>([
        // OpenAI shape: {error: {message}}
        {
            vendor: "OpenAI",
            validate: isOpenAIKeyValid,
            body: {error: {message: "Incorrect API key provided"}},
            expectedMessage: "Incorrect API key provided",
        },
        // Anthropic shape: top-level type plus a nested error
        {
            vendor: "Anthropic",
            validate: isAnthropicKeyValid,
            body: {type: "error", error: {type: "authentication_error", message: "invalid x-api-key"}},
            expectedMessage: "invalid x-api-key",
        },
    ])(
        "should surface the status and error message from a failed $vendor response",
        async ({validate, body, expectedMessage}) => {
            global.fetch = mockFetch(body, false, httpStatus.UNAUTHORIZED)

            expect(await validate(FAKE_KEY)).toEqual({
                ...OK_FALSE,
                status: httpStatus.UNAUTHORIZED,
                message: expectedMessage,
            })
        }
    )

    it("should fall back to just the status when the error body is not valid JSON", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            json: () => Promise.reject(new Error("not json")),
        })

        expect(await isOpenAIKeyValid(FAKE_KEY)).toEqual({...OK_FALSE, status: httpStatus.INTERNAL_SERVER_ERROR})
    })

    it("should handle when fetch throws exceptions", async () => {
        const errorText = "Network error"
        global.fetch = vi.fn().mockRejectedValue(new Error(errorText))
        spyOnConsoleError()

        const failure = {...OK_FALSE, message: errorText}
        expect(await isOpenAIKeyValid(FAKE_KEY)).toMatchObject(failure)
        expect(await isAnthropicKeyValid(FAKE_KEY)).toMatchObject(failure)

        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({message: errorText}))
    })

    it("should stringify a non-Error rejection", async () => {
        global.fetch = vi.fn().mockRejectedValue("boom")
        spyOnConsoleError()

        expect(await isOpenAIKeyValid(FAKE_KEY)).toEqual({...OK_FALSE, message: "boom"})
    })

    it.each<{name: string; result: KeyValidationResult; expected: boolean}>([
        {name: "a failure", result: {ok: false, status: httpStatus.UNAUTHORIZED}, expected: true},
        {name: "a success", result: {ok: true}, expected: false},
    ])("isKeyValidationFailure returns $expected for $name", ({result, expected}) => {
        expect(isKeyValidationFailure(result)).toBe(expected)
    })
})
