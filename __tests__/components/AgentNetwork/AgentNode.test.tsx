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
                    isFrontman: false,
                    depth: 1,
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
                    isFrontman: true,
                    depth: 3,
                }}
            />
        )

        // locate parent div
        const pElement = screen.getByText("testAgent")
        const parentDiv = pElement.closest("div")
        expect(parentDiv).toBeInTheDocument()

        // quirk of testing: since we have disabled css modules, we can't test for the actual color.
        // Frontman uses a color from the globals.css stylesheet which isn't available to jest, so it will manifest as
        // no background-color attribute.
        const style = window.getComputedStyle(parentDiv)
        expect(style.backgroundColor).toBe("")
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
                    isFrontman: false,
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
