import {render, screen, waitFor} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {FormattedMarkdown} from "../../../components/AgentChat/FormattedMarkdown"

describe("FormattedMarkdown component tests", () => {
    withStrictMocks()

    it("Renders markdown correctly", async () => {
        render(
            <FormattedMarkdown
                id="test-markdown"
                nodesList={["# Heading\n\nSome **bold** text."]}
                style={{}}
                wrapLongLines={true}
            />
        )

        await screen.findByText(/# Heading/u)
        await screen.findByText(/Some \*\*bold\*\* text/u)
    })

    it("Aggregates consecutive string nodes", async () => {
        render(
            <FormattedMarkdown
                id="test-aggregate"
                nodesList={["First part. ", "Second part. ", "Third part."]}
                style={{}}
                wrapLongLines={false}
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
                wrapLongLines={false}
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
                wrapLongLines={false}
            />
        )

        expect(container.querySelector("span")).toBeInTheDocument()
        await screen.findByText(/Text 1. Text 2\./u)
        await screen.findByText(/Text 3. Text 4\./u)
    })

    it("Generates unique keys for formatted items", async () => {
        render(
            <FormattedMarkdown
                id="test-keys"
                nodesList={["Text 1. ", <div key="" />, "Text 1. "]}
                style={{}}
                wrapLongLines={false}
            />
        )

        await waitFor(() => {
            expect(screen.getAllByText(/Text 1./u)).toHaveLength(2)
        })
    })
})
