/**
 * Next.js API route to suggest icons for agents using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_AGENT_ICONS_PROMPT} from "./prompts"
import {handleLLMRequest} from "../Common/LlmHandler"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    return handleLLMRequest(req, res, {
        allowedMethod: "POST",
        promptTemplate: SUGGEST_AGENT_ICONS_PROMPT,
        extractVariables: (request) => ({
            connectivity_info: request.body.connectivity_info,
            metadata: request.body.metadata,
        }),
    })
}

export default handler
