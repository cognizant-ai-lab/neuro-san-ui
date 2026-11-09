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

import {fireEvent, render, screen} from "@testing-library/react"
import {MotionGlobalConfig} from "motion/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Magnetic} from "../../../components/Splash/Magnetic"

const reducedMotion = vi.hoisted(() => ({value: false}))

vi.mock("motion/react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("motion/react")>()),
    useReducedMotion: () => reducedMotion.value,
}))

MotionGlobalConfig.skipAnimations = true

describe("Magnetic", () => {
    withStrictMocks()

    it("renders its children and follows the pointer without errors", () => {
        render(
            <Magnetic>
                <span>Launch</span>
            </Magnetic>
        )

        const wrapper = screen.getByText("Launch").parentElement
        vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
            bottom: 50,
            height: 50,
            left: 0,
            right: 200,
            top: 0,
            width: 200,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        })

        fireEvent.pointerMove(wrapper, {clientX: 200, clientY: 50})
        fireEvent.pointerLeave(wrapper)

        expect(screen.getByText("Launch")).toBeInTheDocument()
    })

    it("ignores pointer movement under prefers-reduced-motion", () => {
        reducedMotion.value = true

        try {
            render(
                <Magnetic>
                    <span>Reduced</span>
                </Magnetic>
            )

            const wrapper = screen.getByText("Reduced").parentElement
            const rectSpy = vi.spyOn(wrapper, "getBoundingClientRect")

            fireEvent.pointerMove(wrapper, {clientX: 200, clientY: 50})

            expect(rectSpy).not.toHaveBeenCalled()
        } finally {
            reducedMotion.value = false
        }
    })
})
