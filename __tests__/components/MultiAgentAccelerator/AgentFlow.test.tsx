import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {ReactFlowProvider} from "reactflow"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import AgentFlow from "../../../components/MultiAgentAccelerator/AgentFlow"
import {ConnectivityInfo} from "../../../generated/neuro-san/OpenAPITypes"
import {usePreferences} from "../../../state/Preferences"
import {withStrictMocks} from "../../common/strictMocks"

const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD_PRO = "Music Nerd Pro"

jest.mock("../../../components/MultiAgentAccelerator/PlasmaEdge", () => ({
    PlasmaEdge: () => <g data-testid="mock-plasma-edge" />,
}))

// Mock Preferences state
jest.mock("../../../state/Preferences")
const mockedUsePreferences = jest.mocked(usePreferences, {shallow: true})

describe("AgentFlow", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()

        mockedUsePreferences.mockReturnValue({darkMode: false, toggleDarkMode: jest.fn()})
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

    const defaultProps = {
        agentsInNetwork: network,
        id: "test-flow-id",
        includedAgentIds: [], // No active agents for the default test
        originInfo: [{tool: "agent1", instantiation_index: 1}],
        selectedNetwork: TEST_AGENT_MATH_GUY,
    }

    const renderAgentFlowComponent = (overrides = {}) => {
        const props = {...defaultProps, ...overrides}
        return render(
            <ReactFlowProvider>
                <AgentFlow {...props} />
            </ReactFlowProvider>
        )
    }

    const verifyAgentNodes = (container: HTMLElement) => {
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(3)

        const agentNames = network.map((agent) => agent.origin)
        const nodesArray = Array.from(nodes)

        // Make sure each agent node is rendered at least. Structure in react-flow is:
        // <div class="react-flow__node"><div><p>agentName</p></div></div>
        agentNames.forEach((agent) => {
            expect(nodesArray.some((node) => node.querySelector("p")?.textContent === cleanUpAgentName(agent))).toBe(
                true
            )
        })
    }

    test.each([{darkMode: false}, {darkMode: true}])("Should render correctly in %s mode", async ({darkMode}) => {
        mockedUsePreferences.mockReturnValue({darkMode, toggleDarkMode: jest.fn()})
        const {container} = renderAgentFlowComponent()

        expect(await screen.findByText(cleanUpAgentName("React Flow"))).toBeInTheDocument()
        verifyAgentNodes(container)
    })

    it("Should allow switching to heatmap display", async () => {
        renderAgentFlowComponent()

        const heatmapButton = await screen.findByRole("button", {name: "Heatmap"})

        // press the button to switch to heatmap mode
        await user.click(heatmapButton)

        // Legend should have switched to heatmap mode
        await screen.findByText("Heat")
    })

    it("Should allow switching to heatmap display and not show radial guides with linear display mode", async () => {
        const {container} = renderAgentFlowComponent()

        const radialGuides = container.querySelector("#test-flow-id-radial-guides")

        // Radial guides should be present in radial layout
        expect(radialGuides).toBeInTheDocument()

        // locate linear layout button
        const linearLayoutButton = container.querySelector("#linear-layout-button")
        expect(linearLayoutButton).toBeInTheDocument()

        // click the button
        await user.click(linearLayoutButton)

        // Radial guides should not be present in linear layout
        expect(radialGuides).not.toBeInTheDocument()

        // Now switch to heatmap display
        const heatmapButton = await screen.findByRole("button", {name: "Heatmap"})

        // press the button to switch to heatmap mode
        await user.click(heatmapButton)

        // Legend should have switched to heatmap mode
        await screen.findByText("Heat")
    })

    it("Should handle highlighting the active agents", async () => {
        const {container, rerender} = renderAgentFlowComponent({
            selectedNetwork: TEST_AGENT_MUSIC_NERD_PRO,
        })

        // Force a re-render by changing layout
        const layoutButton = container.querySelector("#linear-layout-button")
        await user.click(layoutButton)

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    agentsInNetwork={network}
                    id="test-flow-id"
                    includedAgentIds={["agent1", "agent3"]}
                    originInfo={[
                        {tool: "agent1", instantiation_index: 1},
                        {tool: "agent3", instantiation_index: 1},
                    ]}
                    selectedNetwork={TEST_AGENT_MUSIC_NERD_PRO}
                />
            </ReactFlowProvider>
        )

        // agent1 is active so should be highlighted
        const agent1Node = container.querySelector('[data-id="agent1"]')
        expect(agent1Node).toBeInTheDocument()

        // agent1 first div is the one with the style
        const agent1ChildDiv = agent1Node.children[0] as HTMLDivElement

        // make sure agent1 has style animation: glow 2.0s infinite
        expect(agent1ChildDiv).toHaveStyle({
            animation: "glow 2.0s infinite",
        })

        // agent3 is active so should be highlighted
        const agent3Node = container.querySelector('[data-id="agent3"]')
        expect(agent3Node).toBeInTheDocument()

        // agent3 first div is the one with the style
        const agent3ChildDiv = agent3Node.children[0] as HTMLDivElement

        // make sure agent3 has style animation: glow 2.0s infinite
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
        const {container} = renderAgentFlowComponent({agentsInNetwork: [], originInfo: []})

        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(0)

        // Expect legend not to be present
        expect(container.querySelector("#test-flow-id-legend")).not.toBeInTheDocument()
    })

    it("Should render the legend if agent list is greater than 0", async () => {
        const {container} = renderAgentFlowComponent()

        // Expect legend to be present
        expect(container.querySelector("#test-flow-id-legend")).toBeInTheDocument()
    })

    it("Should handle a Frontman-only network", async () => {
        const {container} = renderAgentFlowComponent({
            agentsInNetwork: [network[2]],
            originInfo: [{tool: "agent3", instantiation_index: 1}],
        })

        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes).toHaveLength(1)
    })

    test.each(["radial", "linear"])("Should allow switching to %s layout", async (layout) => {
        const {container} = renderAgentFlowComponent()

        // locate appropriate button
        const layoutButton = container.querySelector(`#${layout}-layout-button`)
        expect(layoutButton).toBeInTheDocument()

        // click the button
        await user.click(layoutButton)

        // Make sure at least agent nodes are still rendered
        verifyAgentNodes(container)
    })

    it("Should show radial guides only in radial layout with more than one depth", () => {
        const {container, rerender} = renderAgentFlowComponent()

        // Should show radial guides SVG with more than one node (which is used for the default test network)
        expect(container.querySelector("#test-flow-id-radial-guides")).toBeInTheDocument()

        rerender(
            <ReactFlowProvider>
                <AgentFlow
                    agentsInNetwork={[network[2]]}
                    id="test-flow-id"
                    includedAgentIds={[]}
                    originInfo={[{tool: "agent3", instantiation_index: 1}]}
                    selectedNetwork={TEST_AGENT_MATH_GUY}
                />
            </ReactFlowProvider>
        )

        // Should not show radial guides SVG with only one node
        expect(container.querySelector("#test-flow-id-radial-guides")).not.toBeInTheDocument()
    })
})
