import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {UIMockupGenerator} from "../../components/internal/uiMockupGenerator/UIMockupGenerator"
import {mockFetch} from "../testUtils"

jest.mock("next/image", () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                alt="Test alt"
                {...props}
            />
        )
    },
}))

describe("UIMockupGenerator", () => {
    const onClose = jest.fn()
    const userQuery = "Test user query"

    it("should render blank component", async () => {
        render(
            <UIMockupGenerator
                isOpen={true}
                onClose={onClose}
                userQuery={userQuery}
            />
        )

        expect(screen.getByText("Generate")).toBeInTheDocument()
        expect(screen.queryByAltText(/UI Mockup Image from Dall-e.*?/iu)).not.toBeInTheDocument()
    })

    it("should render image on click of Generate button", async () => {
        const user = userEvent.setup()
        const oldFetch = window.fetch
        window.fetch = mockFetch({response: {imageURL: "1234"}})

        render(
            <UIMockupGenerator
                isOpen={true}
                onClose={onClose}
                userQuery={userQuery}
            />
        )

        await user.click(screen.getByText("Generate"))
        expect(await screen.findByAltText(/UI Mockup Image from Dall-e.*?/iu)).toBeInTheDocument()

        // eslint-disable-next-line require-atomic-updates
        window.fetch = oldFetch
    })
})
