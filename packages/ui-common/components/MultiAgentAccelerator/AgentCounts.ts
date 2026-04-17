import {Origin as NSOrigin} from "../../generated/neuro-san/NeuroSanClient"

/**
 * Given a map of agent counts and a list of origins, return an updated map of agent counts that includes the
 * counts from the origins.
 * @param agentCountsMap Existing map of agent counts, where the key is the agent name and the value is the
 * count of that agent.
 * @param origins List of origins, where each origin has a "tool" property that corresponds to an agent name.
 * @return Updated map of agent counts that includes counts from the origins. If an agent from the origins is not
 * already in the map, it will be added with a count of 1. If it is already in the map, its count will be
 * incremented by 1.
 */
export const getUpdatedAgentCounts = (
    agentCountsMap: Map<string, number>,
    origins: readonly NSOrigin[]
): Map<string, number> => {
    if (!origins?.length) {
        // If there are no origins, return the existing counts map without modification
        return agentCountsMap
    }

    return origins.reduce((acc, {tool}) => {
        // If the agent is not already in the counts map, initialize it to 0 aka "upsert"
        acc.set(tool, (acc.get(tool) || 0) + 1)
        return acc
    }, new Map(agentCountsMap))
}
