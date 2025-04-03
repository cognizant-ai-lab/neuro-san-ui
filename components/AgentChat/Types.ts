import {AgentType as NeuroSanAgentType} from "../../generated/metadata"

// eslint-disable-next-line no-shadow
export enum LegacyAgentType {
    OpportunityFinder = "OpportunityFinder",
    ScopingAgent = "ScopingAgent",
    DataGenerator = "DataGenerator",
    DMSChat = "DMSChat",
    ChatBot = "ChatBot",
}

export type CombinedAgentType = LegacyAgentType | NeuroSanAgentType

/**
 * Models the error we receive from neuro-san agents.
 */
export interface AgentErrorProps {
    error: string
    traceback?: string
    tool?: string
}
