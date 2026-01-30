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

import {hexToRgb} from "@mui/material/styles"
import {render, screen} from "@testing-library/react"
import {CSSProperties} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentNode} from "../../../components/MultiAgentAccelerator/AgentNode"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../state/Settings"
import {PALETTES} from "../../../Theme/Palettes"

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

const AGENT_NAME = "Test Agent"

describe("AgentNode", () => {
    withStrictMocks()

    it("Should render correctly", async () => {
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
                    agentName: AGENT_NAME,
                    depth: 1,
                    displayAs: "llm_agent",
                    getConversations: () => null,
                }}
            />
        )

        expect(screen.getByText(AGENT_NAME)).toBeInTheDocument()

        // Should "display as" an "LLM agent"
        await screen.findByTestId("AutoAwesomeIcon")

        // locate parent div
        const pElement = screen.getByText(AGENT_NAME)
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        // Check the background color of the associated node (the circle div)
        const nodeDiv = Array.from(parentDiv.children).find((el) => el.tagName === "DIV") as HTMLDivElement
        expect(nodeDiv).toBeInTheDocument()
        const style = window.getComputedStyle(nodeDiv)

        // Heatmap color should be applied based on agent count. No other agents so it should be the last color
        // of the default (blue) palette
        const bluePalette = PALETTES["blue"]
        const expectedColor = bluePalette[bluePalette.length - 1]

        expect(style.backgroundColor).toBe(hexToRgb(expectedColor))

        // Non-active node should not have animation
        expect(style.animation).toBe("none")
    })

    it("Should render animation if active agent", async () => {
        render(
            <AgentNode
                id={AGENT_NAME}
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
                    getConversations: () => [
                        {
                            agents: new Set([AGENT_NAME]),
                            id: "conversation1",
                            startedAt: undefined,
                            type: ChatMessageType.UNKNOWN,
                        },
                    ],
                }}
            />
        )

        // locate agent node div
        const agentNodeDiv = screen.getByTestId(AGENT_NAME)

        // Active node should have animation
        const style = window.getComputedStyle(agentNodeDiv)
        expect(style.animation).toBe("glow 2.0s infinite")
    })

    it.each([
        {autoNodeColor: true, depth: 1},
        {autoNodeColor: true, depth: 9},
        {autoNodeColor: false, depth: 1},
        {autoNodeColor: false, depth: 9},
    ])("should handle autoNodeColor=$autoNodeColor and depth=$depth", async ({autoNodeColor, depth}) => {
        const agentIconColor = "#112233"
        useSettingsStore.getState().updateSettings({
            appearance: {
                agentIconColor,
                autoAgentIconColor: autoNodeColor,
            },
        })

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
                    depth,
                    displayAs: "llm_agent",
                    getConversations: () => null,
                }}
            />
        )

        const icon = await screen.findByTestId("AutoAwesomeIcon")
        const iconStyle = window.getComputedStyle(icon)

        // Make sure the icon color matches expected
        const expectedIconColor = autoNodeColor
            ? depth === 1
                ? /rgba\(0, 0, 0, 0\.\d+\)/u // Ignore alpha value (last octet) that MUI generates
                : /rgb\(255, 255, 255\)/u
            : hexToRgb(agentIconColor)
        expect(iconStyle.color).toMatch(expectedIconColor)
    })

    it.each([
        ["handles should display in regular mode", false, "block"],
        ["handles should not display in Zen mode", true, "none"],
    ])("%s", async (_description, isAwaitingLlm, expectedDisplay) => {
        render(
            <AgentNode
                id={AGENT_NAME}
                type="test"
                selected={false}
                zIndex={0}
                isConnectable={false}
                xPos={0}
                yPos={0}
                dragging={false}
                data={{
                    agentName: "agentName",
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
