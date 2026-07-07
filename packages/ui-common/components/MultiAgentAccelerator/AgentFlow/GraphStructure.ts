import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"

// "Parent agents" are those that have tools, aka agents with "child agents". A lone single-agent
// network is treated as its own parent.
export const getParentAgents = <T extends ConnectivityInfo>(agents: readonly T[]): readonly T[] =>
    agents.length === 1 ? agents : agents.filter((agent) => (agent.tools?.length ?? 0) > 0)

/**
 * Determines the frontman of an agent network — the single source of truth for "who is the frontman".
 *
 * The frontman is the agent with no parent: a "parent" agent (one that has tools) that is not itself
 * listed as a tool by any other agent. A lone single-agent network is its own frontman. Returns
 * undefined when no agent qualifies (e.g. a fully cyclic network); callers decide how to fall back.
 *
 * Consumed by the graph layouts (to seed the depth-0 node) and by the network import flow.
 */
export const getFrontman = (agents: readonly ConnectivityInfo[]): ConnectivityInfo | undefined => {
    const parentAgents = getParentAgents(agents)
    // Child agents are everything referenced as a tool by a parent.
    const childAgents = new Set(parentAgents.flatMap((agent) => agent.tools ?? []))
    return parentAgents.find((agent) => agent.origin !== undefined && !childAgents.has(agent.origin))
}

/**
 * Returns the "origins" (node names) of the _immediate_ parents of a node in the agent network. Grandparents and
 * higher are not included.
 *
 * @param node Node ID for which to find parents
 * @param parentAgents Full list of parent agents in the network
 * @returns The IDs of the immediate parent nodes for the given node or empty array if no parents are found (frontman)
 */
export const getParents = (node: string, parentAgents: readonly ConnectivityInfo[]): string[] =>
    parentAgents.filter((agent) => agent.tools.includes(node)).map((parentNode) => parentNode.origin)
