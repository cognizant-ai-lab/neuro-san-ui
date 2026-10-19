import {render, screen} from "@testing-library/react"
import {MockInstance} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ErrorBoundary, ErrorBoundaryProps} from "../../../components/ErrorPage/ErrorBoundary"

// Mock the ErrorPage component so tests don't need Next router or stores
vi.mock("../../../components/ErrorPage/ErrorPage", () => ({
    default: ({errorText, userInfo}: {errorText: string; userInfo: {name: string}}) => (
        <div data-testid="mock-error">
            <span>{errorText}</span>
            <span>Signed in as {userInfo.name}</span>
        </div>
    ),
}))

// Create a component that throws when shouldThrow is true
const ErrorChild = ({shouldThrow}: {shouldThrow: boolean}) => {
    if (shouldThrow) {
        throw new Error("boom")
    }
    return <div>There was an error</div>
}

// The session details the app hands the boundary for its fallback page
const BOUNDARY_PROPS: Omit<ErrorBoundaryProps, "children"> = {
    authenticationType: "NextAuth",
    id: "test-boundary",
    signOut: () => undefined,
    userInfo: {name: "Ada", image: "https://example.com/ada.png"},
}

describe("ErrorBoundary", () => {
    let consoleErrorSpy: MockInstance

    withStrictMocks()

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => vi.fn())
    })

    it("renders fallback ErrorPage when child throws", () => {
        render(
            <ErrorBoundary {...BOUNDARY_PROPS}>
                <ErrorChild shouldThrow={true} />
            </ErrorBoundary>
        )

        // ErrorPage receives an errorText like "boom in Unknown line null column null"
        const fallback = screen.getByTestId("mock-error")
        expect(fallback).toHaveTextContent(/boom in unknown line/iu)

        // Assert console.error was called with the expected error
        const messages = consoleErrorSpy.mock.calls.flat().join(" ")
        expect(messages).toMatch(/error: boom/iu)
    })

    it("shows the signed-in user on the fallback page", () => {
        render(
            <ErrorBoundary {...BOUNDARY_PROPS}>
                <ErrorChild shouldThrow={true} />
            </ErrorBoundary>
        )

        screen.getByText(`Signed in as ${BOUNDARY_PROPS.userInfo.name}`)
    })

    it("clears error when child no longer throws after re-render", async () => {
        const {rerender} = render(
            <ErrorBoundary {...BOUNDARY_PROPS}>
                <ErrorChild shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.queryByText("There was an error")).not.toBeInTheDocument()
        expect(screen.getByTestId("mock-error")).toBeInTheDocument()

        // Remount the ErrorBoundary (change key) to reset its internal state and render child
        rerender(
            <ErrorBoundary
                {...BOUNDARY_PROPS}
                key="reset-1"
            >
                <ErrorChild shouldThrow={false} />
            </ErrorBoundary>
        )

        // Now the child should render and fallback gone
        expect(await screen.findByText("There was an error")).toBeInTheDocument()
    })
})
