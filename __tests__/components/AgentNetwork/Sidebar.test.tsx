import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {SnackbarProvider} from "notistack"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import Sidebar from "../../../components/AgentNetwork/Sidebar"
import {testConnection} from "../../../controller/agent/Agent"
import {withStrictMocks} from "../../common/strictMocks"

const EDIT_EXAMPLE_URL = "https://edit-example.com"
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

    it("Should render correctly", async () => {
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

    it("Should open the popover, update the URL field, and save when the save button is clicked", async () => {
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        expect(screen.queryByLabelText("Agent server address")).not.toBeInTheDocument()

        // Open Settings popover
        await user.click(settingsButton)
        await screen.findByLabelText("Agent server address")

        const urlInput = screen.getByLabelText("Agent server address")
        await user.clear(urlInput)
        await user.type(urlInput, EDIT_EXAMPLE_URL)

        // Ensure the input value is updated
        expect(urlInput).toHaveValue(EDIT_EXAMPLE_URL)

        const saveButton = screen.getByRole("button", {name: /save/iu})
        await user.click(saveButton)

        // Ensure the popover is closed after saving
        expect(screen.queryByText("Custom Agent Network URL")).not.toBeInTheDocument()

        // Open the Settings popover again to check if the URL is saved
        await user.click(settingsButton)
        await screen.findByDisplayValue(EDIT_EXAMPLE_URL)

        // onCustomUrlChange should be called
        expect(customURLCallback).toHaveBeenCalledTimes(1)
    })

    it("Should reset the custom URL when the reset button is clicked", async () => {
        const {customURLCallback} = renderSidebarComponent()

        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        // Open Settings popover
        await user.click(settingsButton)

        const urlInput = screen.getByLabelText("Agent server address")
        await user.clear(urlInput)
        await user.type(urlInput, EDIT_EXAMPLE_URL)

        const resetButton = screen.getByRole("button", {name: /reset/iu})
        await user.click(resetButton)

        // onCustomUrlChange should be called
        expect(customURLCallback).toHaveBeenCalledTimes(1)

        // Ensure the input value is reset
        expect(urlInput).toHaveValue("")
    })

    it("should disable the settings button when isAwaitingLlm is true", () => {
        renderSidebarComponent({isAwaitingLlm: true})
        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        expect(settingsButton).toBeDisabled()
    })

    it("should save settings when pressing Enter in the input", async () => {
        const {customURLCallback} = renderSidebarComponent()
        const settingsButton = screen.getByRole("button", {name: /agent network settings/iu})
        await user.click(settingsButton)
        const urlInput = await screen.findByLabelText("Agent server address")
        await user.clear(urlInput)
        await user.type(urlInput, EDIT_EXAMPLE_URL)
        await user.keyboard("{Enter}")
        expect(customURLCallback).toHaveBeenCalledWith(EDIT_EXAMPLE_URL)
    })

    it("should show success message when Test button is clicked and connection succeeds", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(true)
        renderSidebarComponent()

        await user.click(screen.getByRole("button", {name: /agent network settings/iu}))
        const input = await screen.findByLabelText("Agent server address")
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /test/iu}))
        expect(await screen.findByTestId("CheckCircleOutlineIcon")).toBeInTheDocument()
    })

    it("should show error message when Test button is clicked and connection fails", async () => {
        ;(testConnection as jest.Mock).mockResolvedValue(false)
        renderSidebarComponent()

        await user.click(screen.getByRole("button", {name: /agent network settings/iu}))
        const input = await screen.findByLabelText("Agent server address")
        await user.clear(input)
        await user.type(input, EDIT_EXAMPLE_URL)
        await user.click(screen.getByRole("button", {name: /test/iu}))
        expect(await screen.findByTestId("HighlightOffIcon")).toBeInTheDocument()
    })
})
