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
import {PlasmaEdge, PlasmaEdgeProps} from "../../../../components/MultiAgentAccelerator/AgentFlow/PlasmaEdge"

// Add shim for function not defined by JSDom
declare global {
    interface SVGElement {
        getTotalLength: () => number
        getPointAtLength: (distance: number) => {x: number; y: number}
    }
}

Object.defineProperties(SVGElement.prototype, {
    getTotalLength: {
        configurable: true,
        writable: true,
        value: () => 100,
    },
    getPointAtLength: {
        configurable: true,
        writable: true,
        value: (distance: number) => ({x: distance, y: distance}),
    },
})

describe("PlasmaEdge", () => {
    withStrictMocks()

    const renderPlasmaEdge = (overrides: Partial<PlasmaEdgeProps> = {}) =>
        render(
            <svg>
                <PlasmaEdge
                    id="test-edge"
                    source="test-source"
                    target="test-target"
                    sourceX={0}
                    sourceY={0}
                    targetX={200}
                    targetY={120}
                    sourcePosition={Position.Left}
                    targetPosition={Position.Right}
                    {...overrides}
                />
            </svg>
        )

    it("renders and runs animation", () => {
        vi.spyOn(console, "error").mockImplementation(vi.fn())

        // Mock getContext to provide minimal API used by the component
        const fakeCtx = Object.assign(Object.create(null) as CanvasRenderingContext2D, {
            setTransform: vi.fn(),
            scale: vi.fn(),
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
        })

        const randomSpy = vi.spyOn(Math, "random")
        // Mock successive random values to cover each of the branches
        randomSpy
            .mockReturnValue(0) // default: create particles deterministically
            .mockReturnValueOnce(0.9) // first render: t = 0.9
            .mockReturnValueOnce(0.9) // first render: 0.9 < 0.1 => false, covers inner else

        const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
        const requestAnimationFrameSpy = vi.spyOn(global, "requestAnimationFrame")
        const cancelAnimationFrameSpy = vi.spyOn(global, "cancelAnimationFrame")

        let rafCallback: FrameRequestCallback | undefined

        getContextSpy.mockImplementation((contextId) => {
            if (contextId === "2d") {
                return fakeCtx
            }

            return null
        })

        requestAnimationFrameSpy.mockImplementation((callback: FrameRequestCallback) => {
            rafCallback = callback
            return 1
        })

        cancelAnimationFrameSpy.mockImplementation(vi.fn())

        // First render with default props
        const view = renderPlasmaEdge()
        expect(view.container.querySelector("canvas")).not.toBeNull()
        view.unmount()

        // Now render with specific props to test animation
        const {unmount, container} = renderPlasmaEdge({
            maxParticles: 1,
            particlesPerFrame: 1,
        })

        expect(container.querySelector("canvas")).not.toBeNull()
        expect(container.querySelector("path")).not.toBeNull()
        expect(requestAnimationFrameSpy).toHaveBeenCalled()

        act(() => {
            rafCallback?.(0)
            rafCallback?.(16)
        })

        expect(fakeCtx.clearRect).toHaveBeenCalled()
        expect(fakeCtx.arc).toHaveBeenCalled()

        unmount()
        expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    })
})
