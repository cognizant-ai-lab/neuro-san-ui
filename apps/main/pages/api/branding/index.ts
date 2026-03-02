/**
 * Next.js API route to provide branding colors using LangChain and OpenAI.
 */

import {NextApiRequest, NextApiResponse} from "next"

import {SUGGEST_BRANDING_COLORS_PROMPT} from "./prompts"
import {BrandingSuggestions} from "../../../../../packages/ui-common/controller/Types/Branding"
import {handleLLMRequest} from "../Common/LlmHandler"
import {ErrorResponse} from "../Common/Types"

const handler = async (req: NextApiRequest, res: NextApiResponse<BrandingSuggestions | ErrorResponse>) => {
    return handleLLMRequest<BrandingSuggestions | ErrorResponse>(req, res, {
        promptTemplate: SUGGEST_BRANDING_COLORS_PROMPT,
        extractVariables: (request) => ({
            company: request.body.company,
        }),
    })
}

export default handler
