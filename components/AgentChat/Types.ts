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

  
export type AgentInfo = components["schemas"]["AgentInfo"]
export type ChatContext = components["schemas"]["ChatContext"]
export type ChatFilter = components["schemas"]["ChatFilter"]
export type ChatHistory = components["schemas"]["ChatHistory"]
export type ChatMessage = components["schemas"]["ChatMessage"]
export type ChatRequest = components["schemas"]["ChatRequest"]
export type ChatResponse = components["schemas"]["ChatResponse"]
export type ConciergeResponse = components["schemas"]["ConciergeResponse"]
export type ConnectivityInfo = components["schemas"]["ConnectivityInfo"]
export type ConnectivityResponse = components["schemas"]["ConnectivityResponse"]
export type Function = components["schemas"]["Function"]
export type FunctionResponse = components["schemas"]["FunctionResponse"]
export type GoogleProtobufAny = components["schemas"]["GoogleProtobufAny"]
export type MimeData = components["schemas"]["MimeData"]
export type Origin = components["schemas"]["Origin"]
export type Status = components["schemas"]["Status"]
