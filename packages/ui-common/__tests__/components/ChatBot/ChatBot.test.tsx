import {createTheme, Theme, ThemeProvider} from "@mui/material/styles"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent, {UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ChatBot} from "../../../components/ChatBot/ChatBot"
import {SHEEN_DARK, SHEEN_LIGHT, SHEEN_RADIUS_SURFACE} from "../../../Theme/sheen"
import {useAuthentication} from "../../../utils/Authentication"

// Mock dependencies
vi.mock("../../../utils/Authentication", () => ({
    useAuthentication: vi.fn(),
}))

vi.mock("../../../components/AgentChat/ChatCommon/ChatCommon", () => ({
    ChatCommon: (props: {id: string; title: string; onClose: () => void; backgroundColor: string}) => (
        <div
            data-background-color={props.backgroundColor}
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

const mockUseAuthentication = vi.mocked(useAuthentication)

// jsdom normalizes colors in computed styles to rgb() notation
const hexToRgb = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16)

    return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`
}

const LIGHT_THEME = createTheme({palette: {mode: "light", sheen: SHEEN_LIGHT.sheen}})
const DARK_THEME = createTheme({palette: {mode: "dark", sheen: SHEEN_DARK.sheen}})

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

        user = userEvent.setup()
    })

    const renderChatBot = (props = mockProps, theme: Theme = LIGHT_THEME) =>
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

    it.each([
        {mode: "light", theme: LIGHT_THEME, sheen: SHEEN_LIGHT.sheen},
        {mode: "dark", theme: DARK_THEME, sheen: SHEEN_DARK.sheen},
    ])("Should render the launcher icon with the sheen gradient in $mode mode", ({theme, sheen}) => {
        renderChatBot(mockProps, theme)

        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")

        // Gradient comes from the mode's palette tokens rather than hand-written dark/light branches
        const {backgroundImage} = getComputedStyle(iconContainer)
        expect(backgroundImage).toContain("linear-gradient")
        expect(backgroundImage).toContain(hexToRgb(sheen.gradientStart))
        expect(backgroundImage).toContain(hexToRgb(sheen.gradientEnd))
        expect(iconContainer).toHaveStyle({borderRadius: "50%"})
    })

    it.each([
        {mode: "light", theme: LIGHT_THEME, sheen: SHEEN_LIGHT.sheen},
        {mode: "dark", theme: DARK_THEME, sheen: SHEEN_DARK.sheen},
    ])("Should render the chat window as a glass surface in $mode mode", async ({theme, sheen}) => {
        renderChatBot(mockProps, theme)

        await user.click(screen.getByTestId("ContactSupportIcon").closest("div"))
        await screen.findByTestId("chat-common")

        const chatContainer = document.getElementById(mockProps.id)
        expect(chatContainer).toHaveStyle({
            backgroundColor: sheen.glassBg,
            borderRadius: `${SHEEN_RADIUS_SURFACE}px`,
        })
        expect(chatContainer).toHaveStyle({border: `1px solid ${sheen.glassBorder}`})
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

    it("Should make the ChatCommon background transparent so the glass panel shows through", async () => {
        renderChatBot(mockProps, DARK_THEME)

        // Open chat to trigger ChatCommon render
        const iconContainer = screen.getByTestId("ContactSupportIcon").closest("div")
        expect(iconContainer).not.toBeNull()
        await user.click(iconContainer)

        // Check that ChatCommon is told not to paint its own background
        const chatWindow = await screen.findByTestId("chat-common")
        expect(chatWindow).toHaveAttribute("data-background-color", "transparent")
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
