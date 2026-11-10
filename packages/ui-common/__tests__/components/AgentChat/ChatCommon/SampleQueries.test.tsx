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

import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {QUERY_TRUNCATE_LENGTH, SampleQueries} from "../../../../components/AgentChat/ChatCommon/SampleQueries"

const reducedMotion = vi.hoisted(() => ({value: false}))

vi.mock("motion/react", async (importOriginal) => ({
    ...(await importOriginal<typeof import("motion/react")>()),
    useReducedMotion: () => reducedMotion.value,
}))

describe("SampleQueries", () => {
    withStrictMocks()

    afterEach(() => {
        reducedMotion.value = false
    })

    it("renders nothing when there are no sample queries", () => {
        const {container} = render(
            <SampleQueries
                disabled={false}
                handleSend={vi.fn()}
                sampleQueries={[]}
            />
        )
        expect(container).toBeEmptyDOMElement()
    })

    it.each([false, true])("renders chips and sends the query on click (reduced motion: %s)", async (reduced) => {
        reducedMotion.value = reduced
        const handleSend = vi.fn()
        render(
            <SampleQueries
                disabled={false}
                handleSend={handleSend}
                sampleQueries={["first query", "second query"]}
            />
        )

        await userEvent.click(screen.getByText("first query"))
        expect(handleSend).toHaveBeenCalledExactlyOnceWith("first query")
        expect(screen.getByText("second query")).toBeInTheDocument()
    })

    it("truncates long queries", () => {
        const longQuery = "x".repeat(QUERY_TRUNCATE_LENGTH + 20)
        render(
            <SampleQueries
                disabled={false}
                handleSend={vi.fn()}
                sampleQueries={[longQuery]}
            />
        )
        expect(screen.getByText(`${"x".repeat(QUERY_TRUNCATE_LENGTH)}...`)).toBeInTheDocument()
    })
})
