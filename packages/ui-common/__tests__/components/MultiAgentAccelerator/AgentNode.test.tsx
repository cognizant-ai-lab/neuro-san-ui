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

import {render, screen} from "@testing-library/react"
import {CSSProperties} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentNode} from "../../../components/MultiAgentAccelerator/AgentNode"

// Mock the Handle component since we don't want to invite react-flow to this party
jest.mock("reactflow", () => ({
    ...jest.requireActual("reactflow"),
    Handle: (props: {type: unknown; id: unknown; style: CSSProperties}) => (
        <div
            data-testid={`handle-${props.type}-${props.id}`}
            style={props.style}
        />
    ),
}))

describe("AgentNode", () => {
    withStrictMocks()

    it("Should render correctly", async () => {
        const agentName = "Test Agent"
        const agentId = "testNode"
        render(
            <AgentNode
                id={agentId}
                type="test"
                selected={false}
                zIndex={0}
                isConnectable={false}
                xPos={0}
                yPos={0}
                dragging={false}
                data={{
                    agentCounts: new Map([[agentId, 42]]),
                    agentName,
                    depth: 1,
                    displayAs: "llm_agent",
                    getConversations: () => null,
                }}
            />
        )

        expect(screen.getByText(agentName)).toBeInTheDocument()

        // Should "display as" an "LLM agent"
        await screen.findByTestId("AutoAwesomeIcon")

        // locate parent div
        const pElement = screen.getByText(agentName)
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        // Check the background color of the associated node (the circle div)
        const nodeDiv = Array.from(parentDiv.children).find((el) => el.tagName === "DIV") as HTMLDivElement
        expect(nodeDiv).toBeInTheDocument()
        const style = window.getComputedStyle(nodeDiv)

        // Heatmap color should be applied based on agent count. No other agents so it should be the last color
        // in the palette, #041c45 = "rgb(4, 28, 69)"
        expect(style.backgroundColor).toBe("rgb(4, 28, 69)")

        // Non-active node should not have animation
        expect(style.animation).toBe("none")
    })

    it("Should render animation if active agent", async () => {
        const agentName = "Test Agent"

        render(
            <AgentNode
                id={agentName}
                type="test"
                selected={false}
                zIndex={0}
                isConnectable={false}
                xPos={0}
                yPos={0}
                dragging={false}
                data={{
                    agentName: "testAgent",
                    depth: 3,
                    getConversations: () => [],
                }}
            />
        )

        // locate parent div
        const pElement = screen.getByText("testAgent")
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        // Active node should have animation
        const style = window.getComputedStyle(parentDiv)
        expect(style.animation).not.toBe("none")
    })

    it.each([
        ["handles should display in regular mode", false, "block"],
        ["handles should not display in Zen mode", true, "none"],
    ])("%s", async (_description, isAwaitingLlm, expectedDisplay) => {
        const agentName = "Test Agent"
        render(
            <AgentNode
                id={agentName}
                type="test"
                selected={false}
                zIndex={0}
                isConnectable={false}
                xPos={0}
                yPos={0}
                dragging={false}
                data={{
                    agentName: "testAgent",
                    depth: 3,
                    getConversations: () => [],
                    isAwaitingLlm,
                }}
            />
        )

        const positions = ["left", "right", "top", "bottom"]
        for (const pos of positions) {
            const handle = await screen.findByTestId(`handle-source-Test Agent-${pos}-handle`)
            expect(handle).toBeInTheDocument()
            expect(handle).toHaveStyle({display: expectedDisplay})
        }
    })

    it.each([
        ["llm_agent", "AutoAwesomeIcon"],
        ["external_agent", "TravelExploreIcon"],
        ["coded_tool", "HandymanIcon"],
        ["unknown_display_as_value", "AutoAwesomeIcon"],
    ])("renders correct icon for displayAs=%s", async (displayAs, expectedTestId) => {
        render(
            <AgentNode
                id="testNode"
                type="test"
                selected={false}
                zIndex={0}
                isConnectable={false}
                xPos={0}
                yPos={0}
                dragging={false}
                data={{
                    agentName: "Test Agent",
                    depth: 1,
                    displayAs,
                    getConversations: () => null,
                }}
            />
        )
        await screen.findByTestId(expectedTestId)
    })
})
