import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {ChatCommon} from "../../../components/AgentChat/ChatCommon"
import {AgentErrorProps, CombinedAgentType, LegacyAgentType} from "../../../components/AgentChat/Types"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {sendChatQuery} from "../../../controller/agent/Agent"
import {sendLlmRequest} from "../../../controller/llm/LlmChat"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {ChatContext, ChatMessage, ChatResponse} from "../../../generated/neuro-san/OpenAPITypes"
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

    it("Should correctly detect an error chunk from Neuro-san", async () => {
        renderChatCommonComponent()

        const errorMessage = "Error message from LLM"

        const testResponseText = JSON.stringify({
            error: errorMessage,
            traceback: "test tracebook",
            tool: "test tool",
        } as AgentErrorProps)

        const successMessage: ChatMessage = {
            type: ChatMessageType.AI,
            text: testResponseText,
        }

        const chatResponse: ChatResponse = {
            response: successMessage,
        }

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
})
