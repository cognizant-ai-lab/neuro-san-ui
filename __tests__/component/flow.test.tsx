import "@testing-library/jest-dom"
import {render} from "@testing-library/react"
import React from "react"

import Flow from "../../components/internal/flow/flow"

jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/",
            pathname: "",
            query: ["demo"],
            asPath: "",
            push: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
            beforePopState: jest.fn(() => null),
            prefetch: jest.fn(() => null),
        }
    },
}))

jest.mock("next-auth/react", () => ({
    useSession: jest.fn(() => ({data: {user: {name: "test-user"}}})),
}))

describe("Flow Test", () => {
    it("Generates a single data node for empty flow", () => {
        const handleClick = jest.spyOn(React, "useState")


        const {container} = render(
            <Flow
                id="test-flow"
                ProjectID={123}
                SetParentState={jest.fn()}
                Flow={[]}
                ElementsSelectable={false}
            />
        )

        // Get all the nodes
        const nodes = container.getElementsByClassName("react-flow__node")

        // Should be a data node only
        expect(nodes.length).toBe(1)

        console.debug(`handleClick: ${handleClick}`)
    })
})
