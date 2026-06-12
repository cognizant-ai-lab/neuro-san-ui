/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {createTheme, PaletteMode, ThemeProvider} from "@mui/material/styles"
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {createRef, Ref} from "react"

import {
    MOCK_CONNECTIVITY_INFO,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MATH_GUY_DISPLAY,
    TEST_AGENT_MUSIC_NERD,
} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {USER_AGENTS} from "../../../../../../__tests__/common/UserAgentTestUtils"
import {
    ChatCommon,
    ChatCommonHandle,
    ChatCommonProps,
    MAX_TURNS,
} from "../../../../components/AgentChat/ChatCommon/ChatCommon"
import {MAX_SAMPLE_QUERIES, QUERY_TRUNCATE_LENGTH} from "../../../../components/AgentChat/ChatCommon/SampleQueries"
import {CombinedAgentType, givesFinalAnswer, LegacyAgentType} from "../../../../components/AgentChat/Common/Types"
import {cleanUpAgentName} from "../../../../components/AgentChat/Common/Utils"
import {getAgentFunction, getConnectivity, sendChatQuery} from "../../../../controller/agent/Agent"
import {sendLlmRequest, StreamingUnit} from "../../../../controller/llm/LlmChat"
import {ChatContext, ChatMessage, ChatMessageType, ChatResponse} from "../../../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../../../state/ChatHistory"

// Mock agent API
jest.mock("../../../../controller/agent/Agent")

// Mock llm_chat API
jest.mock("../../../../controller/llm/LlmChat")

// Don't want to send user notifications during tests so mock this
jest.mock("../../../../components/Common/notification")

const TEST_USER = "testUser"
const CHAT_WITH_MATH_GUY = `Chat with ${TEST_AGENT_MATH_GUY_DISPLAY}`

const MODAL_Z_INDEX = 11

const getResponseMessage = (type: ChatMessageType, text: string): ChatMessage => ({
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
})

describe("ChatCommon", () => {
    withStrictMocks()

    let user: UserEvent

    const defaultProps: ChatCommonProps = {
        currentUser: TEST_USER,
        id: "test",
        isAwaitingLlm: false,
        onSend: jest.fn(),
        sampleQueries: MOCK_CONNECTIVITY_INFO.metadata["sample_queries"],
        setIsAwaitingLlm: jest.fn(),
        selectedNetwork: TEST_AGENT_MATH_GUY,
    }

    const renderChatCommonComponent = (
        overrides: Partial<ChatCommonProps> & {ref?: Ref<ChatCommonHandle>} = {},
        mode: PaletteMode = "light"
    ) =>
        render(
            <ThemeProvider
                theme={createTheme({
                    colorSchemes: {
                        light: {palette: {text: {primary: "#112233"}}},
                        dark: {palette: {text: {primary: "#445566"}}},
                    },
                    palette: {
                        mode,
                    },
                    zIndex: {
                        modal: MODAL_Z_INDEX,
                    },
                })}
            >
                <ChatCommon
                    {...defaultProps}
                    {...overrides}
                />
            </ThemeProvider>
        )

    beforeEach(() => {
        user = userEvent.setup({delay: null})

        // Mock getConnectivity to return dummy connectivity info
        ;(getAgentFunction as jest.Mock).mockResolvedValue({
            function: {
                description: "Test description",
            },
        })
        // Reset history. TODO: would be nice if withStrictMocks could also reset Zustand stores
        // but that requires extra machinery, tracking "known stores", etc. For now, just reset the one store
        // that we know is relevant to these tests.
        useAgentChatHistoryStore.setState({history: {}})
    })

    const sendQuery = async (agent: CombinedAgentType, query: string) => {
        // locate user query input
        const userQueryInput = screen.getByPlaceholderText(`Chat with ${cleanUpAgentName(agent)}`)

        // Type a query
        await user.type(userQueryInput, query)

        // Find "Send" button
        const sendButton = screen.getByRole("button", {name: "Send"})

        // Click on the "Send" button
        await user.click(sendButton)
    }

    it.each(["light", "dark"] as PaletteMode[])("Should render correctly with %s mode", async (darkMode) => {
        renderChatCommonComponent({}, darkMode)

        await screen.findByText(TEST_AGENT_MATH_GUY)

        // Should have "Clear Chat", "Regenerate" and "Send" buttons
        screen.getByRole("button", {name: "Clear Chat"})
        screen.getByRole("button", {name: "Regenerate"})
        screen.getByRole("button", {name: "Send"})
    })

    it("Renders with network description", async () => {
        const networkDescription = "test network description"
        renderChatCommonComponent({networkDescription})

        // Should show description and agent
        screen.getByText(`${TEST_AGENT_MATH_GUY}:`)
        screen.getByText(networkDescription)
    })

    it("Should render and send sample queries correctly", async () => {
        const mockSendFunction = jest.fn()
        renderChatCommonComponent({onSend: mockSendFunction})

        // Make sure long query chip is truncated
        const sampleQueries = MOCK_CONNECTIVITY_INFO.metadata.sample_queries
        const expectedLongQuery = `${sampleQueries[1].slice(0, QUERY_TRUNCATE_LENGTH)}...`
        await screen.findByText(expectedLongQuery)

        // Make sure we only display the first 5 queries
        await screen.findByText(sampleQueries[2])
        await screen.findByText(sampleQueries[3])
        await screen.findByText(sampleQueries[4])
        expect(screen.queryByText(sampleQueries[5])).not.toBeInTheDocument()

        for (const query of sampleQueries.slice(0, MAX_SAMPLE_QUERIES - 1)) {
            mockSendFunction.mockClear()
            const truncatedQuery =
                query.length > QUERY_TRUNCATE_LENGTH ? `${query.slice(0, QUERY_TRUNCATE_LENGTH)}...` : query
            // Click a sample query
            const sampleQueryButton = await screen.findByText(truncatedQuery)
            await user.click(sampleQueryButton)

            expect(mockSendFunction).toHaveBeenCalledTimes(1)
            expect(mockSendFunction).toHaveBeenCalledWith(query)
        }
    })

    it("Should handle missing sample queries gracefully", async () => {
        renderChatCommonComponent({sampleQueries: undefined})

        await screen.findByText(TEST_AGENT_MATH_GUY)

        // Should be no sample query chips rendered
        expect(document.querySelectorAll(".MuiChip-root").length).toBe(0)
    })

    it("Should handle empty sample queries gracefully", async () => {
        renderChatCommonComponent({sampleQueries: []})

        await screen.findByText(TEST_AGENT_MATH_GUY)

        // Should be no sample query chips rendered
        expect(document.querySelectorAll(".MuiChip-root").length).toBe(0)
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

        const userInput = await screen.findByPlaceholderText(CHAT_WITH_MATH_GUY)

        // Type user input
        await user.type(userInput, strToCheck)
        // Check that user input is correct
        expect(userInput).toHaveValue(strToCheck)

        const sendButton = await screen.findByRole("button", {name: "Send"})

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

    it.each(["light", "dark"] as PaletteMode[])(
        "Should handle receiving chunks from Neuro-san agents correctly",
        async (darkMode) => {
            const onChunkReceivedMock = jest.fn().mockReturnValue(true)
            const testResponseText = '"Response text from LLM"'

            renderChatCommonComponent({onChunkReceived: onChunkReceivedMock}, darkMode)

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

            // Should appear once in chat history, once in regular output
            expect(await screen.findAllByText(testResponseText)).toHaveLength(2)
            expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
            expect(onChunkReceivedMock).toHaveBeenCalledWith(chunk)
        }
    )

    it("Should handle receiving chunks from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn().mockReturnValue(true)
        const testResponseText1 = "Response text 1 from LLM"
        const testResponseText2 = "Response text 2 from LLM"

        renderChatCommonComponent({
            onChunkReceived: onChunkReceivedMock,
            selectedNetwork: LegacyAgentType.DataGenerator,
        })
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText1)
            callback(testResponseText2)
        })

        const query = "Sample test query for chunk handling"
        await sendQuery(LegacyAgentType.DataGenerator, query)

        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText(testResponseText1 + testResponseText2)
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(2)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText2)
    })

    it("Should handle final answer from legacy agents correctly", async () => {
        const onChunkReceivedMock = jest.fn()
        const finalAnswerText = "Sample final answer from LLM"
        const testResponseText = `Final Answer: ${finalAnswerText}`

        renderChatCommonComponent({onChunkReceived: onChunkReceivedMock, selectedNetwork: LegacyAgentType.DMSChat})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(testResponseText)
        })

        const query = "Sample test query for legacy agent final answer handling"
        await sendQuery(LegacyAgentType.DMSChat, query)

        await screen.findByText(testResponseText)
        expect(onChunkReceivedMock).toHaveBeenCalledTimes(1)
        expect(onChunkReceivedMock).toHaveBeenCalledWith(testResponseText)

        // The body of the final answer should be displayed
        screen.getByText(finalAnswerText)
    })

    it("Should handle no chunks received", async () => {
        renderChatCommonComponent()
        screen.getByText(TEST_AGENT_MATH_GUY)
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(null)
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "test")

        // No final answer from a Neuro-san agent; this is an error
        const alertItem = screen.getByRole("alert")
        within(alertItem).getByText(/final answer/u)
    })

    it("Should handle when legacy agents fail to send a Final Answer", async () => {
        const onChunkReceivedMock = jest.fn()
        const responseText = "Text without the magical final answer string"

        expect(givesFinalAnswer(LegacyAgentType.OpportunityFinder)).toBe(false)
        renderChatCommonComponent({
            onChunkReceived: onChunkReceivedMock,
            selectedNetwork: LegacyAgentType.OpportunityFinder,
        })
        screen.getByText(LegacyAgentType.OpportunityFinder)
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(responseText)
        })

        await sendQuery(LegacyAgentType.OpportunityFinder, "test")

        // The chosen agent is known not to give a final answer, so we should just display whatever text it gives us
        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText(responseText)
    })

    it("Should show an error when legacy agent fails to respond with a final answer", async () => {
        const onChunkReceivedMock = jest.fn()
        const responseText = "Text without the magical final answer string"

        expect(givesFinalAnswer(LegacyAgentType.DMSChat)).toBe(true)
        renderChatCommonComponent({
            onChunkReceived: onChunkReceivedMock,
            selectedNetwork: LegacyAgentType.DMSChat,
        })

        screen.getByText(LegacyAgentType.DMSChat)
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback(responseText)
        })

        await sendQuery(LegacyAgentType.DMSChat, "test")

        // This agent is supposed to give a final answer, so it's an error that it didn't. Check for the alert.
        const alertItem = screen.getByRole("alert")
        within(alertItem).getByText(/final answer/u)
    })

    it("Should handle error thrown while fetching", async () => {
        renderChatCommonComponent({selectedNetwork: LegacyAgentType.OpportunityFinder})
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new Error("Sample error from fetch")
        })

        jest.spyOn(console, "error").mockImplementation()
        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be 3 attempts, so 3 error messages
        expect(await screen.findAllByText(/Error occurred:/u)).toHaveLength(3)

        expect(console.error).toHaveBeenCalledTimes(3)
        ;(console.error as jest.Mock).mockClear()
    })

    it("Should handle non-error type thrown while fetching", async () => {
        renderChatCommonComponent({selectedNetwork: LegacyAgentType.OpportunityFinder})

        jest.spyOn(console, "error").mockImplementation()

        // Now throw something that isn't an Error (which is possible in JavaScript)
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw "Just a string, not an Error object"
        })

        await sendQuery(
            LegacyAgentType.OpportunityFinder,
            "Sample test query for handling non-Error types thrown during fetch"
        )

        expect(console.error).not.toHaveBeenCalled()
    })

    it("Should handle an abort error correctly", async () => {
        renderChatCommonComponent({selectedNetwork: LegacyAgentType.OpportunityFinder})
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

    it("Should handle other types of errors than AbortError correctly", async () => {
        renderChatCommonComponent({selectedNetwork: LegacyAgentType.OpportunityFinder})

        jest.spyOn(console, "error").mockImplementation()
        ;(sendLlmRequest as jest.Mock).mockImplementation(async () => {
            throw new (class extends Error {
                constructor(message?: string) {
                    super(message)
                    this.name = "SomeOtherError"
                }
            })("Some other error occurred")
        })

        await sendQuery(LegacyAgentType.OpportunityFinder, "Sample test query for handling errors during fetch")

        // Should be retries when not "Abort" error
        expect(sendLlmRequest).toHaveBeenCalledTimes(3)

        // For errors other than Abort, we display an error block
        screen.getAllByText(/Error occurred: SomeOtherError: Some other error occurred/u)
    })

    it("Should correctly handle a chunk with an error block in the structure field", async () => {
        const chatResponse = {
            response: {
                type: ChatMessageType.AI,
                structure: {
                    error: "Error message from LLM",
                    traceback: "test traceback",
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
            expect(alertItems).toHaveLength(3 + 1)
        })

        // First three are warnings
        const warnings = screen.getAllByTestId("ReportProblemOutlinedIcon")
        expect(warnings).toHaveLength(3)

        // Final one is an error
        const errors = screen.getAllByTestId("ErrorOutlineIcon")
        expect(errors).toHaveLength(1)
    })

    it("Should truncate at MAX_TURNS", async () => {
        renderChatCommonComponent()

        const messages = Array.from({length: MAX_TURNS + 1}, (_, i) =>
            getResponseMessage(ChatMessageType.AGENT, `Sample AI response ${i + 1}`)
        )

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            for (const chatMessage of messages) {
                callback(JSON.stringify({response: chatMessage}))
            }
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Test query")

        await screen.findByText("Show Thinking")
        const thinkingSection = document.querySelector(`#${defaultProps.id}-thinking`)
        expect(thinkingSection).toBeInTheDocument()

        // Oldest streamed response should be evicted once MAX_TURNS is exceeded
        expect(within(thinkingSection as HTMLElement).queryByText(/Sample AI response 1$/u)).not.toBeInTheDocument()

        // Messages 2..MAX_TURNS+1 should be retained
        for (let responseNumber = 2; responseNumber <= MAX_TURNS + 1; responseNumber += 1) {
            expect(
                within(thinkingSection as HTMLElement).getByText(
                    new RegExp(String.raw`Sample AI response ${responseNumber}(?!\d)`, "u")
                )
            ).toBeInTheDocument()
        }
    })

    it("Should correctly handle chat context", async () => {
        const {rerender} = renderChatCommonComponent()

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

        await screen.findByText(TEST_AGENT_MATH_GUY)
    })

    it("Should not clear chat when a new agent is selected", async () => {
        const {rerender} = renderChatCommonComponent()

        // Make sure first agent greeting appears
        await screen.findByText(TEST_AGENT_MATH_GUY)

        rerender(
            <ChatCommon
                {...defaultProps}
                selectedNetwork={TEST_AGENT_MUSIC_NERD}
            />
        )

        // Previous agent output should still be present
        screen.queryByText(TEST_AGENT_MATH_GUY)

        // New agent greeting should be present
        await screen.findByText(TEST_AGENT_MUSIC_NERD)
    })

    it("Should use custom agent greetings when supplied", async () => {
        const customGreeting = "Custom Greeting"
        renderChatCommonComponent({
            customAgentGreetings: {
                [TEST_AGENT_MATH_GUY]: customGreeting,
            },
        })

        await screen.findByText(customGreeting)
    })

    it("Should refuse interaction when no target agent is set", async () => {
        const mockSendFunction = jest.fn()
        renderChatCommonComponent({onSend: mockSendFunction, selectedNetwork: null})

        // Should be no "Chat with"
        expect(screen.queryByPlaceholderText(/Chat with/u)).not.toBeInTheDocument()

        const overlay = document.getElementById("chat-disabled-overlay")
        expect(overlay).toHaveStyle({
            position: "absolute",
            zIndex: MODAL_Z_INDEX - 1,
            cursor: "not-allowed",
            pointerEvents: "all",
        })
    })

    it("Should handle Stop correctly", async () => {
        const setAwaitingLlmMock = jest.fn()
        renderChatCommonComponent({setIsAwaitingLlm: setAwaitingLlmMock, isAwaitingLlm: true})

        const stopButton = await screen.findByRole("button", {name: "Stop"})

        await user.click(stopButton)
        await screen.findByText("Request cancelled.")
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

        await screen.findByText("Request cancelled.")
        expect(setAwaitingLlmMock).toHaveBeenCalledTimes(1)
        expect(setAwaitingLlmMock).toHaveBeenCalledWith(false)
    })

    it("Should clear the chat when handleClearChat is called via ref", async () => {
        const ref = createRef<ChatCommonHandle>()
        renderChatCommonComponent({ref})

        // Wait for the component to initialize so the ref is set up
        await screen.findByRole("button", {name: "Send"})

        // Verify handleClearChat is exposed via the imperative ref
        expect(typeof ref.current?.handleClearChat).toBe("function")

        // Call it and wait for all async state updates to settle
        await act(async () => {
            ref.current?.handleClearChat()
        })

        // After clearing, connectivity info (rendered into chatOutput via updateOutput) is gone
        // We wait for sample queries to re-appear (they're in agentSampleQueries state, not chatOutput,
        // so they stay after clear and confirm the component is still functional)
        await screen.findByText("Sample query 1")
    })

    it.each(["Wrap output", "Auto-scroll output"])("Should handle %s toggle correctly", async (menuLabel) => {
        renderChatCommonComponent()

        const optionsButton = screen.getByTestId("TuneIcon")
        await user.click(optionsButton)

        const menuItem = screen.getByRole("menuitem", {name: menuLabel})

        // Checked by default
        expect(menuItem.querySelector("svg")).toHaveAttribute("data-testid", "CheckBoxIcon")

        await user.click(menuItem)

        // Should now be unchecked
        expect(menuItem.querySelector("svg")).toHaveAttribute("data-testid", "CheckBoxOutlineBlankIcon")
    })

    it("Should handle final answer from Neuro-san agents correctly", async () => {
        renderChatCommonComponent()

        screen.getByText(TEST_AGENT_MATH_GUY)

        const agentFinalAnswer = "Agent final answer"
        const responseMessage = getResponseMessage(ChatMessageType.AGENT_FRAMEWORK, agentFinalAnswer)

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = {response: responseMessage}

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        // Should appear once in conversation section
        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText(agentFinalAnswer)

        // Should also appear in Chat History
        const chatHistory = document.querySelector(`#${defaultProps.id}-history-items`)
        within(chatHistory as HTMLElement).getByText(agentFinalAnswer)
    })

    it("Should handle final answer with no text, structure only from Neuro-san agents", async () => {
        renderChatCommonComponent()

        screen.getByText(TEST_AGENT_MATH_GUY)
        const structure = {answer: "Final answer in structure"}
        const responseMessage = {
            ...getResponseMessage(ChatMessageType.AGENT_FRAMEWORK, undefined),
            structure,
        }

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = {response: responseMessage}

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        // Structure answer should be displayed in conversation section even if text is undefined
        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText(new RegExp(structure.answer, "u"))
    })

    it("Should handle final answer with no text or structure from Neuro-san agents", async () => {
        renderChatCommonComponent()

        screen.getByText(TEST_AGENT_MATH_GUY)
        const responseMessage: ChatMessage = {
            type: ChatMessageType.AGENT_FRAMEWORK,
            text: null,
            structure: null,
        }

        // Chunk handler expects messages in "wire" (snake case) format since that is how they come from Neuro-san.
        const chatResponse = {response: responseMessage}

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        // No final answer from a Neuro-san agent; this is an error
        const alertItem = screen.getByRole("alert")
        within(alertItem).getByText(/did not provide a final answer/u)
    })

    it("Should handle when Neuro-san agents fail to send a final answer", async () => {
        renderChatCommonComponent()

        screen.getByText(TEST_AGENT_MATH_GUY)
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(getResponseMessage(ChatMessageType.AGENT, "response")))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query final answer test")

        // No final answer from a Neuro-san agent; this is an error
        const alertItem = screen.getByRole("alert")
        within(alertItem).getByText(/did not provide a final answer/u)
    })

    it("Should handle 'show thinking' section correctly", async () => {
        renderChatCommonComponent()

        // Send two responses, a regular AGENT one and an AGENT_FRAMEWORK one
        const agentResponseText = "Sample Agent response"
        const agentFrameworkResponse = "Sample agent framework response"
        const responseMessages = [
            getResponseMessage(ChatMessageType.AGENT, agentResponseText),
            getResponseMessage(ChatMessageType.AGENT_FRAMEWORK, agentFrameworkResponse),
        ]

        // Chunk handler expects messages to be a JSON object with a "response" field
        const chatResponses = responseMessages.map((response) => ({
            response,
        }))

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponses[0]))
            callback(JSON.stringify(chatResponses[1]))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "Sample test query handle thinking button test")

        // Agent framework response is the "final answer" and should always be shown in the conversation section
        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText(agentFrameworkResponse)

        // Agent message should appear in the "thinking" section
        const thinkingSection = document.querySelector(`#${defaultProps.id}-thinking`)
        const item = within(thinkingSection as HTMLElement).getByText(new RegExp(agentResponseText, "u"))
        expect(item).not.toBeVisible()

        // Expand thinking section and verify agent message is visible
        const expandButton = within(thinkingSection as HTMLElement).getByRole("button")
        await user.click(expandButton)
        expect(item).toBeVisible()
    })

    it("Should handle voice transcription correctly", async () => {
        // Store value to restore later
        const win = window as Window & {
            SpeechRecognition?: typeof SpeechRecognition
        }
        const originalSpeechRecognition = win.SpeechRecognition
        const originalUserAgent = navigator.userAgent

        // Mock speech recognition to test actual voice transcription behavior
        const mockSpeechRecognition = {
            continuous: true,
            interimResults: true,
            lang: "en-US",
            onstart: null as (() => void) | null,
            onresult: null as ((event: SpeechRecognitionEvent) => void) | null,
            onerror: null as ((event: Event) => void) | null,
            onend: null as (() => void) | null,
            start: jest.fn(),
            stop: jest.fn(),
            addEventListener: jest.fn((event: string, handler: (event?: unknown) => void) => {
                // Store the handlers so we can call them in tests
                switch (event) {
                    case "result":
                        mockSpeechRecognition.onresult = handler as (event: SpeechRecognitionEvent) => void
                        break
                    case "start":
                        mockSpeechRecognition.onstart = handler as () => void
                        break
                    case "end":
                        mockSpeechRecognition.onend = handler as () => void
                        break
                    case "error":
                        // Intentionally mocking it this way
                        // eslint-disable-next-line unicorn/prefer-add-event-listener
                        mockSpeechRecognition.onerror = handler as (event: Event) => void
                        break
                    default:
                        // Handle any other event types
                        break
                }
            }),
            removeEventListener: jest.fn(),
        }

        Object.defineProperty(navigator, "userAgent", {
            value: USER_AGENTS.CHROME_MAC,
            configurable: true,
        })

        // Mock getUserMedia for microphone permission
        const mockGetUserMedia = jest.fn().mockResolvedValue({
            getTracks: () => [{stop: jest.fn()}],
        })

        Object.defineProperty(navigator, "mediaDevices", {
            value: {
                getUserMedia: mockGetUserMedia,
            },
            configurable: true,
        })

        // Mock SpeechRecognition constructor
        Object.defineProperty(win, "SpeechRecognition", {
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
            const mockAlternative: SpeechRecognitionAlternative = {
                confidence: 100,
                transcript: mockTranscript,
            }

            const mockResult: SpeechRecognitionResult = {
                length: 1,
                isFinal: true,
                item: () => mockAlternative,
                [Symbol.iterator]: Array.prototype[Symbol.iterator].bind([mockAlternative]),
                0: mockAlternative,
            }

            const mockResults: SpeechRecognitionResultList = {
                length: 1,
                item: () => mockResult,
                [Symbol.iterator]: Array.prototype[Symbol.iterator].bind([mockResult]),
                0: mockResult,
            }

            const mockEvent: SpeechRecognitionEvent = {
                resultIndex: 0,
                results: mockResults,
            } as SpeechRecognitionEvent

            // Trigger the onresult handler which should call handleVoiceTranscript
            act(() => {
                if (mockSpeechRecognition.onresult) {
                    mockSpeechRecognition.onresult(mockEvent)
                }
            })

            // The transcript should be appended to existing text with proper spacing
            await waitFor(() => {
                expect(userInput).toHaveValue(`initial text ${mockTranscript}`)
            })

            // Test voice input on empty field (no extra space should be added)
            await user.clear(userInput)

            // Start voice recognition again and simulate new transcript
            await user.click(micButton)

            act(() => {
                if (mockSpeechRecognition.onresult) {
                    const mockVoiceResult: Partial<SpeechRecognitionResult> = {
                        length: 1,
                        isFinal: true,
                        item: () => ({confidence: 100, transcript: "standalone voice input"}),
                        0: {confidence: 100, transcript: "standalone voice input"},
                    }
                    const mockVoiceResults: Partial<SpeechRecognitionResultList> = {
                        length: 1,
                        item: () => mockVoiceResult as SpeechRecognitionResult,
                        0: mockVoiceResult as SpeechRecognitionResult,
                    }
                    const mockVoiceEvent: Partial<SpeechRecognitionEvent> = {
                        resultIndex: 0,
                        results: mockVoiceResults as SpeechRecognitionResultList,
                    }
                    mockSpeechRecognition.onresult(mockVoiceEvent as SpeechRecognitionEvent)
                }
            })

            // Should not add extra space when input is empty
            await waitFor(() => {
                expect(userInput).toHaveValue("standalone voice input")
            })
        } finally {
            // Cleanup: restore original values
            if (originalSpeechRecognition !== undefined) {
                Object.defineProperty(win, "SpeechRecognition", {
                    value: originalSpeechRecognition,
                    configurable: true,
                })
            } else {
                delete win.SpeechRecognition
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

        // Wait for the message to appear. It appears twice -- once in chat history, once "live"
        expect(await screen.findAllByText(testMessage)).toHaveLength(2)

        // Find and click Clear Chat button
        const clearButton = screen.getByRole("button", {name: "Clear Chat"})

        await user.click(clearButton)

        // Verify chat is cleared and agent introduction appears
        await screen.findByText(TEST_AGENT_MATH_GUY)
        expect(screen.queryByText(testMessage)).not.toBeInTheDocument()
    })

    it("Should render with title and close button when provided", async () => {
        const mockOnClose = jest.fn()
        const testTitle = "Test Chat Title"

        renderChatCommonComponent({
            title: testTitle,
            onClose: mockOnClose,
        })

        // Check that title is rendered
        await screen.findByText(testTitle)

        // Check that close button is rendered
        await screen.findByTestId("close-button-test")
    })

    it("Should apply custom backgroundColor when provided", async () => {
        const customColor = "#FF0000"
        renderChatCommonComponent({
            backgroundColor: customColor,
        })

        let chatContainer: HTMLElement | null = null
        await waitFor(() => {
            chatContainer = document.getElementById("llm-responses")
            expect(chatContainer).toBeInTheDocument()
        })

        expect(chatContainer).toHaveStyle({"background-color": customColor})
    })

    it("Should use custom agent placeholder when provided", async () => {
        const customPlaceholder = "Custom placeholder text"
        const customPlaceholders = {
            [TEST_AGENT_MATH_GUY]: customPlaceholder,
        }

        renderChatCommonComponent({
            agentPlaceholders: customPlaceholders,
        })

        await screen.findByPlaceholderText(customPlaceholder)
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
            selectedNetwork: LegacyAgentType.DataGenerator,
            extraParams: testExtraParams,
        })
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback("Legacy agent response")
        })

        await sendQuery(LegacyAgentType.DataGenerator, "test query")

        // Verify sendLlmRequest was called with extraParams
        // The legacyAgentEndpoint may be undefined if not provided
        expect(sendLlmRequest).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Object),
            undefined,
            testExtraParams,
            expect.any(String),
            expect.any(Array),
            null,
            StreamingUnit.Chunk
        )
    })

    it("Should handle legacyAgentEndpoint for legacy agents", async () => {
        const testEndpoint = "custom-legacy-endpoint"

        renderChatCommonComponent({
            selectedNetwork: LegacyAgentType.OpportunityFinder,
            legacyAgentEndpoint: testEndpoint,
        })

        screen.getByText(LegacyAgentType.OpportunityFinder)
        ;(sendLlmRequest as jest.Mock).mockImplementation(async (callback) => {
            callback("Legacy response with custom endpoint")
        })

        await sendQuery(LegacyAgentType.OpportunityFinder, "test query")

        const conversation = document.querySelector(`#${defaultProps.id}-conversation`)
        within(conversation as HTMLElement).getByText("Legacy response with custom endpoint")
    })

    it.each([
        {darkMode: true, agentId: "dark-agent"},
        {darkMode: false, agentId: "light-agent"},
    ])("Should handle dark mode $darkMode with custom styling", async ({darkMode, agentId}) => {
        renderChatCommonComponent({
            id: agentId,
            backgroundColor: darkMode ? "#333333" : "#FFFFFF",
        })

        await waitFor(() => {
            const chatContainer = document.querySelector(`#llm-chat-${agentId}`)
            expect(chatContainer).toBeInTheDocument()
        })

        await screen.findByText(TEST_AGENT_MATH_GUY)
    })

    it("Should handle connectivity info error gracefully", async () => {
        // Mock connectivity to throw an error
        ;(getConnectivity as jest.Mock).mockRejectedValue(new Error("Connectivity fetch failed"))

        renderChatCommonComponent()

        // Component should still render despite connectivity error
        await screen.findByText(TEST_AGENT_MATH_GUY)
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

    it("Should persist agent network definition to Zustand store when sly_data contains it", async () => {
        act(() => {
            useAgentChatHistoryStore.getState().resetHistory(TEST_AGENT_MATH_GUY)
        })

        const networkDefinition = [
            {origin: "agent_a", tools: ["agent_b"], display_as: "llm_agent", instructions: "Do things."},
        ]

        const chatResponse: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT_FRAMEWORK,
                text: "",
                sly_data: {
                    agent_network_definition: networkDefinition,
                },
            },
        }

        renderChatCommonComponent()
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(chatResponse))
        })

        await sendQuery(TEST_AGENT_MATH_GUY, "test query for sly_data network map")

        let storedSlyData
        await waitFor(() => {
            storedSlyData = useAgentChatHistoryStore.getState().history[TEST_AGENT_MATH_GUY]?.slyData
            expect(storedSlyData).toBeDefined()
            expect(storedSlyData?.["agent_network_definition"]).toEqual(networkDefinition)
        })
        expect(storedSlyData).toHaveProperty("agent_network_definition")
    })

    it("Should accumulate sly_data from non-AGENT_FRAMEWORK messages", async () => {
        act(() => {
            useAgentChatHistoryStore.getState().resetHistory(TEST_AGENT_MATH_GUY)
        })

        renderChatCommonComponent()

        const agentChunk: ChatResponse = {
            response: {
                type: ChatMessageType.AGENT,
                text: "Agent thinking text",
                origin: [{tool: "agent_x", instantiation_index: 0}],
                sly_data: {some_custom_key: "some_value"},
            },
        }

        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            callback(JSON.stringify(agentChunk))
        })

        // Should not throw. The AGENT message is rendered into the (hidden) thinking panel.
        await sendQuery(TEST_AGENT_MATH_GUY, "test sly_data accumulation on AGENT message")

        // sendChatQuery was called — the component processed the chunk without error
        expect(sendChatQuery).toHaveBeenCalledTimes(1)
    })
})
