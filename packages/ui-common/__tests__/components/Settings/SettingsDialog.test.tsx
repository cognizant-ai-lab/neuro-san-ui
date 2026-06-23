import {createTheme, PaletteMode, ThemeProvider} from "@mui/material/styles"
import {fireEvent, render, screen, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"
import {NotificationType, sendNotification} from "../../../components/Common/notification"
import {SettingsDialog} from "../../../components/Settings/SettingsDialog"
import {BrandingSuggestions} from "../../../controller/Types/Branding"
import {DEFAULT_SETTINGS, LogoSource, useSettingsStore} from "../../../state/Settings"

// Mock notification system
jest.mock("../../../components/Common/notification")

const TEST_API_KEY = "test-api-key-123"

const BRANDING_SUGGESTIONS_RESPONSE: BrandingSuggestions = {
    background: "#AA0022",
    iconSuggestion: "Add",
    nodeColor: "#445566",
    plasma: "#112233",
    primary: "#778899",
    // Generate a palette of 10 colors for testing
    rangePalette: Array.from({length: 10}, (_, i) => `#${i.toString(16).padStart(6, "0")}`),
    secondary: "#AA0011",
}

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

    const enterCustomerName = async (customerName: string, shouldClickApply: boolean = true) => {
        const customerInput = screen.getByPlaceholderText(/Company or organization name/u)
        await user.clear(customerInput)
        await user.type(customerInput, customerName)

        if (shouldClickApply) {
            // Click "Apply" if requested
            const applyButton = screen.getByRole("button", {name: /Apply/u})
            await user.click(applyButton)
        }
    }

    it("renders the SettingsDialog with default props", async () => {
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )
        await screen.findByText("Settings")
    })

    it("handles nullish logoSource", async () => {
        useSettingsStore.getState().updateSettings({
            branding: {
                logoSource: null,
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Should render without crashing and show the "(None)" option as selected by default
        const logoOptionsContainer = screen.getByRole("group", {name: "logo-selection"})
        const noneButton = within(logoOptionsContainer).getByRole("button", {name: /None/u})
        expect(noneButton).toHaveAttribute("aria-pressed", "true")
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

    describe("API keys", () => {
        it.each(["dark", "light"] satisfies PaletteMode[])("allows user to input and save API keys", async (mode) => {
            global.fetch = mockFetch({}, true)

            render(
                <ThemeProvider theme={createTheme({palette: {mode}})}>
                    <SettingsDialog
                        id="settings-dialog"
                        isOpen={true}
                    />
                </ThemeProvider>
            )

            const apiKeyInput = screen.getByTestId("settings-dialog-openai-input")

            const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")
            const testApiKey = TEST_API_KEY

            await user.type(inputBox, testApiKey)

            // Click "Test" button to (pretend) "test" the key
            const testButton = within(apiKeyInput).getByRole("button", {name: /Test/u})
            expect(testButton).toBeEnabled()
            await user.click(testButton)

            // Click "Save" to save the API key
            const saveButton = await within(apiKeyInput).findByRole("button", {name: /Save/u})
            expect(saveButton).toBeEnabled()

            await user.click(saveButton)

            expect(useSettingsStore.getState().settings.apiKeys.OpenAI).toBe(testApiKey)
        })

        it("allows user to test API keys", async () => {
            global.fetch = mockFetch({}, true)

            render(
                <SettingsDialog
                    id="settings-dialog"
                    isOpen={true}
                />
            )

            const apiKeyInput = screen.getByTestId("settings-dialog-openai-input")

            const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

            await user.type(inputBox, TEST_API_KEY)

            // Make sure we can clear the input
            const clearButton = within(apiKeyInput).getByLabelText(/Clear input/u)
            await user.click(clearButton)
            expect(inputBox).toHaveValue("")

            // Type the key again for testing
            await user.type(inputBox, TEST_API_KEY)

            // Click "Test" button to (pretend) "test" the key
            const testButton = within(apiKeyInput).getByRole("button", {name: /Test/u})
            expect(testButton).toBeEnabled()
            await user.click(testButton)

            within(apiKeyInput).getByTestId("CheckIcon")

            // Now mock test failure and check that error icon appears
            global.fetch = mockFetch({}, false)
            await user.click(testButton)

            within(apiKeyInput).getByTestId("ErrorIcon")
        })

        it("allows user request that API keys be forgotten", async () => {
            // set an existing key value
            useSettingsStore.getState().updateSettings({
                apiKeys: {
                    OpenAI: TEST_API_KEY,
                },
            })

            render(
                <SettingsDialog
                    id="settings-dialog"
                    isOpen={true}
                />
            )

            const apiKeyInput = screen.getByTestId("settings-dialog-openai-input")

            const forgetButton = within(apiKeyInput).getByRole("button", {name: /Forget/u})
            await user.click(forgetButton)

            // First time, cancel
            const cancelButton = await screen.findByText("Cancel")
            await user.click(cancelButton)

            // Key should still be there
            expect(useSettingsStore.getState().settings.apiKeys.OpenAI).toBe(TEST_API_KEY)

            // Now click it again but this time confirm
            await user.click(forgetButton)

            const confirmButton = screen.getByText("Yes, forget key")
            await user.click(confirmButton)

            expect(useSettingsStore.getState().settings.apiKeys.OpenAI).toBeFalsy()
        })

        it("allows a user to show/hide keys", async () => {
            // set an existing key value
            useSettingsStore.getState().updateSettings({
                apiKeys: {
                    OpenAI: TEST_API_KEY,
                },
            })

            render(
                <SettingsDialog
                    id="settings-dialog"
                    isOpen={true}
                />
            )

            const apiKeyContainer = screen.getByTestId("settings-dialog-openai-input")
            const input = within(apiKeyContainer).getByPlaceholderText("sk-...")

            // Assert initial state: masked
            expect(input).toHaveAttribute("type", "password")
            expect(input).toHaveValue(TEST_API_KEY)

            // Click the toggle button
            const showHideButton = within(apiKeyContainer).getByRole("button", {name: "toggle key visibility"})
            await user.click(showHideButton)

            // Now should be unmasked (regular text control)
            expect(input).toHaveAttribute("type", "text")
            expect(input).toHaveValue(TEST_API_KEY)

            // Assert the Tooltip change
            expect(screen.getByLabelText("Hide API key")).toBeInTheDocument()
        })
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

    it("doesn't change palette if user clicks again on the existing option", async () => {
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Find button to select "GrayScale" palette
        const grayScaleButton = screen.getByRole("button", {name: /grayScale-palette-button/u})
        await user.click(grayScaleButton)
        expect(useSettingsStore.getState().settings.appearance.rangePalette).toBe("grayScale")

        // Click the same button again
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
        const autoColorCheckbox = screen.getByTestId("auto-agent-icon-color-button")

        // "auto" button should not be pressed since we set autoAgentIconColor to false
        expect(autoColorCheckbox).toHaveAttribute("aria-pressed", "false")

        await user.click(autoColorCheckbox)

        // Now should be true
        expect(useSettingsStore.getState().settings.appearance.autoAgentIconColor).toBe(true)

        // Click it again
        await user.click(autoColorCheckbox)

        // Should not have changed value
        expect(useSettingsStore.getState().settings.appearance.autoAgentIconColor).toBe(true)
    })

    it("Allows toggling Zen mode", async () => {
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Default: Zen mode should be enabled
        expect(useSettingsStore.getState().settings.behavior.enableZenMode).toBe(true)

        const zenModeToggle = screen.getByTestId("zen-mode-checkbox")

        const checkboxElement = within(zenModeToggle).getByRole("checkbox")

        expect(checkboxElement).toBeChecked()

        // Click to disable Zen mode
        await user.click(checkboxElement)
        expect(checkboxElement).not.toBeChecked()

        expect(useSettingsStore.getState().settings.behavior.enableZenMode).toBe(false)
    })

    it("Allows toggling native agent names mode", async () => {
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Default: mode should be disabled (meaning, we show beautified names)
        expect(useSettingsStore.getState().settings.appearance.useNativeNames).toBe(false)

        // Locate the "beautified" toggle button
        const beautifyToggle = screen.getByRole("button", {name: /Beautified/u})
        await user.click(beautifyToggle)

        // Should be no change since we're already on beautified mode
        expect(useSettingsStore.getState().settings.appearance.useNativeNames).toBe(false)

        // Locate the "native" toggle button
        const toggleButton = screen.getByRole("button", {name: /Native/u})
        await user.click(toggleButton)

        expect(useSettingsStore.getState().settings.appearance.useNativeNames).toBe(true)
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

    it("Does not reset settings to default when cancel button clicked", async () => {
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

    it("applies branding for requested customer", async () => {
        global.fetch = mockFetch(BRANDING_SUGGESTIONS_RESPONSE)

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
                logoServiceToken="test-logo-service-token-456"
            />
        )

        expect(useSettingsStore.getState().settings.branding.logoSource).toEqual<LogoSource>("none")

        const logoOptionsContainer = screen.getByRole("group", {name: "logo-selection"}).closest("span").closest("div")

        const customerName = "Acme"
        await enterCustomerName(customerName)

        // Check that the store was updated with the new customer name
        const brandingSettings = useSettingsStore.getState().settings.branding
        const appearanceSettings = useSettingsStore.getState().settings.appearance

        expect(brandingSettings.customer).toBe(customerName)
        expect(appearanceSettings.rangePalette).toBe("brand")
        expect(appearanceSettings.plasmaColor).toBe(BRANDING_SUGGESTIONS_RESPONSE.plasma)
        expect(appearanceSettings.agentNodeColor).toBe(BRANDING_SUGGESTIONS_RESPONSE.nodeColor)
        expect(brandingSettings.primary).toBe(BRANDING_SUGGESTIONS_RESPONSE.primary)
        expect(brandingSettings.secondary).toBe(BRANDING_SUGGESTIONS_RESPONSE.secondary)
        expect(brandingSettings.background).toBe(BRANDING_SUGGESTIONS_RESPONSE.background)
        expect(brandingSettings.rangePalette).toEqual(BRANDING_SUGGESTIONS_RESPONSE.rangePalette)
        expect(brandingSettings.iconSuggestion).toBe(BRANDING_SUGGESTIONS_RESPONSE.iconSuggestion)

        // Now try using Enter to submit a new customer name and check that it also applies branding
        const newCustomerName = "Acme 2"
        await enterCustomerName(newCustomerName, false)
        await user.keyboard("{Enter}")

        // Check that the store was updated with the new customer name
        expect(useSettingsStore.getState().settings.branding.customer).toBe(newCustomerName)

        // Successfully retrieving a customer name should update the logo source to "auto" to show the new logo
        expect(useSettingsStore.getState().settings.branding.logoSource).toBe("auto")

        // Try different logo options
        const logoNoneButton = within(logoOptionsContainer).getByRole("button", {name: /None/u})
        await user.click(logoNoneButton)

        // Logo source should be set to "none", meaning no logo will be shown even if we have suggestions
        expect(useSettingsStore.getState().settings.branding.logoSource).toEqual<LogoSource>("none")

        // Click the already-selected button
        await user.click(logoNoneButton)

        // Should still be "none"
        expect(useSettingsStore.getState().settings.branding.logoSource).toEqual<LogoSource>("none")

        // Preview should show the "(None)" text indicating no logo will be shown
        within(logoOptionsContainer).getByText("(None)")

        // Now click "generic"
        const logoGenericButton = within(logoOptionsContainer).getByRole("button", {name: /Generic/u})
        await user.click(logoGenericButton)

        expect(useSettingsStore.getState().settings.branding.logoSource).toBe("generic")

        // Should show the generic icon suggestion (Add)
        within(logoOptionsContainer).getByTestId("AddIcon")

        // Now the "auto" option
        const logoAutoButton = within(logoOptionsContainer).getByRole("button", {name: /Auto/u})
        await user.click(logoAutoButton)
        expect(useSettingsStore.getState().settings.branding.logoSource).toBe("auto")

        // Should show the logo from logo.dev with the correct URL (we can check for the img element and its src)
        const logoImg = within(logoOptionsContainer).getByRole("img", {name: /Acme 2 Logo/u})
        expect(logoImg).toBeInTheDocument()
        expect(logoImg).toHaveAttribute(
            "src",
            expect.stringContaining(`https://img.logo.dev/name/${encodeURIComponent(newCustomerName)}`)
        )

        // Now clear branding
        const clearBrandingButton = screen.getByRole("button", {name: "Clear"})
        await user.click(clearBrandingButton)

        // Relevant settings should be back to default values
        expect(useSettingsStore.getState().settings.branding).toMatchObject(DEFAULT_SETTINGS.branding)
        expect(useSettingsStore.getState().settings.appearance.rangePalette).toBe(
            DEFAULT_SETTINGS.appearance.rangePalette
        )
    })

    it("Handles missing branding values from server", async () => {
        global.fetch = mockFetch({
            // Simulate missing values by returning an empty object
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const customerName = "Acme"
        await enterCustomerName(customerName)

        // Check that the store was updated with the new customer name
        const brandingSettings = useSettingsStore.getState().settings.branding
        const appearanceSettings = useSettingsStore.getState().settings.appearance
        expect(brandingSettings.customer).toBe(customerName)
        expect(appearanceSettings.rangePalette).toBe("brand")
        expect(appearanceSettings.plasmaColor).toBe(DEFAULT_SETTINGS.appearance.plasmaColor)
        expect(appearanceSettings.agentNodeColor).toBe(DEFAULT_SETTINGS.appearance.agentNodeColor)
        expect(brandingSettings.primary).toBe(null)
        expect(brandingSettings.secondary).toBe(null)
        expect(brandingSettings.background).toBe(null)
        expect(brandingSettings.rangePalette).toEqual(null)
    })

    it("Handles exception when retrieving branding suggestions", async () => {
        const networkError = "Network error"
        global.fetch = jest.fn().mockRejectedValue(new Error(networkError))
        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        // Spy on console.warn to suppress output during test
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

        const customerName = "Acme"
        await enterCustomerName(customerName)

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringMatching(new RegExp(`Failed to fetch branding suggestions.*"${customerName}"`, "u")),
            expect.objectContaining({message: networkError})
        )
    })

    it("Handles null response when retrieving branding suggestions", async () => {
        global.fetch = mockFetch(null)

        const customer = "OldCustomer"

        useSettingsStore.getState().updateSettings({
            branding: {
                customer,
            },
        })

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        const customerName = "Acme"
        await enterCustomerName(customerName)

        // Customer name should be unchanged
        expect(useSettingsStore.getState().settings.branding.customer).toBe(customer)
    })

    it("Handles customer but no logo token", async () => {
        global.fetch = mockFetch(BRANDING_SUGGESTIONS_RESPONSE)

        render(
            <SettingsDialog
                id="settings-dialog"
                isOpen={true}
            />
        )

        await enterCustomerName("Acme", true)

        const logoOptionsContainer = screen.getByRole("group", {name: "logo-selection"})

        const errorTooltip = within(logoOptionsContainer).getByLabelText(/Cannot use Auto logo source/u)

        // Get span that wraps the button
        const autoButtonSpan = within(logoOptionsContainer).getByRole("button", {name: /Auto/u}).parentElement

        // Hover and make sure we get the tooltip
        await user.hover(autoButtonSpan)
        expect(errorTooltip).toBeVisible()
    })
})
