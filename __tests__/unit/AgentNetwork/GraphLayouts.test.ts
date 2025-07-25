import {DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS} from "../../../components/MultiAgentAccelerator/const"
import {layoutLinear, layoutRadial} from "../../../components/MultiAgentAccelerator/GraphLayouts"
import {ConnectivityInfo} from "../../../generated/neuro-san/OpenAPITypes"
import {withStrictMocks} from "../../common/strictMocks"

describe("GraphLayouts", () => {
    withStrictMocks()

    const threeAgentNetwork: ConnectivityInfo[] = [
        {origin: "agent1", tools: ["agent2"]},
        {origin: "agent2", tools: ["agent3"]},
        {origin: "agent3", tools: []},
    ]

    const sevenAgentNetwork: ConnectivityInfo[] = [
        {origin: "agent1", tools: ["agent2", "agent3", "agent4"]},
        {origin: "agent2", tools: ["agent5"]},
        {origin: "agent3", tools: ["agent6"]},
        {origin: "agent4", tools: ["agent7"]},
        {origin: "agent5", tools: []},
        {origin: "agent6", tools: []},
        {origin: "agent7", tools: []},
    ]

    const networkWithCycles: ConnectivityInfo[] = [
        {origin: "agent1", tools: ["agent2", "agent4"]},
        {origin: "agent2", tools: ["agent3"]},
        {origin: "agent3", tools: ["agent2"]}, // Cycle back to agent2
        {origin: "agent4", tools: ["agent4"]}, // Self-loop
    ]

    const singleNodeNetwork: ConnectivityInfo[] = [{origin: "agent1", tools: []}]

    const disconnectedGraph: ConnectivityInfo[] = [
        {origin: "agent1", tools: ["agent2"]},
        {origin: "agent2", tools: []},
        {origin: "agent3", tools: ["agent4"]},
        {origin: "agent4", tools: []},
    ]

    const transitiveGraph: ConnectivityInfo[] = [
        {origin: "agent1", tools: ["agent2", "agent3"]},
        {origin: "agent2", tools: ["agent3"]},
        {origin: "agent3", tools: []},
    ]

    it("Should generate a linear layout", async () => {
        const {nodes, edges} = layoutLinear(new Map(), threeAgentNetwork, jest.fn(), jest.fn(), false)

        expect(nodes).toHaveLength(3)
        expect(edges).toHaveLength(2)

        // Check that the nodes are correct
        threeAgentNetwork
            .map((agent) => agent.origin)
            .forEach((agent) => {
                expect(nodes.map((node) => node.id)).toContain(agent)
            })

        // Check that the edges are correct
        // agent1 -> agent2
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent2")).toBe(true)
        // agent2 -> agent3
        expect(edges.some((edge) => edge.source === "agent2" && edge.target === "agent3")).toBe(true)
        // agent1 -> agent3 (negative case: not connected)
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent3")).toBe(false)

        // Check that the nodes are in the correct position
        expect(nodes[0].position.x).toBeLessThan(nodes[1].position.x)
        expect(nodes[1].position.x).toBeLessThan(nodes[2].position.x)
    })

    it("Should generate a radial layout", async () => {
        const {nodes, edges} = layoutRadial(new Map(), sevenAgentNetwork, jest.fn(), jest.fn(), false)

        expect(nodes).toHaveLength(7)
        expect(edges).toHaveLength(6)

        // Check that the nodes are correct
        // Should have a node with id agent1 but not necessarily the first
        sevenAgentNetwork
            .map((agent) => agent.origin)
            .forEach((agent) => {
                expect(nodes.map((node) => node.id)).toContain(agent)
            })

        // Check that the edges are correct
        // agent1 -> agent2
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent2")).toBe(true)
        // agent1 -> agent3.
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent3")).toBe(true)
        // agent1 -> agent4
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent4")).toBe(true)
        // agent2 -> agent5
        expect(edges.some((edge) => edge.source === "agent2" && edge.target === "agent5")).toBe(true)
        // agent3 -> agent6
        expect(edges.some((edge) => edge.source === "agent3" && edge.target === "agent6")).toBe(true)
        // agent4 -> agent7
        expect(edges.some((edge) => edge.source === "agent4" && edge.target === "agent7")).toBe(true)

        // Check that the nodes are in roughly the correct position
        // agent1 should be at the center
        expect(nodes[0].position.x).toBe(DEFAULT_FRONTMAN_X_POS)
        expect(nodes[0].position.y).toBe(DEFAULT_FRONTMAN_Y_POS)

        // agents2 and 5 should be right of frontman
        const agent2 = nodes.find((node) => node.id === "agent2")
        const agent5 = nodes.find((node) => node.id === "agent5")

        expect(agent2.position.x).toBeGreaterThan(DEFAULT_FRONTMAN_X_POS)
        expect(agent5.position.x).toBeGreaterThan(DEFAULT_FRONTMAN_X_POS)

        // agent2 right of agent5
        expect(agent5.position.x).toBeGreaterThan(agent2.position.x)

        // agent3 should be left of frontman
        const agent3 = nodes.find((node) => node.id === "agent3")
        expect(agent3.position.x).toBeLessThan(DEFAULT_FRONTMAN_X_POS)

        // agent6 should be left of frontman
        const agent6 = nodes.find((node) => node.id === "agent6")
        expect(agent6.position.x).toBeLessThan(DEFAULT_FRONTMAN_X_POS)

        // agent6 should be left of agent3
        expect(agent6.position.x).toBeLessThan(agent3.position.x)

        // agents4 and 7 should be left of frontman
        const agent4 = nodes.find((node) => node.id === "agent4")
        const agent7 = nodes.find((node) => node.id === "agent7")

        expect(agent4.position.x).toBeLessThan(DEFAULT_FRONTMAN_X_POS)
        expect(agent7.position.x).toBeLessThan(DEFAULT_FRONTMAN_X_POS)

        // agent7 should be left of agent4
        expect(agent7.position.x).toBeLessThan(agent4.position.x)
    })

    it("Should handle cycles in the graph", async () => {
        const {nodes, edges} = layoutRadial(new Map(), networkWithCycles, jest.fn(), jest.fn(), false)

        expect(nodes).toHaveLength(4)

        // Should have 3 edges: agent1 -> agent2, agent1 -> agent4, agent2 -> agent3
        // Should _not_ have the cycle agent3 -> agent2 nor the self-loop agent4 -> agent4
        expect(edges).toHaveLength(3)

        // Check that the nodes are correct
        networkWithCycles
            .map((agent) => agent.origin)
            .forEach((agent) => {
                expect(nodes.map((node) => node.id)).toContain(agent)
            })

        // Check that the edges are correct
        // agent1 -> agent2
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent2")).toBe(true)
        // agent2 -> agent3
        expect(edges.some((edge) => edge.source === "agent2" && edge.target === "agent3")).toBe(true)
        // agent3 -> agent2. We skip cycles, so this edge should not exist.
        expect(edges.some((edge) => edge.source === "agent3" && edge.target === "agent2")).toBe(false)
        // agent4 -> agent4. We skip cycles, so this "self edge" should not exist.
        expect(edges.some((edge) => edge.source === "agent4" && edge.target === "agent4")).toBe(false)
    })

    it("Should handle direct and transitive dependencies in the graph", async () => {
        const {nodes, edges} = layoutRadial(new Map(), transitiveGraph, jest.fn(), jest.fn(), false)

        // Check nodes
        expect(nodes).toHaveLength(3)

        // Check edges
        // Should be 3 edges: agent1 -> agent2, agent1 -> agent3, agent2 -> agent3
        expect(edges).toHaveLength(3)

        // agent1 -> agent2
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent2")).toBe(true)

        // agent1 -> agent3
        expect(edges.some((edge) => edge.source === "agent1" && edge.target === "agent3")).toBe(true)

        // agent2 -> agent3
        expect(edges.some((edge) => edge.source === "agent2" && edge.target === "agent3")).toBe(true)
    })

    test.each([
        {layoutFunction: layoutRadial, name: "radial"},
        {layoutFunction: layoutLinear, name: "linear"},
    ])("Should handle a degenerate single-node graph in $name layout", async ({layoutFunction}) => {
        const {nodes, edges} = layoutFunction(new Map(), singleNodeNetwork, jest.fn(), jest.fn(), false)

        expect(nodes).toHaveLength(1)
        expect(edges).toHaveLength(0)

        expect(nodes[0]?.id).toBe("agent1")
    })

    test.each([
        {layoutFunction: layoutRadial, name: "radial"},
        {layoutFunction: layoutLinear, name: "linear"},
    ])("Should handle a disconnected graph in $name layout", async ({layoutFunction}) => {
        // We don't really support this case; "should never happen". This test is to make sure we at least
        // don't crash. This also exercises the (invalid) "multiple frontmen" case
        const {nodes, edges} = layoutFunction(new Map(), disconnectedGraph, jest.fn(), jest.fn(), false)

        expect(nodes.length).toBeGreaterThanOrEqual(0) // undefined behavior with bad input
        expect(edges.length).toBeGreaterThanOrEqual(0) // undefined behavior with bad input
    })
})
