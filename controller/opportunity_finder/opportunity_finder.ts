/**
 * Controller for Opportunity Finder chat requests
 */

import {OpportunityFinderRequestType} from "../../pages/api/gpt/opportunityFinder/types"
import {MessageWithKargs} from "../../pages/api/gpt/shared/types"
import {sendLlmRequest} from "../llm/llm_chat"

export async function sendOpportunityFinderRequest(
    userQuery: string,
    requestType: OpportunityFinderRequestType,
    callback: (token: string) => void,
    signal: AbortSignal,
    chatHistory: MessageWithKargs[]
) {
    await sendLlmRequest(callback, signal, "/api/gpt/opportunityFinder", {requestType}, userQuery, chatHistory)
}
