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

import {act, render, screen, waitFor, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import httpStatus from "http-status"
import {ComponentProps} from "react"

import {INVALID_MUI_ICON_NAME} from "../../../../../../__tests__/common/MuiIconsMock"
import {
    LEVEL_1_FOLDER,
    LEVEL_1_FOLDER_DISPLAY,
    LEVEL_2_FOLDER,
    LEVEL_2_FOLDER_DISPLAY,
    LIST_NETWORKS_RESPONSE,
    TEMPORARY_NETWORK,
    TEMPORARY_NETWORK_DEFINITION,
    TEMPORARY_NETWORK_NAME,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MATH_GUY_DISPLAY,
    TEST_AGENT_MUSIC_NERD,
    TEST_AGENT_MUSIC_NERD_DISPLAY,
    TEST_AGENTS_FOLDER,
    TEST_AGENTS_FOLDER_DISPLAY,
    TEST_DEEP_AGENT,
    TEST_DEEP_AGENT_DISPLAY,
} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {
    Sidebar,
    SidebarProps,
    SPARKLE_HIGHLIGHT_CLASS,
} from "../../../../components/MultiAgentAccelerator/Sidebar/Sidebar"
import {testConnection, TestConnectionResult} from "../../../../controller/agent/Agent"
import {NetworkIconSuggestions} from "../../../../controller/Types/NetworkIconSuggestions"
import {useEnvironmentStore} from "../../../../state/Environment"
import {useSettingsStore} from "../../../../state/Settings"
import {cleanUpAgentName} from "../../../../utils/AgentName"
import {downloadFile} from "../../../../utils/File"

const DEFAULT_EXAMPLE_URL = "https://default.example.com"

// mock MUI TreeView so we can generate normally impossible values
let mockSelectedTreeItemId: string | null | undefined
vi.mock("@mui/x-tree-view/RichTreeView", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@mui/x-tree-view/RichTreeView")>()

    return {
        ...actual,
        RichTreeView: (props: ComponentProps<typeof actual.RichTreeView>) => {
            const OriginalRichTreeView = actual.RichTreeView

            return (
                <>
                    <OriginalRichTreeView {...props} />
                    <button
                        type="button"
                        data-testid="force-tree-selection"
                        onClick={() => props.onSelectedItemsChange?.(null, mockSelectedTreeItemId ?? null)}
                    />
                </>
            )
        },
    }
})

vi.mock("../../../../controller/agent/Agent")
vi.mock("../../../../utils/File", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../../utils/File")>()

    return {
        ...actual,
        downloadFile: vi.fn(),
    }
})

// Simulated Neuro-san version for testing
const TEST_VERSION = "1.2.3.4a"

// Provide a suggested icon for first network
const NETWORK_ICON_SUGGESTIONS: NetworkIconSuggestions = {
    [`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`]: "Settings",
}

const onDeleteNetworkMock = vi.fn()
const onImportClickMock = vi.fn()
const setSelectedNetworkMock = vi.fn()

const DEFAULT_PROPS: SidebarProps = {
    id: "test-flow-id",
    isAwaitingLlm: false,
    isImporting: false,
    networkIconSuggestions: NETWORK_ICON_SUGGESTIONS,
    networks: LIST_NETWORKS_RESPONSE,
    neuroSanServerURL: DEFAULT_EXAMPLE_URL,
    newlyAddedTemporaryNetworks: undefined,
    onDeleteNetwork: onDeleteNetworkMock,
    onEditNetwork: vi.fn(),
    onImportClick: onImportClickMock,
    setSelectedNetwork: setSelectedNetworkMock,
}

// Not available in JSDom. See: https://github.com/jsdom/jsdom/issues/1695
window.HTMLElement.prototype.scrollIntoView = vi.fn()

describe("SideBar", () => {
    withStrictMocks()

    let user: UserEvent

    /**
     * This function renders the Sidebar component
     * @param overrides An object of any prop overrides
     * @return The props for the Sidebar component
     */
    const renderSidebarComponent = (overrides: Partial<SidebarProps> = {}) => {
        const props: SidebarProps = {...DEFAULT_PROPS, ...overrides}
        const {rerender} = render(<Sidebar {...props} />)

        return {props, rerender}
    }

    beforeAll(() => {
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(DEFAULT_EXAMPLE_URL)
    })

    beforeEach(() => {
        // This has nothing to do with Jest itself and everything to do with a bug in React Testing Library.
        // See: https://github.com/testing-library/user-event/issues/1115#issuecomment-1565730917
        // @ts-expect-error -- it's an ugly workaround to be removed when the above issue is fixed in RTL.
        globalThis["jest"] = {
            advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
        }

        mockSelectedTreeItemId = undefined

        user = userEvent.setup()
        const testConnectionMock = vi.mocked(testConnection)
        testConnectionMock.mockResolvedValue({
            httpStatus: httpStatus.OK,
            status: "ok",
            success: true,
            version: TEST_VERSION,
        } satisfies TestConnectionResult)

        // Reset settings store
        useSettingsStore.getState().resetSettings()
    })

    it("should render correctly", async () => {
        const {
            props: {setSelectedNetwork},
        } = renderSidebarComponent({})

        // Make sure the heading is present
        await screen.findByText("Agent Networks")

        // click to expand networks
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Clicking on a network should call the setSelectedNetwork function
        const network = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
        await user.click(network)

        // setSelectedNetwork should be called
        expect(setSelectedNetwork).toHaveBeenCalledTimes(1)
        expect(setSelectedNetwork).toHaveBeenCalledWith(`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`)
    })

    it("should show correct Neuro SAN status", async () => {
        const {rerender} = renderSidebarComponent({})

        const statusLight = await screen.findByTestId(`${DEFAULT_PROPS.id}-agent-network-status-light`)

        // We mocked testConnection to return success, so the status light should be green
        await waitFor(() => expect(statusLight).toHaveAttribute("data-status", "green"))

        // Check Tooltip
        await user.hover(statusLight)
        const statusTooltip = await screen.findByRole("tooltip", {name: "Neuro-san server status"})
        within(statusTooltip).getByText(TEST_VERSION)
        within(statusTooltip).getByText(/online/u)
        within(statusTooltip).getByText(DEFAULT_EXAMPLE_URL)

        // Now mock testConnection to return failure and re-render the component
        const statusMessage = "expected error string"

        const testConnectionMock = vi.mocked(testConnection)
        testConnectionMock.mockResolvedValue({
            success: false,
            status: statusMessage,
            httpStatus: httpStatus.IM_A_TEAPOT,
        } satisfies TestConnectionResult)

        rerender(
            <Sidebar
                {...DEFAULT_PROPS}
                neuroSanServerURL=""
            />
        )

        // The status light should now be red
        const errorStatusLight = await screen.findByTestId(`${DEFAULT_PROPS.id}-agent-network-status-light`)
        await user.hover(errorStatusLight)
        await waitFor(() => expect(errorStatusLight).toHaveAttribute("data-status", "red"))

        // Tooltip should now show the error status
        const updatedStatusTooltip = await screen.findByRole("tooltip", {name: "Neuro-san server status"})
        within(updatedStatusTooltip).getByText(statusMessage)
        within(updatedStatusTooltip).getByText("offline")
        // version and URL should be "unknown"
        expect(within(updatedStatusTooltip).getAllByText("unknown")).toHaveLength(2)
        within(updatedStatusTooltip).getByText(new RegExp(String(httpStatus.IM_A_TEAPOT), "u"))

        testConnectionMock.mockClear()

        // Now with an unknown http status (mainly for branch coverage)
        testConnectionMock.mockResolvedValue({
            success: false,
            status: statusMessage,
            httpStatus: httpStatus.IM_A_TEAPOT + 1,
        } satisfies TestConnectionResult)

        rerender(
            <Sidebar
                {...DEFAULT_PROPS}
                neuroSanServerURL="different-url"
            />
        )

        const unknownErrorStatusLight = await screen.findByTestId(`${DEFAULT_PROPS.id}-agent-network-status-light`)
        await user.hover(unknownErrorStatusLight)
        await waitFor(() => expect(unknownErrorStatusLight).toHaveAttribute("data-status", "red"))

        // Status light should still be red, but the tooltip should show the unknown status code
        await waitFor(() =>
            expect(screen.getByTestId(`${DEFAULT_PROPS.id}-agent-network-status-light`)).toHaveAttribute(
                "data-status",
                "red"
            )
        )
        const unknownStatusTooltip = await screen.findByRole("tooltip", {name: "Neuro-san server status"})
        within(unknownStatusTooltip).getByText(statusMessage)
        within(unknownStatusTooltip).getByText("offline")
        within(unknownStatusTooltip).getByText("unknown")
        within(unknownStatusTooltip).getByText(new RegExp(`${String(httpStatus.IM_A_TEAPOT + 1)}.*Unknown status`, "u"))
    })

    it.each([
        {
            caseName: "Error object",
            exception: new Error("Simulated testConnection error"),
            expectedMessage: "Simulated testConnection error",
        },
        {
            caseName: "string",
            exception: "Simulated string error",
            expectedMessage: "Simulated string error",
        },
    ])("handles errors from testConnection when $caseName is thrown", async ({exception, expectedMessage}) => {
        const testConnectionMock = vi.mocked(testConnection)

        testConnectionMock.mockRejectedValue(exception)

        renderSidebarComponent({})

        const statusLight = await screen.findByTestId(`${DEFAULT_PROPS.id}-agent-network-status-light`)
        await user.hover(statusLight)

        const tooltip = await screen.findByRole("tooltip", {name: "Neuro-san server status"})
        within(tooltip).getByText(expectedMessage)
    })

    it("Should display suggested network icons correctly", async () => {
        renderSidebarComponent()

        // click to expand networks
        const header = screen.getByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        const networkElement = screen.getByText(TEST_AGENT_MATH_GUY_DISPLAY)

        // Find the icon within the same parent container as the network text
        const networkContainer = networkElement.closest('[role="treeitem"]')
        within(networkContainer as HTMLElement).getByTestId("SettingsIcon")
    })

    it("should respect the 'use native names' setting", async () => {
        useSettingsStore.getState().updateSettings({
            appearance: {
                useNativeNames: false,
            },
        })

        renderSidebarComponent()

        // click to expand networks
        const header = screen.getByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // The display name should be the cleaned-up version of the agent name, not the raw agent name
        screen.getByText(TEST_AGENT_MATH_GUY_DISPLAY)
        expect(screen.queryByText(TEST_AGENT_MATH_GUY)).not.toBeInTheDocument()

        // Now change to useNativeNames = true and check that the raw agent name is displayed
        act(() =>
            useSettingsStore.getState().updateSettings({
                appearance: {
                    useNativeNames: true,
                },
            })
        )

        // now the raw agent name should be displayed
        screen.getByText(TEST_AGENT_MATH_GUY)
        screen.getByText(TEST_AGENTS_FOLDER)

        // Beautified names should no longer be displayed
        expect(screen.queryByText(TEST_AGENTS_FOLDER_DISPLAY)).not.toBeInTheDocument()
        expect(screen.queryByText(TEST_AGENT_MATH_GUY_DISPLAY)).not.toBeInTheDocument()
    })

    it("Should handle invalid icon suggestions correctly", async () => {
        renderSidebarComponent({
            // Override networkIconSuggestions to include an invalid icon name for TEST_AGENT_MUSIC_NERD
            networkIconSuggestions: {
                ...NETWORK_ICON_SUGGESTIONS,
                [`${TEST_AGENTS_FOLDER}/${TEST_AGENT_MUSIC_NERD}`]: INVALID_MUI_ICON_NAME,
            },
        })

        // click to expand networks
        const header = screen.getByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // Check for fallback to default icon
        const treeItem = screen.getByText(TEST_AGENT_MUSIC_NERD_DISPLAY).closest('[role="treeitem"]')
        within(treeItem as HTMLElement).getByTestId("HubIcon")
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

    it("Should render a child network without tags and omit the bookmark icon", async () => {
        renderSidebarComponent({
            networks: [
                {
                    agent_name: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`,
                    description: "",
                    // Intentionally omit `tags` to exercise the `agentNode?.tags || []` fallback
                },
            ],
        })

        // Expand the folder
        const header = await screen.findByText(TEST_AGENTS_FOLDER_DISPLAY)
        await user.click(header)

        // The network renders, but with no tags there should be no bookmark icon
        const networkElement = await screen.findByText(TEST_AGENT_MATH_GUY_DISPLAY)
        const networkContainer = networkElement.closest('[role="treeitem"]')
        expect(within(networkContainer as HTMLElement).queryByTestId("BookmarkIcon")).not.toBeInTheDocument()
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

    it("Should handle temporary networks correctly", async () => {
        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [TEMPORARY_NETWORK],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
        })

        // Item should be auto-expanded as it's a newly added temporary network
        await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))

        // Should be an icon to download the network
        const downloadButton = screen.getByTestId("DownloadIcon")
        await user.click(downloadButton)

        expect(downloadFile).toHaveBeenCalledWith(
            JSON.stringify(TEMPORARY_NETWORK_DEFINITION, null, 2),
            `${TEMPORARY_NETWORK_NAME}.json`,
            "application/json"
        )
    })

    it("Should handle expired temporary networks correctly", async () => {
        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [
                {
                    ...TEMPORARY_NETWORK,
                    reservation: {
                        ...TEMPORARY_NETWORK.reservation,
                        // Set expiration time in the past to simulate expired network
                        expiration_time_in_seconds: Math.floor(Date.now() / 1000) - 3600,
                    },
                },
            ],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
        })

        // Should be displayed even if expired
        const tempNetworkName = await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))
        await user.hover(tempNetworkName)

        // Tooltip should indicate that the network is expired
        await screen.findByText(/Expired/u)

        // The download and edit action buttons should be disabled while the network is expired
        const treeItem = tempNetworkName.closest('[role="treeitem"]')
        expect(
            within(treeItem as HTMLElement)
                .getByTestId("DownloadIcon")
                .closest("button")
        ).toBeDisabled()
        expect(
            within(treeItem as HTMLElement)
                .getByTestId("EditIcon")
                .closest("button")
        ).toBeDisabled()

        setSelectedNetworkMock.mockClear()

        // Clicking the expired network should have no effect
        await user.click(tempNetworkName)

        expect(setSelectedNetworkMock).not.toHaveBeenCalled()
    })

    it("Should allow deleting temporary networks", async () => {
        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [TEMPORARY_NETWORK],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
        })

        const networkTreeItem = await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))

        // Find the delete icon within the same tree item
        const treeItem = networkTreeItem.closest('[role="treeitem"]')
        const deleteIcon = within(treeItem as HTMLElement).getByTestId("DeleteIcon")
        await user.click(deleteIcon)

        // onDeleteNetwork should be called with the correct network name
        expect(onDeleteNetworkMock).toHaveBeenCalledWith(TEMPORARY_NETWORK.agentInfo.agent_name, false)
    })

    it("Should select the network and call onEditNetwork when edit is clicked on a non-selected network", async () => {
        const onEditNetworkMock = vi.fn()
        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [TEMPORARY_NETWORK],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
            onEditNetwork: onEditNetworkMock,
        })

        await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))

        setSelectedNetworkMock.mockClear()

        // Click the edit icon – the network is NOT currently selected
        const networkTreeItem = screen.getByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))
        const treeItem = networkTreeItem.closest('[role="treeitem"]')
        const editButton = within(treeItem as HTMLElement).getByTestId("EditIcon")
        await user.click(editButton)

        // Should have selected the network because it was not already selected
        expect(setSelectedNetworkMock).toHaveBeenCalledWith(TEMPORARY_NETWORK.agentInfo.agent_name)
        // Should also have called onEditNetwork
        expect(onEditNetworkMock).toHaveBeenCalledWith(TEMPORARY_NETWORK.agentInfo.agent_name)
    })

    it("Should not re-select the network when edit is clicked on the already-selected network", async () => {
        const onEditNetworkMock = vi.fn()
        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [TEMPORARY_NETWORK],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
            onEditNetwork: onEditNetworkMock,
        })

        // First, select the network by clicking its label
        const networkLabel = await screen.findByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))
        await user.click(networkLabel)

        setSelectedNetworkMock.mockClear()

        // Now click the edit icon – the network IS already selected
        const networkTreeItem = screen.getByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME))
        const treeItem = networkTreeItem.closest('[role="treeitem"]')
        const editButton = within(treeItem as HTMLElement).getByTestId("EditIcon")
        await user.click(editButton)

        // Should NOT have called setSelectedNetwork again (network was already selected)
        expect(setSelectedNetworkMock).not.toHaveBeenCalled()
        // Should still have called onEditNetwork
        expect(onEditNetworkMock).toHaveBeenCalledWith(TEMPORARY_NETWORK.agentInfo.agent_name)
    })

    it("Should handle invalid items in select handler", async () => {
        renderSidebarComponent()

        mockSelectedTreeItemId = null
        await user.click(screen.getByTestId("force-tree-selection"))

        mockSelectedTreeItemId = "not-a-real-tree-item"
        await user.click(screen.getByTestId("force-tree-selection"))

        expect(setSelectedNetworkMock).not.toHaveBeenCalled()
    })

    it("should disable the import button when isAwaitingLlm is true", async () => {
        renderSidebarComponent({isAwaitingLlm: true})
        const importButton = await screen.findByRole("button", {name: /Import Network Definition/u})
        expect(importButton).toBeDisabled()
    })

    it("should disable the import button when isImporting is true", async () => {
        renderSidebarComponent({isImporting: true})
        const importButton = await screen.findByRole("button", {name: /Import Network Definition/u})
        expect(importButton).toBeDisabled()
    })

    it("should render the import button and call onImportClick when the import button is clicked", async () => {
        renderSidebarComponent()
        const importButton = await screen.findByRole("button", {name: /Import Network Definition/u})
        await user.click(importButton)
        expect(onImportClickMock).toHaveBeenCalledTimes(1)
    })

    it("should not break if networks is empty", async () => {
        renderSidebarComponent({networks: []})
        await screen.findByText("Agent Networks")
        expect(screen.queryByRole("button", {name: TEST_AGENT_MATH_GUY})).not.toBeInTheDocument()
    })

    it("Should add sparkle-highlight to the selected tree item after the 50ms timeout", async () => {
        // Fake timers make the 50ms highlight callback fire deterministically.
        vi.useFakeTimers()

        renderSidebarComponent({
            networks: [...LIST_NETWORKS_RESPONSE],
            temporaryNetworks: [TEMPORARY_NETWORK],
            newlyAddedTemporaryNetworks: new Set([TEMPORARY_NETWORK.agentInfo.agent_name]),
        })

        // Flush pending state updates; findByText succeeds on the first poll (element
        // already present), so no fake-timer conflict.
        const treeItem = screen.getByText(cleanUpAgentName(TEMPORARY_NETWORK_NAME)).closest('[role="treeitem"]')

        // Class only gets applied after 50 ms elapsed, which they haven't yet (in our simulated timeline)
        expect(treeItem).not.toHaveClass(SPARKLE_HIGHLIGHT_CLASS)

        // Fire the pending 50ms timer — covers the true arm of `if (selectedNode)`.
        // 5000ms sparkle-remove timer registered inside the callback won't fire here.
        act(() => {
            vi.advanceTimersByTime(50)
        })

        // Now the sparkle class should have been applied
        await waitFor(() => expect(treeItem).toHaveClass(SPARKLE_HIGHLIGHT_CLASS))

        act(() => {
            vi.advanceTimersByTime(5001)
        })

        // Make sure the sparkle highlight class is removed after the next timer runs
        await waitFor(() => expect(treeItem).not.toHaveClass(SPARKLE_HIGHLIGHT_CLASS))
    })

    it("Should be a no-op when the highlight callback finds no matching tree item", async () => {
        // Fake timers make the 50ms callback fire deterministically.
        vi.useFakeTimers()

        // Render with empty networks, so there are NO treeitem elements in the DOM.
        // When the 50ms timer fires, querySelector returns null → covers the false
        // arm of `if (selectedNode)` in the highlight callback.
        renderSidebarComponent({
            networks: [],
            temporaryNetworks: [],
            newlyAddedTemporaryNetworks: new Set(["any-name"]),
        })

        screen.getByText("Agent Networks")

        // Fire the 50ms timer — selectedNode is null, so the callback is a no-op.
        act(() => {
            vi.advanceTimersByTime(50)
        })

        await waitFor(() => expect(screen.queryByRole("treeitem")).not.toBeInTheDocument())
    })
})
