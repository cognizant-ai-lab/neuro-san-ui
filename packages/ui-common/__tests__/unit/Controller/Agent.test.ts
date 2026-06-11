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

import {LIST_NETWORKS_RESPONSE, TEST_AGENT_MATH_GUY} from "../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"
import {AgentNetworkDefinitionEntry, TEMPORARY_NETWORK_FOLDER} from "../../../components/MultiAgentAccelerator/const"
import {
    getAgentFunction,
    getAgentIconSuggestions,
    getAgentNetworks,
    getBrandingSuggestions,
    getConnectivity,
    getNetworkIconSuggestions,
    sendChatQuery,
    sendNetworkDesignerUpdate,
    testConnection,
    TestConnectionResult,
} from "../../../controller/agent/Agent"
import {sendLlmRequest, StreamingUnit} from "../../../controller/llm/LlmChat"
import {
    ApiPaths,
    // eslint-disable-next-line camelcase
    ChatFilterChat_filter_type,
    ChatHistory,
    ChatMessageType,
    ChatRequest,
} from "../../../generated/neuro-san/NeuroSanClient"

jest.mock("../../../controller/llm/LlmChat")

const NEURO_SAN_EXAMPLE_URL = "https://neuro-san.example.com"

const TEST_USERNAME = "test-username"

let oldFetch: typeof global.fetch

describe("Controller/Agent/testConnection", () => {
    withStrictMocks()

    it("Should handle a successful testConnection result", async () => {
        global.fetch = mockFetch({status: "healthy", versions: {"neuro-san": "1.2.3"}})
        const result: TestConnectionResult = await testConnection("www.example.com")
        expect(result.success).toBe(true)
        expect(result.version).toBe("1.2.3")
    })

    it("Should handle an unsuccessful testConnection result", async () => {
        global.fetch = mockFetch({status: "unhealthy"})
        const result: TestConnectionResult = await testConnection("www.example.com")
        expect(result.success).toBe(false)

        // If "fetch" throws, that should be considered unsuccessful too
        global.fetch = jest.fn(() => {
            throw new Error("Fetch failed")
        })

        const result2: TestConnectionResult = await testConnection("www.example.com")
        expect(result2.success).toBe(false)
    })

    it("Should handle a non-ok response from fetch", async () => {
        global.fetch = mockFetch({}, false)

        const result: TestConnectionResult = await testConnection("www.example.com")
        expect(result.success).toBe(false)
    })

    it("Should abort and report failure when the request exceeds the timeout", async () => {
        jest.useFakeTimers()

        // A fetch that only settles when its AbortSignal fires — simulates a hung request.
        global.fetch = jest.fn(
            (_url, options) =>
                new Promise<Response>((_resolve, reject) => {
                    options?.signal?.addEventListener("abort", () =>
                        reject(new DOMException("The operation was aborted", "AbortError"))
                    )
                })
        )

        const resultPromise = testConnection("https://slow.example.com")

        // Fire the 2.5s timeout, which triggers controller.abort() → fetch rejects.
        jest.advanceTimersByTime(2500)

        const result = await resultPromise
        expect(result.success).toBe(false)
        expect(result.status).toContain("aborted")

        jest.useRealTimers()
    })
})

describe("Controller/Agent/getAgentNetworks", () => {
    withStrictMocks()

    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    it("Should fetch and return agent network names", async () => {
        const agents = LIST_NETWORKS_RESPONSE
        global.fetch = mockFetch({agents})
        const result = await getAgentNetworks(NEURO_SAN_EXAMPLE_URL)
        expect(result).toEqual(LIST_NETWORKS_RESPONSE)
        expect(global.fetch).toHaveBeenCalledWith(`${NEURO_SAN_EXAMPLE_URL}${ApiPaths.ConciergeService_List}`)
    })
})

describe("Controller/Agent/sendChatQuery", () => {
    withStrictMocks()

    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    const testQuery = "test query with special characters: !@#$%^&*()_+"
    const testUser = "test user"
    const chatContext = {chat_histories: [] as ChatHistory[]}
    // TODO: ugly cast due to how openapi-typescript generates object types. What to do here?
    const slyData = {login: testUser}

    const expectedRequestParams: ChatRequest = {
        chat_context: chatContext,
        // eslint-disable-next-line camelcase
        chat_filter: {chat_filter_type: ChatFilterChat_filter_type.MAXIMAL},
        user_message: {
            type: ChatMessageType.HUMAN,
            text: testQuery,
        },
        sly_data: slyData,
    }

    const runSentChatQueryTest = async (username: string | null, mockChunks: boolean) => {
        const abortSignal = new AbortController().signal
        const callbackMock = jest.fn()

        if (mockChunks) {
            ;(sendLlmRequest as jest.Mock).mockImplementation((callback) => {
                callback("line 1 of mocked chunk data\nline 2 of mocked chunk data\n")
            })
        }

        await sendChatQuery(
            NEURO_SAN_EXAMPLE_URL,
            abortSignal,
            testQuery,
            TEST_AGENT_MATH_GUY,
            callbackMock,
            chatContext,
            slyData,
            username
        )

        expect(sendLlmRequest).toHaveBeenCalledTimes(1)
        expect(sendLlmRequest).toHaveBeenCalledWith(
            expect.any(Function),
            abortSignal,
            expect.stringMatching(new RegExp(`${TEST_AGENT_MATH_GUY}.*streaming_chat`, "u")),
            expectedRequestParams,
            null,
            null,
            username,
            StreamingUnit.Chunk
        )

        if (mockChunks) {
            expect(callbackMock).toHaveBeenCalledTimes(2)
            expect(callbackMock).toHaveBeenCalledWith("line 1 of mocked chunk data")
            expect(callbackMock).toHaveBeenCalledWith("line 2 of mocked chunk data")
        }
    }

    // eslint-disable-next-line jest/expect-expect
    it.each([
        ["should correctly construct and send a request", TEST_USERNAME, true],
        ["should correctly send a request without a user ID", null, false],
    ])("%s", async (_desc, username, mockChunks) => {
        await runSentChatQueryTest(username, mockChunks)
    })
})

describe("Controller/Agent/getConnectivity", () => {
    withStrictMocks()

    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    it("Should fetch and return connectivity info", async () => {
        const mockConnectivity = {connections: [{id: "foo"}]}
        global.fetch = mockFetch(mockConnectivity)
        const result = await getConnectivity(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)
        expect(result).toEqual(mockConnectivity)
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(TEST_AGENT_MATH_GUY),
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                    user_id: TEST_USERNAME,
                }),
            })
        )
    })

    it("Should throw on non-ok response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                statusText: "Not Found",
                json: () => Promise.resolve({}),
            } as unknown as Response)
        )
        await expect(getConnectivity(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)).rejects.toThrow(
            "Failed to send connectivity request: Not Found"
        )

        // Make sure getConnectivity logged the error to the console
        expect(errorSpy).toHaveBeenCalled()
    })

    it("Should strip the temporary/ prefix from the network name before calling the server", async () => {
        global.fetch = mockFetch({connections: []})

        await getConnectivity(
            NEURO_SAN_EXAMPLE_URL,
            `${TEMPORARY_NETWORK_FOLDER}/${TEST_AGENT_MATH_GUY}`,
            TEST_USERNAME
        )

        // The server doesn't know about the "temporary/" UI convention, so it must be removed from the path.
        const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
        expect(calledUrl).toContain(TEST_AGENT_MATH_GUY)
        expect(calledUrl).not.toContain(`${TEMPORARY_NETWORK_FOLDER}/`)
    })
})

describe("Controller/Agent/getAgentFunction", () => {
    withStrictMocks()

    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    it("Should fetch and return agent function info", async () => {
        const mockFunction = {description: "Does math"}
        global.fetch = mockFetch(mockFunction)
        const result = await getAgentFunction(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)
        expect(result).toEqual(mockFunction)
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(TEST_AGENT_MATH_GUY),
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                    user_id: TEST_USERNAME,
                }),
            })
        )
    })

    it("Should fetch and return agent function info without user id", async () => {
        const mockFunction = {description: "Does math"}
        global.fetch = mockFetch(mockFunction)
        const result = await getAgentFunction(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, null)
        expect(result).toEqual(mockFunction)
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(TEST_AGENT_MATH_GUY),
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    "Content-Type": "application/json",
                }),
            })
        )
    })

    it("Should throw on non-ok response", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                statusText: "Bad Request",
                json: () => Promise.resolve({}),
            } as unknown as Response)
        )
        await expect(getAgentFunction(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)).rejects.toThrow(
            "Failed to send agent function request: Bad Request"
        )
    })
})

describe("Controller/Agent/sendNetworkDesignerUpdate", () => {
    withStrictMocks()

    it("calls sendChatQuery with the designer agent ID and correct sly_data", async () => {
        const signal = new AbortController().signal
        const onChunk = jest.fn()
        const updated: AgentNetworkDefinitionEntry[] = [{origin: "myAgent", tools: [], instructions: "Do stuff."}]

        ;(sendLlmRequest as jest.Mock).mockImplementation((callback) => {
            callback("chunk1")
        })

        await sendNetworkDesignerUpdate(
            NEURO_SAN_EXAMPLE_URL,
            signal,
            "myAgent",
            updated,
            "my_network",
            TEST_USERNAME,
            onChunk
        )

        expect(sendLlmRequest).toHaveBeenCalledTimes(1)
        const callArgs = (sendLlmRequest as jest.Mock).mock.calls[0]
        const fetchUrl = callArgs[2]
        const requestBody = callArgs[3]
        expect(fetchUrl).toContain("agent_network_designer")
        expect(requestBody).toMatchObject({
            sly_data: expect.objectContaining({
                agent_network_definition: updated,
                agent_network_name: "my_network",
                skip_designer: true,
            }),
        })
        expect(onChunk).toHaveBeenCalledWith("chunk1")
    })

    it("omits agent_network_name from sly_data when not provided", async () => {
        const signal = new AbortController().signal
        const updated: AgentNetworkDefinitionEntry[] = [{origin: "myAgent", tools: []}]

        ;(sendLlmRequest as jest.Mock).mockResolvedValue(undefined)

        await sendNetworkDesignerUpdate(
            NEURO_SAN_EXAMPLE_URL,
            signal,
            "myAgent",
            updated,
            undefined,
            TEST_USERNAME,
            jest.fn()
        )

        const requestBody = (sendLlmRequest as jest.Mock).mock.calls[0][3]
        expect(requestBody.sly_data).not.toHaveProperty("agent_network_name")
    })
})

describe("Controller/Agent suggestion endpoints (postJsonRequest)", () => {
    withStrictMocks()

    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    it("getNetworkIconSuggestions POSTs the networks and returns the suggestions", async () => {
        const suggestions = {"test-agents/math-guy": "Calculate"}
        global.fetch = mockFetch(suggestions)

        const result = await getNetworkIconSuggestions(LIST_NETWORKS_RESPONSE)

        expect(result).toEqual(suggestions)
        expect(global.fetch).toHaveBeenCalledWith(
            "/api/networkIconSuggestions",
            expect.objectContaining({
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({networks: LIST_NETWORKS_RESPONSE}),
            })
        )
    })

    it("getAgentIconSuggestions POSTs the connectivity info and returns the suggestions", async () => {
        const suggestions = {agent1: "SmartToy"}
        global.fetch = mockFetch(suggestions)
        const connectivity = {connectivity_info: [{origin: "agent1", tools: [] as string[]}], metadata: {foo: "bar"}}

        const result = await getAgentIconSuggestions(connectivity)

        expect(result).toEqual(suggestions)
        expect(global.fetch).toHaveBeenCalledWith(
            "/api/agentIconSuggestions",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    connectivity_info: connectivity.connectivity_info,
                    metadata: connectivity.metadata,
                }),
            })
        )
    })

    it("getBrandingSuggestions POSTs the company name and returns the suggestions", async () => {
        const suggestions = {primary: "#123456"}
        global.fetch = mockFetch(suggestions)

        const result = await getBrandingSuggestions("Acme")

        expect(result).toEqual(suggestions)
        expect(global.fetch).toHaveBeenCalledWith(
            "/api/branding",
            expect.objectContaining({method: "POST", body: JSON.stringify({company: "Acme"})})
        )
    })

    it("throws the error field from the response body when present", async () => {
        global.fetch = mockFetch({error: "LLM unavailable"})
        await expect(getBrandingSuggestions("Acme")).rejects.toThrow("LLM unavailable")
    })

    it("throws the statusText when the response is not ok and has no error field", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                statusText: "Internal Server Error",
                json: () => Promise.resolve({}),
            } as unknown as Response)
        )
        await expect(getNetworkIconSuggestions(LIST_NETWORKS_RESPONSE)).rejects.toThrow("Internal Server Error")
    })
})
