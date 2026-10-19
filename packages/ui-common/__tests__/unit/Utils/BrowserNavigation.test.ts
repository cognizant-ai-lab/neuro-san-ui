import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import * as Nav from "../../../utils/BrowserNavigation"

describe("BrowserNavigation", () => {
    withStrictMocks()

    it("calls navigateToUrl (mocked) with expected URL", () => {
        const spy = vi.spyOn(Nav, "navigateToUrl").mockImplementation(() => undefined)
        Nav.navigateToUrl("http://example.com/test-path")
        expect(spy).toHaveBeenCalledWith("http://example.com/test-path")
        spy.mockRestore()
    })

    describe("getCurrentLocation", () => {
        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it("returns the current pathname and query string as a plain object", () => {
            vi.stubGlobal("location", {pathname: "/agents", search: "?id=42&tab=chat"})

            expect(Nav.getCurrentLocation()).toEqual({
                pathname: "/agents",
                query: {id: "42", tab: "chat"},
            })
        })

        it("returns an empty query when the URL has no search string", () => {
            vi.stubGlobal("location", {pathname: "/agents", search: ""})

            expect(Nav.getCurrentLocation()).toEqual({pathname: "/agents", query: {}})
        })

        it("defaults pathname and query when location is missing those fields", () => {
            vi.stubGlobal("location", {})

            expect(Nav.getCurrentLocation()).toEqual({pathname: "", query: {}})
        })

        it("defaults pathname and query when location is unavailable", () => {
            vi.stubGlobal("location", undefined)

            expect(Nav.getCurrentLocation()).toEqual({pathname: "", query: {}})
        })
    })
})
