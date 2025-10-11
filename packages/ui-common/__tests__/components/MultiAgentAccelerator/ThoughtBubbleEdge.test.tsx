import {render} from "@testing-library/react"
import {Position} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ThoughtBubbleEdge} from "../../../components/MultiAgentAccelerator/ThoughtBubbleEdge"

describe("ThoughtBubbleEdge", () => {
    withStrictMocks()

    const mockProps = {
        id: "edge1",
        source: "node1",
        target: "node2",
        sourceX: 100,
        sourceY: 100,
        targetX: 200,
        targetY: 200,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
    }

    it("Should render an invisible path for hover detection", () => {
        const {container} = render(
            <svg>
                <ThoughtBubbleEdge {...mockProps} />
            </svg>
        )

        const path = container.querySelector("path")
        expect(path).toBeInTheDocument()
        expect(path).toHaveAttribute("stroke", "transparent")
        expect(path).toHaveAttribute("stroke-width", "20")
        expect(path).toHaveStyle("pointer-events: stroke")
    })

    it("Should generate path id based on conversationId when provided", () => {
        const propsWithData = {
            ...mockProps,
            data: {
                conversationId: "test-conversation-123",
                text: "Test message",
                showAlways: true,
            },
        }

        const {container} = render(
            <svg>
                <ThoughtBubbleEdge {...propsWithData} />
            </svg>
        )

        const path = container.querySelector("path")
        expect(path).toHaveAttribute("id", "thought-bubble-hover-test-conversation-123")
    })

    it("Should generate path id with empty string when conversationId not provided", () => {
        const propsWithoutConversationId = {
            ...mockProps,
            data: {
                text: "Test message",
                showAlways: false,
            },
        }

        const {container} = render(
            <svg>
                <ThoughtBubbleEdge {...propsWithoutConversationId} />
            </svg>
        )

        const path = container.querySelector("path")
        expect(path).toHaveAttribute("id", "thought-bubble-hover-")
    })

    it("Should generate path id with empty string when no data provided", () => {
        const {container} = render(
            <svg>
                <ThoughtBubbleEdge {...mockProps} />
            </svg>
        )

        const path = container.querySelector("path")
        expect(path).toHaveAttribute("id", "thought-bubble-hover-")
    })

    it("Should render with correct bezier path attributes", () => {
        const {container} = render(
            <svg>
                <ThoughtBubbleEdge {...mockProps} />
            </svg>
        )

        const path = container.querySelector("path")
        expect(path).toHaveAttribute("d")
        expect(path).toHaveAttribute("fill", "none")

        // The d attribute should contain a bezier curve path
        const dAttribute = path?.getAttribute("d")
        expect(dAttribute).toContain("M") // Move to command
        expect(dAttribute).toContain("C") // Curve to command
    })
})
