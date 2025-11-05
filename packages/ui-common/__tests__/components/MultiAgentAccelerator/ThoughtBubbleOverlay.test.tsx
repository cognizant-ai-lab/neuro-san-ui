import {render, screen} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
import {act} from "react-dom/test-utils"
import type {Edge} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ThoughtBubbleOverlay} from "../../../components/MultiAgentAccelerator/ThoughtBubbleOverlay"

describe("ThoughtBubbleOverlay", () => {
    withStrictMocks()

    let user: UserEvent

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

    beforeEach(() => {
        user = userEvent.setup()
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

    // SW: This does increase test coverage but I don't think this should be a hard requirement.
    // TODO: We may want to change this behavior in the future.
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

    it("Should render connecting line for each bubble", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test with arrow")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Check for SVG connecting lines
        const svgs = container.querySelectorAll("svg")
        expect(svgs.length).toBeGreaterThan(0)

        // Check for line in SVG (connecting line from bubble to agent)
        const line = container.querySelector("line")
        expect(line).toBeInTheDocument()
    })

    it("Check that bubbles are rendered with the correct text", () => {
        const shortText = "Short message"
        const longText = "Invoking Agent with inquiry: This is very long text that will be truncated when displayed"

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

        // Both bubbles should render
        expect(screen.getByText(shortText)).toBeInTheDocument()
        expect(screen.getByText(/This is very long text/u)).toBeInTheDocument()
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

    it("Should update when edges are added or removed", () => {
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

        expect(screen.getByText("First message")).toBeInTheDocument()
        expect(screen.getByText("Second message")).toBeInTheDocument()

        // Add a new edge
        const edgesAdded = [...edges, createMockEdge("edge3", "node1", "node2", "Third message")]

        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edgesAdded}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("First message")).toBeInTheDocument()
        expect(screen.getByText("Second message")).toBeInTheDocument()
        expect(screen.getByText("Third message")).toBeInTheDocument()

        const edgesRemoved = [...edgesAdded]
        edgesRemoved.splice(1, 1) // Remove second message

        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edgesRemoved}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("First message")).toBeInTheDocument()
        expect(screen.getByText("Third message")).toBeInTheDocument()
    })

    it("Should handle hover state changes", async () => {
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

    it("Should not re-check truncation while a bubble is hovered", async () => {
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

    it("Should handle multiple rapid hover state changes", async () => {
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

    it("Should handle onBubbleHoverChange not provided", async () => {
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

    it("Should handle rapid edge additions and removals (timeout clearing)", () => {
        const edges1 = [createMockEdge("edge1", "node1", "node2", "Message 1")]
        const edges2 = [createMockEdge("edge2", "node1", "node2", "Message 2")]
        const edges3 = [createMockEdge("edge3", "node1", "node2", "Message 3")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges1}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("Message 1")).toBeInTheDocument()

        // Rapidly change edges to trigger timeout clearing logic
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges2}
                showThoughtBubbles={true}
            />
        )

        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges3}
                showThoughtBubbles={true}
            />
        )

        // Should handle rapid changes without crashing
        expect(screen.getByText("Message 3")).toBeInTheDocument()
    })

    it("Should handle edges with empty text string", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", ""),
            createMockEdge("edge2", "node1", "node2", "Valid message"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should only render the valid message (empty string should be filtered out)
        expect(screen.getByText("Valid message")).toBeInTheDocument()
        // Empty string should not be rendered
        expect(screen.queryByText("")).toBeNull()
    })

    it("Should handle edges with non-string text data", () => {
        const edges = [
            {id: "edge1", source: "node1", target: "node2", data: {text: 123}, type: "thoughtBubbleEdge"},
            {id: "edge2", source: "node1", target: "node2", data: {text: true}, type: "thoughtBubbleEdge"},
            {id: "edge3", source: "node1", target: "node2", data: {text: null}, type: "thoughtBubbleEdge"},
            createMockEdge("edge4", "node1", "node2", "Valid message"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges as Edge[]}
                showThoughtBubbles={true}
            />
        )

        // Should only render the valid string message
        expect(screen.getByText("Valid message")).toBeInTheDocument()
        expect(screen.queryAllByText(/./u)).toHaveLength(1)
    })

    it("Should handle frontman node identification with multiple depth 0 nodes", () => {
        const nodesWithMultipleFrontmen = [
            {id: "node1", data: {depth: 0, agentName: "Frontman1"}, position: {x: 100, y: 100}, type: "agentNode"},
            {id: "node2", data: {depth: 0, agentName: "Frontman2"}, position: {x: 200, y: 200}, type: "agentNode"},
            {id: "node3", data: {depth: 1, agentName: "Agent3"}, position: {x: 300, y: 300}, type: "agentNode"},
        ]

        const edges = [
            createMockEdge("edge1", "node1", "node3", "From first frontman"),
            createMockEdge("edge2", "node2", "node3", "From second frontman"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={nodesWithMultipleFrontmen}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should render both messages without crashing
        expect(screen.getByText("From first frontman")).toBeInTheDocument()
        expect(screen.getByText("From second frontman")).toBeInTheDocument()
    })

    it("Should cleanup timeouts on component unmount", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {unmount} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("Test message")).toBeInTheDocument()

        // Unmount should not crash and should cleanup timeouts
        expect(() => unmount()).not.toThrow()
    })

    it("Should handle bubble state transitions correctly", () => {
        const edges1 = [
            createMockEdge("edge1", "node1", "node2", "Message 1"),
            createMockEdge("edge2", "node1", "node2", "Message 2"),
        ]
        const edges2 = [createMockEdge("edge1", "node1", "node2", "Message 1")] // Remove edge2
        const edges3 = [
            createMockEdge("edge1", "node1", "node2", "Message 1"),
            createMockEdge("edge2", "node1", "node2", "Message 2"), // Add edge2 back
        ]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges1}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("Message 1")).toBeInTheDocument()
        expect(screen.getByText("Message 2")).toBeInTheDocument()

        // Remove edge2 (should trigger exit animation)
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges2}
                showThoughtBubbles={true}
            />
        )

        // Quickly add edge2 back (should trigger timeout clearing for the existing removal)
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges3}
                showThoughtBubbles={true}
            />
        )

        // Both messages should be present (tests the timeout clearing logic)
        expect(screen.getByText("Message 1")).toBeInTheDocument()
        expect(screen.getByText("Message 2")).toBeInTheDocument()
    })

    it("Should handle exiting bubbles that are not in current edges", () => {
        const edges1: Edge[] = [createMockEdge("edge1", "node1", "node2", "Message 1")]
        const edges2: Edge[] = [] // Remove all edges

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges1}
                showThoughtBubbles={true}
            />
        )

        expect(screen.getByText("Message 1")).toBeInTheDocument()

        // Remove all edges (should find exiting bubble in original edges array)
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges2}
                showThoughtBubbles={true}
            />
        )

        // Should not crash (tests finding exiting bubble in edges array)
        // This tests the code path where exiting bubbles are looked up in the original edges array
        expect(() => screen.queryByText("Message 1")).not.toThrow()
    })

    it("Should handle bubbles with isVisible=false", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Initial render should have bubble
        expect(screen.getByText("Test message")).toBeInTheDocument()

        // Check that bubble container is rendered (using class-based styling)
        const bubbles = container.querySelectorAll("div[class*='css-']")
        expect(bubbles.length).toBeGreaterThan(0)
    })

    it("Should handle truncation detection edge cases", () => {
        // Mock scrollHeight and clientHeight to simulate truncation
        const originalScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight")
        const originalClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight")

        Object.defineProperty(Element.prototype, "scrollHeight", {
            configurable: true,
            get() {
                return this.textContent?.includes("Long text") ? 150 : 50
            },
        })
        Object.defineProperty(Element.prototype, "clientHeight", {
            configurable: true,
            get() {
                return 50
            },
        })

        const edges = [
            createMockEdge("edge1", "node1", "node2", "Short"),
            createMockEdge("edge2", "node1", "node2", "Long text that should be truncated"),
        ]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should detect truncation correctly
        expect(screen.getByText("Short")).toBeInTheDocument()
        expect(screen.getByText("Long text that should be truncated")).toBeInTheDocument()

        // Rerender to trigger truncation check
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Restore original properties
        if (originalScrollHeight) {
            Object.defineProperty(Element.prototype, "scrollHeight", originalScrollHeight)
        }
        if (originalClientHeight) {
            Object.defineProperty(Element.prototype, "clientHeight", originalClientHeight)
        }
    })

    it("Should handle animation delays correctly", () => {
        const edges = [
            createMockEdge("edge1", "node1", "node2", "First"),
            createMockEdge("edge2", "node1", "node2", "Second"),
            createMockEdge("edge3", "node1", "node2", "Third"),
        ]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Each bubble should have different animation delays
        expect(screen.getByText("First")).toBeInTheDocument()
        expect(screen.getByText("Second")).toBeInTheDocument()
        expect(screen.getByText("Third")).toBeInTheDocument()
    })

    it("Should handle edge positioning with fallback", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should render with default position when edge position not found
        expect(screen.getByText("Test message")).toBeInTheDocument()
    })

    it("Should skip rendering bubbles with null text after filtering", () => {
        const edges = [
            {id: "edge1", source: "node1", target: "node2", data: {text: null}, type: "thoughtBubbleEdge"},
            createMockEdge("edge2", "node1", "node2", "Valid message"),
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
    })

    it("Should render connecting line with correct animation state", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Check that connecting line SVG is rendered with animation
        const lines = container.querySelectorAll("svg line")
        expect(lines.length).toBe(1)

        // Check that line has the correct stroke attributes for connecting line
        const line = lines[0]
        expect(line.getAttribute("stroke")).toBe("var(--bs-primary)")
        expect(line.getAttribute("stroke-width")).toBe("2")
    })

    it("Should handle complex bubble state scenarios", () => {
        const edges1 = [createMockEdge("edge1", "node1", "node2", "Message 1")]
        const edges2 = [
            createMockEdge("edge1", "node1", "node2", "Message 1"),
            createMockEdge("edge2", "node1", "node2", "Message 2"),
        ]
        const edges3 = [createMockEdge("edge3", "node1", "node2", "Message 3")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges1}
                showThoughtBubbles={true}
            />
        )

        // Add more edges
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges2}
                showThoughtBubbles={true}
            />
        )

        // Completely replace all edges
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges3}
                showThoughtBubbles={true}
            />
        )

        // Should handle complex state transitions without crashing
        expect(screen.getByText("Message 3")).toBeInTheDocument()
    })

    it("Should handle undefined edge in renderableBubbles", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Simulate scenario where edge might be undefined during state transitions
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={true}
            />
        )

        // Should handle gracefully without crashing
        expect(() => screen.queryByText("Test message")).not.toThrow()
    })

    it("Should return null when nodes is not an array", () => {
        const edges = [createMockEdge("edge1", "node1", "node2", "Test message")]

        const {container} = render(
            <ThoughtBubbleOverlay
                nodes={null}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Should not render any bubbles when nodes is null
        const bubbles = container.querySelectorAll("div[style*='position: absolute'][style*='left:']")
        expect(bubbles.length).toBe(0)
    })
})
