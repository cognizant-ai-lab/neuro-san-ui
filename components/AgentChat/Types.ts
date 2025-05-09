// @ts-expect-error TS2307: Module not found
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {components} from "../../generated/neuro-san/NeuroSanClient"

// @ts-prune-ignore-next
export enum LegacyAgentType {
    OpportunityFinder = "OpportunityFinder",
    ScopingAgent = "ScopingAgent",
    DataGenerator = "DataGenerator",
    DMSChat = "DMSChat",
    ChatBot = "ChatBot",
}

// @ts-prune-ignore-next
export const isLegacyAgentType = (agent: string) => {
    return Object.keys(LegacyAgentType).includes(agent)
}

// @ts-prune-ignore-next
export type CombinedAgentType = LegacyAgentType | string

/**
 * Models the error we receive from neuro-san agents.
 */
// @ts-prune-ignore-next
export interface AgentErrorProps {
    error: string
    traceback?: string
    tool?: string
}
