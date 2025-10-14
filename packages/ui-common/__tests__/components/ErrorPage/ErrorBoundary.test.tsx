import {render, screen} from "@testing-library/react"

import {ErrorBoundary} from "../../../components/ErrorPage/ErrorBoundary"

// Mock the ErrorPage component so tests don't need Next router or stores
jest.mock("../../../components/ErrorPage/ErrorPage", () => ({
    __esModule: true,
    default: ({errorText}: {errorText: string}) => <div data-testid="mock-error">{errorText}</div>,
}))

// Create a component that throws when shouldThrow is true
function ErrorChild({shouldThrow}: {shouldThrow: boolean}) {
    if (shouldThrow) {
        throw new Error("boom")
    }
    return <div>There was an error</div>
}

describe("ErrorBoundary", () => {
    const originalConsoleError = console.error

    beforeEach(() => {
        // Silence expected console.error calls during React error boundary rendering
        jest.spyOn(console, "error").mockImplementation()
    })

    afterEach(() => {
        ;(console.error as jest.Mock).mockRestore()
        console.error = originalConsoleError
    })

    test("renders fallback ErrorPage when child throws", () => {
        render(
            <ErrorBoundary id="test-boundary">
                <ErrorChild shouldThrow={true} />
            </ErrorBoundary>
        )

        // ErrorPage receives an errorText like "boom in Unknown line null column null"
        const fallback = screen.getByTestId("mock-error")
        expect(fallback).toHaveTextContent(/boom in unknown line/iu)
    })

    test("clears error when child no longer throws after re-render", async () => {
        const {rerender} = render(
            <ErrorBoundary id="test-boundary">
                <ErrorChild shouldThrow={true} />
            </ErrorBoundary>
        )

        expect(screen.queryByText("There was an error")).toBeNull()
        expect(screen.getByTestId("mock-error")).toBeInTheDocument()

        // Remount the ErrorBoundary (change key) to reset its internal state and render child
        rerender(
            <ErrorBoundary
                key="reset-1"
                id="test-boundary"
            >
                <ErrorChild shouldThrow={false} />
            </ErrorBoundary>
        )

        // Now the child should render and fallback gone
        expect(await screen.findByText("There was an error")).toBeInTheDocument()
    })
})
