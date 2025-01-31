/**
 * Tests for Opp Finder common logic
 */

import {experimentGeneratedMessage} from "../../../../components/internal/opportunity_finder/common"

describe("Common component tests", () => {
    it("Should generate a valid experiment complete item", () => {
        const projectUrl = new URL("https://example.com")
        const experimentGeneratedItem = experimentGeneratedMessage(projectUrl)

        // make sure it contains a link
        expect(experimentGeneratedItem.props.children).toContainEqual(expect.objectContaining({type: "a"}))

        // retrieve the link
        const link = experimentGeneratedItem.props.children.find((child) => child.type === "a")
        expect(link.props.href).toContain(projectUrl.toString())
    })
})
