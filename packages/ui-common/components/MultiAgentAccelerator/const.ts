/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {ConnectivityInfo} from "../../generated/neuro-san/NeuroSanClient"

export const DEFAULT_FRONTMAN_X_POS = 150
export const DEFAULT_FRONTMAN_Y_POS = 450

// Minimum distance from center
export const BASE_RADIUS = 100

// Distance between depth levels
export const LEVEL_SPACING = 150

// Temporary folder name for networks created from agent reservations. These networks are not "in a folder" when
// they come from the backend, but we need to put them somewhere in the UI, and this makes it clear that they're
// temporary.
export const TEMPORARY_NETWORK_FOLDER = "temporary"

// We expect the agent reservations to be stored in sly_data under this key
export const AGENT_RESERVATIONS_KEY = "agent_reservations"

// We expect the agent network HOCON to be stored in sly_data under this key, if it is provided by the backend
export const AGENT_NETWORK_HOCON = "agent_network_hocon_text"

// The key in the message structure where connectivity info is stored for agent progress messages
export const AGENT_PROGRESS_CONNECTIVITY_KEY = "connectivity_info"

// Agent name for the special "Agent Network Designer" network
export const AGENT_NETWORK_DESIGNER_ID = "agent_network_designer"

// The key in sly_data where the agent network definition is stored
export const AGENT_NETWORK_DEFINITION_KEY = "agent_network_definition"

// The key in sly_data where the agent network name is stored
export const AGENT_NETWORK_NAME_KEY = "agent_network_name"

// The event name that needs to be fired for the app tour to start
export const TRIGGER_APP_TOUR_EVENT_NAME = "trigger-app-tour"

/**
 * A single agent entry within an agent network definition, as received in sly_data from the backend.
 * Extends ConnectivityInfo with editable instructions and description fields for the Agent Network Designer.
 */
export type AgentNetworkDefinitionEntry = ConnectivityInfo & {
    readonly instructions?: string
    readonly description?: string
}

/** Possible values for the `display_as` field in ConnectivityInfo / AgentNetworkDefinitionEntry. */
export enum DisplayAs {
    LLM_AGENT = "llm_agent",
    CODED_TOOL = "coded_tool",
    LANGCHAIN_TOOL = "langchain_tool",
    EXTERNAL_AGENT = "external_agent",
}

/**
 * Determines the frontman of an agent network — the single source of truth for "who is the frontman".
 *
 * The frontman is the agent with no parent: a "parent" agent (one that has tools) that is not itself
 * listed as a tool by any other agent. A lone single-agent network is its own frontman. Returns
 * undefined when no agent qualifies (e.g. a fully cyclic network); callers decide how to fall back.
 *
 * Consumed by the graph layouts (to seed the depth-0 node) and by the network import flow.
 */
export const getFrontman = <T extends ConnectivityInfo>(agents: readonly T[]): T | undefined => {
    // Parent agents are those that have tools; a single-agent network is treated as its own parent.
    const parentAgents = agents.length === 1 ? agents : agents.filter((agent) => (agent.tools?.length ?? 0) > 0)
    // Child agents are everything referenced as a tool by a parent.
    const childAgents = new Set(parentAgents.flatMap((agent) => agent.tools ?? []))
    return parentAgents.find((agent) => agent.origin !== undefined && !childAgents.has(agent.origin))
}

// Display expired temporary networks for this amount of time after they expire so users can see what happened
export const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes

// We show the tour modal after this amount of time so as not to "pounce" on the user when they first open the app
export const SHOW_TOUR_DELAY_MS = 5000
