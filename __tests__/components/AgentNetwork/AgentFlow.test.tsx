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

jest.mock("../../../components/AgentNetwork/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid="mock-plasma-edge" />,
}))

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

        // agent3 is active so should be highlighted
        const agent3Node = container.querySelector('[data-id="agent3"]')
        expect(agent3Node).toBeInTheDocument()

        // first div is the one with the style
        const agent3ChildDiv = agent3Node.children[0] as HTMLDivElement

        // make sure it has style animation: glow 2.0s infinite
        expect(agent3ChildDiv).toHaveStyle({
            animation: "glow 2.0s infinite",
        })

        // agent2 is not "active" so should not have the pulsing animation
        const agent2Div = container.querySelector('[data-id="agent2"]')
        expect(agent2Div).toBeInTheDocument()
        const agent2ChildDiv = agent2Div.children[0] as HTMLDivElement
        expect(agent2ChildDiv).toHaveStyle({
            animation: "none",
        })
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
