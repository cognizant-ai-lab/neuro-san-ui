import {render, screen, waitFor} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import Sidebar from "../../../components/AgentNetwork/Sidebar"
import {testConnection} from "../../../controller/agent/Agent"
import {withStrictMocks} from "../../common/strictMocks"

const AGENT_NETWORK_SETTINGS_NAME = {name: /Agent Network Settings/u}
const AGENT_SERVER_ADDRESS = "Agent server address"
const EDIT_EXAMPLE_URL = "https://edit.example.com"
const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"
const TOOLTIP_EXAMPLE_URL = "https://tooltip.example.com"

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

    /**
     * This function renders the Sidebar component
     * @param overrides An object of any prop overrides
     * @return The props for the Sidebar component
     */
    const renderSidebarComponent = (overrides = {}) => {
        const props = {...defaultProps, ...overrides}
        render(
            <SnackbarProvider>
                <Sidebar {...props} />
            </SnackbarProvider>
        )
        return props
    }

    /**
     * This function opens the Settings popover, clears the URL input and then optionally types a value into that input
     * @param url The URL to add to the URL input
     * @return An object with these elements: {settingsButton, urlInput}
     */
    const openPopoverAndTypeInInput = async (url?: string) => {
        const settingsButton = screen.getByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        // Open Settings Popover
        await user.click(settingsButton)
        const urlInput = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(urlInput)

        if (url) {
            await user.type(urlInput, url)
        }

        return {settingsButton, urlInput}
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
        await screen.findByRole("button", AGENT_NETWORK_SETTINGS_NAME)

        // Clicking on a network should call the setSelectedNetwork function
        const network = screen.getByText(cleanUpAgentName(TEST_AGENT_MATH_GUY))
        await user.click(network)

        // setSelectedNetwork should be called
        expect(setSelectedNetwork).toHaveBeenCalledTimes(1)
        expect(setSelectedNetwork).toHaveBeenCalledWith(TEST_AGENT_MATH_GUY)
    })

    it("should disable the Settings button when isAwaitingLlm is true", () => {
        renderSidebarComponent({isAwaitingLlm: true})
        const settingsButton = screen.getByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        expect(settingsButton).toBeDisabled()
    })

    it("should display tooltip with customURLLocalStorage if provided", async () => {
        renderSidebarComponent({customURLLocalStorage: TOOLTIP_EXAMPLE_URL})
        const settingsButton = await screen.findByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        await user.hover(settingsButton)
        // Query the SVG element by its aria-label
        await screen.findByLabelText(TOOLTIP_EXAMPLE_URL)
        await user.unhover(settingsButton)
        await waitFor(() => expect(screen.queryByText(TOOLTIP_EXAMPLE_URL)).not.toBeInTheDocument())
    })

    it("Should open the popover, validate buttons, update the URL field, and close the popup on Save", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", AGENT_NETWORK_SETTINGS_NAME)

        // Check that Settings popover is not open
        expect(screen.queryByLabelText(AGENT_SERVER_ADDRESS)).not.toBeInTheDocument()

        // Open Settings popover
        await user.click(settingsButton)
        await screen.findByLabelText(AGENT_SERVER_ADDRESS)

        const testButton = screen.getByRole("button", {name: /Test/u})
        const saveButton = screen.getByRole("button", {name: /Save/u})
        const resetButton = screen.getByRole("button", {name: /Reset/u})

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

        const {urlInput} = await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)

        const resetButton = screen.getByRole("button", {name: /Reset/u})
        await user.click(resetButton)

        // onCustomUrlChange should be called
        expect(customURLCallback).toHaveBeenCalledTimes(1)

        // Ensure the input value is reset
        expect(urlInput).toHaveValue("")
    })

    it("should show success message when Test button is clicked and connection succeeds", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /Test/u}))

        // Check if Success icon is displayed
        await screen.findByTestId("CheckCircleOutlineIcon")
    })

    it("should show error message when Test button is clicked and connection fails", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(false)
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /Test/u}))

        // Check if Error icon is displayed
        await screen.findByTestId("HighlightOffIcon")
    })

    it("should disable Save and Reset buttons in popover when input is empty", async () => {
        renderSidebarComponent()

        await openPopoverAndTypeInInput()

        const saveButton = screen.getByRole("button", {name: /Save/u})
        const resetButton = screen.getByRole("button", {name: /Reset/u})
        expect(saveButton).toBeDisabled()
        expect(resetButton).toBeDisabled()
    })

    // Not really a pure user interaction test, but might as well have it
    it("should call setSelectedNetwork(null) when resetting settings", async () => {
        const setSelectedNetwork = jest.fn()
        renderSidebarComponent({setSelectedNetwork})

        const settingsButton = screen.getByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        // Open Settings popover
        await user.click(settingsButton)

        const input = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        const resetButton = screen.getByRole("button", {name: /Reset/u})
        await user.click(resetButton)

        expect(setSelectedNetwork).toHaveBeenCalledWith(null)
    })

    it("should close the popover and reset input when Cancel (outside click) is triggered", async () => {
        renderSidebarComponent({customURLLocalStorage: EDIT_EXAMPLE_URL})

        const {settingsButton} = await openPopoverAndTypeInInput(TOOLTIP_EXAMPLE_URL)

        // Simulate clicking outside the popover (triggers onClose)
        await user.click(document.body)

        // Popover should close and input should reset to customURLLocalStorage
        // Can't use document.body due to MuiBackdrop
        await user.click(document.querySelector(".MuiBackdrop-root"))

        // Open again to check input value is reset
        await user.click(settingsButton)
        const urlInputAgain = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        expect(urlInputAgain).toHaveValue(EDIT_EXAMPLE_URL)
    })

    it("should allow saving with Enter key when Save is enabled", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        const {customURLCallback} = renderSidebarComponent()

        const {urlInput} = await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)

        // Test connection to enable Save
        await user.click(screen.getByRole("button", {name: /Test/u}))
        const saveButton = screen.getByRole("button", {name: /Save/u})
        expect(saveButton).toBeEnabled()

        // Click in URL input to bring focus to it
        await user.click(urlInput)

        // Press Enter key
        await user.keyboard("{Enter}")

        // Popover should close
        await waitFor(() => expect(screen.queryByLabelText(AGENT_SERVER_ADDRESS)).not.toBeInTheDocument())
        expect(customURLCallback).toHaveBeenCalled()
    })

    it("should format URL before saving (add https:// if missing, remove trailing slash)", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        const {customURLCallback} = renderSidebarComponent()

        await openPopoverAndTypeInInput("example.com/")

        // Test connection to enable Save
        await user.click(screen.getByRole("button", {name: /Test/u}))
        await user.click(screen.getByRole("button", {name: /Save/u}))

        // Should call with formatted URL
        expect(customURLCallback).toHaveBeenCalledWith("https://example.com")
    })

    it("should scroll selected network into view when selectedNetwork changes", async () => {
        const scrollIntoView = jest.fn()
        // Mock ref
        jest.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(scrollIntoView)
        const {setSelectedNetwork} = renderSidebarComponent()

        // Click the second network
        const network = screen.getByText(cleanUpAgentName(TEST_AGENT_MUSIC_NERD))
        await user.click(network)
        expect(setSelectedNetwork).toHaveBeenCalledWith(TEST_AGENT_MUSIC_NERD)
        // The scrollIntoView should have been called
        expect(scrollIntoView).toHaveBeenCalled()
    })

    it("should not break if networks is empty", () => {
        renderSidebarComponent({networks: []})
        expect(screen.getByText("Agent Networks")).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: TEST_AGENT_MATH_GUY})).not.toBeInTheDocument()
    })
})
