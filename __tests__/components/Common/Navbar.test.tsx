/**
 * Component tests for top nav bar
 */

import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"
import {useSession} from "next-auth/react"

import Navbar from "../../../components/Common/Navbar"
import {ALL_BUILD_TARGET, CONTACT_US_CONFIRMATION_DIALOG_TEXT} from "../../../const"
import {withStrictMocks} from "../../common/strictMocks"

const MOCK_EMAIL_ADDRESS = "helloWorld@mock.com"
const MOCK_USER = "mock-user"

const mockUseSession = useSession as jest.Mock

const mockEnvironment = {
    buildTarget: ALL_BUILD_TARGET,
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

describe("navbar", () => {
    let user: UserEvent

    const defaultNavbar = (
        <Navbar
            id="mock-id"
            Logo="mock-title"
        />
    )

    const windowLocation = window.location

    withStrictMocks()

    beforeEach(() => {
        mockUseSession.mockReturnValue({data: {user: {name: MOCK_USER}}})
        // https://www.joshmcarthur.com/til/2022/01/19/assert-windowlocation-properties-with-jest.html
        Object.defineProperty(window, "location", {
            value: new URL(window.location.href),
            configurable: true,
        })
        user = userEvent.setup()
    })

    afterEach(() => {
        Object.defineProperty(window, "location", {
            value: windowLocation,
            configurable: true,
        })

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

        expect(window.location.href).toEqual(`mailto:${MOCK_EMAIL_ADDRESS}`)
    })

    it("renders the Navbar with the provided logo (Neuro® AI Decisioning)", async () => {
        render(defaultNavbar)

        const logoLink = await screen.findByRole("link", {name: "mock-title Decisioning"})
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("renders the Navbar with the provided logo (Neuro® AI Multi-Agent Accelerator)", async () => {
        // Temporarily pathname for this test
        Object.assign(mockRouterValues, {
            pathname: "/agentNetwork",
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
