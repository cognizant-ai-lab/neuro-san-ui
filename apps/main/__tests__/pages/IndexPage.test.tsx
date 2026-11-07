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

import {render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"
import {MotionGlobalConfig} from "motion/react"
import {NextRouter, useRouter} from "next/router"
import {FC, useEffect} from "react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {ConstellationScene} from "../../components/Splash/ConstellationScene"
import {isWebGLAvailable} from "../../components/Splash/webgl"
import {Index} from "../../pages"

const createMockRouter = (overrides: Partial<NextRouter> = {}): NextRouter => ({
    basePath: "",
    pathname: "/",
    route: "/",
    query: {},
    asPath: "/",
    isFallback: undefined,
    isReady: true,
    isPreview: undefined,
    isLocaleDomain: undefined,
    push: undefined,
    replace: undefined,
    reload: undefined,
    back: undefined,
    forward: undefined,
    prefetch: undefined,
    beforePopState: undefined,
    events: undefined,
    ...overrides,
})

// Mock dependencies
vi.mock("../../../../packages/ui-common/state/Environment", () => ({
    useEnvironmentStore: vi.fn(),
}))

vi.mock("next/router", () => ({
    useRouter: vi.fn(),
}))

// jsdom has no WebGL: stand in for the three.js scene and the capability check
vi.mock("../../components/Splash/ConstellationScene", () => ({
    ConstellationScene: vi.fn(),
}))

vi.mock("../../components/Splash/webgl", () => ({
    isWebGLAvailable: vi.fn(),
}))

// jsdom has no GPU, so "auto" effects would otherwise always pick lite mode and skip the 3D scene
vi.mock("../../../../packages/ui-common/Theme/effects", () => ({
    useLiteEffects: vi.fn(() => false),
}))

// Run motion's entrance animations instantly
MotionGlobalConfig.skipAnimations = true

// Stand-in scene that reports its first frame (or, if asked, a lost WebGL context) after mounting
const MockScene: FC<{onError: () => void; onReady: () => void; lose?: boolean}> = ({onError, onReady, lose}) => {
    useEffect(() => (lose ? onError() : onReady()), [lose, onError, onReady])
    return <div data-testid="mock-constellation-scene" />
}

describe("Index Page", () => {
    withStrictMocks()

    beforeEach(() => {
        vi.mocked(useEnvironmentStore).mockReturnValue({
            supportEmailAddress: "support@example.com",
        })
        vi.mocked(useRouter).mockReturnValue(createMockRouter())
        vi.mocked(isWebGLAvailable).mockReturnValue(false)
        vi.mocked(ConstellationScene).mockImplementation(MockScene)
    })

    it("renders the page correctly", async () => {
        render(<Index />)

        await screen.findByText("Neuro® AI")
        await screen.findByText("Multi-Agent Accelerator")
        await screen.findByText("Low-code framework for rapidly agentifying your business.")
        await screen.findByText("Explore more.")
        await screen.findByText("Explore agent networks")
        await screen.findByText("About")
        await screen.findByText("Contact Us")
        await screen.findByText("AI Innovation Studios")
        await screen.findByText("Neuro IT Ops")
        await screen.findByText("Flowsource")
        await screen.findByText("Skygrade")
        await screen.findByText("Cognizant Ignition")
        const title = await screen.findByText(/Star us on GitHub/u)
        await waitFor(() => expect(title).toBeVisible())

        const link = title.closest("a")

        expect(link).toBeVisible()
        expect(link).toHaveAttribute("href", "https://github.com/cognizant-ai-lab/neuro-san-studio")
    })

    it("opens the email dialog when 'Contact Us' is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        const contactUsLink = await screen.findByText("Contact Us")
        await user.click(contactUsLink)
        await screen.findByText("Confirm")
        await screen.findByText("Cancel")
    })

    it("closes the email dialog when cancel is clicked", async () => {
        const user = userEvent.setup()
        render(<Index />)

        const contactUsLink = await screen.findByText("Contact Us")
        await user.click(contactUsLink)
        const cancelButton = await screen.findByText("Cancel")
        await user.click(cancelButton)

        expect(screen.queryByText("Confirm")).not.toBeInTheDocument()
    })

    it("keeps the element ids and link targets used by the user tour", async () => {
        vi.mocked(useRouter).mockReturnValue(createMockRouter({query: {demo: "1"}}))
        render(<Index />)

        for (const id of [
            "splash-page__container",
            "nav-bar",
            "main-div",
            "headline-eyebrow",
            "header-line",
            "neuro-ai-maa-box",
            "neuro-ai-description-box",
            "multi-agent-accelerator-container",
            "neuro-san-button",
            "splash-hero-orb",
            "splash-hero-grid",
        ]) {
            expect(document.getElementById(id)).toBeInTheDocument()
        }

        expect(document.getElementById("explore-agent-networks-link-anchor")).toHaveAttribute(
            "href",
            "/multiAgentAccelerator?demo=1"
        )
        expect(document.getElementById("explore-more-link")).toHaveAttribute(
            "href",
            "https://github.com/cognizant-ai-lab/neuro-san-studio"
        )
        expect(document.getElementById("splash-logo-link")).toHaveAttribute("href", "https://www.cognizant.com/us/en")
    })

    it("shows only the CSS fallback when WebGL is unavailable", async () => {
        render(<Index />)

        await screen.findByText("Explore agent networks")
        expect(screen.getByTestId("constellation-backdrop")).toBeInTheDocument()
        expect(document.getElementById("splash-hero-orb")).toBeInTheDocument()
        expect(screen.queryByTestId("constellation-canvas-layer")).not.toBeInTheDocument()
        expect(ConstellationScene).not.toHaveBeenCalled()
    })

    it("loads the 3D scene when WebGL is available and reveals it once drawn", async () => {
        vi.mocked(isWebGLAvailable).mockReturnValue(true)
        render(<Index />)

        await screen.findByTestId("mock-constellation-scene")
        await waitFor(() =>
            expect(screen.getByTestId("constellation-canvas-layer")).toHaveAttribute("data-scene-ready", "true")
        )
        expect(ConstellationScene).toHaveBeenLastCalledWith(
            expect.objectContaining({active: true, isLight: false, reducedMotion: false}),
            undefined
        )
    })

    it("falls back to the CSS backdrop if the 3D scene crashes", async () => {
        vi.mocked(isWebGLAvailable).mockReturnValue(true)
        vi.mocked(ConstellationScene).mockImplementation(() => {
            throw new Error("WebGL context could not be created")
        })
        // React and the error boundary both report the caught error
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

        render(<Index />)

        await waitFor(() => expect(screen.queryByTestId("constellation-canvas-layer")).not.toBeInTheDocument())
        expect(warnSpy).toHaveBeenCalledWith(
            "Splash 3D scene unavailable, using fallback",
            expect.any(Error),
            expect.anything()
        )
        expect(document.getElementById("splash-hero-orb")).toBeInTheDocument()
        expect(screen.getByText("Multi-Agent Accelerator")).toBeInTheDocument()
        errorSpy.mockRestore()
    })

    it("falls back to the CSS backdrop if the WebGL context is lost", async () => {
        vi.mocked(isWebGLAvailable).mockReturnValue(true)
        vi.mocked(ConstellationScene).mockImplementation((props) => (
            <MockScene
                {...props}
                lose={true}
            />
        ))
        render(<Index />)

        await screen.findByText("Explore agent networks")
        await waitFor(() => expect(screen.queryByTestId("constellation-canvas-layer")).not.toBeInTheDocument())
        expect(document.getElementById("splash-hero-orb")).toBeInTheDocument()
    })
})
