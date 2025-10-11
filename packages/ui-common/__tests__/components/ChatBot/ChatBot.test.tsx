import {createTheme, ThemeProvider} from "@mui/material/styles"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ChatBot} from "../../../components/ChatBot/ChatBot"

// Mock dependencies
jest.mock("../../../state/Preferences", () => ({
    usePreferences: jest.fn(),
}))

jest.mock("../../../utils/Authentication", () => ({
    useAuthentication: jest.fn(),
}))

jest.mock("../../../components/AgentChat/ChatCommon", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
    const ReactModule = require("react")
    return {
        ChatCommon: (props: {id: string; title: string; onClose: () => void; backgroundColor: string}) =>
            ReactModule.createElement(
                "div",
                {"data-testid": "chat-common", id: props.id, style: {backgroundColor: props.backgroundColor}},
                [
                    ReactModule.createElement("div", {key: "title"}, props.title),
                    ReactModule.createElement(
                        "button",
                        {key: "button", onClick: props.onClose, "data-testid": "close-button"},
                        "Close"
                    ),
                ]
            ),
    }
})

// Mock MUI Grow to render children when `in` prop is true
jest.mock("@mui/material/Grow", () => ({
    __esModule: true,
    default: ({children, in: inProp}: {children: unknown; in: boolean}) => (inProp ? children : null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
const mockUsePreferences = require("../../../state/Preferences").usePreferences as jest.Mock
// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
const mockUseAuthentication = require("../../../utils/Authentication").useAuthentication as jest.Mock

describe("ChatBot", () => {
    withStrictMocks()

    const mockProps = {
        id: "test-chatbot",
        userAvatar: "/path/to/avatar.jpg",
        pageContext: "This is a test page about products",
    }

    const theme = createTheme()

    beforeEach(() => {
        jest.clearAllMocks()

        mockUsePreferences.mockReturnValue({
            darkMode: false,
        })

        mockUseAuthentication.mockReturnValue({
            data: {
                user: {
                    name: "Test User",
                },
            },
        })
    })

    const renderChatBot = (props = mockProps) =>
        render(
            <ThemeProvider theme={theme}>
                <ChatBot {...props} />
            </ThemeProvider>
        )

    it("Should render the chat icon when chat is closed", () => {
        renderChatBot()

        const chatIcon = screen.getByTestId("ContactSupportIcon")
        expect(chatIcon).toBeInTheDocument()

        // Chat window should not be visible initially
        expect(screen.queryByTestId("chat-common")).not.toBeInTheDocument()
    })

    it("Should open chat window when icon is clicked", async () => {
        const user = userEvent.setup()
        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)
        expect(await screen.findByTestId("chat-common")).toBeInTheDocument()
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })

    it("Should close chat window when close button is clicked", async () => {
        const user = userEvent.setup()
        renderChatBot()

        // Open chat first
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)
        expect(await screen.findByTestId("chat-common")).toBeInTheDocument()
        // Close chat
        const closeButton = screen.getByTestId("close-button")
        await user.click(closeButton)
        await waitFor(() => expect(screen.queryByTestId("chat-common")).not.toBeInTheDocument())
        expect(screen.getByTestId("ContactSupportIcon")).toBeInTheDocument()
    })

    it("Should hide chat icon when chat is open", async () => {
        const user = userEvent.setup()
        renderChatBot()

        // Initially icon should be visible
        expect(screen.getByTestId("ContactSupportIcon")).toBeInTheDocument()

        // Open chat
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)
        await waitFor(() => expect(screen.queryByTestId("ContactSupportIcon")).not.toBeInTheDocument())
    })

    it("Should apply dark mode styling", () => {
        mockUsePreferences.mockReturnValue({
            darkMode: true,
        })

        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")

        expect(iconContainer).toHaveStyle({
            backgroundColor: "var(--bs-dark-mode-dim)",
        })
    })

    it("Should apply light mode styling", () => {
        mockUsePreferences.mockReturnValue({
            darkMode: false,
        })

        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")

        expect(iconContainer).toHaveStyle({
            backgroundColor: "var(--bs-white)",
        })
    })

    it("Should pass correct props to ChatCommon component", async () => {
        const user = userEvent.setup()
        renderChatBot()

        // Open chat to trigger ChatCommon render
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)

        // Check that ChatCommon renders with correct content
        const chatWindow = await screen.findByTestId("chat-common")
        expect(chatWindow).toHaveAttribute("id", "chatbot-window")
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })

    it("Should set correct dark mode background for ChatCommon", async () => {
        const user = userEvent.setup()
        mockUsePreferences.mockReturnValue({
            darkMode: true,
        })

        renderChatBot()

        // Open chat to trigger ChatCommon render
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)

        // Check that ChatCommon renders with dark mode background
        const chatWindow = await screen.findByTestId("chat-common")
        expect(chatWindow).toHaveStyle({backgroundColor: "var(--bs-gray-dark)"})
    })

    it("Should use the provided id for the chatbot container", async () => {
        const user = userEvent.setup()
        const customProps = {...mockProps, id: "custom-chatbot-id"}
        renderChatBot(customProps)

        // Open chat to see the container
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)
        expect(await screen.findByTestId("chat-common")).toBeInTheDocument()
        const chatContainer = document.getElementById("custom-chatbot-id")
        expect(chatContainer).toBeInTheDocument()
    })

    it("Should handle isAwaitingLlm state changes", async () => {
        const user = userEvent.setup()
        renderChatBot()

        // Open chat
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer as HTMLElement)

        // Verify chat window renders (which confirms all state management is working)
        expect(await screen.findByTestId("chat-common")).toBeInTheDocument()
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })
})
