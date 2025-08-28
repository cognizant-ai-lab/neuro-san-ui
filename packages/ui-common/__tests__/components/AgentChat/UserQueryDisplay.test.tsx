import {render, screen} from "@testing-library/react"

import {UserQueryDisplay} from "../../../components/AgentChat/UserQueryDisplay"
import {DEFAULT_USER_IMAGE} from "../../../const"
import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"

// Mock dependencies
jest.mock("next/image", () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        const copyProps = {...props}
        delete copyProps.unoptimized
        return (
            <img
                {...copyProps}
                alt="Test alt"
            />
        )
    },
}))

describe("UserQueryDisplay", () => {
    const defaultProps = {
        userQuery: "Hello, world!",
        title: "User Name",
        userImage: "/user.png",
    }

    withStrictMocks()

    it("renders user query and image", () => {
        render(<UserQueryDisplay {...defaultProps} />)

        expect(screen.getByText(defaultProps.userQuery)).toBeInTheDocument()
        const img = screen.getByRole("img")
        expect(img).toHaveAttribute("src", defaultProps.userImage)
        expect(img).toHaveAttribute("title", defaultProps.title)
    })

    it("uses DEFAULT_USER_IMAGE if userImage is empty", () => {
        render(
            <UserQueryDisplay
                {...defaultProps}
                userImage=""
            />
        )

        const img = screen.getByRole("img")
        expect(img).toHaveAttribute("src", DEFAULT_USER_IMAGE)
    })
})
