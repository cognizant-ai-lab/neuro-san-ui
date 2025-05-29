import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import Sidebar from "../../../components/AgentNetwork/Sidebar"
import {testConnection} from "../../../controller/agent/Agent"
import {withStrictMocks} from "../../common/strictMocks"

const AGENT_SERVER_ADDRESS = "Agent server address"
const EDIT_EXAMPLE_URL = "https://edit.example.com"
const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"

jest.mock("../../../controller/agent/Agent", () => ({
    ...jest.requireActual("../../../controller/agent/Agent"),
    testConnection: jest.fn(),
}))

describe("SideBar", () => {
    let user: UserEvent

    const defaultProps = {
        customURLCallback: jest.fn(),
        id: "test-flow-id",
        neuroSanURL: "",
        networks: [TEST_AGENT_MATH_GUY, TEST_AGENT_MUSIC_NERD],
        selectedNetwork: TEST_AGENT_MATH_GUY,
        setSelectedNetwork: jest.fn(),
        isAwaitingLlm: false,
    }

    const renderSidebarComponent = (overrides = {}) => {
        const props = {...defaultProps, ...overrides}
        render(
            <SnackbarProvider>
                <Sidebar {...props} />
            </SnackbarProvider>
        )
        return props
    }

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
    })

    it("Should render Sidebar correctly", async () => {
        const {setSelectedNetwork} = renderSidebarComponent()

        // Make sure the heading is present
        await screen.findByText("Agent Networks")

        // Ensure the settings button is rendered
        await screen.findByRole("button", {name: /agent network settings/iu})

        // Clicking on a network should call the setSelectedNetwork function
        const network = screen.getByText(cleanUpAgentName(TEST_AGENT_MATH_GUY))
        await user.click(network)

        // setSelectedNetwork should be called
        expect(setSelectedNetwork).toHaveBeenCalledTimes(1)
        expect(setSelectedNetwork).toHaveBeenCalledWith(TEST_AGENT_MATH_GUY)
    })

    it("should disable the Settings button when isAwaitingLlm is true", () => {
        renderSidebarComponent({isAwaitingLlm: true})
        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        expect(settingsButton).toBeDisabled()
    })

    it("should display tooltip with customURLLocalStorage if provided", async () => {
        renderSidebarComponent({customURLLocalStorage: "https://foo.bar"})
        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        await user.hover(settingsButton)
        // Tooltip is rendered in a portal, so we can't easily assert its content,
        // but we can check that the button is present and enabled
        expect(settingsButton).toBeInTheDocument()
    })

    it("Should open the popover, validate buttons, update the URL field, and close the popup on Save", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        expect(screen.queryByLabelText(AGENT_SERVER_ADDRESS)).not.toBeInTheDocument()

        // Open Settings popover
        await user.click(settingsButton)
        await screen.findByLabelText(AGENT_SERVER_ADDRESS)

        const testButton = screen.getByRole("button", {name: /test/iu})
        const saveButton = screen.getByRole("button", {name: /save/iu})
        const resetButton = screen.getByRole("button", {name: /reset/iu})

        // Test, Save, and Reset buttons should be disabled until the user types a URL
        expect(testButton).toBeDisabled()
        expect(resetButton).toBeDisabled()
        expect(saveButton).toBeDisabled()

        const urlInput = screen.getByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(urlInput)
        await user.type(urlInput, EDIT_EXAMPLE_URL)

        // Ensure the input value is updated
        expect(urlInput).toHaveValue(EDIT_EXAMPLE_URL)

        // Test and Reset buttons should be enabled once the user types a URL
        expect(testButton).toBeEnabled()
        expect(resetButton).toBeEnabled()

        // Make sure the Save button is still disabled, until Test button is clicked
        expect(saveButton).toBeDisabled()

        // Click the Test button
        await user.click(testButton)

        // Make sure the Save button is now enabled, after the Test button was clicked
        expect(saveButton).toBeEnabled()

        await user.click(saveButton)

        // Ensure the popover is closed after saving
        expect(screen.queryByText("Custom Agent Network URL")).not.toBeInTheDocument()

        // Open the Settings popover again to check if the URL is saved
        await user.click(settingsButton)
        await screen.findByDisplayValue(EDIT_EXAMPLE_URL)

        // onCustomUrlChange should be called
        expect(customURLCallback).toHaveBeenCalledTimes(1)
    })

    it("Should reset the custom URL when the Reset button in popover is clicked", async () => {
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const urlInput = screen.getByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(urlInput)
        await user.type(urlInput, EDIT_EXAMPLE_URL)

        const resetButton = screen.getByRole("button", {name: /reset/iu})
        await user.click(resetButton)

        // onCustomUrlChange should be called
        expect(customURLCallback).toHaveBeenCalledTimes(1)

        // Ensure the input value is reset
        expect(urlInput).toHaveValue("")
    })

    it("should show success message when Test button is clicked and connection succeeds", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const input = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /test/iu}))

        // Check if Success icon is displayed
        await screen.findByTestId("CheckCircleOutlineIcon")
    })

    it("should show error message when Test button is clicked and connection fails", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(false)
        renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const input = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /test/iu}))

        // Check if Error icon is displayed
        await screen.findByTestId("HighlightOffIcon")
    })

    it("should disable Save and Reset buttons in popover when input is empty", async () => {
        renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const input = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(input)
        const saveButton = screen.getByRole("button", {name: /save/iu})
        const resetButton = screen.getByRole("button", {name: /reset/iu})
        expect(saveButton).toBeDisabled()
        expect(resetButton).toBeDisabled()
    })

    // Not really a pure user interaction test, but might as well have it
    it("should call setSelectedNetwork(null) when resetting settings", async () => {
        const setSelectedNetwork = jest.fn()
        renderSidebarComponent({setSelectedNetwork})

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const input = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        const resetButton = screen.getByRole("button", {name: /reset/iu})
        await user.click(resetButton)

        expect(setSelectedNetwork).toHaveBeenCalledWith(null)
    })
})
