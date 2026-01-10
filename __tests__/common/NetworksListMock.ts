/**
 * Common test data for agent-related tests, for consistency.
 */

export const TEST_AGENT_MATH_GUY = "math-guy"
export const TEST_AGENT_MUSIC_NERD = "music-nerd"
export const TEST_DEEP_AGENT = "deep-agent"

// Folder name for test agents
export const TEST_AGENTS_FOLDER = "test-agents"
export const LEVEL_1_FOLDER = "level-1"
export const LEVEL_2_FOLDER = "level-2"

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
