import {render, screen} from "@testing-library/react"

import {AgentNode} from "../../../components/MultiAgentAccelerator/AgentNode"
import {withStrictMocks} from "../../common/strictMocks"

// Mock the Handle component since we don't want to invite react-flow to this party
jest.mock("reactflow", () => ({
    ...jest.requireActual("reactflow"),
    Handle: (props) => (
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
                    getConversations: () => ({
                        agents: new Set<string>(),
                        startedAt: new Date(),
                    }),
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

    test.each([
        [false, "block", "handles should display in regular mode"],
        [true, "none", "handles should not display in Zen mode"],
    ])("%s", async (isAwaitingLlm, expectedDisplay) => {
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
                    getConversations: () => ({
                        agents: new Set<string>(),
                        startedAt: new Date(),
                    }),
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

    test.each([
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
