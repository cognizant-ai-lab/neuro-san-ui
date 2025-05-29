/**
 * Component tests for top nav bar
 */

import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import Navbar from "../../../components/Common/Navbar"
import {ALL_BUILD_TARGET, CONTACT_US_CONFIRMATION_DIALOG_TEXT} from "../../../const"

const MOCK_EMAIL_ADDRESS = "helloWorld@mock.com"

// Mock dependencies
jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/projects",
            pathname: "",
            asPath: "",
            push: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
            beforePopState: jest.fn(() => null),
            prefetch: jest.fn(() => null),
        }
    },
}))

jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: "MOCK_USER"}}})),
    }
})

jest.mock("../../../state/environment", () => ({
    ...jest.requireActual("../../../state/environment"),
    __esModule: true,
    default: jest.fn(() => ({buildTarget: ALL_BUILD_TARGET, supportEmailAddress: MOCK_EMAIL_ADDRESS})),
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
    beforeEach(() => {
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
    })

    it("should open a confirmation dialog when the contact us link is clicked", async () => {
        render(defaultNavbar)

        await user.click(screen.getByText("Help"))
        const contactUsLink = screen.getByText("Contact Us")

        expect(contactUsLink).toBeInTheDocument()
        await user.click(contactUsLink)

        expect(screen.getByText(CONTACT_US_CONFIRMATION_DIALOG_TEXT)).toBeInTheDocument()
        expect(screen.getByText("Confirm")).toBeInTheDocument()
    })

    it("should redirect to email client when confirmation is clicked", async () => {
        render(defaultNavbar)

        await user.click(screen.getByText("Help"))
        await user.click(screen.getByText("Contact Us"))
        await user.click(screen.getByText("Confirm"))

        expect(window.location.href).toEqual(`mailto:${MOCK_EMAIL_ADDRESS}`)
    })

    it("renders the Navbar with the provided logo", () => {
        render(defaultNavbar)

        const logoLink = screen.getByRole("link", {name: "mock-title"})
        expect(logoLink).toBeInTheDocument()
        expect(logoLink).toHaveAttribute("href", "/")
    })

    it("displays the build version", () => {
        render(defaultNavbar)
        const buildText = screen.getByText(/Build:/iu)
        expect(buildText).toBeInTheDocument()
    })

    it("opens the help menu", async () => {
        render(defaultNavbar)

        const helpToggle = screen.getByText("Help")
        await user.click(helpToggle)

        const userGuide = screen.getByText("User guide")
        expect(userGuide).toBeVisible()
    })

    it("opens the profile menu", async () => {
        render(defaultNavbar)

        const userDropdownToggle = screen.getByRole("button", {name: "User dropdown toggle"})
        await user.click(userDropdownToggle)

        const signOut = screen.getByText("Sign out")
        expect(signOut).toBeVisible()
    })

    it("opens the explore menu", async () => {
        render(defaultNavbar)

        const helpToggle = screen.getByText("Explore")
        await user.click(helpToggle)

        const neuroSanStudioItem = screen.getByText("Neuro-san studio (examples)")
        expect(neuroSanStudioItem).toBeVisible()

        const neuroSanCoreItem = screen.getByText("Neuro-san (core)")
        expect(neuroSanCoreItem).toBeVisible()
    })
})
