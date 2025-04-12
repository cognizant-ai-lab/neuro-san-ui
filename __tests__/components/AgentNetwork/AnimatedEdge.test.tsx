import {render} from "@testing-library/react"
import {Position} from "reactflow"

import {AnimatedEdge} from "../../../components/AgentNetwork/AnimatedEdge"

describe("AnimatedEdge", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("Should render correctly", async () => {
        jest.spyOn(console, "error").mockImplementation()

        render(
            <AnimatedEdge
                id="test-animated-edge"
                source="test-source"
                target="test-target"
                sourceX={0}
                sourceY={0}
                targetX={0}
                targetY={0}
                sourcePosition={Position.Right}
                targetPosition={Position.Left}
            />
        )

        // We expect console errors due to rendering SVG elements within RTL
        expect(console.error).toHaveBeenCalledTimes(4)

        // Make sure we have the right elements at least
        const circleElement = document.querySelector("circle")
        expect(circleElement).toBeInTheDocument()

        const animateMotionElement = document.querySelector("circle animatemotion")
        expect(animateMotionElement).toBeInTheDocument()
    })
})
