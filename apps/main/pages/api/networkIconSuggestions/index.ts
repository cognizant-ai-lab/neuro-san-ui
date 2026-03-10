/**
 * Next.js API route to suggest icons for networks using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_NETWORK_ICONS_PROMPT} from "./prompts"
import {NetworkIconSuggestions} from "../../../../../packages/ui-common/controller/Types/NetworkIconSuggestions"
import {handleLLMRequest} from "../Common/LlmHandler"
import {ErrorResponse} from "../Common/Types"

const handler = async (req: NextApiRequest, res: NextApiResponse<NetworkIconSuggestions | ErrorResponse>) => {
    return handleLLMRequest<NetworkIconSuggestions | ErrorResponse>(req, res, {
        promptTemplate: SUGGEST_NETWORK_ICONS_PROMPT,
        extractVariables: (request) => ({
            network_list: request.body.networks,
        }),
    })
}

export default handler
