/**
 * Common test data for agent-related tests, for consistency.
 */

import {cleanUpAgentName} from "../../packages/ui-common/components/AgentChat/Common/Utils"
import {TEMPORARY_NETWORK_FOLDER} from "../../packages/ui-common/components/MultiAgentAccelerator/const"
import {TemporaryNetwork} from "../../packages/ui-common/state/TemporaryNetworks"

// Define some test agents and associated display names
export const TEST_AGENT_MATH_GUY = "math-guy"
export const TEST_AGENT_MATH_GUY_DISPLAY = cleanUpAgentName(TEST_AGENT_MATH_GUY)

export const TEST_AGENT_MUSIC_NERD = "music-nerd"
export const TEST_AGENT_MUSIC_NERD_DISPLAY = cleanUpAgentName(TEST_AGENT_MUSIC_NERD)

export const TEST_DEEP_AGENT = "deep-agent"
export const TEST_DEEP_AGENT_DISPLAY = cleanUpAgentName(TEST_DEEP_AGENT)

// Folder name for test agents
export const TEST_AGENTS_FOLDER = "test-agents"
export const TEST_AGENTS_FOLDER_DISPLAY = cleanUpAgentName(TEST_AGENTS_FOLDER)

export const LEVEL_1_FOLDER = "level-1"
export const LEVEL_1_FOLDER_DISPLAY = cleanUpAgentName(LEVEL_1_FOLDER)

export const LEVEL_2_FOLDER = "level-2"
export const LEVEL_2_FOLDER_DISPLAY = cleanUpAgentName(LEVEL_2_FOLDER)

export const LIST_NETWORKS_RESPONSE = [
    {
        agent_name: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MATH_GUY}`,
        description: "",
        tags: ["tag1", "tag2", "tag3"],
    },
    {
        agent_name: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_MUSIC_NERD}`,
        description: "",
        tags: [],
    },
    {
        agent_name: "uncategorized-network-1",
        description: "",
        tags: [],
    },
    {
        agent_name: "uncategorized-network-2",
        description: "",
        tags: [],
    },
    {
        agent_name: `${TEST_AGENTS_FOLDER}/${LEVEL_1_FOLDER}/${LEVEL_2_FOLDER}/${TEST_DEEP_AGENT}`,
        description: "",
        tags: ["deep-agent-tag1", "deep-agent-tag2"],
    },
]

export const TEMPORARY_NETWORK_NAME = "temp_network1"

const TEMP_NETWORK_AGENT_INFO = {
    agent_name: `${TEMPORARY_NETWORK_FOLDER}/${TEMPORARY_NETWORK_NAME}`,
    description: "",
    tags: ["tag1", "tag2", "tag3"],
}

export const TEMPORARY_NETWORK: TemporaryNetwork = {
    reservation: {
        reservation_id: "temp-reservation-1",
        lifetime_in_seconds: 3600,
        expiration_time_in_seconds: Math.floor(Date.now() / 1000) + 3600,
    },
    agentInfo: TEMP_NETWORK_AGENT_INFO,
    networkHocon: JSON.stringify(TEMP_NETWORK_AGENT_INFO, null, 2),
}
