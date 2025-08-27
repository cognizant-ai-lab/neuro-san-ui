import {
    getAgentFunction,
    getAgentNetworks,
    getConnectivity,
    sendChatQuery,
    testConnection,
    TestConnectionResult,
} from "../../../controller/agent/Agent"
import {sendLlmRequest} from "../../../controller/llm/LlmChat"
import {
    ApiPaths,
    // eslint-disable-next-line camelcase
    ChatFilterChat_filter_type,
    ChatHistory,
    ChatMessageType,
    ChatRequest,
} from "../../../../../generated/neuro-san/NeuroSanClient"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"

jest.mock("../../../controller/llm/LlmChat")

const NEURO_SAN_EXAMPLE_URL = "https://neuro-san.example.com"
const TEST_AGENT_MATH_GUY = "math_guy"
const TEST_USERNAME = "test-username"

let oldFetch: typeof global.fetch

describe("Controller/Agent/testConnection", () => {
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
})

describe("Controller/Agent/getAgentNetworks", () => {
    beforeEach(() => {
        oldFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = oldFetch
    })

    it("Should fetch and return agent network names", async () => {
        const agents = [{agent_name: "network1"}, {agent_name: "network2"}]
        global.fetch = mockFetch({agents})
        const result = await getAgentNetworks(NEURO_SAN_EXAMPLE_URL)
        expect(result).toEqual(["network1", "network2"])
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
            username
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
        const debugSpy = jest.spyOn(console, "debug").mockImplementation()
        global.fetch = jest.fn(
            () =>
                Promise.resolve({
                    ok: false,
                    statusText: "Not Found",
                    json: () => Promise.resolve({}),
                } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        )
        await expect(getConnectivity(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)).rejects.toThrow(
            "Failed to send connectivity request: Not Found"
        )
        expect(debugSpy).toHaveBeenCalled()
        debugSpy.mockRestore()
    })
})

describe("Controller/Agent/getAgentFunction", () => {
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
        global.fetch = jest.fn(
            () =>
                Promise.resolve({
                    ok: false,
                    statusText: "Bad Request",
                    json: () => Promise.resolve({}),
                } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        )
        await expect(getAgentFunction(NEURO_SAN_EXAMPLE_URL, TEST_AGENT_MATH_GUY, TEST_USERNAME)).rejects.toThrow(
            "Failed to send agent function request: Bad Request"
        )
    })
})
