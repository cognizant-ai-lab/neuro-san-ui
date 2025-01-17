import {render} from "@testing-library/react"

import BlankLines from "../../components/blanklines"

describe("Blank Lines Test", () => {
    it("inserts the specified number of blank lines", () => {
        const {container} = render(
            <BlankLines
                id="test_blank_lines"
                numLines={5}
            />
        )

        const brs = container.getElementsByTagName("br")
        expect(brs.length).toBe(5)
    })

    it("handles the case of zero lines requested", () => {
        const {container} = render(
            <BlankLines
                id="test_blank_lines"
                numLines={0}
            />
        )

        const brs = container.getElementsByTagName("br")
        expect(brs.length).toBe(0)
    })
})
