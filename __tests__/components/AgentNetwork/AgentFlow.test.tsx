import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {ReactFlowProvider} from "reactflow"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import AgentFlow from "../../../components/AgentNetwork/AgentFlow"
import {ConnectivityInfo} from "../../../generated/neuro-san/OpenAPITypes"
import {withStrictMocks} from "../../common/strictMocks"

const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"
const TEST_AGENT_MUSIC_NERD_PRO = "Music Nerd Pro"

describe("AgentFlow", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
    })

    const network: ConnectivityInfo[] = [
        {
            origin: "agent1",
            tools: ["agent2", "agent3"],
        },
        {
            origin: "agent2",
            tools: ["agent3"],
        },
        {
            origin: "agent3",
            tools: [],
        },
    ]

    function verifyAgentNodes(container: HTMLElement) {
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(3)

        const agentNames = network.map((agent) => agent.origin)
        const nodesArray = Array.from(nodes)

        // Make sure each agent node is rendered at least. Structure in react-flow is:
        // <div class="react-flow__node"><div><p>agentName</p></div></div>
        agentNames.forEach((agent) => {
            expect(
                nodesArray.some(
                    (node) => node.querySelector("div")?.querySelector("p")?.textContent === cleanUpAgentName(agent)
                )
            ).toBe(true)
        })
    }

    it("Should render correctly", async () => {
        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    id="test-flow-id"
                    agentsInNetwork={network}
                    originInfo={[{tool: "agent1", instantiation_index: 1}]}
                    selectedNetwork={TEST_AGENT_MATH_GUY}
                />
            </ReactFlowProvider>
        )

        // We don't pay for premium so we get the ad!
        expect(await screen.findByText(cleanUpAgentName("React Flow"))).toBeInTheDocument()

        verifyAgentNodes(container)
    })

    it("Should handle highlighting the active agents", async () => {
        const {container, rerender} = render(
            <ReactFlowProvider>
                <AgentFlow
                    id="test-flow-id"
                    agentsInNetwork={network}
                    originInfo={[{tool: "agent2", instantiation_index: 1}]}
                    selectedNetwork={TEST_AGENT_MUSIC_NERD}
                />
            </ReactFlowProvider>
        )

        // Force a re-render by changing layout
        const layoutButton = container.querySelector("#linear-layout-button")
        await user.click(layoutButton)

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    id="test-flow-id"
                    agentsInNetwork={network}
                    originInfo={[{tool: "agent3", instantiation_index: 1}]}
                    selectedNetwork={TEST_AGENT_MUSIC_NERD_PRO}
                />
            </ReactFlowProvider>
        )

        // agent1 and agent3 should highlighted since agent1 (the Frontman) is the first upstream of agent3.
        // But we can't check that currently since we disable CSS parsing in jest due to other issues.
        // Also the edge between agent1 and agent3 should be highlighted. We can verify that.

        // locate edge by aria-label
        const edge = container.querySelector('[aria-label="Edge from agent1 to agent3"]')
        expect(edge).toBeInTheDocument()

        // Get the <path> element within the edge
        const path = edge?.firstElementChild

        // Should be highlighted
        expect(path).toHaveStyle("stroke-width: 3")

        // Verify that agent1 -> agent2 edge is not highlighted
        const edge2 = container.querySelector('[aria-label="Edge from agent1 to agent2"]')
        const path2 = edge2?.firstElementChild
        expect(path2).toBeInTheDocument()
        expect(path2).not.toHaveAttribute("style", expect.stringContaining("stroke-width"))
    })

    it("Should handle an empty agent list", async () => {
        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    id="test-flow-id"
                    agentsInNetwork={[]}
                    originInfo={[]}
                    selectedNetwork={TEST_AGENT_MATH_GUY}
                />
            </ReactFlowProvider>
        )

        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(0)
    })

    test.each(["radial", "linear"])("Should allow switching to %s layout", async (layout) => {
        const {container} = render(
            <ReactFlowProvider>
                <AgentFlow
                    id="test-flow-id"
                    agentsInNetwork={network}
                    originInfo={[{tool: "agent1", instantiation_index: 1}]}
                    selectedNetwork={TEST_AGENT_MATH_GUY}
                />
            </ReactFlowProvider>
        )

        // locate appropriate button
        const layoutButton = container.querySelector(`#${layout}-layout-button`)
        expect(layoutButton).toBeInTheDocument()

        // click the button
        await user.click(layoutButton)

        // Make sure at least agent nodes are still rendered
        verifyAgentNodes(container)
    })
})
