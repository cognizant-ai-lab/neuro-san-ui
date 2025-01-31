// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import {
    handleStreamingReceived,
    processLogLine,
    sendStreamingChatRequest,
} from "../../../../components/internal/opportunity_finder/AgentChatHandling"
import {AgentError, LOGS_DELIMITER} from "../../../../components/internal/opportunity_finder/common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "../../../../components/internal/opportunity_finder/const"
import {sendChatQuery} from "../../../../controller/agent/agent"
import {ChatResponse} from "../../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../../generated/neuro_san/api/grpc/chat"

const mockSyntaxHighlighter = jest.fn(({children}) => <div>{children}</div>)

jest.mock("react-syntax-highlighter", () => {
    const actual = jest.requireActual("react-syntax-highlighter")
    return {
        __esModule: true,
        ...actual,
        default: (children) => mockSyntaxHighlighter(children),
    }
})

// Mock the agent module
jest.mock("../../../../controller/agent/agent")

describe("processLogLine", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("Should generate a section for a normal log line", () => {
        // Use a value that intentionally doesn't parse as JSON for this test case
        const logLineDetails = "[]This is a test log line"
        const logLine = `AgentName${LOGS_DELIMITER}${logLineDetails}`
        const result = processLogLine(logLine, null)

        render(result)

        // UI "sentence cases" agent names as they tend to come in all caps from neuro-san which is ugly
        expect(screen.getByText("Agentname")).toBeInTheDocument()
        expect(screen.getByText("[]This is a test log line")).toBeInTheDocument()
    })

    it("Should syntax highlight JSON", () => {
        const logLineDetails = JSON.stringify({test: "value"})
        const logLine = `AgentName${LOGS_DELIMITER}${logLineDetails}`
        const result = processLogLine(logLine, null)

        render(result)

        expect(screen.getByText("Agentname")).toBeInTheDocument()
        expect(mockSyntaxHighlighter).toHaveBeenCalledWith(expect.objectContaining({children: logLineDetails}))
    })
})

describe("handleStreamingReceived", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("Should skip unknown message types", () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.UNKNOWN,
                }),
            }),
        }
        const updateOutputMock = jest.fn()
        handleStreamingReceived(JSON.stringify(chunk), null, updateOutputMock, null, null)

        expect(updateOutputMock).not.toHaveBeenCalled()
    })

    it("Should detect an 'orchestration complete' message", async () => {
        const orchestrationCompleteMessage = {
            project_id: 123,
            experiment_id: 456,
        }

        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.AI,
                    text: JSON.stringify(orchestrationCompleteMessage),
                }),
            }),
        }

        const updateOutputMock = jest.fn()
        const projectUrl: {current: URL} = {
            current: null,
        }
        const isAwaitingLlmMock = jest.fn()
        handleStreamingReceived(JSON.stringify(chunk), projectUrl, updateOutputMock, null, isAwaitingLlmMock)

        expect(projectUrl.current.pathname).toContain(`/projects/${orchestrationCompleteMessage.project_id}/`)
        expect(projectUrl.current.pathname).toContain(`/experiments/${orchestrationCompleteMessage.experiment_id}/`)

        // Should have signaled that we are done with the interaction
        expect(isAwaitingLlmMock).toHaveBeenCalledWith(false)

        // Retrieve call to updateOutputMock
        const experimentGeneratedItem = updateOutputMock.mock.calls[0][0]

        // Render the component it was called with
        const {container} = render(experimentGeneratedItem)

        // Check for success message
        expect(await screen.findByText(/Your new experiment has been generated/u)).toBeInTheDocument()

        // Check for expected link
        const anchor = container.querySelector("a")
        expect(anchor).toBeInTheDocument()
        expect(anchor).toHaveAttribute("href", projectUrl.current.toString())
    })

    it("Should detect an 'orchestration failed' message", async () => {
        const orchestrationFailedMessage = {
            error: "This is an error message",
            traceback: "This is a traceback",
            tool: "Orchestration tool",
        }

        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.AI,
                    text: JSON.stringify(orchestrationFailedMessage),
                }),
            }),
        }

        const updateOutputMock = jest.fn()
        const projectUrl: {current: URL} = {
            current: null,
        }
        const isAwaitingLlmMock = jest.fn()
        let caughtError: Error | null = null
        try {
            handleStreamingReceived(JSON.stringify(chunk), projectUrl, updateOutputMock, null, isAwaitingLlmMock)
        } catch (error: unknown) {
            caughtError = error as Error
        }

        expect(caughtError).toBeTruthy()
        expect(caughtError).toBeInstanceOf(AgentError)
        expect(caughtError.message).toContain(orchestrationFailedMessage.error)
        expect(caughtError.message).toContain(orchestrationFailedMessage.traceback)
        expect(caughtError.message).toContain(orchestrationFailedMessage.tool)

        // Should have signaled that we are done with the interaction
        expect(isAwaitingLlmMock).toHaveBeenCalledWith(false)
    })

    it("Should handle a non-JSON chat message", async () => {
        const chunk = {
            result: ChatResponse.fromPartial({
                response: ChatMessage.fromPartial({
                    type: ChatMessageChatMessageType.AI,
                    text: "[] This is a test message that will not parse as JSON",
                }),
            }),
        }

        const updateOutputMock = jest.fn()
        const projectUrl: {current: URL} = {
            current: null,
        }
        const setAwaitingLlmMock = jest.fn()
        handleStreamingReceived(JSON.stringify(chunk), projectUrl, updateOutputMock, null, setAwaitingLlmMock)

        // It's a plain text chat so we shouldn't have invoked the formatter
        expect(mockSyntaxHighlighter).not.toHaveBeenCalled()

        // Retrieve call to updateOutputMock
        const experimentGeneratedItem = updateOutputMock.mock.calls[0][0]

        // Render the component it was called with
        render(experimentGeneratedItem)

        expect(await screen.findByText(chunk.result.response.text)).toBeInTheDocument()
    })

    describe("sendStreamingChatRequest", () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        it("Should handle chat messages", async () => {
            const projectUrl: {current: URL} = {
                current: null,
            }

            const abortController = {
                current: null,
            }
            const updateOutputMock = jest.fn()
            const setAwaitingLlmMock = jest.fn()

            ;(sendChatQuery as jest.Mock).mockImplementation(async (_signal, _query, _user, callback) => {
                callback()
            })

            await sendStreamingChatRequest(
                projectUrl,
                updateOutputMock,
                setAwaitingLlmMock,
                abortController,
                "testUser",
                "testQuery",
                () => {
                    // signals success
                    projectUrl.current = new URL("http://example.com")
                }
            )

            expect(sendChatQuery).toHaveBeenCalledTimes(1)

            // Should be no errors; only the initial "contacting agents" message
            expect(updateOutputMock).toHaveBeenCalledTimes(1)

            // Retrieve call to updateOutputMock
            const experimentGeneratedItem = updateOutputMock.mock.calls[0][0]

            // Render the component it was called with
            render(experimentGeneratedItem)

            // Check for initial message
            expect(await screen.findByText(/Contacting orchestration agents/u)).toBeInTheDocument()
        })

        it("Should retry when not receiving success message", async () => {
            const projectUrl: {current: URL} = {
                current: null,
            }

            const abortController = {
                current: null,
            }
            const updateOutputMock = jest.fn()
            const setAwaitingLlmMock = jest.fn()

            ;(sendChatQuery as jest.Mock).mockImplementation(async (_signal, _query, _user, callback) => {
                callback("Random chat message")
            })

            await sendStreamingChatRequest(
                projectUrl,
                updateOutputMock,
                setAwaitingLlmMock,
                abortController,
                "testUser",
                "testQuery",
                () => {
                    // Do nothing
                }
            )

            // Should have retried the maximum number of times then given up
            expect(sendChatQuery).toHaveBeenCalledTimes(MAX_ORCHESTRATION_ATTEMPTS)
        })
    })
})
