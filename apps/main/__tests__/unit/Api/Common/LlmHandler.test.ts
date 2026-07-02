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

import {ChatPromptTemplate} from "@langchain/core/prompts"
import {ChatOpenAI} from "@langchain/openai"
import httpStatus from "http-status"
import {createMocks} from "node-mocks-http"
import {describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../../../__tests__/common/vitest/strictMocks"
import {handleLLMRequest} from "../../../../pages/api/Common/LlmHandler"

vi.mock("@langchain/openai")

describe("LlmHandler", () => {
    withStrictMocks()

    it("Handles a valid request", async () => {
        const {req, res} = createMocks({
            method: "POST",
        })

        process.env["OPENAI_API_KEY"] = "test-api-key"

        await handleLLMRequest(req, res, {
            extractVariables: (): Record<string, unknown> => undefined,
            promptTemplate: ChatPromptTemplate.fromTemplate("Test prompt"),
        })

        expect(res._getJSONData()).toBeTruthy()
    })

    it("Returns an error if OpenAPI key is missing", async () => {
        const {req, res} = createMocks({
            method: "POST",
        })

        delete process.env["OPENAI_API_KEY"]

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        await handleLLMRequest(req, res, {
            extractVariables: (): Record<string, unknown> => undefined,
            promptTemplate: undefined,
        })

        expect(res._getStatusCode()).toBe(httpStatus.INTERNAL_SERVER_ERROR)
        expect(res._getJSONData()).toEqual({error: expect.stringContaining("OpenAI Key")})
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("OpenAI Key"))
    })

    it("Returns an error if method is not allowed", async () => {
        const {req, res} = createMocks({
            method: "PATCH",
        })

        await handleLLMRequest(req, res, {
            extractVariables: (): Record<string, unknown> => undefined,
            promptTemplate: undefined,
        })

        expect(res._getStatusCode()).toBe(httpStatus.METHOD_NOT_ALLOWED)
        expect(res._getJSONData()).toEqual({error: expect.stringContaining("Method not allowed")})
    })

    it("Returns an error if exception is thrown", async () => {
        const {req, res} = createMocks({
            method: "POST",
        })

        process.env["OPENAI_API_KEY"] = "test-api-key"

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        // This cannot be an arrow function as it will be new'd by the module under test, and you can't do that with
        // arrow functions.
        // eslint-disable-next-line prefer-arrow-callback,prefer-arrow-functions/prefer-arrow-functions
        vi.mocked(ChatOpenAI).mockImplementation(function () {
            return {
                invoke: vi.fn().mockRejectedValue(new Error("Expected error")),
            }
        })

        await handleLLMRequest(req, res, {
            extractVariables: (): Record<string, unknown> => ({}),
            promptTemplate: ChatPromptTemplate.fromTemplate("Test prompt"),
        })

        expect(res._getStatusCode()).toBe(httpStatus.INTERNAL_SERVER_ERROR)
        expect(res._getJSONData()).toEqual({error: expect.stringContaining("Failed to get LLM response")})
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Error:",
            expect.objectContaining({
                message: "Expected error",
            })
        )
    })
})
