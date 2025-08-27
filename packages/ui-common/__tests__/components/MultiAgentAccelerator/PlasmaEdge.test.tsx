import {render} from "@testing-library/react"
import {Position} from "reactflow"

import {PlasmaEdge} from "../../../components/MultiAgentAccelerator/PlasmaEdge"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"

// Capture the *real* createElement before it's mocked
// eslint-disable-next-line @typescript-eslint/no-deprecated
const originalCreateElement = global.document?.createElement

describe("PlasmaEdge", () => {
    withStrictMocks()

    beforeEach(() => {
        // Mock canvas context
        jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
            () =>
                ({
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
                }) as never
        )

        // Mock SVG path methods
        jest.spyOn(SVGPathElement.prototype, "getTotalLength").mockImplementation(() => 100)
        jest.spyOn(SVGPathElement.prototype, "getPointAtLength").mockImplementation((len: number) => ({
            x: len,
            y: len,
            z: 0,
            w: 1,
            matrixTransform: () => this,
            toJSON: () => ({x: len, y: len, z: 0, w: 1}),
        }))

        // Mock createElement for <path>
        jest.spyOn(document, "createElement").mockImplementation(
            (
                (original) =>
                (tag: string, ...args) => {
                    const el = original.call(document, tag, ...args)
                    if (tag.toLowerCase() === "path") {
                        Object.assign(el, {
                            getTotalLength: () => 100,
                            getPointAtLength: (len: number) => ({
                                x: len,
                                y: len,
                                z: 0,
                                w: 1,
                                matrixTransform: () => el,
                                toJSON: () => ({x: len, y: len, z: 0, w: 1}),
                            }),
                        })
                    }
                    return el
                }
            )(originalCreateElement)
        )
    })

    it("should render correctly", () => {
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

        expect(console.error).toHaveBeenCalledTimes(3)
        expect(document.querySelector("canvas")).toBeInTheDocument()
        expect(document.querySelector("foreignObject")).toBeInTheDocument()
        expect(document.querySelector("path")).toBeInTheDocument()
    })
})
