import {AgentType as NeuroSanAgentType} from "../../generated/metadata"

export type LegacyAgentType = "OpportunityFinder" | "ScopingAgent" | "DataGenerator" | "OrchestrationAgent"

export type CombinedAgentType = LegacyAgentType | NeuroSanAgentType
