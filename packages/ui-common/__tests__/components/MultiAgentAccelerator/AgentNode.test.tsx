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
import {NodeProps, Node as RFNode} from "@xyflow/react"
import {CSSProperties} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AgentConversation} from "../../../components/MultiAgentAccelerator/AgentConversations"
import {AgentNode, AgentNodeProps} from "../../../components/MultiAgentAccelerator/AgentNode"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../../state/Settings"
import {PALETTES} from "../../../Theme/Palettes"

// Mock the Handle component since we don't want to invite reactflow (now @xyflow/react) to this party
jest.mock("@xyflow/react", () => ({
    ...jest.requireActual("@xyflow/react"),
    Handle: (props: {type: unknown; id: unknown; style: CSSProperties}) => (
        <div
            data-testid={`handle-${props.type}-${props.id}`}
            style={props.style}
        />
    ),
}))

const AGENT_NAME = "Test Agent"
const AGENT_ID = "testNode"

const renderAgentNode = (data: Partial<AgentNodeProps>) => {
    const nodeProps: NodeProps<RFNode<AgentNodeProps>> = {
        id: AGENT_ID,
        type: "test",
        selected: false,
        selectable: false,
        deletable: false,
        draggable: false,
        zIndex: 0,
        isConnectable: false,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        dragging: false,
        data: {
            agentName: AGENT_NAME,
            depth: 1,
            displayAs: "llm_agent",
            getConversations: (): AgentConversation[] | null => null,
            ...data,
        },
    }

    render(<AgentNode {...nodeProps} />)
}

describe("AgentNode", () => {
    withStrictMocks()

    beforeEach(() => {
        // Reset settings store before each test
        useSettingsStore.getState().resetSettings()
    })

    it("Should render correctly", async () => {
        renderAgentNode({
            agentCounts: new Map([[AGENT_ID, 42]]),
        })

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

        // Inactive node should not have animation
        expect(style.animation).toBe("")
    })

    it("Should render animation if active agent", async () => {
        renderAgentNode({
            depth: 3,
            getConversations: () => [
                {
                    agents: new Set([AGENT_ID]),
                    id: "conversation1",
                    startedAt: undefined,
                    type: ChatMessageType.UNKNOWN,
                },
            ],
        })

        // locate agent node div
        const agentNodeDiv = screen.getByTestId(AGENT_ID)

        // Active node should have animation
        const style = window.getComputedStyle(agentNodeDiv)
        expect(style.animation).toMatch(/animation-\w+ 2s infinite/u)
    })

    it.each([
        {autoAgentIconColor: true, depth: 1},
        {autoAgentIconColor: true, depth: 9},
        {autoAgentIconColor: false, depth: 1},
        {autoAgentIconColor: false, depth: 9},
    ])("should handle autoNodeColor=$autoNodeColor and depth=$depth", async ({autoAgentIconColor, depth}) => {
        const agentIconColor = "#112233"
        useSettingsStore.getState().updateSettings({
            appearance: {
                agentIconColor,
                autoAgentIconColor,
            },
        })

        renderAgentNode({depth})

        // Locate the icon (should be AutoAwesomeIcon for llm_agent)
        const icon = await screen.findByTestId("AutoAwesomeIcon")
        const iconStyle = window.getComputedStyle(icon)

        // Make sure the icon color matches expected
        const expectedIconColor = autoAgentIconColor
            ? depth === 1
                ? /rgba\(0, 0, 0, 0\.\d+\)/u // Ignore alpha value (last octet) that MUI generates
                : /rgb\(255, 255, 255\)/u
            : hexToRgb(agentIconColor)
        expect(iconStyle.color).toMatch(expectedIconColor)
    })

    it.each([
        ["handles should display in regular mode", false, "visible"],
        ["handles should not display in Zen mode", true, "hidden"],
    ])("%s", async (_description, isAwaitingLlm, expectedVisibility) => {
        renderAgentNode({
            isAwaitingLlm,
            depth: 3,
        })

        const positions = ["left", "right", "top", "bottom"]
        for (const pos of positions) {
            const handle = await screen.findByTestId(`handle-source-${AGENT_ID}-${pos}-handle`)
            expect(handle).toBeInTheDocument()
            expect(handle).toHaveStyle({visibility: expectedVisibility})
        }
    })

    it.each([
        ["llm_agent", "AutoAwesomeIcon"],
        ["external_agent", "TravelExploreIcon"],
        ["coded_tool", "HandymanIcon"],
        ["unknown_display_as_value", "AutoAwesomeIcon"],
    ])("renders correct icon for displayAs=%s", async (displayAs, expectedTestId) => {
        renderAgentNode({displayAs})
        await screen.findByTestId(expectedTestId)
    })

    // Are these tests repeated somewhere? I don't see other code exercising the agentIconSuggestion prop?
    it("renders a custom MUI icon when agentIconSuggestion is a valid icon name", async () => {
        // "Star" is a real named export in @mui/icons-material; MUI renders it with testid "StarIcon"
        renderAgentNode({agentIconSuggestion: "Star"})
        await screen.findByTestId("StarIcon")
    })

    it("warns and falls back to default icon when agentIconSuggestion is invalid", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
        renderAgentNode({agentIconSuggestion: "NotARealMuiIconAtAll"})
        expect(warnSpy).toHaveBeenCalledWith("Invalid MUI icon suggestion: NotARealMuiIconAtAll")
        warnSpy.mockRestore()
    })
})
