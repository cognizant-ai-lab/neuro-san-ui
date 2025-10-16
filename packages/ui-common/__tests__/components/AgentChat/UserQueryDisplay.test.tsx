/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {UserQueryDisplay} from "../../../components/AgentChat/UserQueryDisplay"
import {DEFAULT_USER_IMAGE} from "../../../const"

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
