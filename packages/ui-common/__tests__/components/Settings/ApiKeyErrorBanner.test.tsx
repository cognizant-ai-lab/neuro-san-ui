import {render, screen, within} from "@testing-library/react"
import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ApiKeyErrorBanner, ApiKeyFailure} from "../../../components/Settings/ApiKeyErrorBanner"
import {KeyValidationFailure} from "../../../controller/llm/Providers"

// Base result used for both providers
const BASE_401_RESULT: KeyValidationFailure = {ok: false, status: httpStatus.UNAUTHORIZED}

// The banner header renders "<vendor> — <httpStatus reason phrase> (<status>)".
const bannerTitle = (vendor: string, statusCode: number) =>
    `${vendor} — ${httpStatus[statusCode] ?? "Unknown status"} (${statusCode})`

const ANTHROPIC_AUTH_FAILED_TITLE = bannerTitle("Anthropic", httpStatus.UNAUTHORIZED)
const ANTHROPIC_INVALID_KEY_MESSAGE = "API key is invalid."
const ANTHROPIC_INVALID_KEY_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {
        ok: false,
        status: httpStatus.UNAUTHORIZED,
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

const OPENAI_AUTH_FAILED_TITLE = bannerTitle("OpenAI", httpStatus.UNAUTHORIZED)
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

        screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)
        screen.getByText(ANTHROPIC_INVALID_KEY_MESSAGE)
    })

    it("surfaces an Anthropic 401 CORS message", () => {
        renderBanner([ANTHROPIC_CORS_FAILURE])

        screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)
        screen.getByText(ANTHROPIC_CORS_MESSAGE)
    })

    it("surfaces an OpenAI 401 invalid key message", () => {
        renderBanner([OPENAI_INVALID_KEY_FAILURE])

        screen.getByText(OPENAI_AUTH_FAILED_TITLE)
        screen.getByText(OPENAI_INVALID_KEY_MESSAGE)
    })

    it("reports a network/CORS error as a status-less request failure", () => {
        renderBanner([OPENAI_NETWORK_FAILURE])

        screen.getByText("OpenAI — Request failed")
        screen.getByText(OPENAI_NETWORK_ERROR_MESSAGE)
    })

    it.each([
        httpStatus.BAD_REQUEST,
        httpStatus.UNAUTHORIZED,
        httpStatus.FORBIDDEN,
        httpStatus.NOT_FOUND,
        httpStatus.TOO_MANY_REQUESTS,
        httpStatus.INTERNAL_SERVER_ERROR,
    ])("maps status %i to its banner title", (statusCode) => {
        renderBanner([{vendor: "OpenAI", result: {ok: false, status: statusCode}}])

        const banner = screen.getByRole("alert")
        expect(within(banner).getByText(bannerTitle("OpenAI", statusCode))).toBeInTheDocument()
    })
})
