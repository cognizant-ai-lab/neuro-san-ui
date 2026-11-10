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
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {AccordionLite} from "../../../components/Common/AccordionLite"

describe("AccordionLite", () => {
    withStrictMocks()

    it("toggles its expanded state when the title is clicked", async () => {
        const user = userEvent.setup()
        render(
            <AccordionLite
                id="acc"
                items={<span>inner</span>}
                title="Title"
            />
        )

        const collapse = document.getElementById("acc-items")
        expect(collapse).toHaveStyle({visibility: "hidden"})

        await user.click(screen.getByText("Title"))
        expect(collapse).not.toHaveStyle({visibility: "hidden"})

        await user.click(screen.getByText("Title"))
        expect(screen.getByText("inner")).toBeInTheDocument()
    })

    it("accepts contentSx as an array", () => {
        render(
            <AccordionLite
                id="acc2"
                contentSx={[{color: "red"}]}
                items={<span>inner2</span>}
                title="Title2"
            />
        )

        expect(screen.getByText("inner2")).toBeInTheDocument()
    })
})
