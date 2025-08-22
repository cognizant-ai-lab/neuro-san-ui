/**
 * Component tests for top nav bar
 */

import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"

import {Navbar} from "../../../components/Common/Navbar"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT} from "../../../const"
import * as BrowserNavigation from "../../../utils/BrowserNavigation"
import {navigateToUrl} from "../../../utils/BrowserNavigation"
import {withStrictMocks} from "../../common/strictMocks"

const MOCK_EMAIL_ADDRESS = "helloWorld@mock.com"
const MOCK_USER = "mock-user"

const mockUseSession = useSession as jest.Mock

const mockEnvironment = {
    supportEmailAddress: MOCK_EMAIL_ADDRESS,
    auth0ClientId: "mock-auth0-client-id",
}

const mockRouterValues = {
    pathname: "/projects",
}

// Mock dependencies
jest.mock("next/image", () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        const copyProps = {...props}
        delete copyProps.priority
        delete copyProps.unoptimized
        return (
            <img
                {...copyProps}
                alt="Test alt"
            />
        )
    },
}))

jest.mock("next/router", () => ({
    useRouter: () => mockRouterValues,
}))

jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: MOCK_USER}}})),
    }
})

jest.mock("../../../state/environment", () => ({
    __esModule: true,
    default: () => mockEnvironment,
}))

describe("NavBar", () => {
    withStrictMocks()

    let user: UserEvent

    const defaultNavbar = (
        <Navbar
            id="mock-id"
            logo="mock-title"
        />
    )

    beforeEach(() => {
        mockUseSession.mockReturnValue({data: {user: {name: MOCK_USER}}})
        jest.spyOn(BrowserNavigation, "navigateToUrl")
        ;(navigateToUrl as jest.Mock).mockImplementation()
        user = userEvent.setup()
    })

    afterEach(() => {
        Object.assign(mockRouterValues, {
            pathname: "/projects",
        })
    })

    it("should open a confirmation dialog when the contact us link is clicked", async () => {
        render(defaultNavbar)

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)
        const contactUsItem = await screen.findByText("Contact Us")
        await user.click(contactUsItem)

        await screen.findByText(CONTACT_US_CONFIRMATION_DIALOG_TEXT)
        await screen.findByText("Confirm")
    })

    it("should redirect to email client when confirmation is clicked", async () => {
        render(defaultNavbar)

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)
        const contactUsItem = await screen.findByText("Contact Us")
        await user.click(contactUsItem)
        const confirmButton = await screen.findByText("Confirm")
        await user.click(confirmButton)

        expect(navigateToUrl).toHaveBeenCalledWith(`mailto:${MOCK_EMAIL_ADDRESS}`)
    })

    it("renders the Navbar with the provided logo (Neuro® AI Decisioning)", async () => {
        render(defaultNavbar)

        const logoLink = await screen.findByRole("link", {name: "mock-title Decisioning"})
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("renders the Navbar with the provided logo (Neuro® AI Multi-Agent Accelerator)", async () => {
        // Temporarily pathname for this test
        Object.assign(mockRouterValues, {
            pathname: "/multiAgentAccelerator",
        })

        render(defaultNavbar)

        const logoLink = await screen.findByRole("link", {name: "mock-title Multi-Agent Accelerator"})
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("displays the build version", async () => {
        render(defaultNavbar)
        await screen.findByText(/Build:/iu)
    })

    it("opens the help menu", async () => {
        render(defaultNavbar)

        const helpToggle = await screen.findByText("Help")
        await user.click(helpToggle)

        const userGuide = await screen.findByText("User guide")
        expect(userGuide).toBeVisible()
    })

    it("opens the profile menu", async () => {
        render(defaultNavbar)

        const userDropdownToggle = await screen.findByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOut = await screen.findByText("Sign out")
        expect(signOut).toBeVisible()
    })

    it("opens the explore menu", async () => {
        render(defaultNavbar)

        const helpToggle = await screen.findByText("Explore")
        await user.click(helpToggle)

        const neuroSanStudioItem = await screen.findByText("Neuro-san studio (examples)")
        expect(neuroSanStudioItem).toBeVisible()

        const neuroSanCoreItem = await screen.findByText("Neuro-san (core)")
        expect(neuroSanCoreItem).toBeVisible()
    })
})
