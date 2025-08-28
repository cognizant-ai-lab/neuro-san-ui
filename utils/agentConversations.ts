import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {NotificationType, sendNotification} from "../components/Common/notification"
import {ChatMessageType, Origin} from "../generated/neuro-san/NeuroSanClient"

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

export const createConversation = (agents: string[] = []): AgentConversation => ({
    id: `conv_${Date.now()}_${Math.random()}`,
    agents: new Set(agents),
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

// Helper function to process agent completion
const processAgentCompletion = (
    conversations: AgentConversation[],
    tools: string[],
    origins: readonly Origin[]
): AgentConversation[] => {
    let updatedConversations = conversations

    for (const tool of tools) {
        // Filter conversations with agent
        const conversationsWithAgent = updatedConversations.filter((conv) => conv.agents.has(tool))

        for (const conversation of conversationsWithAgent) {
            // Create a proper Origin object for the tool
            const toolOrigin = origins.find((originItem) => originItem.tool === tool)
            if (toolOrigin) {
                // Remove agents from the conversation
                const toolsToRemove = new Set([toolOrigin.tool])
                const updatedConversation = {
                    ...conversation,
                    agents: new Set([...conversation.agents].filter((agent) => !toolsToRemove.has(agent))),
                }
                // If no agents remain in this conversation, remove it entirely
                if (updatedConversation.agents.size === 0) {
                    updatedConversations = updatedConversations.filter((conv) => conv.id !== conversation.id)
                } else {
                    updatedConversations = updatedConversations.map((conv) =>
                        conv.id === conversation.id ? updatedConversation : conv
                    )
                }
            }
        }
    }

    return updatedConversations
}

export const processChatChunk = (
    chunk: string,
    agentCountsMap: Map<string, number>,
    currentConversations: AgentConversation[] | null,
    setAgentCounts: (counts: Map<string, number>) => void,
    setCurrentConversations: (conversations: AgentConversation[] | null) => void
): boolean => {
    try {
        const updatedConversations = [...(currentConversations || [])]

        // Get chat message if it's a known message type
        const chatMessage = chatMessageFromChunk(chunk)

        // If there are no origins in a chat message, return
        // TODO: Is this a valid case to keep?
        if (!chatMessage?.origin?.length) {
            return true
        }

        // Update agent counts
        const updatedCounts = updateAgentCounts(agentCountsMap, chatMessage.origin)
        setAgentCounts(updatedCounts)

        const isFinal = isFinalMessage(chatMessage)
        const agents: string[] = chatMessage.origin.map((originItem) => originItem.tool).filter(Boolean)

        // Check if this is an AGENT message and if it's a final message, i.e. an end event
        if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
            const currentConversationsToUpdate = processAgentCompletion(updatedConversations, agents, chatMessage.origin)
            setCurrentConversations(currentConversationsToUpdate.length === 0 ? null : currentConversationsToUpdate)
        } else {
            // Create a new conversation for this communication path
            const newConversation = createConversation(agents)
            updatedConversations.push(newConversation)
            setCurrentConversations(updatedConversations)
        }

        return true
    } catch (error) {
        sendNotification(NotificationType.error, "Agent conversation error")
        console.error("Agent conversation error:", error)
        return false
    }
}
