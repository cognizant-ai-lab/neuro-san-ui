// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import {FormattedMarkdown} from "../../components/internal/opportunity_finder/FormattedMarkdown"

// Have to mock these up due to https://github.com/remarkjs/react-markdown/issues/635
// And we can't even fix it using `transformIgnorePatterns` due to https://github.com/vercel/next.js/issues/35634
// None of the "solutions" in those tickets worked for me.
/* eslint-disable react/no-multi-comp */
jest.mock("react-markdown", () => ({children}) => <div>{children}</div>)
jest.mock("rehype-raw", () => ({children}) => <div>{children}</div>)
jest.mock("rehype-slug", () => ({children}) => <div>{children}</div>)
/* eslint-enable react/no-multi-comp */

describe("FormattedMarkdown component tests", () => {
    // eslint-disable-next-line jest/expect-expect
    it("Renders markdown correctly", async () => {
        render(
            <FormattedMarkdown
                id="test-markdown"
                nodesList={["# Heading\n\nSome **bold** text."]}
                style={{}}
            />
        )

        await screen.findByText(/# Heading/u)
        await screen.findByText(/Some \*\*bold\*\* text/u)
    })

    // eslint-disable-next-line jest/expect-expect
    it("Aggregates consecutive string nodes", async () => {
        render(
            <FormattedMarkdown
                id="test-aggregate"
                nodesList={["First part. ", "Second part. ", "Third part."]}
                style={{}}
            />
        )

        await screen.findByText(/First part. Second part. Third part\./u)
    })

    it("Handles non-string nodes correctly", () => {
        const {container} = render(
            <FormattedMarkdown
                id="test-non-string"
                nodesList={["Text before.", <span key="1">Non-string node</span>, "Text after."]}
                style={{}}
            />
        )
        expect(container.querySelector("span")).toBeInTheDocument()
        expect(container).toHaveTextContent(/Text before\./u)
        expect(container).toHaveTextContent(/Text after\./u)
    })

    it("Handles alternating string and non-string nodes", async () => {
        const {container} = render(
            <FormattedMarkdown
                id="test-alternating"
                nodesList={[
                    "Text 1. ",
                    "Text 2.",
                    <span key="1">Non-string node</span>,
                    "Text 3. ",
                    "Text 4.",
                    <span key="2">Another non-string node</span>,
                ]}
                style={{}}
            />
        )

        expect(container.querySelector("span")).toBeInTheDocument()
        await screen.findByText(/Text 1. Text 2\./u)
        await screen.findByText(/Text 3. Text 4\./u)
    })
})
