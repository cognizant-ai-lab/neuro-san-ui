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

import {createTheme, PaletteMode, ThemeProvider} from "@mui/material/styles"
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {useSnackbar} from "notistack"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Snackbar, SnackbarProps} from "../../../components/Common/Snackbar"

// Mock useSnackbar hook
vi.mock("notistack", async (importOriginal) => {
    const actual = await importOriginal<typeof import("notistack")>()

    return {
        ...actual,
        useSnackbar: vi.fn(),
    }
})

describe("Snackbar Component", () => {
    withStrictMocks()

    const mockCloseSnackbar = vi.fn()

    const renderSnackbar = (props?: Partial<SnackbarProps>, mode: PaletteMode = "light") =>
        render(
            <ThemeProvider theme={createTheme({palette: {mode}})}>
                <Snackbar
                    variant="info"
                    anchorOrigin={{
                        vertical: "top",
                        horizontal: "right",
                    }}
                    hideIconVariant={false}
                    iconVariant={{}}
                    id="test-id"
                    message="Test message"
                    description="Test description"
                    persist={false}
                    style={{}}
                    {...props}
                />
            </ThemeProvider>
        )

    beforeEach(() => {
        vi.mocked(useSnackbar).mockReturnValue({
            enqueueSnackbar: undefined,
            closeSnackbar: mockCloseSnackbar,
        })
    })

    it("renders all elements", () => {
        renderSnackbar()

        expect(screen.getByText("Test message")).toBeInTheDocument()
        expect(screen.getByText("Test description")).toBeInTheDocument()
        expect(screen.getByLabelText("close")).toBeInTheDocument()
    })

    it("calls closeSnackbar when close button is clicked", async () => {
        const user = userEvent.setup()
        renderSnackbar()

        const closeButton = screen.getByLabelText("close")
        await user.click(closeButton)

        // Verify that closeSnackbar was called with the correct ID
        expect(mockCloseSnackbar).toHaveBeenCalledWith("test-id")
    })

    it("does not render the icon if hideIconVariant is true", () => {
        renderSnackbar({hideIconVariant: true})

        const iconBox = screen.queryByTestId("test-id-snackbar-icon-box")
        expect(iconBox).not.toBeInTheDocument()
    })

    it("renders the correct variant class for success", () => {
        renderSnackbar({variant: "success"})

        const iconBox = screen.getByTestId("test-id-snackbar-icon-box")
        expect(iconBox).toHaveClass("success")
    })

    it("renders the correct variant class for error", () => {
        renderSnackbar({variant: "error"})

        const iconBox = screen.getByTestId("test-id-snackbar-icon-box")
        expect(iconBox).toHaveClass("error")
    })

    it("renders the correct variant class for warning", () => {
        renderSnackbar({variant: "warning"})

        const iconBox = screen.getByTestId("test-id-snackbar-icon-box")
        expect(iconBox).toHaveClass("warning")
    })

    it("renders the correct variant class for info", () => {
        renderSnackbar({variant: "info"})

        const iconBox = screen.getByTestId("test-id-snackbar-icon-box")
        expect(iconBox).toHaveClass("info")
    })

    it("renders without a description if not provided", () => {
        renderSnackbar({description: ""})

        expect(screen.queryByText("Test description")).not.toBeInTheDocument()
    })

    it("applies a light-mode shadow by default", () => {
        renderSnackbar()
        const box = screen.getByTestId("test-id-snackbar-box")
        const computed = window.getComputedStyle(box)
        expect(computed.boxShadow).toContain("rgba(0, 0, 0, 0.08)")
    })

    it("switches to a white shadow color in dark mode", () => {
        renderSnackbar({}, "dark")
        const box = screen.getByTestId("test-id-snackbar-box")
        const computed = window.getComputedStyle(box)
        expect(computed.boxShadow).toContain("rgba(255, 255, 255, 0.08)")
    })
})
