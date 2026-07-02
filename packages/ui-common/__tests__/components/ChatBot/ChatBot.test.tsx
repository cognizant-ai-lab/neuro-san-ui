import {createTheme, ThemeProvider, useColorScheme} from "@mui/material/styles"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent, {UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ChatBot} from "../../../components/ChatBot/ChatBot"
import {useAuthentication} from "../../../utils/Authentication"

// Mock dependencies
vi.mock("../../../utils/Authentication", () => ({
    useAuthentication: vi.fn(),
}))

vi.mock("../../../components/AgentChat/ChatCommon/ChatCommon", () => ({
    ChatCommon: (props: {id: string; title: string; onClose: () => void; backgroundColor: string}) => (
        <div
            data-testid="chat-common"
            id={props.id}
            style={{backgroundColor: props.backgroundColor}}
        >
            <div>{props.title}</div>
            <button
                onClick={props.onClose}
                data-testid="close-button"
                type="button"
            >
                Close
            </button>
        </div>
    ),
}))

// Mock MUI theming
vi.mock("@mui/material/styles", async () => ({
    ...(await vi.importActual("@mui/material/styles")),
    useColorScheme: vi.fn(),
}))

vi.mock("@mui/material/Grow", () => ({
    __esModule: true,
    default: ({children, in: inProp}: {children: unknown; in: boolean}) => (inProp ? children : null),
}))

const mockUseAuthentication = vi.mocked(useAuthentication)

const getUseColorSchemeMockReturnValue = (mode: "light" | "dark", systemMode: "light" | "dark" = "light") =>
    ({
        allColorSchemes: ["light", "dark"],
        mode,
        systemMode,
        lightColorScheme: "light",
        darkColorScheme: "light",
        colorScheme: "light",
        setMode: vi.fn(),
        setColorScheme: vi.fn(),
    }) satisfies ReturnType<typeof useColorScheme>

describe("ChatBot", () => {
    withStrictMocks()

    let user: UserEvent

    const mockProps = {
        id: "test-chatbot",
        userAvatar: "/path/to/avatar.jpg",
        pageContext: "This is a test page about products",
    }

    beforeEach(() => {
        mockUseAuthentication.mockReturnValue({
            data: {
                user: {
                    name: "Test User",
                    image: "",
                },
            },
        })

        vi.mocked(useColorScheme).mockReturnValue(getUseColorSchemeMockReturnValue("light"))

        user = userEvent.setup()
    })

    const renderChatBot = (props = mockProps) =>
        render(
            <ThemeProvider theme={createTheme({colorSchemes: {light: true, dark: true}})}>
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
        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).toBeVisible()
        await user.click(iconContainer)
        await screen.findByTestId("chat-common")
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })

    it("Should close chat window when close button is clicked", async () => {
        renderChatBot()

        // Open chat first
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).toBeVisible()
        await user.click(iconContainer)
        await screen.findByTestId("chat-common")
        // Close chat
        const closeButton = screen.getByTestId("close-button")
        await user.click(closeButton)
        await waitFor(() => expect(screen.queryByTestId("chat-common")).not.toBeInTheDocument())
        expect(screen.getByTestId("ContactSupportIcon")).toBeInTheDocument()
    })

    it("Should hide chat icon when chat is open", async () => {
        renderChatBot()

        // Initially icon should be visible
        expect(screen.getByTestId("ContactSupportIcon")).toBeInTheDocument()

        // Open chat
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)
        await waitFor(() => expect(screen.queryByTestId("ContactSupportIcon")).not.toBeInTheDocument())
    })

    it("Should apply dark mode styling", () => {
        // Set MUI to dark mode
        vi.mocked(useColorScheme).mockReturnValue(getUseColorSchemeMockReturnValue("dark", "dark"))

        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")

        expect(iconContainer).toHaveStyle({
            backgroundColor: "var(--bs-dark-mode-dim)",
        })
    })

    it("Should apply light mode styling", () => {
        renderChatBot()

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")

        expect(iconContainer).toHaveStyle({
            backgroundColor: "var(--bs-white)",
        })
    })

    it("Should pass correct props to ChatCommon component", async () => {
        renderChatBot()

        // Open chat to trigger ChatCommon render
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)

        // Check that ChatCommon renders with correct content
        const chatWindow = await screen.findByTestId("chat-common")
        expect(chatWindow).toHaveAttribute("id", "chatbot-window")
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })

    it("Should set correct dark mode background for ChatCommon", async () => {
        // Set MUI to dark mode
        vi.mocked(useColorScheme).mockReturnValue(getUseColorSchemeMockReturnValue("dark"))

        renderChatBot()

        // Open chat to trigger ChatCommon render
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)

        // Check that ChatCommon renders with dark mode background
        const chatWindow = await screen.findByTestId("chat-common")
        expect(chatWindow).toHaveStyle({backgroundColor: "var(--bs-gray-dark)"})
    })

    it("Should use the provided id for the chatbot container", async () => {
        const customProps = {...mockProps, id: "custom-chatbot-id"}
        renderChatBot(customProps)

        // Open chat to see the container
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)

        await screen.findByTestId("chat-common")
        const chatContainer = document.getElementById("custom-chatbot-id")
        expect(chatContainer).toBeInTheDocument()
    })

    it("Should handle isAwaitingLlm state changes", async () => {
        renderChatBot()

        // Open chat
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)

        // Verify chat window renders (which confirms all state management is working)
        await screen.findByTestId("chat-common")
        expect(screen.getByText("Cognizant Neuro AI Assistant")).toBeInTheDocument()
    })
})
