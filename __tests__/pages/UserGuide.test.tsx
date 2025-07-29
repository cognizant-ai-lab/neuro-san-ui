import {render, screen} from "@testing-library/react"

import UserGuide from "../../pages/userguide"
import {withStrictMocks} from "../common/strictMocks"

const originalFetch = window.fetch

describe("User Guide", () => {
    withStrictMocks()

    afterEach(() => {
        window.fetch = originalFetch
    })

    it("Renders the User Guide correctly", async () => {
        const userGuideContent = "Sample User Guide Content"
        window.fetch = jest.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                text: async () => userGuideContent,
            })
        })
        render(<UserGuide />)

        await screen.findByText(userGuideContent)
    })

    it("Displays an error message when failing to fetch the User Guide", async () => {
        window.fetch = jest.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: false,
            })
        })
        render(<UserGuide />)

        await screen.findByText(/Unable to load user guide/u)
    })
})
