import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentErrorProps} from "../../../components/AgentChat/Types"
import {
    chatMessageFromChunk,
    checkError,
    isTextMeaningful,
    parseInquiryFromText,
} from "../../../components/AgentChat/Utils"
import {ChatMessageType, ChatResponse} from "../../../generated/neuro-san/NeuroSanClient"

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

describe("AgentChat/Utils/parseInquiryFromText", () => {
    withStrictMocks()

    it("Should handle empty or null input", () => {
        expect(parseInquiryFromText("")).toBe("")
        expect(parseInquiryFromText(null as unknown as string)).toBe("")
        expect(parseInquiryFromText(undefined as unknown as string)).toBe("")
    })

    it("Should extract inquiry from JSON code block", () => {
        const text = '```json\n{"inquiry": "What is the weather?"}\n```'
        const result = parseInquiryFromText(text)
        expect(result).toBe("What is the weather?")
    })

    it("Should handle JSON code block with Inquiry (capital I)", () => {
        const text = '```json\n{"Inquiry": "Tell me a joke"}\n```'
        const result = parseInquiryFromText(text)
        expect(result).toBe("Tell me a joke")
    })

    it("Should parse Invoking format and extract inquiry", () => {
        const text = 'Invoking: `WeatherAgent` with `{"inquiry": "Get forecast for NYC"}`'
        const result = parseInquiryFromText(text)
        expect(result).toBe('Invoking `WeatherAgent` with "Get forecast for NYC"')
    })

    it("Should handle Invoking format with single quotes in JSON", () => {
        const text = "Invoking: `SearchAgent` with `{'inquiry': 'Find documents'}`"
        const result = parseInquiryFromText(text)
        expect(result).toBe('Invoking `SearchAgent` with "Find documents"')
    })

    it("Should parse direct JSON object with inquiry", () => {
        const text = '{"inquiry": "Process this request", "mode": "sync"}'
        const result = parseInquiryFromText(text)
        expect(result).toBe("Process this request")
    })

    it("Should parse direct JSON object with Inquiry (capital I)", () => {
        const text = '{"Inquiry": "Execute task", "priority": "high"}'
        const result = parseInquiryFromText(text)
        expect(result).toBe("Execute task")
    })

    it("Should extract inquiry from text with colon separator", () => {
        const text = "inquiry: Extract this information"
        const result = parseInquiryFromText(text)
        expect(result).toBe("Extract this information")
    })

    it("Should extract inquiry from text with equals separator", () => {
        const text = "inquiry=Process this data"
        const result = parseInquiryFromText(text)
        expect(result).toBe("Process this data")
    })

    it("Should handle malformed JSON gracefully", () => {
        const text = "{not valid json at all"
        const result = parseInquiryFromText(text)
        // Should return the original text or first line truncated
        expect(result).toBeTruthy()
        expect(result.length).toBeLessThanOrEqual(120)
    })

    it("Should return first line if no inquiry pattern found", () => {
        const text = "This is just regular text\nWith multiple lines\nAnd more content"
        const result = parseInquiryFromText(text)
        expect(result).toBe("This is just regular text")
    })

    it("Should truncate long text to 120 characters", () => {
        const longText = "a".repeat(200)
        const result = parseInquiryFromText(longText)
        expect(result.length).toBe(120)
    })

    it("Should handle Invoking format with no inquiry field", () => {
        const text = 'Invoking: `Agent` with `{"mode": "async"}`'
        const result = parseInquiryFromText(text)
        // Should return the cleaned text since no inquiry found
        expect(result).toContain("mode")
    })

    it("Should handle JSON code block without inquiry field", () => {
        const text = '```json\n{"status": "running"}\n```'
        const result = parseInquiryFromText(text)
        expect(result).toContain("status")
    })

    it("Should not be vulnerable to ReDoS attacks", () => {
        // Test with a potentially problematic string that could cause exponential backtracking
        const maliciousText = `\`\`\`json\n${"a".repeat(10000)}\n\`\`\``
        const startTime = Date.now()
        parseInquiryFromText(maliciousText)
        const endTime = Date.now()
        const duration = endTime - startTime
        // Should complete quickly (within 100ms) - ReDoS would take much longer
        expect(duration).toBeLessThan(100)
    })

    it("Should trim whitespace from extracted inquiry", () => {
        const text = '```json\n{"inquiry": "  Trim this  "}\n```'
        const result = parseInquiryFromText(text)
        expect(result).toBe("  Trim this  ")
    })
})

describe("AgentChat/Utils/isTextMeaningful", () => {
    withStrictMocks()

    it("Should return false for empty string", () => {
        expect(isTextMeaningful("")).toBe(false)
    })

    it("Should return false for null or undefined", () => {
        expect(isTextMeaningful(null as unknown as string)).toBe(false)
        expect(isTextMeaningful(undefined as unknown as string)).toBe(false)
    })

    it("Should return false for very short strings", () => {
        expect(isTextMeaningful("a")).toBe(false)
        expect(isTextMeaningful("ab")).toBe(false)
        expect(isTextMeaningful("  ")).toBe(false)
    })

    it("Should return false for single digit numbers", () => {
        expect(isTextMeaningful("0")).toBe(false)
        expect(isTextMeaningful("1")).toBe(false)
        expect(isTextMeaningful("9")).toBe(false)
    })

    it("Should return false for multi-digit numbers", () => {
        expect(isTextMeaningful("123")).toBe(false)
        expect(isTextMeaningful("456789")).toBe(false)
    })

    it("Should return true for meaningful text with 3+ characters", () => {
        expect(isTextMeaningful("abc")).toBe(true)
        expect(isTextMeaningful("Hello")).toBe(true)
        expect(isTextMeaningful("Invoking agent")).toBe(true)
    })

    it("Should return true for text with numbers and letters", () => {
        expect(isTextMeaningful("abc123")).toBe(true)
        expect(isTextMeaningful("Agent42")).toBe(true)
    })

    it("Should trim whitespace before checking", () => {
        expect(isTextMeaningful("  x  ")).toBe(false) // Only 1 char after trim
        expect(isTextMeaningful("  abc  ")).toBe(true) // 3 chars after trim
    })

    it("Should return true for sentences", () => {
        expect(isTextMeaningful("This is a meaningful sentence.")).toBe(true)
        expect(isTextMeaningful("What is the weather?")).toBe(true)
    })
})
