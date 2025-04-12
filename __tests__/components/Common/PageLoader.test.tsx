import {render, screen} from "@testing-library/react"

import {PageLoader} from "../../../components/Common/pageLoader"

describe("PageLoader", () => {
    const pageLoaderComponent = <PageLoader id="mock-page-loader" />
    it("should render a page loader", async () => {
        render(pageLoaderComponent)

        const loadingTitle = screen.getByText("Loading... Please wait")

        expect(loadingTitle).toBeInTheDocument()
    })
})
