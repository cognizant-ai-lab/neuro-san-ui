/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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
import {createTheme} from "@mui/material/styles"
import {fireEvent, render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {Spotlight, spotlightStyles} from "../../../components/Common/Spotlight"

describe("Spotlight", () => {
    withStrictMocks()

    it("tracks the pointer via CSS variables and fades on leave", () => {
        render(
            <Spotlight
                id="spot"
                size={100}
            >
                content
            </Spotlight>
        )

        const el = screen.getByText("content")
        vi.spyOn(el, "getBoundingClientRect").mockReturnValue({left: 10, top: 20} as DOMRect)

        fireEvent.pointerMove(el, {clientX: 50, clientY: 70})
        expect(el.style.getPropertyValue("--spotlight-x")).toBe("40px")
        expect(el.style.getPropertyValue("--spotlight-y")).toBe("50px")
        expect(el.style.getPropertyValue("--spotlight-opacity")).toBe("1")

        fireEvent.pointerLeave(el)
        expect(el.style.getPropertyValue("--spotlight-opacity")).toBe("0")
    })

    it("accepts a default size, and sx as an array or object", () => {
        render(
            <>
                <Spotlight sx={[{color: "red"}]}>array</Spotlight>
                <Spotlight sx={{color: "blue"}}>object</Spotlight>
                <Spotlight>none</Spotlight>
            </>
        )

        expect(screen.getByText("array")).toBeInTheDocument()
        expect(screen.getByText("object")).toBeInTheDocument()
        expect(screen.getByText("none")).toBeInTheDocument()
    })

    it("builds spotlight styles with a default glow size", () => {
        const styles = spotlightStyles(createTheme())

        expect(styles).toMatchObject({position: "relative", isolation: "isolate"})
    })
})
