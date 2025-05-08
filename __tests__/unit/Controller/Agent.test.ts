import {ChatRequest} from "../../../components/AgentChat/Types"
import {sendChatQuery} from "../../../controller/agent/Agent"
import {sendLlmRequest} from "../../../controller/llm/LlmChat"
// eslint-disable-next-line camelcase
import {ChatFilterChat_filter_type, ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {withStrictMocks} from "../../common/strictMocks"

jest.mock("../../../controller/llm/LlmChat")

const TEST_AGENT_MATH_GUY = "Math Guy"

describe("Controller/Agent/sendChatQuery", () => {
    withStrictMocks()

    it("Should correctly construct and send a request", async () => {
        const abortSignal = new AbortController().signal

        const callbackMock = jest.fn()
        const testQuery = "test query with special characters: !@#$%^&*()_+"
        const testUser = "test user"
        await sendChatQuery(
            abortSignal,
            testQuery,
            TEST_AGENT_MATH_GUY,
            callbackMock,
            {
                chat_histories: [],
            },
            // TODO: ugly cast due to how openapi-typescript generates `object` types. What to do here?
            {login: testUser} as unknown as Record<string, never>
        )
        expect(sendLlmRequest).toHaveBeenCalledTimes(1)

        const expectedRequestParams: ChatRequest = {
            chat_context: {chat_histories: []},
            // eslint-disable-next-line camelcase
            chat_filter: {chat_filter_type: ChatFilterChat_filter_type.MAXIMAL},
            user_message: {
                type: ChatMessageType.HUMAN,
                text: testQuery,
            },
            sly_data: {login: testUser} as unknown as Record<string, never>,
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
