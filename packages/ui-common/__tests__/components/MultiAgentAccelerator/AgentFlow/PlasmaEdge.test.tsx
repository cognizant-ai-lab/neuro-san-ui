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

import {act, render} from "@testing-library/react"
import {Position} from "@xyflow/react"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {PlasmaEdge} from "../../../../components/MultiAgentAccelerator/AgentFlow/PlasmaEdge"

describe("PlasmaEdge", () => {
    withStrictMocks()

    it("renders and runs animation with mocked canvas context, SVG methods, and RAF", () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(vi.fn())

        // Mock getContext to provide minimal API used by the component
        const fakeCtx: Partial<CanvasRenderingContext2D> = {
            setTransform: vi.fn(),
            scale: vi.fn(),
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
        }

        const origGetContext = HTMLCanvasElement.prototype.getContext
        const origRAF = global.requestAnimationFrame
        const origCAF = global.cancelAnimationFrame
        const origGetTotalLength = (Element.prototype as unknown as {getTotalLength?: () => number}).getTotalLength
        const origGetPointAtLength = (
            Element.prototype as unknown as {getPointAtLength?: (length: number) => {x: number; y: number}}
        ).getPointAtLength

        let rafCallback: FrameRequestCallback | undefined

        try {
            HTMLCanvasElement.prototype.getContext = vi.fn(
                () => fakeCtx as CanvasRenderingContext2D
            ) as unknown as typeof HTMLCanvasElement.prototype.getContext
            ;(Element.prototype as unknown as {getTotalLength?: () => number}).getTotalLength = vi.fn(() => 100)
            ;(
                Element.prototype as unknown as {getPointAtLength?: (length: number) => {x: number; y: number}}
            ).getPointAtLength = vi.fn((length: number) => ({x: length, y: length}))

            global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
                rafCallback = callback
                return 1
            })

            global.cancelAnimationFrame = vi.fn()

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

            expect(container.querySelector("canvas")).not.toBeNull()
            expect(container.querySelector("path")).not.toBeNull()
            expect(global.requestAnimationFrame).toHaveBeenCalled()

            act(() => {
                rafCallback?.(16)
            })

            expect(fakeCtx.clearRect).toHaveBeenCalled()
            expect(fakeCtx.arc).toHaveBeenCalled()

            unmount()
            expect(global.cancelAnimationFrame).toHaveBeenCalled()
        } finally {
            HTMLCanvasElement.prototype.getContext = origGetContext
            global.requestAnimationFrame = origRAF
            global.cancelAnimationFrame = origCAF
            const elementPrototype = Element.prototype as unknown as {
                getTotalLength?: () => number
                getPointAtLength?: (length: number) => {x: number; y: number}
            }
            elementPrototype.getTotalLength = origGetTotalLength
            elementPrototype.getPointAtLength = origGetPointAtLength
            errSpy.mockRestore()
        }
    })
})
