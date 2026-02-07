/**
 * Utility to create Next.js API route handlers that use LangChain and OpenAI.
 */

import type {ChatPromptTemplate} from "@langchain/core/prompts"
import {ChatOpenAI} from "@langchain/openai"
import httpStatus from "http-status"
import type {NextApiRequest, NextApiResponse} from "next"

interface LLMHandlerOptions {
    readonly allowedMethod: "GET" | "POST"
    readonly promptTemplate: ChatPromptTemplate
    readonly extractVariables: (req: NextApiRequest) => Record<string, unknown>
}

/**
 * Handles LLM requests using LangChain and OpenAI.
 *
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @param options - Configuration for the handler
 */
export const handleLLMRequest = async (
    req: NextApiRequest,
    res: NextApiResponse,
    {allowedMethod, promptTemplate, extractVariables}: LLMHandlerOptions
): Promise<void> => {
    if (req.method !== allowedMethod) {
        res.status(httpStatus.METHOD_NOT_ALLOWED).json({error: "Method not allowed"})
        return
    }

    const openAIApiKey = process.env["OPENAI_API_KEY"]
    if (!openAIApiKey) {
        console.error("Could not find OpenAI Key. Set the OPENAI_API_KEY environment variable.")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error: "Could not find OpenAI Key"})
        return
    }

    try {
        const variables = extractVariables(req)
        const formattedPrompt = await promptTemplate.formatMessages(variables)
        const response = await new ChatOpenAI({
            model: "gpt-4o",
            temperature: 0.7,
            openAIApiKey,
        }).invoke(formattedPrompt)

        // Assuming the response content is a JSON string, parse it before sending the response
        const parsedContent = JSON.parse(response.content as string)
        res.json(parsedContent)
    } catch (error) {
        console.error("Error:", error)
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({error: "Failed to get LLM response"})
    }
}
