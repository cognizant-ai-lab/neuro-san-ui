import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {buildTreeViewItems} from "../../../../components/MultiAgentAccelerator/Sidebar/TreeBuilder"

describe("TreeBuilder", () => {
    withStrictMocks()

    it("should handle undefined inputs", async () => {
        const tree = buildTreeViewItems(true, undefined, undefined)
        expect(tree).toEqual([])
    })

    it("should handle missing inputs", async () => {
        const tree = buildTreeViewItems(true)
        expect(tree).toEqual([])
    })
})
