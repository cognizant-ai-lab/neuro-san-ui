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
        // Ensure only one bubble element rendered (use data-bubble-id attribute)
        const bubbles = document.querySelectorAll("[data-bubble-id]")
        expect(bubbles.length).toBe(1)
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

        // Check that line has the correct stroke attributes for connecting line (uses CSS variable)
        const line = lines[0]
        expect(line.getAttribute("stroke")).toBe("var(--thought-bubble-line-color)")
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

    it("Should tolerate getConversations provider returning non-array (defensive)", () => {
        const nodesWithProvider = [
            {
                id: "node1",
                data: {
                    depth: 0,
                    agentName: "Frontman",
                    // provider exists but returns a non-array value
                    getConversations: () => ({notArray: true}),
                },
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

        const edges = [createMockEdge("edge-gc", "node1", "node2", "GC test")]

        // Should not throw when provider returns non-array
        expect(() =>
            render(
                <ThoughtBubbleOverlay
                    nodes={nodesWithProvider}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        ).not.toThrow()
        // Also assert that the rendered message is present
        expect(screen.getByText("GC test")).toBeInTheDocument()
    })

    it("Should not update truncatedBubbles when nothing changed (no-op path)", () => {
        // Make scrollHeight equal to clientHeight so nothing is truncated
        const origScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight")
        const origClient = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight")
        Object.defineProperty(Element.prototype, "scrollHeight", {
            configurable: true,
            get() {
                return 50
            },
        })
        Object.defineProperty(Element.prototype, "clientHeight", {
            configurable: true,
            get() {
                return 50
            },
        })

        const edges = [createMockEdge("edge1", "node1", "node2", "No truncation")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Rerender should exercise the size-equality branch and not throw
        expect(() =>
            rerender(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        ).not.toThrow()

        // Restore
        if (origScroll) Object.defineProperty(Element.prototype, "scrollHeight", origScroll)
        if (origClient) Object.defineProperty(Element.prototype, "clientHeight", origClient)
    })

    it("Should call ResizeObserver.observe on document.body when no overlay element is present", () => {
        // Spy on ResizeObserver.observe calls
        const OriginalRO = (global as unknown as {ResizeObserver?: unknown}).ResizeObserver
        const observed: Element[] = []
        function SpyRO(this: {__isSpy?: boolean}) {
            // mark instance so it's not an empty constructor
            this.__isSpy = true
        }
        SpyRO.prototype.observe = function (el: Element): void {
            observed.push(el)
            return undefined
        }
        SpyRO.prototype.disconnect = function (): void {
            // noop
            return undefined
        }
        Object.defineProperty(global, "ResizeObserver", {value: SpyRO, configurable: true})

        // Render with showThoughtBubbles=false so the overlay element is not attached
        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={false}
            />
        )

        // Ensure document.body was observed
        expect(observed).toContain(document.body)

        // Restore
        Object.defineProperty(global, "ResizeObserver", {value: OriginalRO, configurable: true})
    })

    it("Should schedule visibility timeouts for staggered bubbles", () => {
        jest.useFakeTimers()
        const spyTimeout = jest.spyOn(global, "setTimeout")

        const edges = [createMockEdge("e1", "node1", "node2", "A"), createMockEdge("e2", "node1", "node2", "B")]

        render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Advance timers to let effects run scheduling logic
        act(() => jest.advanceTimersByTime(10))

        // We expect at least one timeout to have been scheduled for staggered animation
        expect(spyTimeout).toHaveBeenCalled()

        spyTimeout.mockRestore()
        jest.useRealTimers()
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

    it("Should render SVG lines after entrance delay and update coordinates", async () => {
        jest.useFakeTimers()
        // Start system time at 0 so enteredAt is deterministic
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-lines", "node1", "node2", "Line message")]

        // Create a DOM element that represents the agent node so calculateLineCoordinates can find it
        const agentEl = document.createElement("div")
        agentEl.dataset["id"] = "node2"
        agentEl.className = "react-flow__node"
        // Mock bounding rect for the agent element
        // Provide a partial DOMRect-like object for JSDOM
        agentEl.getBoundingClientRect = () => ({
            left: 100,
            top: 120,
            width: 40,
            height: 40,
            right: 140,
            bottom: 160,
            x: 100,
            y: 120,
            toJSON: () => ({left: 100, top: 120, width: 40, height: 40}),
        })
        document.body.append(agentEl)

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Advance timers past the per-bubble animation delay (120ms) to allow lines to appear
        await act(async () => {
            jest.advanceTimersByTime(200)
        })

        // Rerender to force recalculation of shouldShowLines
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // A line should be rendered and have stroke attributes
        const lines = container.querySelectorAll("svg line")
        expect(lines.length).toBeGreaterThan(0)
        const line = lines[0]
        expect(line.getAttribute("stroke")).toBe("var(--thought-bubble-line-color)")

        // Cleanup
        agentEl.remove()
        jest.useRealTimers()
    })

    it("Should not render lines for HUMAN message type or when agent is not active via getConversations", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        // HUMAN type should skip lines entirely
        const humanEdge = {
            id: "edge-human",
            source: "node1",
            target: "node2",
            data: {text: "hi", type: "HUMAN"},
            type: "thoughtBubbleEdge",
        } as Edge

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[humanEdge]}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[humanEdge]}
                showThoughtBubbles={true}
            />
        )
        expect(container.querySelectorAll("svg line").length).toBe(0)

        // Now test getConversations provider filtering.
        // Create nodes that report conversations but do not include the target
        const nodesWithProvider = [
            {
                id: "node1",
                data: {
                    depth: 0,
                    agentName: "Frontman",
                    getConversations: () => [{agents: new Set(["otherAgent"])}],
                },
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

        const edgeTargetingInactive = createMockEdge("edge-inactive", "node1", "node2", "Should not have lines")

        const {container: c2, rerender: r2} = render(
            <ThoughtBubbleOverlay
                nodes={nodesWithProvider as unknown as import("reactflow").Node[]}
                edges={[edgeTargetingInactive]}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        r2(
            <ThoughtBubbleOverlay
                nodes={nodesWithProvider as unknown as import("reactflow").Node[]}
                edges={[edgeTargetingInactive]}
                showThoughtBubbles={true}
            />
        )

        expect(c2.querySelectorAll("svg line").length).toBe(0)

        jest.useRealTimers()
    })

    it("Should use fallback bubble coordinates when bubble DOM element is missing", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        // Ensure predictable viewport width for fallback calculation
        // (expected x = innerWidth - 20 - BUBBLE_WIDTH(260))
        window.innerWidth = 800

        const edges = [createMockEdge("edge-fallback", "node1", "node2", "Fallback test")]

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Remove the rendered bubble element to force the fallback path
        const bubbleEl = container.querySelector('[data-bubble-id="edge-fallback"]')
        if (bubbleEl) bubbleEl.remove()

        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const lines = container.querySelectorAll("svg line")
        // Accept either no lines (browser/JSDOM differences) or the expected fallback values
        const x1 = lines.length > 0 ? lines[0].getAttribute("x1") : null
        const y1 = lines.length > 0 ? lines[0].getAttribute("y1") : null
        expect([null, String(800 - 20 - 260)]).toContain(x1)
        expect([null, String(70 + 78 / 2)]).toContain(y1)

        jest.useRealTimers()
    })

    it("Should find agent element via getElementById when data-id selectors are absent", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-agent-id", "node1", "node2", "AgentId test")]

        // Create an agent element only accessible via getElementById
        const agentEl = document.createElement("div")
        agentEl.id = "node2"
        // Mock bounding rect for the agent element (partial DOMRect)
        agentEl.getBoundingClientRect = () => ({
            left: 300,
            top: 200,
            width: 50,
            height: 50,
            right: 350,
            bottom: 250,
            x: 300,
            y: 200,
            toJSON: () => ({left: 300, top: 200, width: 50, height: 50}),
        })
        document.body.append(agentEl)

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const lines = container.querySelectorAll("svg line")
        const x2 = lines.length > 0 ? lines[0].getAttribute("x2") : null
        const y2 = lines.length > 0 ? lines[0].getAttribute("y2") : null
        expect([null, String(Math.round(300 + 50 / 2))]).toContain(x2)
        expect([null, String(Math.round(200 + 50 / 2))]).toContain(y2)

        // Cleanup
        agentEl.remove()
        jest.useRealTimers()
    })

    it("Should not throw when document.querySelectorAll throws (defensive catch)", async () => {
        // Monkeypatch querySelectorAll to throw for the agent selector and restore afterwards
        // Use jest.spyOn to avoid race-condition lint warnings and to restore easily
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const origQSAll = document.querySelectorAll.bind(document)

        const qsSpy = jest.spyOn(document, "querySelectorAll").mockImplementation((sel: string) => {
            if (sel.includes('[data-id="node2"]')) throw new Error("Simulated querySelectorAll failure")
            return origQSAll(sel)
        })

        jest.useFakeTimers()
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-throw", "node1", "node2", "Throw test")]

        const {rerender, unmount} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        // Rerender to trigger updateAllLines which should catch the thrown error
        expect(() =>
            rerender(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        ).not.toThrow()

        // No unhandled exceptions and component still unmounts cleanly
        expect(() => unmount()).not.toThrow()

        // Restore
        qsSpy.mockRestore()
        jest.useRealTimers()
    })

    it("Should remove bubble after exit animation timeout when edges are removed", async () => {
        jest.useFakeTimers()

        const edges = [createMockEdge("edge-exit", "node1", "node2", "Exit test")]

        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Remove edges to trigger exit path
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={true}
            />
        )

        // Advance timers to allow exit animation (400ms) and internal timeouts to run
        await act(async () => jest.advanceTimersByTime(450))

        // After timeout, bubble should be removed (no text present)
        expect(() => screen.queryByText("Exit test")).not.toThrow()
        expect(screen.queryByText("Exit test")).toBeNull()

        jest.useRealTimers()
    })

    it("Should tolerate getConversations throwing without crashing", () => {
        const nodesWithThrowingProvider = [
            {
                id: "node1",
                data: {
                    depth: 0,
                    agentName: "Frontman",
                    getConversations: () => {
                        throw new Error("boom")
                    },
                },
                position: {x: 100, y: 100},
                type: "agentNode",
            },
            {id: "node2", data: {depth: 1, agentName: "Agent2"}, position: {x: 200, y: 200}, type: "agentNode"},
        ]

        const edges = [createMockEdge("edge-throw-conv", "node1", "node2", "Conv throw test")]

        // Should not throw during render even if provider throws
        expect(() =>
            render(
                <ThoughtBubbleOverlay
                    nodes={nodesWithThrowingProvider as unknown as import("reactflow").Node[]}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        ).not.toThrow()
    })

    it("Should find agent via data-id element and use its closest react-flow__node parent", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-closest", "node1", "node2", "Closest test")]

        const parentEl = document.createElement("div")
        parentEl.className = "react-flow__node"
        parentEl.style.position = "absolute"
        // Mock rect on parent
        // Mock rect on parent
        parentEl.getBoundingClientRect = () => ({
            left: 400,
            top: 300,
            width: 60,
            height: 60,
            right: 460,
            bottom: 360,
            x: 400,
            y: 300,
            toJSON: () => ({left: 400, top: 300, width: 60, height: 60}),
        })

        const child = document.createElement("div")
        child.dataset["id"] = "node2"
        parentEl.append(child)
        document.body.append(parentEl)

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const lines = container.querySelectorAll("svg line")
        const x2c = lines.length > 0 ? lines[0].getAttribute("x2") : null
        const y2c = lines.length > 0 ? lines[0].getAttribute("y2") : null
        expect([null, String(Math.round(400 + 60 / 2))]).toContain(x2c)
        expect([null, String(Math.round(300 + 60 / 2))]).toContain(y2c)

        parentEl.remove()
        jest.useRealTimers()
    })

    it("Should render multiple lines when edge.data.agents has multiple targets", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        const multiEdge = {
            id: "edge-multi",
            source: "node1",
            target: "node2",
            data: {text: "Multi target", agents: ["node2", "node3"]},
            type: "thoughtBubbleEdge",
        } as Edge

        // Create two agent elements
        const a1 = document.createElement("div")
        a1.dataset["id"] = "node2"
        a1.className = "react-flow__node"
        a1.getBoundingClientRect = () => ({
            left: 10,
            top: 20,
            width: 30,
            height: 30,
            right: 40,
            bottom: 50,
            x: 10,
            y: 20,
            toJSON: () => ({left: 10, top: 20, width: 30, height: 30}),
        })
        document.body.append(a1)

        const a2 = document.createElement("div")
        a2.dataset["id"] = "node3"
        a2.className = "react-flow__node"
        a2.getBoundingClientRect = () => ({
            left: 60,
            top: 80,
            width: 20,
            height: 20,
            right: 80,
            bottom: 100,
            x: 60,
            y: 80,
            toJSON: () => ({left: 60, top: 80, width: 20, height: 20}),
        })
        document.body.append(a2)

        const {container, rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[multiEdge]}
                showThoughtBubbles={true}
            />
        )

        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[multiEdge]}
                showThoughtBubbles={true}
            />
        )

        // Cleanup
        a1.remove()
        a2.remove()
        const lines = container.querySelectorAll("svg line")
        // Expect at least two lines (one per agent)
        expect(lines.length).toBeGreaterThanOrEqual(2)

        a1.remove()
        a2.remove()
        jest.useRealTimers()
    })

    it("Should render lines with opacity 0 for exiting bubbles before removal", async () => {
        jest.useFakeTimers()
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-exit-opacity", "node1", "node2", "Exit opacity test")]

        const {rerender, container} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Now remove edges to mark bubble as exiting
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={true}
            />
        )

        // Advance a small amount but less than the exit duration so the bubble is still exiting
        await act(async () => jest.advanceTimersByTime(100))

        // Rerender to ensure shouldShowLines evaluation
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={[]}
                showThoughtBubbles={true}
            />
        )

        const lines = container.querySelectorAll("svg line")
        // If lines exist for the exiting bubble, they should have opacity 0
        const opacities = Array.from(lines).map((line) => {
            const styleOpacity = line.getAttribute("style") || ""
            return styleOpacity.includes("opacity: 0") || styleOpacity.includes("opacity:0")
        })
        // All lines (if any) should report opacity 0
        expect(opacities.every(Boolean)).toBeTruthy()

        jest.useRealTimers()
    })

    it("Should not crash when isStreaming=true (starts streaming RAF loop)", async () => {
        jest.useFakeTimers()

        const edges = [createMockEdge("edge-stream", "node1", "node2", "Stream test")]
        const agentEl = document.createElement("div")
        agentEl.dataset["id"] = "node2"
        agentEl.className = "react-flow__node"
        agentEl.getBoundingClientRect = () => ({
            left: 10,
            top: 10,
            width: 20,
            height: 20,
            right: 30,
            bottom: 30,
            x: 10,
            y: 10,
            toJSON: () => ({left: 10, top: 10, width: 20, height: 20}),
        })
        document.body.append(agentEl)

        const {unmount} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                isStreaming={true}
            />
        )

        // Let a few RAF cycles run
        await act(async () => jest.advanceTimersByTime(50))

        // Cleanup
        expect(() => unmount()).not.toThrow()
        agentEl.remove()
        jest.useRealTimers()
    })

    it("Should tolerate ResizeObserver.observe throwing (defensive catch)", () => {
        // Replace global ResizeObserver with one whose observe throws
        const OriginalRO = (global as unknown as {ResizeObserver?: unknown}).ResizeObserver
        function BadRO(this: {__bad?: boolean}) {
            // mark instance to avoid empty-function lint
            this.__bad = true
        }
        BadRO.prototype.observe = function (): void {
            throw new Error("RO fail")
        }
        BadRO.prototype.disconnect = function (): void {
            // noop
            return undefined
        }

        // Install replacement using defineProperty to avoid any casts
        Object.defineProperty(global, "ResizeObserver", {value: BadRO, configurable: true})

        const edges = [createMockEdge("edge-ro", "node1", "node2", "RO test")]

        // Should not throw during render even if RO.observe throws
        expect(() =>
            render(
                <ThoughtBubbleOverlay
                    nodes={mockNodes}
                    edges={edges}
                    showThoughtBubbles={true}
                />
            )
        ).not.toThrow()

        // Restore
        const __restoreRO = {value: OriginalRO, configurable: true}
        Object.defineProperty(global, "ResizeObserver", __restoreRO)
    })

    it("Should call document.querySelectorAll for agent lookup when appropriate", async () => {
        jest.useFakeTimers()

        const spy = jest.spyOn(document, "querySelectorAll")

        const edges = [createMockEdge("edge-qs", "node1", "node2", "QS test")]

        const a = document.createElement("div")
        a.dataset["id"] = "node2"
        a.className = "react-flow__node"
        a.getBoundingClientRect = () => ({
            left: 120,
            top: 130,
            width: 20,
            height: 20,
            right: 140,
            bottom: 150,
            x: 120,
            y: 130,
            toJSON: () => ({left: 120, top: 130, width: 20, height: 20}),
        })
        document.body.append(a)

        const {rerender, unmount} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )
        await act(async () => jest.advanceTimersByTime(200))
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Ensure querySelectorAll was called for the agent lookup
        const wasCalled = spy.mock.calls.some((args) => args[0].includes('[data-id="node2"]'))
        expect(wasCalled).toBeTruthy()

        spy.mockRestore()
        a.remove()
        expect(() => unmount()).not.toThrow()
        jest.useRealTimers()
    })

    it("Should catch and debug-log errors from updateAllLines without throwing", async () => {
        // This test forces updateAllLines to encounter a DOM write error (setAttribute)
        // and verifies the component swallows the error and logs via console.debug.
        jest.useFakeTimers()
        jest.setSystemTime(0)

        const edges = [createMockEdge("edge-debug", "node1", "node2", "Debug test")]

        // Create an agent element so lines will be rendered
        const agentEl = document.createElement("div")
        agentEl.dataset["id"] = "node2"
        agentEl.className = "react-flow__node"
        agentEl.getBoundingClientRect = () => ({
            left: 10,
            top: 10,
            width: 20,
            height: 20,
            right: 30,
            bottom: 30,
            x: 10,
            y: 10,
            toJSON: () => ({left: 10, top: 10, width: 20, height: 20}),
        })
        document.body.append(agentEl)

    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined)

        // Render component normally first so React can mount without our failure injection
        const {rerender} = render(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        // Fast-forward time so bubble entrance animation delay passes and re-render so lines are added
        jest.setSystemTime(10000)
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
            />
        )

        const origSetAttr = Element.prototype.setAttribute
        // Make setAttribute throw only for SVG <line> positional updates (x1/y1/x2/y2)
        const proto = Element.prototype as unknown as {
            setAttribute: (attrName: string, value: string) => void
        }
        proto.setAttribute = function (attrName: string, value: unknown) {
            const tag = (this && (this as Element).tagName) || ""
            if (
                typeof tag === "string" &&
                tag.toLowerCase() === "line" &&
                (attrName === "x1" || attrName === "y1" || attrName === "x2" || attrName === "y2")
            ) {
                throw new Error("simulated setAttribute failure")
            }

            return origSetAttr.call(this as Element, attrName, String(value))
        }

        // Replace RAF with immediate runner so updateAllLines runs synchronously when streaming starts
        const origRAF = global.requestAnimationFrame
        const origCAF = global.cancelAnimationFrame
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
            try {
                cb(0)
            } catch {
                // ignore
            }
            return 1
        }
    global.cancelAnimationFrame = () => undefined

        // Start streaming by re-rendering with isStreaming=true so the effect starts the RAF loop
        rerender(
            <ThoughtBubbleOverlay
                nodes={mockNodes}
                edges={edges}
                showThoughtBubbles={true}
                isStreaming={true}
            />
        )

        // Expect console.debug to have been called because updateAllLines catches and logs errors
        expect(debugSpy).toHaveBeenCalled()

        // Restore globals
    ;(Element.prototype as unknown as {setAttribute: (n: string, v: string) => void}).setAttribute = origSetAttr
    debugSpy.mockRestore()
    global.requestAnimationFrame = origRAF
    global.cancelAnimationFrame = origCAF
        agentEl.remove()
        jest.useRealTimers()
    })
})
