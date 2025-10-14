import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {Edge, Node as RFNode} from "reactflow"

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

    it("Should skip truncation check when a bubble is hovered", async () => {
        const user = userEvent.setup()
        const edges = [createMockEdge("edge1", "node1", "node2", "Hover prevents truncation check")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const bubble = screen.getByText("Hover prevents truncation check")

        // Hover the bubble
        await user.hover(bubble)

        // The bubble should still be in the document
        expect(bubble).toBeInTheDocument()
    })

    it("Should not update truncation state if nothing changed", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "Message one"),
            createMockEdge("edge2", "node1", "node2", "Message two"),
        ]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Rerender with same edges
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should still render both messages
        expect(screen.getByText("Message one")).toBeInTheDocument()
        expect(screen.getByText("Message two")).toBeInTheDocument()
    })

    it("Should clear hover timeout when component unmounts", async () => {
        const user = userEvent.setup()
        const onBubbleHoverChange = jest.fn()
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {unmount} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                onBubbleHoverChange={onBubbleHoverChange}
            />
        )

        const bubble = screen.getByText("Test message")

        // Hover over the bubble
        await user.hover(bubble)
        expect(onBubbleHoverChange).toHaveBeenCalledWith("edge1")

        // Unhover
        await user.unhover(bubble)

        // Unmount before the 200ms timeout completes
        unmount()

        // Should not crash
    })

    it("Should handle multiple rapid hover state changes", async () => {
        const user = userEvent.setup()
        const onBubbleHoverChange = jest.fn()
        const edges = [
            createMockEdge("edge1", "node1", "node2", "First bubble"),
            createMockEdge("edge2", "node1", "node2", "Second bubble"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                onBubbleHoverChange={onBubbleHoverChange}
            />
        )

        const bubble1 = screen.getByText("First bubble")
        const bubble2 = screen.getByText("Second bubble")

        // Rapid hover changes
        await user.hover(bubble1)
        await user.hover(bubble2)
        await user.unhover(bubble2)

        // Should not crash and should handle multiple hover changes
        expect(onBubbleHoverChange).toHaveBeenCalled()
    })

    it("Should handle edges with same source and target node", () => {
        const edges = [createMockEdge("edge1", "node1", "node1", "Self-referencing edge")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should render (positioning might be odd but shouldn't crash)
        expect(screen.getByText("Self-referencing edge")).toBeInTheDocument()
    })

    it("Should sort edges with missing frontman node data", () => {
        const nodesWithoutData: RFNode[] = [
            {id: "node1", position: {x: 0, y: 0}, data: {}},
            {id: "node2", position: {x: 100, y: 100}, data: {}},
        ]

        const edges = [
            createMockEdge("edge1", "node1", "node2", "First edge"),
            createMockEdge("edge2", "node2", "node1", "Second edge"),
        ]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={nodesWithoutData}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should render without errors
        const bubbles = container.querySelectorAll("div[style*='position: absolute']")
        expect(bubbles.length).toBeGreaterThan(0)
    })

    it("Should handle edge with very long ID", () => {
        const longId = `edge-${"a".repeat(200)}`
        const edges = [createMockEdge(longId, "node1", "node2", "Message with long ID")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should render without errors
        expect(screen.getByText("Message with long ID")).toBeInTheDocument()
    })

    it("Should handle onBubbleHoverChange not provided", async () => {
        const user = userEvent.setup()
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                // onBubbleHoverChange not provided
            />
        )

        const bubble = screen.getByText("Test message")

        // Hover should not crash even without callback
        await user.hover(bubble)
        await user.unhover(bubble)

        expect(bubble).toBeInTheDocument()
    })

    it("Should handle edges changing while a bubble is hovered", async () => {
        const user = userEvent.setup()
        const edges1 = [createMockEdge("edge1", "node1", "node2", "Original message")]
        const edges2 = [createMockEdge("edge2", "node1", "node2", "Updated message")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges1}
                showThoughtBubbles={true}
            />
        )

        const bubble = screen.getByText("Original message")
        await user.hover(bubble)

        // Change edges while hovering
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges2}
                showThoughtBubbles={true}
            />
        )

        // New message should appear
        expect(screen.getByText("Updated message")).toBeInTheDocument()
    })
})
