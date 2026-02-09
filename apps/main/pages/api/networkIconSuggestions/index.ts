/**
 * Next.js API route to suggest icons for networks using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_NETWORK_ICONS_PROMPT} from "./prompts"
import {handleLLMRequest} from "../Common/LlmHandler"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    return handleLLMRequest(req, res, {
        promptTemplate: SUGGEST_NETWORK_ICONS_PROMPT,
        extractVariables: (request) => ({
            network_list: request.body,
        }),
    })
}

export default handler
