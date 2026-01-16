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

import {useColorScheme} from "@mui/material"
import {render, screen, waitFor, within} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"

import {
    LEVEL_1_FOLDER,
    LEVEL_1_FOLDER_DISPLAY,
    LEVEL_2_FOLDER,
    LEVEL_2_FOLDER_DISPLAY,
    LIST_NETWORKS_RESPONSE,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MATH_GUY_DISPLAY,
    TEST_AGENTS_FOLDER,
    TEST_AGENTS_FOLDER_DISPLAY,
    TEST_DEEP_AGENT,
    TEST_DEEP_AGENT_DISPLAY,
} from "../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import {Sidebar, SidebarProps} from "../../../components/MultiAgentAccelerator/Sidebar/Sidebar"
import {testConnection} from "../../../controller/agent/Agent"
import {useEnvironmentStore} from "../../../state/environment"

const AGENT_NETWORK_SETTINGS_NAME = {name: /Agent Network Settings/u}
const AGENT_SERVER_ADDRESS = "Agent server address"
const CLEAR_INPUT = {name: /Clear input/u}
const DEFAULT_EXAMPLE_URL = "https://default.example.com"
const EDIT_EXAMPLE_URL = "https://edit.example.com"

const TEST_EXAMPLE_URL = "https://test.example.com"
const TOOLTIP_EXAMPLE_URL = "https://tooltip.example.com"

jest.mock("../../../controller/agent/Agent")

// Simulated Neuro-san version for testing
const TEST_VERSION = "1.2.3.4a"

// Mock MUI theming
jest.mock("@mui/material", () => ({
    ...jest.requireActual("@mui/material"),
    useColorScheme: jest.fn(),
}))

describe("SideBar", () => {
    withStrictMocks()

    let user: UserEvent

    const defaultProps: SidebarProps = {
        customURLCallback: jest.fn(),
        id: "test-flow-id",
        networks: LIST_NETWORKS_RESPONSE,
        setSelectedNetwork: jest.fn(),
        isAwaitingLlm: false,
    }

    /**
     * This function renders the Sidebar component
     * @param overrides An object of any prop overrides
     * @return The props for the Sidebar component
     */
    const renderSidebarComponent = (overrides = {}) => {
        const props: SidebarProps = {...defaultProps, ...overrides}
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

    beforeAll(() => {
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(DEFAULT_EXAMPLE_URL)
    })

    beforeEach(() => {
        user = userEvent.setup()
        ;(testConnection as jest.Mock).mockResolvedValue({success: true, status: "ok", version: TEST_VERSION})
        ;(useColorScheme as jest.Mock).mockReturnValue({
            mode: "light",
        })
    })

    it.each([false, true])("should render correctly with darkMode=%s", async (darkMode) => {
        ;(useColorScheme as jest.Mock).mockReturnValue({
            mode: darkMode ? "dark" : "light",
        })

        const {setSelectedNetwork} = renderSidebarComponent()

        // Make sure the heading is present
        await screen.findByText("Agent Networks")

        // click to expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Ensure the settings button is rendered
        await screen.findByRole("button", AGENT_NETWORK_SETTINGS_NAME)

        // Clicking on a network should call the setSelectedNetwork function
        const network = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
        await user.click(network)

        // setSelectedNetwork should be called
        expect(setSelectedNetwork).toHaveBeenCalledTimes(1)
        expect(setSelectedNetwork).toHaveBeenCalledWith(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)

        // Mousing over the cog should show the tooltip with the version and URL
        const settingsButton = await screen.findByRole("button", {name: /Agent Network Settings/u})

        // Hover over the settings button to show the tooltip
        await user.hover(settingsButton)

        // Check if the tooltip is displayed with the correct URL and version
        await screen.findByLabelText((label) => label.includes(DEFAULT_EXAMPLE_URL) && label.includes(TEST_VERSION))
    })

    it("Should render the tags when user mouses over the icon", async () => {
        renderSidebarComponent()

        // click to expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Find the first tag item and hover over it
        const network = await screen.findByTestId("BookmarkIcon")
        await user.hover(network)

        // Check that all tags are displayed in the tooltip
        for (const tag of LIST_NETWORKS_RESPONSE[0].tags) {
            await screen.findByText(tag)
        }
    })

    it("Should render uncategorized networks correctly", async () => {
        renderSidebarComponent()

        // Ensure uncategorized networks are displayed
        const uncategorizedHeader = await screen.findByText("Uncategorized")

        // Expand Uncategorized section
        await user.click(uncategorizedHeader)

        // Check for uncategorized networks; they are those without a "/" in their agent_name
        const uncategorizedNetworks = LIST_NETWORKS_RESPONSE.filter((n) => !n.agent_name.includes("/"))
        for (const network of uncategorizedNetworks) {
            await screen.findByText(cleanUpAgentName(network.agent_name))
        }
    })

    it("Should handle networks of arbitrary depth", async () => {
        renderSidebarComponent()

        // click to expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Ensure deep network is present
        const level1Header = await screen.findByText(LEVEL_1_FOLDER_DISPLAY)

        // Expand level 1
        await user.click(level1Header)

        const level2Header = await screen.findByText(LEVEL_2_FOLDER_DISPLAY)

        // Expand level 2
        await user.click(level2Header)

        // Check for deep agent
        const deepAgent = await screen.findByText(TEST_DEEP_AGENT_DISPLAY)

        // Deep agent tags
        // Find the BookmarkIcon within the same parent container as the deep agent text
        const deepAgentContainer = deepAgent.closest('[role="treeitem"]')
        const bookmarkIcon = within(deepAgentContainer as HTMLElement).getByTestId("BookmarkIcon")

        // Hover over the bookmark icon
        await user.hover(bookmarkIcon)

        // Verify the deep agent tags from LIST_NETWORKS_RESPONSE are displayed
        const deepAgentData = LIST_NETWORKS_RESPONSE.find(
            (n) => n.agent_name === `${TEST_AGENTS_FOLDER}/${LEVEL_1_FOLDER}/${LEVEL_2_FOLDER}/${TEST_DEEP_AGENT}`
        )
        for (const tag of deepAgentData.tags) {
            await screen.findByText(tag)
        }
    })

    it("should disable the Settings button when isAwaitingLlm is true", async () => {
        renderSidebarComponent({isAwaitingLlm: true})
        const settingsButton = await screen.findByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        expect(settingsButton).toBeDisabled()
    })

    it("should display tooltip with customURLLocalStorage if provided", async () => {
        renderSidebarComponent({customURLLocalStorage: TOOLTIP_EXAMPLE_URL})
        const settingsButton = await screen.findByRole("button", AGENT_NETWORK_SETTINGS_NAME)
        await user.hover(settingsButton)
        // Query the SVG element by its aria-label
        await screen.findByLabelText((label) => label.startsWith(TOOLTIP_EXAMPLE_URL))
        await user.unhover(settingsButton)
        await waitFor(() => expect(screen.queryByText(new RegExp(TOOLTIP_EXAMPLE_URL, "u"))).not.toBeInTheDocument())
    })

    it("Should open the popover, validate buttons, update the URL field, and close the popup on Save", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue({success: true})
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", AGENT_NETWORK_SETTINGS_NAME)

        // Check that Settings popover is not open
        expect(screen.queryByLabelText(AGENT_SERVER_ADDRESS)).not.toBeInTheDocument()

        // Open Settings popover
        await user.click(settingsButton)
        await screen.findByLabelText(AGENT_SERVER_ADDRESS)

        const urlInput = screen.getByLabelText(AGENT_SERVER_ADDRESS)
        // Ensure the input value is set to the default
        expect(urlInput).toHaveValue(DEFAULT_EXAMPLE_URL)

        const testButton = screen.getByRole("button", {name: /Test/u})
        const saveButton = screen.getByRole("button", {name: /Save/u})
        const defaultButton = screen.getByRole("button", {name: /Default/u})

        // Clear the URL input, similar to user manually clearing it (without using the clear input adornment)
        await user.clear(urlInput)

        // Test and Save buttons should be disabled until the user types a URL
        expect(testButton).toBeDisabled()
        expect(saveButton).toBeDisabled()

        // Type in the URL input
        await user.type(urlInput, EDIT_EXAMPLE_URL)

        // Ensure the input value is updated
        expect(urlInput).toHaveValue(EDIT_EXAMPLE_URL)

        // Test and Default buttons should be enabled once the user types a URL
        expect(testButton).toBeEnabled()
        expect(defaultButton).toBeEnabled()

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

    it("should show success message when Test button is clicked and connection succeeds", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue({success: true})
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /Test/u}))

        // Check if Success icon is displayed
        await screen.findByTestId("CheckCircleOutlineIcon")

        // Type in URL input again
        const urlInput = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.type(urlInput, TEST_EXAMPLE_URL)

        // Check that Success icon is not displayed
        expect(screen.queryByTestId("CheckCircleOutlineIcon")).not.toBeInTheDocument()
    })

    it("should show error message when Test button is clicked and connection fails", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue({success: false})
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /Test/u}))

        // Check if Error icon is displayed
        await screen.findByTestId("HighlightOffIcon")

        // Type in URL input again
        const urlInput = await screen.findByLabelText(AGENT_SERVER_ADDRESS)
        await user.type(urlInput, TEST_EXAMPLE_URL)

        // Check that Error icon is not displayed
        expect(screen.queryByTestId("HighlightOffIcon")).not.toBeInTheDocument()
    })

    it("Should allow Save after resetting to default URL, without Test", async () => {
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)

        const defaultButton = screen.getByRole("button", {name: /Default/u})
        const saveButton = screen.getByRole("button", {name: /Save/u})

        // Save should be disabled since user typed in the URL input but did not test it
        expect(saveButton).toBeDisabled()

        // Click the Default button to reset the input to the default URL
        await user.click(defaultButton)

        await waitFor(() => expect(saveButton).toBeEnabled())
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
        ;(testConnection as jest.Mock).mockResolvedValue({success: true})
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
        ;(testConnection as jest.Mock).mockResolvedValue({success: true})
        const {customURLCallback} = renderSidebarComponent()

        await openPopoverAndTypeInInput("example.com/")

        // Test connection to enable Save
        await user.click(screen.getByRole("button", {name: /Test/u}))
        await user.click(await screen.findByRole("button", {name: /Save/u}))

        // Should call with formatted URL
        expect(customURLCallback).toHaveBeenCalledWith("https://example.com")
    })

    it("should handle the Cancel button correctly", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue({success: true})
        const {customURLCallback} = renderSidebarComponent()

        await openPopoverAndTypeInInput("example.com/")

        // Click the Cancel button
        const cancelButton = screen.getByRole("button", {name: /Cancel/u})
        await user.click(cancelButton)
        expect(customURLCallback).not.toHaveBeenCalled()
    })

    it("should clear the input when Clear button is clicked", async () => {
        renderSidebarComponent()

        await openPopoverAndTypeInInput(EDIT_EXAMPLE_URL)

        const clearInput = screen.getByRole("button", CLEAR_INPUT)
        await user.click(clearInput)

        const urlInput = screen.getByLabelText(AGENT_SERVER_ADDRESS)
        expect(urlInput).toHaveValue("")

        const testButton = screen.getByRole("button", {name: /Test/u})
        const saveButton = screen.getByRole("button", {name: /Save/u})

        // Test and Save buttons should be disabled after user clears the URL input
        expect(testButton).toBeDisabled()
        expect(saveButton).toBeDisabled()

        // Check that Success icon is not displayed
        expect(screen.queryByTestId("CheckCircleOutlineIcon")).not.toBeInTheDocument()

        // Check that Error icon is not displayed
        expect(screen.queryByTestId("HighlightOffIcon")).not.toBeInTheDocument()
    })

    it("should not break if networks is empty", async () => {
        renderSidebarComponent({networks: []})
        await screen.findByText("Agent Networks")
        expect(screen.queryByRole("button", {name: TEST_AGENT_MATH_GUY})).not.toBeInTheDocument()
    })
})
