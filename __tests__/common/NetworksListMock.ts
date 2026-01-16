/**
 * Common test data for agent-related tests, for consistency.
 */
import {cleanUpAgentName} from "../../packages/ui-common/components/AgentChat/Utils"

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
