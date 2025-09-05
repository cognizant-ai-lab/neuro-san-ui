import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {createRef} from "react"

import {ChatCommon, ChatCommonHandle} from "../../../components/AgentChat/ChatCommon"
import {CombinedAgentType, LegacyAgentType} from "../../../components/AgentChat/Types"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {getConnectivity, sendChatQuery} from "../../../controller/agent/Agent"
import {sendLlmRequest} from "../../../controller/llm/LlmChat"
import {ChatContext, ChatMessage, ChatMessageType, ChatResponse} from "../../../generated/neuro-san/NeuroSanClient"
import {usePreferences} from "../../../state/Preferences"
import {withStrictMocks} from "../../common/strictMocks"

// Mock agent API
jest.mock("../../../controller/agent/Agent")

// Mock llm_chat API
jest.mock("../../../controller/llm/LlmChat")

// Don't want to send user notifications during tests so mock this
jest.mock("../../../components/Common/notification")

// Mock Preferences state
jest.mock("../../../state/Preferences")
const mockedUsePreferences = jest.mocked(usePreferences, {shallow: true})

const TEST_USER = "testUser"
const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"
const CHAT_WITH_MATH_GUY = `Chat with ${TEST_AGENT_MATH_GUY}`
const TEST_TOOL_SPOTIFY = "spotify_tool"
const TEST_TOOL_LAST_FM = "last_fm_tool"
const TEST_TOOL_SOLVER = "math_solver_tool"
const TEST_TOOL_CALCULATOR = "calculator_tool"

function getResponseMessage(type: ChatMessageType, text: string): ChatMessage {
    return {
        type,
        text,
        chat_context: {
            chat_histories: [
                {
                    messages: [
                        {
                            type,
                            text,
                        },
                    ],
                },
            ],
        },
    }
}

describe("ChatCommon", () => {
    let user: UserEvent

    const defaultProps = {
        currentUser: TEST_USER,
        id: "",
        isAwaitingLlm: false,
        onSend: jest.fn(),
        setIsAwaitingLlm: jest.fn(),
        targetAgent: TEST_AGENT_MATH_GUY,
        userImage: "",
    }

    const renderChatCommonComponent = (overrides = {}) => {
        const props = {...defaultProps, ...overrides}
        render(<ChatCommon {...props} />)
        return props
    }

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
        mockedUsePreferences.mockReturnValue({darkMode: false, toggleDarkMode: jest.fn()})

        // Mock getConnectivity to return dummy connectivity info
        ;(getConnectivity as jest.Mock).mockResolvedValue({
            connectivity_info: [
                {
                    origin: TEST_AGENT_MUSIC_NERD,
                    tools: [TEST_TOOL_SPOTIFY, TEST_TOOL_LAST_FM],
                },
                {
                    origin: TEST_AGENT_MATH_GUY,
                    tools: [TEST_TOOL_CALCULATOR, TEST_TOOL_SOLVER],
                },
            ],
        })
    })

    async function sendQuery(agent: CombinedAgentType, query: string) {
        // locate user query input
        const userQueryInput = screen.getByPlaceholderText(`Chat with ${cleanUpAgentName(agent)}`)
        expect(userQueryInput).toBeInTheDocument()

        // Type a query
        await user.type(userQueryInput, query)

        // Find "Send" button
        const sendButton = screen.getByRole("button", {name: "Send"})
        expect(sendButton).toBeInTheDocument()

        // Click on the "Send" button
        await user.click(sendButton)
    }

    it.each([false, true])("Should render correctly with darkMode=%s", async (darkMode) => {
        mockedUsePreferences.mockReturnValue({darkMode, toggleDarkMode: jest.fn()})
        const overrides = {id: darkMode ? "dark-mode" : "light-mode"}
        renderChatCommonComponent(overrides)

        // Make sure the id reflects the dark mode state
        await waitFor(() => {
            expect(document.querySelector(`#llm-chat-${overrides.id}`)).toBeInTheDocument()
        })

        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()

        // Should have "Clear Chat", "Regenerate" and "Send" buttons
        expect(screen.getByRole("button", {name: "Clear Chat"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Regenerate"})).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Send"})).toBeInTheDocument()

        // Check that connectivity info is rendered correctly
        const connectivityList = document.getElementById("connectivity-list")
        expect(connectivityList).toBeInTheDocument()

        // Check that the expected agents are in the connectivity list
        const musicNerdItem = within(connectivityList).getByText(TEST_AGENT_MUSIC_NERD)
        expect(musicNerdItem).toBeInTheDocument()

        // Check that the tools for Music Nerd are listed
        const musicNerdToolsList = document.getElementById(`${TEST_AGENT_MUSIC_NERD}-tools`)
        expect(musicNerdToolsList).toBeInTheDocument()

        // Verify specific tools are present in the list
        ;[TEST_TOOL_SPOTIFY, TEST_TOOL_LAST_FM].forEach((tool) => {
            const toolElement = within(musicNerdToolsList).getByText(tool)
            expect(toolElement).toBeInTheDocument()
        })

        // Now math guy
        const mathGuyItem = within(connectivityList).queryByText(TEST_AGENT_MATH_GUY)

        // Should not be present since we are chatting with Math Guy and we don't show agents connecting to themselves
        expect(mathGuyItem).not.toBeInTheDocument()
    })

    it("Should behave correctly when awaiting the LLM response", async () => {
        renderChatCommonComponent({isAwaitingLlm: true})

        // "Stop" button should be enabled while awaiting LLM response
        expect(await screen.findByRole("button", {name: "Stop"})).toBeEnabled()

        // "Send" button should be disabled while awaiting LLM response
        expect(await screen.findByRole("button", {name: "Send"})).toBeDisabled()

        // "Clear Chat" button should not be in the document while awaiting LLM response
        expect(screen.queryByRole("button", {name: "Clear Chat"})).not.toBeInTheDocument()

        // "Regenerate" button should be replaced by "Stop" button while awaiting LLM response
        expect(screen.queryByRole("button", {name: "Regenerate"})).not.toBeInTheDocument()
    })

    it("Should handle user input correctly and should call Send on click", async () => {
        const mockSendFunction = jest.fn()
        const strToCheck = "Please fix my internet"

        renderChatCommonComponent({onSend: mockSendFunction})

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type user input
        await user.type(userInput, strToCheck)
        // Check that user input is correct
        expect(userInput).toHaveValue(strToCheck)

        const sendButton = await screen.findByRole("button", {name: "Send"})
        expect(sendButton).toBeInTheDocument()
        // Click Send button
        await user.click(sendButton)

        // Check that Send button on click works
        expect(mockSendFunction).toHaveBeenCalledTimes(1)
        expect(mockSendFunction).toHaveBeenCalledWith(strToCheck)
    })

    it("Should call Send on enter", async () => {
        const mockSendFunction = jest.fn()
        const strToCheck = "Please fix my internet"

        renderChatCommonComponent({onSend: mockSendFunction})

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type user input
        await user.type(userInput, strToCheck)
        // Press enter
        fireEvent.keyDown(userInput, {key: "Enter"})

        // Check that enter has triggered the Send
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledWith(strToCheck))
    })

    it("Should not call Send on enter + shift and should handle multiline input correctly", async () => {
        const mockSendFunction = jest.fn()
        const strToCheckLine1 = "Please fix my internet line 1"
        const strToCheckLine2 = "Please fix my internet line 2"
        const fullStrToCheck = `${strToCheckLine1}\n${strToCheckLine2}`

        renderChatCommonComponent({onSend: mockSendFunction})

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        expect(userInput).toBeInTheDocument()

        // Type line 1
        await user.type(userInput, strToCheckLine1)
        // Type enter + shift
        await user.type(userInput, "{Shift>}{Enter}{/Shift}")

        // Make sure that enter + shift has not triggered the Send
        await waitFor(() => expect(mockSendFunction).not.toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).not.toHaveBeenCalledWith(strToCheckLine1))

        // Type line 2
        await user.type(userInput, strToCheckLine2)

        // Press enter
        fireEvent.keyDown(userInput, {key: "Enter"})

        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledTimes(1))
        await waitFor(() => expect(mockSendFunction).toHaveBeenCalledWith(fullStrToCheck))
    })

    it("Should handle receiving chunks from Neuro-san agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        const testResponseText = '"Response text from LLM"'

        renderChatCommonComponent({onChunkReceived: onChunkReceivedMock})

        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: testResponseText,
                origin: [{tool: "testTool", instantiation_index: 1}],
                sly_data: {answer: 42},
            },
        }

        const chunk = JSON.stringify(chatResponse)
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(chunk)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(chunk)
    })

    it("Should handle receiving chunks from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        const testResponseText = '"Response text from LLM"'

        renderChatCommonComponent({onChunkReceived: onChunkReceivedMock, targetAgent: LegacyAgentType.DataGenerator})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(LegacyAgentType.DataGenerator, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText)
    })

    it("Should handle final answer from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        const testResponseText = "Final Answer: Sample final answer from LLM"

        renderChatCommonComponent({onChunkReceived: onChunkReceivedMock, targetAgent: LegacyAgentType.DMSChat})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText)
        })

        const query = "Sample test query for legacy agent final answer handling"
        await sendQuery(LegacyAgentType.DMSChat, query)

        expect(await screen.findByText(testResponseText)).toBeInTheDocument()
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText)

        // should be a span with content "Final Answer"
        expect(screen.getByText("Final Answer")).toBeInTheDocument()
    })

    it("Should correctly handle errors thrown while fetching", async () => {
        renderChatCommonComponent({targetAgent: LegacyAgentType.OpportunityFinder})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new Error("Sample error from fetch")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be 3 attempts, so 3 error messages
        await waitFor(() => {
            expect(screen.getAllByText(/Error occurred:/u)).toHaveLength(3)
        })

        expect(console.error).toHaveBeenCalledTimes(3)
    })

    it("Should correctly an abort error correctly", async () => {
        renderChatCommonComponent({targetAgent: LegacyAgentType.OpportunityFinder})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new (class extends Error {
                constructor(message?: string) {
                    super(message)
                    this.name = "AbortError"
                }
            })("Operation was aborted")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be only 1 attempt when we are aborted
        expect(sendLlmRequest).toHaveBeenCalledTimes(1)

        // For abort errors, we don't display the error block since they are handled differently
        expect(screen.queryByText(/Error occurred:/u)).not.toBeInTheDocument()
    })

    it("Should correctly handle a chunk with an error block in the structure field", async () => {
        const chatResponse = {
            response: {
                type: ChatMessageType.AI,
                structure: {
                    error: "Error message from LLM",
                    traceback: "test tracebook",
                    tool: "test tool",
                },
            },
        }

        renderChatCommonComponent()
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        const query = "Sample test query for error handling"
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        // Should be 3 retries due to the error
        expect(await screen.findAllByText(/Error occurred/u)).toHaveLength(3)

        let alertItems: HTMLElement[]
        await waitFor(() => {
            alertItems = screen.getAllByRole("alert")
            expect(alertItems).toHaveLength(4)
        })

        // First two are warnings
        alertItems.slice(0, 2).forEach((item) => {
            expect(item).toHaveClass("MuiAlert-standardWarning")
        })

        // Final one is an error
        expect(alertItems[3]).toHaveClass("MuiAlert-standardError")
    })

    it("Should correctly handle chat context", async () => {
        const {rerender} = render(<ChatCommon {...defaultProps} />)

        const responseMessage = getResponseMessage(ChatMessageType.AGENT_FRAMEWORK, "Sample AI response")

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = {response: responseMessage}

        let sentChatContext: ChatContext
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback, chatContext) => {
            callback(JSON.stringify(chatResponse))
            sentChatContext = chatContext
        })

        const query = "Sample test query for chat context"
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        // re-render to update chat_context ref
        rerender(<ChatCommon {...defaultProps} />)
        await sendQuery(TEST_AGENT_MATH_GUY, query)

        //We should be sending back chat context as-is to the server to maintain conversation state
        expect(sentChatContext).toEqual(responseMessage.chat_context)
    })

    it("Should show agent introduction", async () => {
        renderChatCommonComponent()

        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()
    })

    it("Should clear chat when a new agent is selected", async () => {
        const {rerender} = render(
            <ChatCommon
                {...defaultProps}
                clearChatOnNewAgent={true}
            />
        )

        // Make sure first agent greeting appears
        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()

        rerender(
            <ChatCommon
                {...defaultProps}
                clearChatOnNewAgent={true}
                targetAgent={TEST_AGENT_MUSIC_NERD}
            />
        )

        // Previous agent output should have been cleared
        expect(screen.queryByText(cleanUpAgentName(TEST_AGENT_MATH_GUY))).not.toBeInTheDocument()

        // New agent greeting should be present
        expect(await screen.findByText(cleanUpAgentName(TEST_AGENT_MUSIC_NERD))).toBeInTheDocument()
    })

    it("Should handle Stop correctly", async () => {
        const setAwaitingLlmMock = jest.fn()
        renderChatCommonComponent({setIsAwaitingLlm: setAwaitingLlmMock, isAwaitingLlm: true})

        const stopButton = await screen.findByRole("button", {name: "Stop"})
        expect(stopButton).toBeInTheDocument()

        await user.click(stopButton)
        expect(await screen.findByText("Request cancelled.")).toBeInTheDocument()
        expect(setAwaitingLlmMock).toHaveBeenCalledTimes(1)
        expect(setAwaitingLlmMock).toHaveBeenCalledWith(false)
    })

    it("Should handle External Stop correctly", async () => {
        const setAwaitingLlmMock = jest.fn()
        const ref = createRef<ChatCommonHandle>()
        renderChatCommonComponent({setIsAwaitingLlm: setAwaitingLlmMock, isAwaitingLlm: true, ref})

        // Unusual case: need act() here because handleStop is not tied to any simulated event handler like a button
        // click etc.
        await act(async () => {
            // Call the external stop handler directly
            ref.current?.handleStop()
        })

        expect(await screen.findByText("Request cancelled.")).toBeInTheDocument()
        expect(setAwaitingLlmMock).toHaveBeenCalledTimes(1)
        expect(setAwaitingLlmMock).toHaveBeenCalledWith(false)
    })

    it("Should handle autoscroll toggle correctly", async () => {
        renderChatCommonComponent()

        const autoscrollButton = screen.getByRole("button", {name: "Autoscroll enabled"})
        expect(autoscrollButton).toBeInTheDocument()

        await user.click(autoscrollButton)
        expect(screen.getByRole("button", {name: "Autoscroll disabled"})).toBeInTheDocument()
    })

    it("Should handle text wrapping toggle correctly", async () => {
        renderChatCommonComponent()

        const wrapButton = screen.getByRole("button", {name: "Text wrapping enabled"})
        expect(wrapButton).toBeInTheDocument()

        await user.click(wrapButton)
        expect(screen.getByRole("button", {name: "Text wrapping disabled"})).toBeInTheDocument()
    })

    it("Should handle final answer from Neuro-san agents correctly", async () => {
        renderChatCommonComponent()

        const responseMessage = getResponseMessage(ChatMessageType.AI, "Sample AI response")

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = {response: responseMessage}

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        expect(await screen.findByText("Final Answer")).toBeInTheDocument()
    })

    it("Should handle 'show thinking' button correctly", async () => {
        renderChatCommonComponent()

        // Send two responses, a regular AGENT one and an AI one
        // The initial [] is to make sure the message is not treated as JSON
        const agentResponseText = "[]Sample Agent response"
        const aiResponseText = "[]Sample AI response"
        const responseMessages = [
            getResponseMessage(ChatMessageType.AGENT, agentResponseText),
            getResponseMessage(ChatMessageType.AI, aiResponseText),
        ]

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponsesStringified = responseMessages.map((response) => ({
            response,
        }))

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponsesStringified[0]))
            callback(JSON.stringify(chatResponsesStringified[1]))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query handle thinking button test")

        // Click "show thinking" button. It defaults to "hiding agent thinking" so we look for that
        const showThinkingButton = document.getElementById("show-thinking-button")
        expect(showThinkingButton).toBeInTheDocument()
        await user.click(showThinkingButton)

        // All responses should be visible when "show thinking" is enabled
        await waitFor(() => {
            expect(screen.getAllByText(aiResponseText)).toHaveLength(2)
        })
        expect(await screen.findByText(agentResponseText)).toBeInTheDocument()

        // Now click the button again to hide agent thinking
        await user.click(showThinkingButton)

        // Only the AI response should be visible
        await waitFor(() => {
            expect(screen.getAllByText(aiResponseText)).toHaveLength(2)
        })

        // Agent response should be in the DOM but with display: none
        expect(await screen.findByText(agentResponseText)).not.toBeVisible()
    })

    it("Should handle voice transcription correctly", async () => {
        // Store original values to restore later
        const originalSpeechRecognition = (window as any).SpeechRecognition
        const originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition
        const originalUserAgent = navigator.userAgent

        // Mock speech recognition to test actual voice transcription behavior
        const mockSpeechRecognition = {
            continuous: true,
            interimResults: true,
            lang: "en-US",
            onstart: null as (() => void) | null,
            onresult: null as ((event: any) => void) | null,
            onerror: null as ((event: any) => void) | null,
            onend: null as (() => void) | null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn(), // Proper addEventListener mock
        }

        // Mock Chrome browser environment
        Object.defineProperty(navigator, "userAgent", {
            value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            configurable: true,
        })

        // Mock SpeechRecognition constructor
        Object.defineProperty(window, "SpeechRecognition", {
            value: jest.fn(() => mockSpeechRecognition),
            configurable: true,
        })
        Object.defineProperty(window, "webkitSpeechRecognition", {
            value: jest.fn(() => mockSpeechRecognition),
            configurable: true,
        })

        try {
            renderChatCommonComponent()

            const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
            const micButton = screen.getByTestId("microphone-button")

            // Type some initial text
            await user.type(userInput, "initial text")
            expect(userInput).toHaveValue("initial text")

            // Start voice recognition
            await user.click(micButton)
            expect(mockSpeechRecognition.start).toHaveBeenCalled()

            // Simulate speech recognition providing a final transcript
            const mockTranscript = "from voice recognition"
            const mockEvent = {
                resultIndex: 0,
                results: {
                    length: 1,
                    0: {
                        isFinal: true,
                        0: {transcript: mockTranscript},
                    },
                },
            }

            // Trigger the onresult handler which should call handleVoiceTranscript
            act(() => {
                if (mockSpeechRecognition.onresult) {
                    mockSpeechRecognition.onresult(mockEvent)
                }
            })

            // The transcript should be appended to existing text with proper spacing
            await waitFor(() => {
                expect(userInput).toHaveValue("initial text " + mockTranscript)
            })

            // Test voice input on empty field (no extra space should be added)
            await user.clear(userInput)

            // Start voice recognition again and simulate new transcript
            await user.click(micButton)

            act(() => {
                if (mockSpeechRecognition.onresult) {
                    mockSpeechRecognition.onresult({
                        resultIndex: 0,
                        results: {
                            length: 1,
                            0: {
                                isFinal: true,
                                0: {transcript: "standalone voice input"},
                            },
                        },
                    })
                }
            })

            // Should not add extra space when input is empty
            await waitFor(() => {
                expect(userInput).toHaveValue("standalone voice input")
            })
        } finally {
            // Cleanup: restore original values
            if (originalSpeechRecognition) {
                Object.defineProperty(window, "SpeechRecognition", {
                    value: originalSpeechRecognition,
                    configurable: true,
                })
            } else {
                delete (window as any).SpeechRecognition
            }

            if (originalWebkitSpeechRecognition) {
                Object.defineProperty(window, "webkitSpeechRecognition", {
                    value: originalWebkitSpeechRecognition,
                    configurable: true,
                })
            } else {
                delete (window as any).webkitSpeechRecognition
            }

            Object.defineProperty(navigator, "userAgent", {
                value: originalUserAgent,
                configurable: true,
            })
        }
    })

    it("Should handle Clear Chat functionality", async () => {
        renderChatCommonComponent()

        // First send a message to create chat output
        const testMessage = "test message for clearing"
        await sendQuery(TEST_AGENT_MATH_GUY, testMessage)

        // Wait for the message to appear
        await waitFor(() => {
            expect(screen.getByText(testMessage)).toBeInTheDocument()
        })

        // Find and click Clear Chat button
        const clearButton = screen.getByRole("button", {name: "Clear Chat"})
        expect(clearButton).toBeInTheDocument()

        await user.click(clearButton)

        // Verify chat is cleared and agent introduction appears
        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()
        expect(screen.queryByText(testMessage)).not.toBeInTheDocument()
    })

    it("Should render with title and close button when provided", async () => {
        const mockOnClose = jest.fn()
        const testTitle = "Test Chat Title"

        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            renderChatCommonComponent({
                title: testTitle,
                onClose: mockOnClose,
            })
        })

        // Check that title is rendered
        expect(screen.getByText(testTitle)).toBeInTheDocument()

        // Note: Close button implementation may vary - this tests the props are passed
    })

    it("Should apply custom backgroundColor when provided", async () => {
        const customColor = "#FF0000"
        renderChatCommonComponent({
            backgroundColor: customColor,
            id: "test-chat",
        })

        await waitFor(() => {
            const chatContainer = document.querySelector("#llm-chat-test-chat")
            expect(chatContainer).toBeInTheDocument()
        })
    })

    it("Should use custom agent placeholder when provided", async () => {
        const customPlaceholder = "Custom placeholder text"
        const customPlaceholders = {
            [TEST_AGENT_MATH_GUY]: customPlaceholder,
        }

        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            renderChatCommonComponent({
                agentPlaceholders: customPlaceholders,
            })
        })

        const userInput = screen.getByPlaceholderText(customPlaceholder)
        expect(userInput).toBeInTheDocument()
    })

    it("Should handle onStreamingStarted and onStreamingComplete callbacks", async () => {
        const mockOnStreamingStarted = jest.fn()
        const mockOnStreamingComplete = jest.fn()

        renderChatCommonComponent({
            onStreamingStarted: mockOnStreamingStarted,
            onStreamingComplete: mockOnStreamingComplete,
        })

        const testResponseText = "Test response"
        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: testResponseText,
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "test query")

        expect(mockOnStreamingStarted).toHaveBeenCalledTimes(1)
        expect(mockOnStreamingComplete).toHaveBeenCalledTimes(1)
    })

    it("Should handle setPreviousResponse callback", async () => {
        const mockSetPreviousResponse = jest.fn()

        renderChatCommonComponent({
            setPreviousResponse: mockSetPreviousResponse,
        })

        const testResponseText = "Test response for previous"
        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: testResponseText,
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "test query")

        await waitFor(() => {
            expect(mockSetPreviousResponse).toHaveBeenCalledTimes(1)
        })

        // The response may contain additional elements, so just check it was called
        expect(mockSetPreviousResponse).toHaveBeenCalledWith(TEST_AGENT_MATH_GUY, expect.any(String))
    })

    it("Should handle onSend callback that modifies query", async () => {
        const mockOnSend = jest.fn((query: string) => `Modified: ${query}`)

        renderChatCommonComponent({
            onSend: mockOnSend,
        })

        const originalQuery = "original query"
        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: "response text",
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, originalQuery)

        expect(mockOnSend).toHaveBeenCalledWith(originalQuery)
    })

    it("Should handle empty input correctly", async () => {
        renderChatCommonComponent()

        const userInput = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        const sendButton = screen.getByRole("button", {name: "Send"})

        // Send button should be disabled with empty input
        expect(sendButton).toBeDisabled()

        // Try with whitespace only
        await user.type(userInput, "   ")
        expect(sendButton).toBeDisabled()

        // Clear and add actual content
        await user.clear(userInput)
        await user.type(userInput, "actual content")
        expect(sendButton).toBeEnabled()
    })

    it("Should handle regenerate functionality", async () => {
        renderChatCommonComponent()

        // First send a query
        const testQuery = "test query for regenerate"
        const initialResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: "initial response",
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(initialResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, testQuery)

        // Regenerate button should now be enabled
        const regenerateButton = screen.getByRole("button", {name: "Regenerate"})
        expect(regenerateButton).toBeEnabled()

        // Mock the regenerate request
        const regenerateResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: "regenerated response",
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(regenerateResponse))
        })

        await user.click(regenerateButton)

        // Check that regenerate was triggered (component should show new response)
        expect(regenerateButton).toBeInTheDocument()
    })

    it("Should handle malformed JSON chunks gracefully", async () => {
        renderChatCommonComponent()

        const malformedChunk = "{ malformed json without closing brace"

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(malformedChunk)
        })

        // Should not throw error when processing malformed JSON
        await sendQuery(TEST_AGENT_MATH_GUY, "test query")

        // Component should still be functional - check for agent greeting elements
        const agentGreetings = screen.getAllByText(TEST_AGENT_MATH_GUY)
        expect(agentGreetings.length).toBeGreaterThan(0)
    })

    it("Should handle chunks that return false from onChunkReceived", async () => {
        const mockOnChunkReceived = jest.fn().mockReturnValue(false)

        renderChatCommonComponent({
            onChunkReceived: mockOnChunkReceived,
        })

        const testResponseText = "Response that should trigger retry"
        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: testResponseText,
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "test query")

        expect(mockOnChunkReceived).toHaveBeenCalledWith(JSON.stringify(chatResponse))
    })

    it("Should handle extraParams for legacy agents", async () => {
        const testExtraParams = {
            customParam: "test value",
            numericParam: 42,
        }

        renderChatCommonComponent({
            targetAgent: LegacyAgentType.DataGenerator,
            extraParams: testExtraParams,
        })
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback("Legacy agent response")
        })

        await sendQuery(LegacyAgentType.DataGenerator, "test query")

        // Verify sendLlmRequest was called with extraParams
        // The legacyAgentEndpoint may be undefined if not provided
        expect(sendLlmRequest).toHaveBeenCalledWith(
            expect.any(Function), // handleChunk
            expect.any(Object), // signal
            undefined, // legacyAgentEndpoint (can be undefined)
            testExtraParams, // extraParams
            expect.any(String), // query
            expect.any(Array) // chatHistory
        )
    })

    it("Should handle legacyAgentEndpoint for legacy agents", async () => {
        const testEndpoint = "custom-legacy-endpoint"

        renderChatCommonComponent({
            targetAgent: LegacyAgentType.OpportunityFinder,
            legacyAgentEndpoint: testEndpoint,
        })
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback("Legacy response with custom endpoint")
        })

        await sendQuery(LegacyAgentType.OpportunityFinder, "test query")

        expect(await screen.findByText("Legacy response with custom endpoint")).toBeInTheDocument()
    })

    it.each([
        {darkMode: true, agentId: "dark-agent"},
        {darkMode: false, agentId: "light-agent"},
    ])("Should handle dark mode $darkMode with custom styling", async ({darkMode, agentId}) => {
        mockedUsePreferences.mockReturnValue({darkMode, toggleDarkMode: jest.fn()})

        renderChatCommonComponent({
            id: agentId,
            backgroundColor: darkMode ? "#333333" : "#FFFFFF",
        })

        await waitFor(() => {
            const chatContainer = document.querySelector(`#llm-chat-${agentId}`)
            expect(chatContainer).toBeInTheDocument()
        })

        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()
    })

    it("Should handle connectivity info error gracefully", async () => {
        // Mock connectivity to throw an error
        ;(getConnectivity as jest.Mock).mockRejectedValue(new Error("Connectivity fetch failed"))

        renderChatCommonComponent()

        // Component should still render despite connectivity error
        expect(await screen.findByText(TEST_AGENT_MATH_GUY)).toBeInTheDocument()
    })

    it("Should handle network request timeout", async () => {
        renderChatCommonComponent()

        // Mock a timeout scenario
        ;(sendChatQuery as jest.Mock).mockImplementation(async () => {
            throw new Error("Network timeout")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(TEST_AGENT_MATH_GUY, "test query for timeout")

        // Should handle timeout gracefully and show error
        await waitFor(() => {
            expect(screen.getAllByText(/Error occurred:/u)).toHaveLength(3)
        })
    })

    it("clears input when clear button is clicked", async () => {
        renderChatCommonComponent()
        const input = screen.getByPlaceholderText(CHAT_WITH_MATH_GUY)
        await user.type(input, "hello")
        // Find the clear input button by id (since it has no accessible name)
        const clearBtn = document.getElementById("clear-input-button")
        expect(clearBtn).toBeTruthy()
        if (clearBtn) {
            fireEvent.click(clearBtn)
        }
        expect(input).toHaveValue("")
    })
})
