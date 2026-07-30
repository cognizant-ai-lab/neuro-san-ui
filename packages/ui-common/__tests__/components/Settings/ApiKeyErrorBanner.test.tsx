import {render, screen} from "@testing-library/react"
import httpStatus from "http-status"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {ApiKeyErrorBanner, ApiKeyFailure, errorTitle} from "../../../components/Settings/ApiKeyErrorBanner"
import {KeyValidationFailure} from "../../../controller/llm/Providers"

// Base result reused across the 401 cases.
const BASE_401_RESULT: KeyValidationFailure = {ok: false, status: httpStatus.UNAUTHORIZED}

const ANTHROPIC_INVALID_KEY_MESSAGE = "Anthropic invalid key error message"
const ANTHROPIC_INVALID_KEY_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {...BASE_401_RESULT, message: ANTHROPIC_INVALID_KEY_MESSAGE},
}
const ANTHROPIC_CORS_MESSAGE = "Anthropic CORS error message"
const ANTHROPIC_CORS_FAILURE: ApiKeyFailure = {
    vendor: "Anthropic",
    result: {...BASE_401_RESULT, message: ANTHROPIC_CORS_MESSAGE},
}
const ANTHROPIC_NO_MESSAGE_FAILURE: ApiKeyFailure = {vendor: "Anthropic", result: BASE_401_RESULT}

const OPENAI_INVALID_KEY_MESSAGE = "OpenAI invalid key error message"
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

const ANTHROPIC_AUTH_FAILED_TITLE = errorTitle(ANTHROPIC_INVALID_KEY_FAILURE)
const OPENAI_AUTH_FAILED_TITLE = errorTitle(OPENAI_INVALID_KEY_FAILURE)
const OPENAI_NETWORK_TITLE = errorTitle(OPENAI_NETWORK_FAILURE)

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

        screen.getByText(OPENAI_NETWORK_TITLE)
        screen.getByText(OPENAI_NETWORK_ERROR_MESSAGE)
    })

    it("omits the message line when the failure has none", () => {
        renderBanner([ANTHROPIC_NO_MESSAGE_FAILURE])

        screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)
        expect(screen.queryByTestId(/-message$/u)).not.toBeInTheDocument()
    })

    it("renders a row for every failing provider", () => {
        renderBanner([ANTHROPIC_INVALID_KEY_FAILURE, OPENAI_INVALID_KEY_FAILURE])

        screen.getByText(ANTHROPIC_AUTH_FAILED_TITLE)
        screen.getByText(OPENAI_AUTH_FAILED_TITLE)
    })
})

describe("errorTitle", () => {
    // Pins the branch the render tests can't reach: a status with no http-status phrase.
    it("falls back to 'Unknown status' when the status has no reason phrase", () => {
        const failure: ApiKeyFailure = {vendor: "OpenAI", result: {ok: false, status: 599}}

        expect(errorTitle(failure)).toBe("OpenAI — Unknown status (599)")
    })
})
