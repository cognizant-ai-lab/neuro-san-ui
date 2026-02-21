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
import {Position} from "@xyflow/react"
import {act} from "react"

import {PlasmaEdge} from "../../../components/MultiAgentAccelerator/PlasmaEdge"

describe("PlasmaEdge", () => {
    it("renders and runs animation with mocked canvas context, SVG methods, and RAF", () => {
        const errSpy = jest.spyOn(console, "error").mockImplementation()

        // Mock getContext to provide minimal API used by the component
        const fakeCtx: Partial<CanvasRenderingContext2D> = {
            setTransform: jest.fn(),
            scale: jest.fn(),
            clearRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
        }

        // Keep originals so we can restore later (use explicit narrow types instead of `any`)
        const origGetContext = HTMLCanvasElement.prototype.getContext as unknown as (
            contextId?: string | null
        ) => CanvasRenderingContext2D | null
        const origRAF = global.requestAnimationFrame
        const origCAF = global.cancelAnimationFrame
        const origGetTotalLength = (SVGElement.prototype as unknown as {getTotalLength?: () => number}).getTotalLength
        const origGetPointAtLength = (
            SVGElement.prototype as unknown as {getPointAtLength?: (l: number) => {x: number; y: number}}
        ).getPointAtLength

        // Monkeypatch getContext on canvas prototype for the test
        HTMLCanvasElement.prototype.getContext = function () {
            return fakeCtx as CanvasRenderingContext2D
        } as unknown as typeof HTMLCanvasElement.prototype.getContext

        // Provide simple implementations for SVG element methods used by the particle generator
        ;(Element.prototype as unknown as {getTotalLength?: () => number}).getTotalLength = () => 100
        ;(Element.prototype as unknown as {getPointAtLength?: (l: number) => {x: number; y: number}}).getPointAtLength =
            (l: number) => ({x: l, y: l})

        // Mock RAF to run callback immediately once
        global.requestAnimationFrame = (cb: FrameRequestCallback) => {
            try {
                cb(0)
            } catch {
                // ignore
            }
            return 1
        }
        global.cancelAnimationFrame = () => undefined

        const {unmount, container} = render(
            <PlasmaEdge
                // edge props are minimally required for rendering
                id="test-edge"
                source="test-source"
                target="test-target"
                sourceX={0}
                sourceY={0}
                targetX={200}
                targetY={120}
                sourcePosition={Position.Left}
                targetPosition={Position.Right}
            />
        )

        // Allow effects to run
        act(() => undefined)

        // Ensure canvas and path are present
        const canvas = container.querySelector("canvas")
        const path = container.querySelector("path")
        expect(canvas).not.toBeNull()
        expect(path).not.toBeNull()

        // Cleanup and restore
        unmount()
        ;(HTMLCanvasElement.prototype as unknown as {getContext?: typeof origGetContext}).getContext = origGetContext
        global.requestAnimationFrame = origRAF
        global.cancelAnimationFrame = origCAF
        ;(SVGElement.prototype as unknown as {getTotalLength?: () => number}).getTotalLength = origGetTotalLength
        ;(
            SVGElement.prototype as unknown as {getPointAtLength?: (l: number) => {x: number; y: number}}
        ).getPointAtLength = origGetPointAtLength
        errSpy.mockRestore()
    })
})
