import {sendChatQuery} from "../../../controller/agent/agent"
import {sendLlmRequest} from "../../../controller/llm/llm_chat"
import {AgentType} from "../../../generated/metadata"
import {ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

jest.mock("../../../controller/llm/llm_chat")

describe("Controller/Agent/sendChatQuery", () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it("Should correctly construct and send a request", async () => {
        const abortSignal = new AbortController().signal

        const callbackMock = jest.fn()
        const testQuery = "test query with special characters: !@#$%^&*()_+"
        const testUser = "test user"
        const testAgent = AgentType.BANKING_OPS
        await sendChatQuery(abortSignal, testQuery, testUser, testAgent, callbackMock, {
            chatHistories: [],
        })
        expect(sendLlmRequest).toHaveBeenCalledTimes(1)

        const expectedRequestParams = {
            request: {chat_context: {}, user_message: {type: ChatMessageChatMessageType.HUMAN, text: testQuery}},
            target_agent: testAgent,
            user: {login: testUser},
        }
        expect(sendLlmRequest).toHaveBeenCalledWith(
            callbackMock,
            abortSignal,
            expect.stringContaining("streaming_chat"),
            expectedRequestParams,
            null
        )
    })
})
