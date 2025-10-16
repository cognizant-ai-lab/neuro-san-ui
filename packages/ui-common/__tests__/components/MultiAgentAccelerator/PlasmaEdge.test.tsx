/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {render} from "@testing-library/react"
import {Position} from "reactflow"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {PlasmaEdge} from "../../../components/MultiAgentAccelerator/PlasmaEdge"

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
