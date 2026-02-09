import {fireEvent, render, screen} from "@testing-library/react"
import {UserEvent} from "@testing-library/user-event"
import {default as userEvent} from "@testing-library/user-event/dist/cjs/index.js"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"
import {NotificationType, sendNotification} from "../../../components/Common/notification"
import {SettingsDialog} from "../../../components/Settings/SettingsDialog"
import {DEFAULT_SETTINGS, useSettingsStore} from "../../../state/Settings"

// Mock notification system
jest.mock("../../../components/Common/notification")

describe("SettingsDialog", () => {
    withStrictMocks()

    let user: UserEvent
    let originalFetch: typeof global.fetch

    beforeEach(() => {
        user = userEvent.setup()
        useSettingsStore.getState().resetSettings()
        originalFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it("renders the SettingsDialog with default props", async () => {
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )
        await screen.findByText("Settings")
    })

    it("triggers onClose when the dialog is closed", async () => {
        const onCloseMock = jest.fn()
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
                onClose={onCloseMock}
            />
        )

        const closeButton = await screen.findByLabelText("close")
        await user.click(closeButton)
        expect(onCloseMock).toHaveBeenCalledTimes(1)
    })

    it.each([
        {
            label: "plasma-color-picker",
            color: "#112233",
            expectedUpdate: {appearance: {plasmaColor: "#112233"}},
        },
        {
            label: "agent-node-color-picker",
            color: "#445566",
            expectedUpdate: {appearance: {agentNodeColor: "#445566"}},
        },
        {
            label: "agent-icon-color-picker",
            color: "#778899",
            expectedUpdate: {appearance: {agentIconColor: "#778899"}},
        },
    ])("updates $label when user selects new color", async ({label, color, expectedUpdate}) => {
        // Set some non-default values first
        useSettingsStore.getState().updateSettings({
            appearance: {
                plasmaColor: "#000000",
                agentNodeColor: "#000000",
                agentIconColor: "#000000",
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const colorInput = screen.getByLabelText(label)

        // Simulate the onChange event with a new color value.
        // Can't do this in a more "user-like" way since JSDom doesn't really implement the color-picker input.
        fireEvent.change(colorInput, {target: {value: color}})

        const appearanceSettings = useSettingsStore.getState().settings.appearance
        expect(appearanceSettings).toMatchObject(expectedUpdate.appearance)
    })

    it("Changes palette for depth/heatmap when user selects a new option", async () => {
        // Set non-default value first
        useSettingsStore.getState().updateSettings({
            appearance: {
                // Assuming the default is not "green"
                rangePalette: "green",
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Find button to select "GrayScale" palette
        const grayScaleButton = screen.getByRole("button", {name: /grayScale-palette-button/u})

        // Click the button to change the palette
        await user.click(grayScaleButton)

        expect(useSettingsStore.getState().settings.appearance.rangePalette).toBe("grayScale")
    })

    it("Allows selecting and unselecting auto agent icon color", async () => {
        // Set non-default value first
        useSettingsStore.getState().updateSettings({
            appearance: {
                autoAgentIconColor: false,
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Locate the auto color checkbox
        const autoColorCheckbox = screen.getByRole("button", {name: /Auto/u})

        // "auto" button should not be pressed since we set autoAgentIconColor to false
        expect(autoColorCheckbox).toHaveAttribute("aria-pressed", "false")

        await user.click(autoColorCheckbox)

        // Now should be true
        expect(useSettingsStore.getState().settings.appearance.autoAgentIconColor).toBe(true)
    })

    it("resets settings to default when reset button is confirmed", async () => {
        ;(sendNotification as jest.Mock).mockClear()

        // Set some non-default values first
        useSettingsStore.getState().updateSettings({
            appearance: {
                plasmaColor: "#123456",
                agentNodeColor: "#abcdef",
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const resetButton = screen.getByRole("button", {name: /Reset to defaults/u})
        await user.click(resetButton)

        const confirmButton = await screen.findByText("Confirm")
        await user.click(confirmButton)

        // Assert the store was actually reset
        const settings = useSettingsStore.getState().settings
        expect(settings.appearance.plasmaColor).toBe(DEFAULT_SETTINGS.appearance.plasmaColor)
        expect(settings.appearance.agentNodeColor).toBe(DEFAULT_SETTINGS.appearance.agentNodeColor)

        // Check that a success notification was sent
        expect(sendNotification).toHaveBeenCalledTimes(1)
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.success,
            "Settings have been reset to default values."
        )
    })

    it("Does not resets settings to default when cancel button clicked", async () => {
        const plasmaColor = "#123456"
        const agentNodeColor = "#abcdef"

        // Set some non-default values first
        useSettingsStore.getState().updateSettings({
            appearance: {
                plasmaColor,
                agentNodeColor,
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const resetButton = screen.getByRole("button", {name: /Reset to defaults/u})
        await user.click(resetButton)

        const cancelButton = await screen.findByText("Cancel")
        await user.click(cancelButton)

        // Assert the store was not changed
        const settingsAfter = useSettingsStore.getState().settings
        expect(settingsAfter.appearance.plasmaColor).toBe(plasmaColor)
        expect(settingsAfter.appearance.agentNodeColor).toBe(agentNodeColor)
    })

    it("Applies customer branding when selected", async () => {
        // Set some non-default values first
        useSettingsStore.getState().updateSettings({
            branding: {
                customer: null,
            },
        })

        const palette = Array.from({length: 10}, (_, i) => `#${i.toString(16).padStart(6, "0")}`)
        const plasma = "#112233"
        const nodeColor = "#445566"
        const primary = "#778899"
        const secondary = "#AA0011"
        const background = "#AA0022"

        global.fetch = mockFetch(
            {
                plasma,
                nodeColor,
                primary,
                secondary,
                background,
                rangePalette: palette,
            },
            true
        )

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const customerInput = screen.getByPlaceholderText(/Company or organization name/u)
        const customerName = "Acme"
        await user.type(customerInput, customerName)

        // Click "Apply"
        const applyButton = screen.getByRole("button", {name: /Apply/u})
        await user.click(applyButton)

        // Check that the store was updated with the new customer name
        const brandingSettings = useSettingsStore.getState().settings.branding
        const appearanceSettings = useSettingsStore.getState().settings.appearance

        expect(brandingSettings.customer).toBe(customerName)
        expect(appearanceSettings.rangePalette).toBe("brand")
        expect(appearanceSettings.plasmaColor).toBe(plasma)
        expect(appearanceSettings.agentNodeColor).toBe(nodeColor)
        expect(brandingSettings.primary).toBe(primary)
        expect(brandingSettings.secondary).toBe(secondary)
        expect(brandingSettings.background).toBe(background)
        expect(brandingSettings.rangePalette).toEqual(palette)
    })
})
