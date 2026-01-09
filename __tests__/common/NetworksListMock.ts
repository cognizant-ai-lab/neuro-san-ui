/**
 * Common test data for agent-related tests, for consistency.
 */

export const TEST_AGENT_MATH_GUY = "math-guy"
export const TEST_AGENT_MUSIC_NERD = "music-nerd"
const TEST_AGENT_AIRLINE_POLICY = "airline-policy"

// Folder name for test agents
export const TEST_AGENTS_FOLDER = "test-agents"

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
        agent_name: `${TEST_AGENTS_FOLDER}/${TEST_AGENT_AIRLINE_POLICY}`,
        description: "",
        tags: [],
    },
    {
        agent_name: TEST_AGENT_AIRLINE_POLICY,
        description: "",
        tags: [],
    },
]
