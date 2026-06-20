import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {CustomerLogo, LOGO_DEV_URL} from "../../../components/Logo/CustomerLogo"

describe("CustomerLogo", () => {
    withStrictMocks()

    it("Renders nothing when null props provided", () => {
        render(
            <CustomerLogo
                customer={null}
                logoSource={null}
            />
        )

        // should not render anything when logoSource is null
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("Renders MUI icon when logoSource is 'generic' and iconSuggestion is valid", () => {
        render(
            <CustomerLogo
                customer={null}
                logoSource="generic"
                iconSuggestion="AcUnit" // Valid MUI icon name
            />
        )
        screen.getByTestId("AcUnitIcon")
    })

    it("Renders nothing if iconSuggestion is invalid", () => {
        render(
            <CustomerLogo
                customer="Test Customer"
                logoSource="generic"
                iconSuggestion="InvalidIconName" // Invalid MUI icon name
            />
        )
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("Renders logo from logo service when logoSource is 'auto' and token is provided", () => {
        const mockToken = "mock-logo-dev-token"
        const mockCustomerName = "Test Customer"
        render(
            <CustomerLogo
                customer={mockCustomerName}
                logoServiceToken={mockToken}
                logoSource="auto"
            />
        )
        const logoImg = screen.getByAltText(`${mockCustomerName} Logo`)
        expect(logoImg).toBeInTheDocument()
        expect(logoImg).toHaveAttribute(
            "src",
            expect.stringMatching(
                new RegExp(`${LOGO_DEV_URL}.*${encodeURIComponent(mockCustomerName)}.*${mockToken}`, "u")
            )
        )
    })

    it("Renders nothing if auto icon requested but no token provided", () => {
        render(
            <CustomerLogo
                customer="Test Customer"
                logoSource="auto"
            />
        )
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("Renders nothing if auto icon requested but no customer provided", () => {
        render(
            <CustomerLogo
                customer={null}
                logoSource="auto"
            />
        )
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("Renders nothing if 'none' logo source is requested", () => {
        render(
            <CustomerLogo
                customer="Test Customer"
                logoSource="none"
                logoServiceToken="mock-logo-dev-token"
            />
        )
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })
})
