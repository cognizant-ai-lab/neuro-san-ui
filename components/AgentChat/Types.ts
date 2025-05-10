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
