import {render} from "@testing-library/react"
import {Position} from "reactflow"

import {PlasmaEdge} from "../../../components/AgentNetwork/PlasmaEdge"
import {withStrictMocks} from "../../common/strictMocks"

// Mock for CanvasRenderingContext2D
const mockCtx = {
    save: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    restore: jest.fn(),
    clearRect: jest.fn(),
    setTransform: jest.fn(),
    scale: jest.fn(),
    shadowBlur: 0,
    shadowColor: "",
    fillStyle: "",
    globalAlpha: 1,
}

// Mock for SVGPathElement
const mockPathEl = {
    getTotalLength: jest.fn(() => 100),
    getPointAtLength: jest.fn((len: number) => ({x: len, y: len})),
}

// Mock SVGPathElement if not present (for Jest/jsdom)
if (typeof SVGPathElement === "undefined") {
    global.SVGPathElement = class {}
    // Add the methods to the prototype so jest.spyOn can work
    global.SVGPathElement.prototype.getTotalLength = function () {
        return 100
    }
    global.SVGPathElement.prototype.getPointAtLength = function (len: number) {
        // Return a DOMPoint-like object if needed
        return {x: len, y: len, z: 0, w: 1, matrixTransform: () => this, toJSON: () => ({x: len, y: len, z: 0, w: 1})}
    }
}

describe("PlasmaEdge", () => {
    withStrictMocks()

    const originalCreateElement = document.createElement
    beforeAll(() => {
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockCtx as any)

        document.createElement = function (tagName: string, ...args: any[]) {
            const el = originalCreateElement.call(this, tagName, ...args)
            if (tagName.toLowerCase() === "path") {
                // Add the mocked methods directly to the element
                el.getTotalLength = () => 100
                el.getPointAtLength = (len: number) => ({
                    x: len,
                    y: len,
                    z: 0,
                    w: 1,
                    matrixTransform: () => this,
                    toJSON: () => ({x: len, y: len, z: 0, w: 1}),
                })
            }
            return el
        }
    })

    // Mock getContext on HTMLCanvasElement
    beforeAll(() => {
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockCtx as any)
        jest.spyOn(SVGPathElement.prototype, "getTotalLength").mockImplementation(mockPathEl.getTotalLength)
        jest.spyOn(SVGPathElement.prototype, "getPointAtLength").mockImplementation(mockPathEl.getPointAtLength)
    })

    it("Should render correctly", async () => {
        jest.spyOn(console, "error").mockImplementation()

        render(
            <PlasmaEdge
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
        expect(console.error).toHaveBeenCalledTimes(3)

        // Make sure we have the right elements at least
        const circleElement = document.querySelector("canvas")
        expect(circleElement).toBeInTheDocument()

        const animateMotionElement = document.querySelector("foreignObject")
        expect(animateMotionElement).toBeInTheDocument()

        const pathElement = document.querySelector("path")
        expect(pathElement).toBeInTheDocument()
    })
})
