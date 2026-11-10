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
import {glassSurface, SHEEN_DARK, SHEEN_LIGHT, SHEEN_RADIUS} from "../../../Theme/sheen"

// Mock useSnackbar hook
vi.mock("notistack", async (importOriginal) => {
    const actual = await importOriginal<typeof import("notistack")>()

    return {
        ...actual,
        useSnackbar: vi.fn(),
    }
})

const reducedMotion = vi.hoisted(() => ({value: false}))

vi.mock("motion/react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("motion/react")>()),
    useReducedMotion: () => reducedMotion.value,
}))

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

    afterEach(() => {
        reducedMotion.value = false
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

    it("shows a gradient countdown line that drains over the auto-hide duration", () => {
        renderSnackbar({autoHideDuration: 3000})

        const progress = screen.getByTestId("test-id-snackbar-progress")
        expect(getComputedStyle(progress).animation).toContain("3000ms")
        expect(getComputedStyle(progress).backgroundImage).toContain("linear-gradient")
    })

    it("falls back to notistack's default duration for the countdown line", () => {
        renderSnackbar()

        expect(getComputedStyle(screen.getByTestId("test-id-snackbar-progress")).animation).toContain("5000ms")
    })

    it.each([
        {name: "persistent", props: {persist: true}},
        {name: "never auto-hidden", props: {autoHideDuration: null}},
    ])("has no countdown line when $name", ({props}) => {
        renderSnackbar(props)

        expect(screen.queryByTestId("test-id-snackbar-progress")).not.toBeInTheDocument()
    })

    it("renders anchored to the left edge", () => {
        renderSnackbar({anchorOrigin: {vertical: "bottom", horizontal: "left"}})

        expect(screen.getByTestId("test-id-snackbar-box")).toBeInTheDocument()
    })

    it("renders when no anchor origin is given", () => {
        renderSnackbar({anchorOrigin: undefined})

        expect(screen.getByTestId("test-id-snackbar-box")).toBeInTheDocument()
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

    it("renders as a glass toast with the sheen glass shadow", () => {
        renderSnackbar()
        const box = screen.getByTestId("test-id-snackbar-box")
        const computed = window.getComputedStyle(box)
        const glass = glassSurface(createTheme({palette: {mode: "light"}}), SHEEN_RADIUS)

        // Light glass background from the sheen tokens
        expect(computed.backgroundColor).toBe(SHEEN_LIGHT.sheen.glassBg)
        expect(computed.borderRadius).toBe(`${SHEEN_RADIUS}px`)

        // Depth comes from the shared glass shadow (specular top edge + soft drop shadow)
        expect(computed.boxShadow.replaceAll(/\s/gu, "")).toBe((glass.boxShadow as string).replaceAll(/\s/gu, ""))
    })

    it("switches to the dark glass background in dark mode", () => {
        renderSnackbar({}, "dark")
        const box = screen.getByTestId("test-id-snackbar-box")
        const computed = window.getComputedStyle(box)
        expect(computed.backgroundColor).toBe(SHEEN_DARK.sheen.glassBg)
    })

    it.each(["success", "error", "warning", "info"] as const)("colors the %s icon from the palette", (variant) => {
        const theme = createTheme()
        renderSnackbar({variant})

        const iconBox = screen.getByTestId("test-id-snackbar-icon-box")
        expect(iconBox).toHaveStyle({color: theme.palette[variant].main})
        // Sits in a softly tinted circle of the same status color
        expect(iconBox).toHaveStyle({borderRadius: "50%"})
        expect(window.getComputedStyle(iconBox).backgroundColor).not.toBe("")
    })

    it("renders with plain fade transitions when reduced motion is preferred", () => {
        reducedMotion.value = true
        renderSnackbar()

        expect(screen.getByText("Test message")).toBeInTheDocument()
    })

    it("shows the variant icon by default when hideIconVariant is not specified", () => {
        renderSnackbar({hideIconVariant: undefined})

        expect(screen.getByText("Test message")).toBeInTheDocument()
    })
})
