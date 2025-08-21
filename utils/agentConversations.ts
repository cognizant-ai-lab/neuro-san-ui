import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {ChatMessageType} from "../generated/neuro-san/NeuroSanClient"
import {Origin} from "../generated/neuro-san/OpenAPITypes"

export interface AgentConversation {
    // Unique identifier for the conversation
    id: string
    // The specific agents involved in this conversation path
    agents: Set<string>
    // Timestamp when the conversation started
    startedAt: Date
}

export const isFinalMessage = (chatMessage: {
    structure?: {tool_end?: boolean; total_tokens?: number}
    text?: string
}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.structure?.tool_end
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export const createConversation = (): AgentConversation => ({
    id: `conv_${Date.now()}_${Math.random()}`,
    agents: new Set<string>(),
    startedAt: new Date(),
})

export const updateAgentCounts = (
    agentCountsMap: Map<string, number>,
    origins: readonly Origin[]
): Map<string, number> => {
    // Update agent counts.
    // Note: we increment an agent's count each time it appears in the origin info, but another strategy
    // would be to only count an agent when it is the "end destination" of the chain. Needs some thought to
    // determine which is more useful.
    return origins.reduce((acc, {tool}) => {
        // If the agent is not already in the counts map, initialize it to 0 aka "upsert"
        acc.set(tool, (acc.get(tool) || 0) + 1)
        return acc
    }, new Map(agentCountsMap))
}

export const addOrRemoveAgents = (
    conversation: AgentConversation,
    origins: readonly Origin[],
    isAdd: boolean
): AgentConversation => {
    const tools = origins.map((originData) => originData.tool).filter(Boolean)

    if (isAdd) {
        // Add agents to the conversation
        return {
            ...conversation,
            agents: new Set([...conversation.agents, ...tools]),
        }
    } else {
        // Remove agents from the conversation
        const toolsToRemove = new Set(tools)
        return {
            ...conversation,
            agents: new Set([...conversation.agents].filter((agent) => !toolsToRemove.has(agent))),
        }
    }
}

// Helper function to find which conversation an agent belongs to
export const findConversationWithAgent = (
    conversations: AgentConversation[],
    agentTool: string
): AgentConversation | null => {
    return conversations.find((conv) => conv.agents.has(agentTool)) || null
}

// Helper function to update a specific conversation in the conversations array
export const updateConversation = (
    conversations: AgentConversation[],
    conversationId: string,
    updatedConversation: AgentConversation
): AgentConversation[] => {
    return conversations.map((conv) => (conv.id === conversationId ? updatedConversation : conv))
}

// Helper function to remove a conversation from the conversations array
export const removeConversation = (conversations: AgentConversation[], conversationId: string): AgentConversation[] => {
    return conversations.filter((conv) => conv.id !== conversationId)
}

// Helper function to add a new conversation to the conversations array
export const addConversation = (
    conversations: AgentConversation[],
    newConversation: AgentConversation
): AgentConversation[] => {
    return [...conversations, newConversation]
}

// Helper function to process agent completion and reduce nesting
const processAgentCompletion = (
    conversations: AgentConversation[],
    tools: string[],
    origins: readonly Origin[]
): {updatedConversations: AgentConversation[]; conversationsChanged: boolean} => {
    let updatedConversations = conversations
    let conversationsChanged = false

    for (const tool of tools) {
        // Remove this agent from ALL conversations it appears in
        // This is important for the frontman which might be in multiple conversations
        const conversationsWithAgent = updatedConversations.filter((conv) => conv.agents.has(tool))

        for (const conversation of conversationsWithAgent) {
            // Create a proper Origin object for the tool
            const toolOrigin = origins.find((originItem) => originItem.tool === tool)
            if (toolOrigin) {
                const updatedConversation = addOrRemoveAgents(conversation, [toolOrigin], false)

                // If no agents remain in this conversation, remove it entirely
                if (updatedConversation.agents.size === 0) {
                    updatedConversations = removeConversation(updatedConversations, conversation.id)
                } else {
                    updatedConversations = updateConversation(
                        updatedConversations,
                        conversation.id,
                        updatedConversation
                    )
                }
                conversationsChanged = true
            }
        }
    }

    return {updatedConversations, conversationsChanged}
}

export const processChatChunk = (
    chunk: string,
    agentCountsMap: Map<string, number>,
    setAgentCounts: (counts: Map<string, number>) => void,
    setCurrentConversations: (conversations: AgentConversation[] | null) => void,
    currentConversations: AgentConversation[] = [] // last since this parameter has a default
): boolean => {
    try {
        // Get chat message if it's a known message type
        const chatMessage = chatMessageFromChunk(chunk)

        if (!chatMessage?.origin?.length) {
            return true
        }

        // Update agent counts
        const updatedCounts = updateAgentCounts(agentCountsMap, chatMessage.origin)
        setAgentCounts(updatedCounts)

        const isFinal = isFinalMessage(chatMessage)
        const tools = chatMessage.origin.map((originItem) => originItem.tool).filter(Boolean)

        // Check if this is an AGENT message and if it's a final message, i.e. an end event
        if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
            const {updatedConversations, conversationsChanged} = processAgentCompletion(
                currentConversations,
                tools,
                chatMessage.origin
            )

            // Always update conversations state to ensure UI re-renders
            // If no changes were made, create a new array reference to trigger state update
            const finalConversations =
                !conversationsChanged && updatedConversations.length > 0
                    ? [...updatedConversations]
                    : updatedConversations
            setCurrentConversations(finalConversations.length === 0 ? null : finalConversations)
        } else {
            // Handle adding agents to conversations - each message creates a new conversation path
            let updatedConversations = [...(currentConversations || [])]

            // Create a new conversation for this communication path
            const newConversation = createConversation()
            const updatedConversation = addOrRemoveAgents(newConversation, chatMessage.origin, true)
            updatedConversations = addConversation(updatedConversations, updatedConversation)
            setCurrentConversations(updatedConversations)
        }

        return true
    } catch (error) {
        console.error("Error processing chunk in agent tracking:", error)
        return false
    }
}
