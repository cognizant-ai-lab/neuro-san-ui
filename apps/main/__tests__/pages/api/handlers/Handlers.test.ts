import {ChatPromptTemplate} from "@langchain/core/prompts"
import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"
import {createMocks} from "node-mocks-http"

import agentIconSuggestionsHandler from "../../../../pages/api/agentIconSuggestions"
import brandingHandler from "../../../../pages/api/branding"
import {handleLLMRequest} from "../../../../pages/api/Common/LlmHandler"
import networkIconSuggestionsHandler from "../../../../pages/api/networkIconSuggestions"
jest.mock("../../../../pages/api/Common/LlmHandler")

describe("branding API handler", () => {
    type HandlerType = (req: NextApiRequest, res: NextApiResponse<unknown>) => Promise<void>

    const handlers: [string, HandlerType][] = [
        ["brandingHandler", brandingHandler],
        ["agentIconSuggestionsHandler", agentIconSuggestionsHandler],
        ["networkIconSuggestionsHandler", networkIconSuggestionsHandler],
    ]

    it.each(handlers)("returns a successful response when provided valid input (%s)", async (_name, handler) => {
        const {req, res} = createMocks({
            method: "POST",
            // body is irrelevant since we're mocking handleLLMRequest
            body: {company: "Test Company"},
        })

        ;(handleLLMRequest as jest.Mock).mockImplementationOnce(async (request, response, args) => {
            // exercise the supplied extractVariables function
            const variables = args.extractVariables(request)
            response.status(httpStatus.OK)
            response.end(JSON.stringify({variables}))
        })

        await handler(req, res)

        expect(handleLLMRequest).toHaveBeenCalledWith(req, res, {
            promptTemplate: expect.any(ChatPromptTemplate),
            extractVariables: expect.any(Function),
        })
        expect(res._getStatusCode()).toBe(httpStatus.OK)
    })

    it("handles unexpected errors gracefully", async () => {
        const {req, res} = createMocks({
            method: "POST",
            body: {company: "Test Company"},
        })

        ;(handleLLMRequest as jest.Mock).mockImplementationOnce(async (_req, response) => {
            response.status(httpStatus.INTERNAL_SERVER_ERROR)
            response.end("Internal Server Error")
        })

        await brandingHandler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.INTERNAL_SERVER_ERROR)
        expect(res._getData()).toContain("Internal Server Error")
    })
})
