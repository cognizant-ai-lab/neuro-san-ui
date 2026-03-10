import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {CustomerLogo} from "../../../components/Common/CustomerLogo"
import {useSettingsStore} from "../../../state/Settings"

describe("CustomerLogo", () => {
    withStrictMocks()

    beforeEach(() => {
        useSettingsStore.getState().resetSettings()
    })
    it("renders correctly with default props", () => {
        render(<CustomerLogo />)
        const logoImg = screen.getByAltText("Cognizant Logo")
        expect(logoImg).toBeInTheDocument()
        expect(logoImg).toHaveAttribute("src", "/cognizant-logo-white.svg")
    })

    it("Renders fallback element when logoSource is 'none'", () => {
        useSettingsStore.getState().updateSettings({branding: {logoSource: "none"}})
        const fallbackText = "No Logo"
        render(<CustomerLogo fallbackElement={fallbackText} />)
        screen.getByText(fallbackText)
    })

    it("Renders MUI icon when logoSource is 'generic' and iconSuggestion is valid", () => {
        useSettingsStore.getState().updateSettings({
            branding: {
                logoSource: "generic",
                iconSuggestion: "AcUnit", // Valid MUI icon name
            },
        })
        render(<CustomerLogo />)
        screen.getByTestId("AcUnitIcon")
    })

    it("Falls back to supplied fallbackText logoSource is 'generic' but iconSuggestion is invalid", () => {
        useSettingsStore.getState().updateSettings({
            branding: {
                logoSource: "generic",
                iconSuggestion: "InvalidIconName", // Invalid MUI icon name
            },
        })
        const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()
        const fallbackText = "No Logo"
        render(<CustomerLogo fallbackElement={fallbackText} />)
        screen.getByText(fallbackText)

        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("InvalidIconName"))
    })

    it("Renders logo from logo service when logoSource is 'auto' and token is provided", () => {
        const mockToken = "mock-logo-dev-token"
        const mockCustomerName = "Test Customer"
        useSettingsStore.getState().updateSettings({
            branding: {
                logoSource: "auto",
                customer: mockCustomerName,
            },
        })
        render(<CustomerLogo logoServiceToken={mockToken} />)
        const logoImg = screen.getByAltText(`${mockCustomerName} Logo`)
        expect(logoImg).toBeInTheDocument()
        expect(logoImg).toHaveAttribute(
            "src",
            expect.stringMatching(new RegExp(`${encodeURIComponent(mockCustomerName)}.*${mockToken}`, "u"))
        )
    })

    it("Falls back to supplied fallbackText when logoSource is 'auto' but token is missing", () => {
        const mockCustomerName = "Test Customer"
        useSettingsStore.getState().updateSettings({
            branding: {
                logoSource: "auto",
                customer: mockCustomerName,
            },
        })
        const fallbackText = "No Logo"
        render(<CustomerLogo fallbackElement={fallbackText} />)
        screen.getByText(fallbackText)
    })
})
