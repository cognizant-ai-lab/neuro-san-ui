/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {FloatingPanel} from "../../../../components/MultiAgentAccelerator/Workspace/FloatingPanel"

const reducedMotion = vi.hoisted(() => ({value: false}))

vi.mock("motion/react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("motion/react")>()),
    useReducedMotion: () => reducedMotion.value,
}))

describe("FloatingPanel", () => {
    withStrictMocks()

    const renderPanel = (collapsed: boolean, side: "left" | "right" = "left", isTransitioning = false) =>
        render(
            <FloatingPanel
                collapsed={collapsed}
                id="card"
                isTransitioning={isTransitioning}
                minWidth={300}
                side={side}
            >
                <button type="button">Inside</button>
            </FloatingPanel>
        )

    it("renders its content interactive when expanded", () => {
        renderPanel(false)
        const card = document.getElementById("card")
        expect(card).toHaveAttribute("data-collapsed", "false")
        expect(card).not.toHaveAttribute("aria-hidden")
        expect(card).toHaveStyle({pointerEvents: "auto", width: "100%", right: "0px"})
        expect(screen.getByRole("button", {name: "Inside"})).toBeInTheDocument()
    })

    it("becomes inert and hidden from assistive tech when collapsed", () => {
        renderPanel(true, "right")
        const card = document.getElementById("card")
        expect(card).toHaveAttribute("data-collapsed", "true")
        expect(card).toHaveAttribute("aria-hidden", "true")
        expect(card).toHaveAttribute("inert")
        expect(card).toHaveStyle({pointerEvents: "none", left: "0px"})
        expect(screen.queryByRole("button", {name: "Inside"})).not.toBeInTheDocument()
    })

    it("renders without spring animation under prefers-reduced-motion", () => {
        reducedMotion.value = true
        try {
            renderPanel(false, "right", true)
            expect(document.getElementById("card")).toHaveAttribute("data-collapsed", "false")
        } finally {
            reducedMotion.value = false
        }
    })

    it("slides a collapsed left panel out when isTransitioning is omitted", () => {
        render(
            <FloatingPanel
                collapsed={true}
                id="card"
                minWidth={300}
                side="left"
            >
                <button type="button">Inside</button>
            </FloatingPanel>
        )

        expect(document.getElementById("card")).toHaveAttribute("data-collapsed", "true")
    })
})
