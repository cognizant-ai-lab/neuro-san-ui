/**
 * Next.js API route to suggest icons for agents using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_AGENT_ICONS_PROMPT} from "./prompts"
import {AgentIconSuggestions} from "../../../../../packages/ui-common/controller/Types/AgentIconSuggestions"
import {handleLLMRequest} from "../Common/LlmHandler"
import {ErrorResponse} from "../Common/Types"

const handler = async (req: NextApiRequest, res: NextApiResponse<AgentIconSuggestions | ErrorResponse>) =>
    handleLLMRequest<AgentIconSuggestions | ErrorResponse>(req, res, {
        promptTemplate: SUGGEST_AGENT_ICONS_PROMPT,
        extractVariables: (request) => ({
            connectivity_info: request.body.connectivity_info,
            metadata: request.body.metadata,
        }),
    })

export default handler
