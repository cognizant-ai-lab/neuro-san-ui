import {render, screen, within} from "@testing-library/react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ApiKeyErrorBanner, ApiKeyFailure} from "../../../components/Settings/ApiKeyErrorBanner"

// Base result used for both providers
const BASE_401_RESULT = {ok: false, status: 401}

const ANTHROPIC_AUTH_FAILED_TITLE = "Anthropic — Authentication failed (401)"
const ANTHROPIC_INVALID_KEY_MESSAGE = "API key is invalid."
const ANTHROPIC_INVALID_KEY_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {
        ok: false,
        status: 401,
        message: ANTHROPIC_INVALID_KEY_MESSAGE,
    },
}
const ANTHROPIC_CORS_MESSAGE =
    "CORS requests are not allowed for this Organization because of its settings. " +
    "If you believe this in error, contact support at https://support.anthropic.com/."
const ANTHROPIC_CORS_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {...BASE_401_RESULT, message: ANTHROPIC_CORS_MESSAGE},
}

const OPENAI_AUTH_FAILED_TITLE = "OpenAI — Authentication failed (401)"
const OPENAI_INVALID_KEY_MESSAGE =
    "Incorrect API key provided: ***. You can find your API key at https://platform.openai.com/account/api-keys."
const OPENAI_INVALID_KEY_FAILURE: ApiKeyFailure = {
    vendor: "OpenAI",
    result: {...BASE_401_RESULT, message: OPENAI_INVALID_KEY_MESSAGE},
}

// A thrown network/CORS error yields a failure with no status (see validateKey's catch).
const OPENAI_NETWORK_ERROR_MESSAGE = "Failed to fetch"
const OPENAI_NETWORK_FAILURE: ApiKeyFailure = {
    vendor: "OpenAI",
    result: {ok: false, message: OPENAI_NETWORK_ERROR_MESSAGE},
}

const renderBanner = (failures: readonly ApiKeyFailure[]) =>
    render(
        <ApiKeyErrorBanner
            failures={failures}
            id="banner"
        />
    )

describe("ApiKeyErrorBanner", () => {
    withStrictMocks()

    it("renders nothing when there are no failures", () => {
        const {container} = renderBanner([])
        expect(container).toBeEmptyDOMElement()
    })

    it("surfaces an Anthropic 401 invalid key message", () => {
        renderBanner([ANTHROPIC_INVALID_KEY_FAILURE])

        expect(screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)).toBeInTheDocument()
        expect(screen.getByText(ANTHROPIC_INVALID_KEY_MESSAGE)).toBeInTheDocument()
    })

    it("surfaces an Anthropic 401 CORS message", () => {
        renderBanner([ANTHROPIC_CORS_FAILURE])

        expect(screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)).toBeInTheDocument()
        expect(screen.getByText(ANTHROPIC_CORS_MESSAGE)).toBeInTheDocument()
    })

    it("surfaces an OpenAI 401 invalid key message", () => {
        renderBanner([OPENAI_INVALID_KEY_FAILURE])

        expect(screen.getByText(OPENAI_AUTH_FAILED_TITLE)).toBeInTheDocument()
        expect(screen.getByText(OPENAI_INVALID_KEY_MESSAGE)).toBeInTheDocument()
    })

    it("reports a network/CORS error as a status-less request failure", () => {
        renderBanner([OPENAI_NETWORK_FAILURE])

        expect(screen.getByText("OpenAI — Request failed")).toBeInTheDocument()
        expect(screen.getByText(OPENAI_NETWORK_ERROR_MESSAGE)).toBeInTheDocument()
    })

    it.each([
        [400, "OpenAI — Bad request (400)"],
        [401, OPENAI_AUTH_FAILED_TITLE],
        [403, "OpenAI — Access forbidden (403)"],
        [404, "OpenAI — Not found (404)"],
        [429, "OpenAI — Rate limited (429)"],
        [500, "OpenAI — Server error (500)"],
    ])("maps status %i to its banner title", (statusCode, expected) => {
        renderBanner([{vendor: "OpenAI", result: {ok: false, status: statusCode}}])

        const banner = screen.getByTestId("banner")
        expect(within(banner).getByText(expected)).toBeInTheDocument()
    })
})
