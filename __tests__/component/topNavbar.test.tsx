/**
 * Component tests for top nav bar
 */

// eslint-disable-next-line no-shadow
import {fireEvent, render, screen, waitFor} from "@testing-library/react"

import Navbar from "../../components/navbar"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT} from "../../const"

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

describe("navbar", () => {
    it("should open a confirmation dialog when the contact us link is clicked", () => {
        render(
            <Navbar
                id="mock-id"
                Logo="mock-title"
            />
        )

        fireEvent.click(screen.getByText("Help"))
        const contactUsLink = screen.getByText("Contact Us")

        expect(contactUsLink).toBeInTheDocument()
        fireEvent.click(contactUsLink)

        expect(screen.getByText(CONTACT_US_CONFIRMATION_DIALOG_TEXT)).toBeInTheDocument()
        expect(screen.getByText("Confirm")).toBeInTheDocument()
    })

    it("should redirect to email client when confirmation is clicked", async () => {
        // https://www.joshmcarthur.com/til/2022/01/19/assert-windowlocation-properties-with-jest.html
        Object.defineProperty(window, "location", {
            value: new URL("http://example.com"),
            configurable: true,
        })
        render(
            <Navbar
                id="mock-id"
                Logo="mock-title"
            />
        )

        fireEvent.click(screen.getByText("Help"))
        fireEvent.click(screen.getByText("Contact Us"))
        fireEvent.click(screen.getByText("Confirm"))

        await waitFor(() => {
            expect(window.location.href).toEqual("mailto:NeuroAiSupport@cognizant.com")
        })
    })
})
