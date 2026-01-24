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

/**
 * Component tests for top nav bar
 */

import {createTheme, ThemeProvider} from "@mui/material"
import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Navbar} from "../../../components/Common/Navbar"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT} from "../../../const"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"
import {navigateToUrl} from "../../../utils/BrowserNavigation"

const MOCK_EMAIL_ADDRESS = "helloWorld@mock.com"
const MOCK_USER = "mock-user"

describe("Navbar", () => {
    withStrictMocks()

    const logo = "mock-title"

    let user: UserEvent

    const renderNavbar = (pathName: string = "/projects") =>
        render(
            <ThemeProvider theme={createTheme({colorSchemes: {light: true, dark: true}})}>
                <Navbar
                    id="mock-id"
                    logo={logo}
                    query={undefined}
                    pathname={pathName}
                    userInfo={{
                        name: MOCK_USER,
                        image: "",
                    }}
                    authenticationType=""
                    signOut={jest.fn()}
                    supportEmailAddress={MOCK_EMAIL_ADDRESS}
                />
            </ThemeProvider>
        )

    beforeEach(() => {
        jest.spyOn(BrowserNavigation, "navigateToUrl")
        ;(navigateToUrl as jest.Mock).mockImplementation()
        user = userEvent.setup()
    })

    it("should open a confirmation dialog when the contact us link is clicked", async () => {
        renderNavbar()

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)
        const contactUsItem = await screen.findByText("Contact Us")
        await user.click(contactUsItem)

        await screen.findByText(CONTACT_US_CONFIRMATION_DIALOG_TEXT)
        await screen.findByText("Confirm")
    })

    it("Should open the Settings page when Settings is clicked", async () => {
        renderNavbar()

        expect(screen.queryByTestId("settings-dialog")).not.toBeInTheDocument()

        const settingsButton = screen.getByTestId("SettingsIcon")
        await user.click(settingsButton)

        screen.getByTestId("settings-dialog")
        screen.getByRole("heading", {name: "Settings"})
        screen.getByText("Appearance")
        screen.getByText("Network animation")

        // Close it
        const closeButton = await screen.findByLabelText("close")
        await user.click(closeButton)

        expect(screen.queryByTestId("settings-dialog")).not.toBeInTheDocument()
    })

    it("should redirect to email client when confirmation is clicked", async () => {
        renderNavbar()

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)
        const contactUsItem = await screen.findByText("Contact Us")
        await user.click(contactUsItem)
        const confirmButton = await screen.findByText("Confirm")
        await user.click(confirmButton)

        expect(navigateToUrl).toHaveBeenCalledWith(`mailto:${MOCK_EMAIL_ADDRESS}`)
    })

    it("renders the Navbar with the provided logo (Neuro® AI Decisioning)", async () => {
        renderNavbar()

        const logoLink = await screen.findByRole("link", {name: `${logo} Decisioning`})
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("renders the Navbar with the provided logo (Neuro® AI Multi-Agent Accelerator)", async () => {
        renderNavbar("/multiAgentAccelerator")

        const logoLink = await screen.findByRole("link", {name: `${logo} Multi-Agent Accelerator`})
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("displays the build version", async () => {
        renderNavbar()
        await screen.findByText(/Build:/iu)
    })

    it("opens the help menu", async () => {
        renderNavbar()

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)

        const userGuide = await screen.findByText("User guide")
        expect(userGuide).toBeVisible()
    })

    it("opens the profile menu", async () => {
        renderNavbar()

        const userDropdownToggle = await screen.findByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOut = await screen.findByText("Sign out")
        expect(signOut).toBeVisible()
    })

    it("opens the explore menu", async () => {
        renderNavbar()

        const helpToggle = await screen.findByText("Explore")
        await user.click(helpToggle)

        const neuroSanStudioItem = await screen.findByText("Neuro-san studio (examples)")
        expect(neuroSanStudioItem).toBeVisible()

        const neuroSanCoreItem = await screen.findByText("Neuro-san (core)")
        expect(neuroSanCoreItem).toBeVisible()
    })

    it("toggles dark mode", async () => {
        renderNavbar()

        const darkModeToggle = await screen.findByTestId("DarkModeIcon")

        // Check initial color (light mode)
        expect(darkModeToggle).toHaveStyle("color: var(--bs-gray-dark)")

        await user.click(darkModeToggle)

        // Check color after toggle (dark mode)
        expect(darkModeToggle).toHaveStyle("color: var(--bs-yellow)")
    })
})
