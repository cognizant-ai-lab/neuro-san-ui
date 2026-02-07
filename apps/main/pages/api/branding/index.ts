/**
 * Next.js API route to provide branding colors using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_BRANDING_COLORS_PROMPT} from "./prompts"
import {handleLLMRequest} from "../Common/LlmHandler"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    return handleLLMRequest(req, res, {
        allowedMethod: "GET",
        promptTemplate: SUGGEST_BRANDING_COLORS_PROMPT,
        extractVariables: (request) => ({
            company: request.query["company"] as string,
        }),
    })
}

export default handler
