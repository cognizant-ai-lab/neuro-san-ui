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
})
