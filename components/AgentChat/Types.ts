import {components} from "../../generated/neuro-san/NeuroSanClient"

export enum LegacyAgentType {
    OpportunityFinder = "OpportunityFinder",
    ScopingAgent = "ScopingAgent",
    DataGenerator = "DataGenerator",
    DMSChat = "DMSChat",
    ChatBot = "ChatBot",
}

export const isLegacyAgentType = (agent: string) => {
    return Object.keys(LegacyAgentType).includes(agent)
}

export type CombinedAgentType = LegacyAgentType | string

/**
 * Models the error we receive from neuro-san agents.
 */
export interface AgentErrorProps {
    error: string
    traceback?: string
    tool?: string
}

export type ChatContext = components["schemas"]["ChatContext"]
export type ChatMessage = components["schemas"]["ChatMessage"]
export type ChatRequest = components["schemas"]["ChatRequest"]
export type ChatResponse = components["schemas"]["ChatResponse"]
export type ConciergeResponse = components["schemas"]["ConciergeResponse"]
export type ConnectivityInfo = components["schemas"]["ConnectivityInfo"]
export type FunctionResponse = components["schemas"]["FunctionResponse"]
export type ConnectivityResponse = components["schemas"]["ConnectivityResponse"]
export type Origin = components["schemas"]["Origin"]
