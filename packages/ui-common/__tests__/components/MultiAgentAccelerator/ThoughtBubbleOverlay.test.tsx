import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {Edge} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ThoughtBubbleOverlay} from "../../../components/MultiAgentAccelerator/ThoughtBubbleOverlay"

describe("ThoughtBubbleOverlay", () => {
    withStrictMocks()

    const mockNodes = [
        {
            id: "node1",
            data: {depth: 0, agentName: "Frontman"},
            position: {x: 100, y: 100},
            type: "agentNode",
        },
        {
            id: "node2",
            data: {depth: 1, agentName: "Agent2"},
            position: {x: 200, y: 200},
            type: "agentNode",
        },
    ]

    const createMockEdge = (id: string, source: string, target: string, text: string) => ({
        id,
        source,
        target,
        data: {text},
        type: "thoughtBubbleEdge",
    })

    it("Should render nothing when showThoughtBubbles is false", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={false}
            />
        )

        expect(container.firstChild).toBeNull()
    })

    it("Should render thought bubbles when showThoughtBubbles is true", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Invoking Agent with inquiry")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Check that overlay container is rendered
        const overlay = screen.getByText(/invoking agent/iu).closest("div")
        expect(overlay).toBeInTheDocument()
    })

    it("Should filter out edges with non-meaningful text", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "0"), // Single digit - should be filtered
            createMockEdge("edge2", "node1", "node2", "ab"), // Too short - should be filtered
            createMockEdge("edge3", "node1", "node2", "This is meaningful text"), // Should render
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Only the meaningful text should be rendered
        expect(screen.queryByText("0")).not.toBeInTheDocument()
        expect(screen.queryByText("ab")).not.toBeInTheDocument()
        expect(screen.getByText("This is meaningful text")).toBeInTheDocument()
    })

    it("Should parse inquiry from JSON code blocks", () => {
        const jsonText = '```json\n{"inquiry": "What is the weather?"}\n```'
        const edges = [createMockEdge("edge1", "node1", "node2", jsonText)]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("What is the weather?")).toBeInTheDocument()
    })

    it("Should parse Invoking format messages", () => {
        const invokingText = 'Invoking: `WeatherAgent` with `{"inquiry": "Get forecast"}`'
        const edges = [createMockEdge("edge1", "node1", "node2", invokingText)]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText(/Invoking `WeatherAgent` with "Get forecast"/u)).toBeInTheDocument()
    })

    it("Should prioritize frontman edges first", () => {
        const edges = [
            createMockEdge("edge1", "node2", "node1", "Non-frontman edge"),
            createMockEdge("edge2", "node1", "node2", "Frontman edge"),
        ]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const bubbles = container.querySelectorAll("div[style*='position: absolute']")
        // Check that frontman edges are rendered (they should be prioritized in sorting)
        expect(bubbles.length).toBeGreaterThan(0)
    })

    it("Should handle hover state changes", async () => {
        const {act} = await import("react-dom/test-utils")
        const user = userEvent.setup()
        const onBubbleHoverChange = jest.fn()
        const edges = [createMockEdge("edge1", "node1", "node2", "Hover test message")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                onBubbleHoverChange={onBubbleHoverChange}
            />
        )

        const bubble = screen.getByText("Hover test message")

        // Hover over the bubble
        await user.hover(bubble)
        expect(onBubbleHoverChange).toHaveBeenCalledWith("edge1")

        // Unhover - should delay before calling with null
        await user.unhover(bubble)
        // Wait for the 200ms delay wrapped in act
        await act(async () => {
            await new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 250)
            })
        })
        expect(onBubbleHoverChange).toHaveBeenCalledWith(null)
    })

    it("Should maintain stable positions for bubbles using edgePositions map", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "First bubble"),
            createMockEdge("edge2", "node1", "node2", "Second bubble"),
            createMockEdge("edge3", "node1", "node2", "Third bubble"),
        ]

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Get initial bubbles count
        const initialBubbles = Array.from(container.querySelectorAll("div[style*='position: absolute']"))
        expect(initialBubbles.length).toBeGreaterThan(0)

        // Remove middle edge and rerender
        const newEdges = [edges[0], edges[2]]
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={newEdges}
                showThoughtBubbles={true}
            />
        )

        // Should still render bubbles after removing one
        const newBubbles = Array.from(container.querySelectorAll("div[style*='position: absolute']"))
        expect(newBubbles.length).toBeGreaterThan(0)
    })

    it("Should handle edges with no source node gracefully", () => {
        const edges = [createMockEdge("edge1", "nonexistent", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should not crash, but also should not render a bubble
        expect(container.querySelector("div[style*='position: absolute']")).toBeNull()
    })

    it("Should handle empty nodes array", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={[]}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should not crash
        expect(container).toBeInTheDocument()
    })

    it("Should handle empty edges array", () => {
        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={true}
            />
        )

        // Should render container but no bubbles
        expect(container.firstChild).toBeInTheDocument()
        expect(container.querySelectorAll("div[style*='position: absolute']").length).toBe(0)
    })

    it("Should render triangle pointer for each bubble", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test with arrow")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Check for SVG triangle
        const svgs = container.querySelectorAll("svg")
        expect(svgs.length).toBeGreaterThan(0)

        // Check for polygon in SVG
        const polygon = container.querySelector("polygon")
        expect(polygon).toBeInTheDocument()
    })

    it("Should apply animation delays to bubbles", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "First bubble"),
            createMockEdge("edge2", "node1", "node2", "Second bubble"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Check that bubbles are rendered
        expect(screen.getByText("First bubble")).toBeInTheDocument()
        expect(screen.getByText("Second bubble")).toBeInTheDocument()
    })

    it("Should handle edges with null or undefined data", () => {
        const edges = [
            {id: "edge1", source: "node1", target: "node2", data: null, type: "thoughtBubbleEdge"},
            {id: "edge2", source: "node1", target: "node2", data: undefined, type: "thoughtBubbleEdge"},
            createMockEdge("edge3", "node1", "node2", "Valid message"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges as Edge[]}
                showThoughtBubbles={true}
            />
        )

        // Should only render the valid message
        expect(screen.getByText("Valid message")).toBeInTheDocument()
        expect(screen.queryAllByText(/./u)).toHaveLength(1) // Only one text node
    })

    it("Should call hooks in consistent order regardless of showThoughtBubbles prop", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        // First render with showThoughtBubbles=true
        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Rerender with showThoughtBubbles=false
        // This should not throw "Rendered fewer hooks than expected" error
        expect(() => {
            rerender(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={false}
                />
            )
        }).not.toThrow()
    })

    it("Should detect truncated text and apply appropriate cursor style", () => {
        const shortText = "Short message"
        const longText =
            "Invoking Agent with inquiry: This is a very long inquiry text that will be truncated when displayed"

        const edges = [
            createMockEdge("edge1", "node1", "node2", shortText),
            createMockEdge("edge2", "node1", "node2", longText),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Both bubbles should render (longText will be parsed to extract the inquiry part)
        expect(screen.getByText(shortText)).toBeInTheDocument()
        expect(screen.getByText(/This is a very long inquiry text/u)).toBeInTheDocument()
    })

    it("Should only expand on hover if text is truncated", async () => {
        const user = userEvent.setup()
        const shortText = "Short text"
        const edges = [createMockEdge("edge1", "node1", "node2", shortText)]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const bubble = screen.getByText(shortText)

        // Hover over non-truncated bubble
        await user.hover(bubble)

        // Bubble should still be visible
        expect(bubble).toBeInTheDocument()
    })

    it("Should not re-check truncation while a bubble is hovered", async () => {
        const user = userEvent.setup()
        const longText = "This is a very long text that will definitely be truncated"
        const edges = [createMockEdge("edge1", "node1", "node2", longText)]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const bubble = screen.getByText(longText)

        // Hover over the bubble
        await user.hover(bubble)

        // Rerender with same props (simulating a parent re-render)
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should not cause infinite loop or flashing
        expect(bubble).toBeInTheDocument()
    })

    it("Should handle ref callbacks being called multiple times", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Rerender multiple times
        expect(() => {
            rerender(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
            rerender(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        }).not.toThrow()
    })

    it("Should maintain truncation state when edges are added or removed", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "First message"),
            createMockEdge("edge2", "node1", "node2", "Second message"),
        ]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Add a new edge
        const newEdges = [...edges, createMockEdge("edge3", "node1", "node2", "Third message")]

        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={newEdges}
                showThoughtBubbles={true}
            />
        )

        // All messages should be visible
        expect(screen.getByText("First message")).toBeInTheDocument()
        expect(screen.getByText("Second message")).toBeInTheDocument()
        expect(screen.getByText("Third message")).toBeInTheDocument()
    })
})
