import {AgentErrorProps, ChatResponse} from "../../../components/AgentChat/Types"
import {chatMessageFromChunk, checkError, tryParseJson} from "../../../components/AgentChat/Utils"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {withStrictMocks} from "../../common/strictMocks"

describe("AgentChat/Utils/chatMessageFromChunk", () => {
    withStrictMocks()

    it("Should reject unknown message types", () => {
        const chunk: ChatResponse = {
            response: {
                type: ChatMessageType.UNKNOWN,
            },
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).toBeNull()
    })

    it("Should correctly handle known message types", () => {
        const chunk: ChatResponse = {
            response: {
                type: ChatMessageType.AI,
                text: "This is a test message",
            },
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()

        expect(chatMessage.type).toEqual(ChatMessageType.AI)
        expect(chatMessage.text).toEqual("This is a test message")
    })
})

describe("AgentChat/Utils/tryParseJson", () => {
    withStrictMocks()

    it("Should return an object for valid JSON", () => {
        const chunk: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: JSON.stringify({foo: 42}),
            },
        }

        const chatMessage = tryParseJson(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()

        // make sure it's an object
        expect(typeof chatMessage).toBe("object")

        expect(chatMessage).toEqual({foo: 42})
    })

    it("Should return text cleaned up for non-JSON", () => {
        const chunk: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: 'This is a test string with embedded newline \\n and escaped double quote \\"',
            },
        }

        const chatMessage = tryParseJson(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()
        expect(typeof chatMessage).toBe("string")
        expect(chatMessage).toEqual("This is a test string with embedded newline \n and escaped double quote '")
    })
})

describe("AgentChat/Utils/checkError", () => {
    withStrictMocks()

    it("Should return detect an error block", () => {
        const errorText = "This is a test error"
        const traceText = "This is a test trace"
        const toolText = "This is a test tool"
        const result = checkError({
            error: errorText,
            traceback: traceText,
            tool: toolText,
        } as AgentErrorProps)

        expect(typeof result).toBe("string")
        expect(result).toContain("Error occurred")
        expect(result).toContain(errorText)
        expect(result).toContain(traceText)
        expect(result).toContain(toolText)
    })

    it("Should return null for non-errors", () => {
        const result = checkError({
            text: "no errors here",
        })

        expect(result).toBeNull()
    })
})
