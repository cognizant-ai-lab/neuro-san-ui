import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {PageLoader} from "../../../components/Common/PageLoader"

describe("PageLoader", () => {
    withStrictMocks()

    const pageLoaderComponent = <PageLoader id="mock-page-loader" />

    it("should render a page loader", async () => {
        render(pageLoaderComponent)

        const loadingTitle = screen.getByText("Loading... Please wait")

        expect(loadingTitle).toBeInTheDocument()
    })
})
