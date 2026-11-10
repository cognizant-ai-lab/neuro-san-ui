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
import {NetworkHud} from "../../../../components/MultiAgentAccelerator/AgentFlow/NetworkHud"

const reducedMotion = vi.hoisted(() => ({value: false}))

vi.mock("motion/react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("motion/react")>()),
    useReducedMotion: () => reducedMotion.value,
}))

describe("NetworkHud", () => {
    withStrictMocks()

    it.each([
        ["idle", "Idle", false],
        ["thinking", "Thinking", true],
        ["streaming", "Streaming", true],
    ] as const)("shows the %s status", (hudStatus, label, showsDots) => {
        render(
            <NetworkHud
                agentCount={1}
                centerOffset={-50}
                id="hud"
                networkDisplayName="Math Guy"
                status={hudStatus}
                top={90}
            >
                <button type="button">Edit</button>
            </NetworkHud>
        )

        expect(screen.getByRole("status", {name: `Math Guy: ${label}, 1 agents`})).toBeInTheDocument()
        expect(screen.getByText(label)).toBeInTheDocument()
        expect(screen.getByText("1 agent")).toBeInTheDocument()
        expect(document.getElementById("hud-hud-dots") !== null).toBe(showsDots)
        expect(document.getElementById("hud-network-title")).toHaveTextContent("Math Guy")
        expect(screen.getByRole("button", {name: "Edit"})).toBeInTheDocument()

        const bar = document.getElementById("hud-network-title-bar")
        expect(bar).toHaveStyle({top: "90px", left: "calc(50% + -50px)"})
    })

    it("shows static thinking dots under prefers-reduced-motion", () => {
        reducedMotion.value = true
        try {
            render(
                <NetworkHud
                    agentCount={2}
                    centerOffset={0}
                    id="hud"
                    networkDisplayName="Math Guy"
                    status="thinking"
                    top={90}
                />
            )

            expect(document.getElementById("hud-hud-dots")).toBeInTheDocument()
        } finally {
            reducedMotion.value = false
        }
    })
})
