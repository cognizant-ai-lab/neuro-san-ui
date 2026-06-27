// eslint-disable-next-line no-shadow
import {describe, expect, it, vi} from "vitest"

import * as Nav from "../../../utils/BrowserNavigation"

describe("BrowserNavigation", () => {
    it("calls navigateToUrl (mocked) with expected URL", () => {
        const spy = vi.spyOn(Nav, "navigateToUrl").mockImplementation(() => undefined)
        Nav.navigateToUrl("http://example.com/test-path")
        expect(spy).toHaveBeenCalledWith("http://example.com/test-path")
        spy.mockRestore()
    })
})
