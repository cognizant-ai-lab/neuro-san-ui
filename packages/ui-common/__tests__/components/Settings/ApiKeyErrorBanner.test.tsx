import {render, screen, within} from "@testing-library/react"
import {UserEvent, userEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ApiKeyErrorBanner, ApiKeyFailure} from "../../../components/Settings/ApiKeyErrorBanner"

const ANTHROPIC_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {
        ok: false,
        status: 401,
        errorType: "authentication_error",
        message: "invalid x-api-key",
        raw: '{\n  "type": "error"\n}',
    },
}

describe("ApiKeyErrorBanner", () => {
    withStrictMocks()

    let user: UserEvent

    beforeEach(() => {
        user = userEvent.setup()
    })

    it("renders nothing when there are no failures", () => {
        const {container} = render(
            <ApiKeyErrorBanner
                failures={[]}
                id="banner"
            />
        )
        expect(container).toBeEmptyDOMElement()
    })

    it("summarizes a failure with its status, message, and metadata", () => {
        render(
            <ApiKeyErrorBanner
                failures={[ANTHROPIC_FAILURE]}
                id="banner"
            />
        )

        expect(screen.getByText("Anthropic — Authentication failed (401)")).toBeInTheDocument()
        expect(screen.getByText("invalid x-api-key")).toBeInTheDocument()
        expect(screen.getByText("authentication_error")).toBeInTheDocument()
    })

    it("aggregates multiple failing providers", () => {
        render(
            <ApiKeyErrorBanner
                failures={[
                    ANTHROPIC_FAILURE,
                    {vendor: "OpenAI", result: {ok: false, status: 429, message: "slow down"}},
                ]}
                id="banner"
            />
        )

        expect(screen.getByText("Anthropic — Authentication failed (401)")).toBeInTheDocument()
        expect(screen.getByText("OpenAI — Rate limited (429)")).toBeInTheDocument()
    })

    it("toggles the raw response body", async () => {
        render(
            <ApiKeyErrorBanner
                failures={[ANTHROPIC_FAILURE]}
                id="banner"
            />
        )

        const toggle = screen.getByRole("button", {name: /View raw response/u})
        expect(toggle).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByText(/"type": "error"/u)).not.toBeInTheDocument()

        await user.click(toggle)

        expect(toggle).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByText(/"type": "error"/u)).toBeInTheDocument()
    })

    it("omits the status code and raw toggle when they are unknown", () => {
        render(
            <ApiKeyErrorBanner
                failures={[{vendor: "OpenAI", result: {ok: false, message: "network down"}}]}
                id="banner"
            />
        )

        expect(screen.getByText("OpenAI — Request failed")).toBeInTheDocument()
        expect(screen.queryByRole("button", {name: /View raw response/u})).not.toBeInTheDocument()
    })

    it.each([
        [400, "OpenAI — Bad request (400)"],
        [401, "OpenAI — Authentication failed (401)"],
        [403, "OpenAI — Access forbidden (403)"],
        [404, "OpenAI — Not found (404)"],
        [429, "OpenAI — Rate limited (429)"],
        [500, "OpenAI — Server error (500)"],
        [503, "OpenAI — Server error (503)"],
    ])("summarizes status %i as its title", (statusCode, expected) => {
        render(
            <ApiKeyErrorBanner
                failures={[{vendor: "OpenAI", result: {ok: false, status: statusCode}}]}
                id="banner"
            />
        )

        const banner = screen.getByTestId("banner")
        expect(within(banner).getByText(expected)).toBeInTheDocument()
    })
})
