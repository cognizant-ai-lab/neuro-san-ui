import {render, screen} from "@testing-library/react"

import {AgentNode} from "../../../components/AgentNetwork/AgentNode"
import {withStrictMocks} from "../../common/strictMocks"

// Mock the Handle component since we don't want to invite react-flow to this party
jest.mock("reactflow", () => ({
    ...jest.requireActual("reactflow"),
    Handle: jest.fn((id) => <div data-testid={id.id} />),
}))

describe("AgentNode", () => {
    withStrictMocks()

    it("Should render correctly", async () => {
        const agentName = "Test Agent"
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
                    agentName,
                    getOriginInfo: () => [],
                    depth: 1,
                    agentCounts: new Map([["testNode", 42]]),
                }}
            />
        )

        expect(screen.getByText(agentName)).toBeInTheDocument()

        // locate parent div
        const pElement = screen.getByText(agentName)
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        // Regular node should not have animation
        const style = window.getComputedStyle(parentDiv)
        expect(style.animation).toBe("none")
    })

    it("Should render in a different color if frontman", async () => {
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
                    agentName: "testAgent",
                    getOriginInfo: () => [],
                    depth: 3,
                }}
            />
        )

        // locate parent div
        const pElement = screen.getByText("testAgent")
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        const style = window.getComputedStyle(parentDiv)
        expect(style.backgroundColor).toBe("rgb(158, 202, 225)")
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
                    getOriginInfo: () => [{tool: agentName, instantiationIndex: 1}],
                    depth: 3,
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
})
