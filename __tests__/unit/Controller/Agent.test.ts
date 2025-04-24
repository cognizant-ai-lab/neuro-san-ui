import {sendChatQuery} from "../../../controller/agent/agent"
import {sendLlmRequest} from "../../../controller/llm/llm_chat"
import {ChatFilterType} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

jest.mock("../../../controller/llm/llm_chat")

const TEST_AGENT_MATH_GUY = "Math Guy"

describe("Controller/Agent/sendChatQuery", () => {
    beforeEach(() => {
        jest.resetAllMocks()
    })

    it("Should correctly construct and send a request", async () => {
        const abortSignal = new AbortController().signal

        const callbackMock = jest.fn()
        const testQuery = "test query with special characters: !@#$%^&*()_+"
        const testUser = "test user"
        await sendChatQuery(abortSignal, testQuery, testUser, TEST_AGENT_MATH_GUY, callbackMock, {
            chatHistories: [],
        })
        expect(sendLlmRequest).toHaveBeenCalledTimes(1)

        const expectedRequestParams = {
            request: {
                chat_context: {},
                chat_filter: {chat_filter_type: ChatFilterType.MAXIMAL},
                user_message: {
                    type: ChatMessageChatMessageType.HUMAN,
                    text: testQuery,
                },
            },
            target_agent: TEST_AGENT_MATH_GUY,
            // TODO: Need to figure this one out
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
