// Auto generated. Do not edit!

// @ts-expect-error TS2307: Module not found
// eslint-disable-next-line import/no-unresolved, @typescript-eslint/no-unused-vars
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
