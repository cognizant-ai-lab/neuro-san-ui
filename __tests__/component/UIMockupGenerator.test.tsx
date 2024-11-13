import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import {UIMockupGenerator} from "../../components/internal/uiMockupGenerator/UIMockupGenerator"

jest.mock("next/image", () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        return <img {...props} />
    },
}))

describe("Dialog", () => {
    const onClose = jest.fn()
    const userQuery = "Test user query"

    it("should render UIMockupGenerator", async () => {
        render(
            <UIMockupGenerator
                isOpen={true}
                onClose={onClose}
                userQuery={userQuery}
            />
        )

        expect(screen.getByText("Generate")).toBeInTheDocument()
    })
})
