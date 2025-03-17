import {LOGS_DELIMITER} from "../../../components/AgentChat/const"
import {AgentErrorProps} from "../../../components/AgentChat/Types"
import {chatMessageFromChunk, checkError, splitLogLine, tryParseJson} from "../../../components/AgentChat/Utils"
import {ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

describe("AgentChat/Utils/splitLogLine", () => {
    it("Should correctly split a log line with delimiter", () => {
        const details = "This is a test log line"
        const logLine = `AgentName${LOGS_DELIMITER}${details}`
        const {summarySentenceCase, logLineDetails} = splitLogLine(logLine, "Agent message")

        // UI "sentence cases" agent names as they tend to come in all caps from neuro-san which is ugly
        expect(summarySentenceCase).toEqual("Agentname")

        expect(logLineDetails).toEqual(details)
    })

    it("Should correctly handle a log line without delimiter", () => {
        // Use a value that intentionally doesn't parse as JSON for this test case
        const logLine = "This is a test log line"
        const {summarySentenceCase, logLineDetails} = splitLogLine(logLine, "Agent message")

        expect(summarySentenceCase).toEqual("Agent message")
        expect(logLineDetails).toEqual(logLine)
    })
})

describe("AgentChat/Utils/chatMessageFromChunk", () => {
    it("Should reject unknown message types", () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.UNKNOWN,
                }),
            }),
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).toBeNull()
    })

    it("Should correctly handle known message types", () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.AI,
                    text: "This is a test message",
                }),
            }),
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()

        expect(chatMessage.type).toEqual(ChatMessageChatMessageType.AI)
        expect(chatMessage.text).toEqual("This is a test message")
    })
})

describe("AgentChat/Utils/tryParseJson", () => {
    it("Should return an object for valid JSON", () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.LEGACY_LOGS,
                    text: JSON.stringify({foo: 42}),
                }),
            }),
        }

        const chatMessage = tryParseJson(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()

        // make sure it's an object
        expect(typeof chatMessage).toBe("object")

        expect(chatMessage).toEqual({foo: 42})
    })

    it("Should return text cleaned up for non-JSON", () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.LEGACY_LOGS,
                    text: 'This is a test string with embedded newline \\n and escaped double quote \\"',
                }),
            }),
        }

        const chatMessage = tryParseJson(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()
        expect(typeof chatMessage).toBe("string")
        expect(chatMessage).toEqual("This is a test string with embedded newline \n and escaped double quote '")
    })
})

describe("AgentChat/Utils/checkError", () => {
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
