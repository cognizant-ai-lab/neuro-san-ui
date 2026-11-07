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

import {createTheme, ThemeProvider} from "@mui/material/styles"
import {act, render, screen, waitFor} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    CommandPalette,
    CommandPaletteProps,
    openCommandPalette,
} from "../../../components/CommandPalette/CommandPalette"
import {useSettingsStore} from "../../../state/Settings"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"

const SUPPORT_EMAIL = "support@example.com"

describe("CommandPalette", () => {
    withStrictMocks()

    let user: UserEvent

    const theme = createTheme({colorSchemes: {light: true, dark: true}})

    const renderPalette = (props: Partial<CommandPaletteProps> = {}) => {
        const onNavigate = vi.fn()
        const onStartTour = vi.fn()
        render(
            <ThemeProvider theme={theme}>
                <CommandPalette
                    onNavigate={onNavigate}
                    onStartTour={onStartTour}
                    pathname="/multiAgentAccelerator"
                    supportEmailAddress={SUPPORT_EMAIL}
                    {...props}
                />
            </ThemeProvider>
        )
        return {onNavigate, onStartTour}
    }

    const openWithShortcut = async () => {
        await user.keyboard("{Meta>}k{/Meta}")
        return screen.findByRole("dialog", {name: "Command palette"})
    }

    const waitForClosed = async () => {
        await waitFor(() => expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument())
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    }

    beforeEach(() => {
        user = userEvent.setup()
        useSettingsStore.getState().resetSettings()
    })

    it("is closed until opened", () => {
        renderPalette()

        expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument()
    })

    it("opens with ⌘K, focuses the search field and lists grouped actions", async () => {
        renderPalette()

        await openWithShortcut()

        const input = screen.getByRole("combobox")
        expect(input).toHaveFocus()
        expect(input).toHaveAttribute("placeholder", "Search pages and actions…")

        for (const heading of ["Navigate", "Preferences", "Help & resources"]) {
            expect(screen.getByText(heading)).toBeInTheDocument()
        }
        for (const label of ["Home", "Multi-Agent Accelerator", "User Guide", "Open settings", "Take a tour"]) {
            expect(screen.getByRole("option", {name: new RegExp(label, "u")})).toBeInTheDocument()
        }

        // Current page is marked
        expect(screen.getByRole("option", {name: /Multi-Agent Accelerator/u})).toHaveTextContent("Current")
    })

    it("opens with Ctrl+K and toggles closed with a second press", async () => {
        renderPalette()

        await user.keyboard("{Control>}k{/Control}")
        await screen.findByRole("dialog", {name: "Command palette"})

        await user.keyboard("{Control>}k{/Control}")
        await waitForClosed()
    })

    it("opens when the open event is dispatched", async () => {
        renderPalette()

        act(() => openCommandPalette())

        await screen.findByRole("dialog", {name: "Command palette"})
    })

    it("filters the actions as the user types", async () => {
        renderPalette()
        await openWithShortcut()

        await user.type(screen.getByRole("combobox"), "guide")

        expect(screen.getByRole("option", {name: /User Guide/u})).toBeInTheDocument()
        expect(screen.queryByRole("option", {name: /^Home/u})).not.toBeInTheDocument()
        expect(screen.queryByRole("option", {name: /Open settings/u})).not.toBeInTheDocument()
    })

    it("shows an empty state when nothing matches", async () => {
        renderPalette()
        await openWithShortcut()

        await user.type(screen.getByRole("combobox"), "zzzzqqq")

        expect(screen.queryAllByRole("option")).toHaveLength(0)
        expect(screen.getByText(/No results for/u)).toHaveTextContent("zzzzqqq")
    })

    it("navigates with the keyboard and closes", async () => {
        const {onNavigate} = renderPalette()
        await openWithShortcut()

        await user.type(screen.getByRole("combobox"), "guide")
        await user.keyboard("{Enter}")

        expect(onNavigate).toHaveBeenCalledWith("/UserGuide")
        await waitForClosed()
    })

    it("navigates when an item is clicked", async () => {
        const {onNavigate} = renderPalette()
        await openWithShortcut()

        await user.click(screen.getByRole("option", {name: /^Home/u}))

        expect(onNavigate).toHaveBeenCalledWith("/")
        await waitForClosed()
    })

    it("toggles the color scheme", async () => {
        renderPalette()
        await openWithShortcut()

        // Default is light in this theme
        await user.type(screen.getByRole("combobox"), "dark mode")
        await user.click(screen.getByRole("option", {name: /Switch to dark mode/u}))
        await waitForClosed()

        await openWithShortcut()
        expect(screen.getByRole("option", {name: /Switch to light mode/u})).toBeInTheDocument()
    })

    it("disables the color scheme toggle while customer branding is active", async () => {
        useSettingsStore.getState().updateSettings({branding: {customer: "Acme"}})
        renderPalette()
        await openWithShortcut()

        expect(screen.getByRole("option", {name: /Switch to dark mode/u})).toHaveAttribute("aria-disabled", "true")
    })

    it("starts the tour", async () => {
        const {onStartTour} = renderPalette()
        await openWithShortcut()

        await user.click(screen.getByRole("option", {name: /Take a tour/u}))

        expect(onStartTour).toHaveBeenCalledTimes(1)
        await waitForClosed()
    })

    it("opens the Settings dialog", async () => {
        renderPalette()
        await openWithShortcut()

        await user.click(screen.getByRole("option", {name: /Open settings/u}))

        await screen.findByTestId("command-palette-settings-dialog")
    })

    it("contacts support by email when an address is configured", async () => {
        vi.spyOn(BrowserNavigation, "navigateToUrl").mockImplementation(vi.fn())
        renderPalette()
        await openWithShortcut()

        await user.click(screen.getByRole("option", {name: /Contact support/u}))

        expect(BrowserNavigation.navigateToUrl).toHaveBeenCalledWith(`mailto:${SUPPORT_EMAIL}`)
    })

    it("omits contact support and the tour when they aren't available", async () => {
        renderPalette({onStartTour: undefined, supportEmailAddress: undefined})
        await openWithShortcut()

        expect(screen.queryByRole("option", {name: /Contact support/u})).not.toBeInTheDocument()
        expect(screen.queryByRole("option", {name: /Take a tour/u})).not.toBeInTheDocument()
    })

    it("opens external resources in a new tab", async () => {
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)
        renderPalette()
        await openWithShortcut()

        await user.click(screen.getByRole("option", {name: /Neuro-san \(core\)/u}))

        expect(openSpy).toHaveBeenCalledWith("https://github.com/cognizant-ai-lab/neuro-san", "_blank", "noopener")
    })

    it("closes on Escape", async () => {
        renderPalette()
        await openWithShortcut()

        expect(screen.getByRole("combobox")).toHaveFocus()
        await user.keyboard("{Escape}")

        await waitForClosed()
    })

    it("closes when the backdrop is clicked", async () => {
        renderPalette()
        await openWithShortcut()

        await user.click(screen.getByTestId("command-palette-backdrop"))

        await waitForClosed()
    })

    it("clears the previous search when reopened", async () => {
        renderPalette()
        await openWithShortcut()
        await user.type(screen.getByRole("combobox"), "guide")
        await user.keyboard("{Escape}")
        await waitForClosed()

        await openWithShortcut()

        expect(screen.getByRole("combobox")).toHaveValue("")
    })
})
