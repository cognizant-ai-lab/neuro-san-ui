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
    // The conversation text to display in thought bubbles
    text?: string
}

export const isFinalMessage = (chatMessage: {
    structure?: {tool_end?: boolean; total_tokens?: number}
    text?: string
}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.structure?.tool_end
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export const createConversation = (agents: string[] = [], text?: string): AgentConversation => ({
    // Could use crypto.randomUUID, but it's only available under HTTPS, and don't want to use a different
    // solution for HTTP on localhost.
    // eslint-disable-next-line newline-per-chained-call
    id: `conv_${Date.now()}${Math.random().toString(36).slice(2, 10)}`,
    agents: new Set(agents),
    startedAt: new Date(),
    text,
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

const processAgentCompletion = (conversations: AgentConversation[], tools: string[]): AgentConversation[] => {
    const toolsToRemove = new Set(tools)

    // For each conversation:
    // 1) Remove all agents whose tool is in toolsToRemove
    // 2) Only keep conversations that still have agents left
    return (
        conversations
            .map((conv) => {
                // Remove all matching tools from this conversation's agents
                const updatedAgents = new Set([...conv.agents].filter((agent) => !toolsToRemove.has(agent)))
                // Return a new conversation object with updated agents
                return {...conv, agents: updatedAgents}
            })
            // Filter out conversations that have no agents left
            .filter((conv) => conv.agents.size > 0)
    )
}

export const processChatChunk = (
    chunk: string,
    agentCountsMap: Map<string, number>,
    currentConversations: AgentConversation[] | null
): {
    success: boolean
    newCounts: Map<string, number>
    newConversations: AgentConversation[] | null
} => {
    try {
        const updatedConversations = [...(currentConversations || [])]

        // Get chat message if it's a known message type
        const chatMessage = chatMessageFromChunk(chunk)

        // If there are no origins in a chat message, return current state
        if (!chatMessage?.origin?.length) {
            return {
                success: true,
                newCounts: agentCountsMap,
                newConversations: currentConversations,
            }
        }

        // Update agent counts
        const updatedCounts = updateAgentCounts(agentCountsMap, chatMessage.origin)

        const isFinal = isFinalMessage(chatMessage)
        const agents: string[] = chatMessage.origin.map((originItem) => originItem.tool).filter(Boolean)

        let finalConversations: AgentConversation[] | null

        // Check if this is an AGENT message and if it's a final message, i.e. an end event
        if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
            const currentConversationsToUpdate = processAgentCompletion(updatedConversations, agents)
            finalConversations = currentConversationsToUpdate.length === 0 ? null : currentConversationsToUpdate
        } else {
            // Create a new conversation for this communication path
            let inquiryText: string | undefined
            const params = chatMessage.structure?.["params"]
            if (params && typeof params === "object" && "inquiry" in params) {
                inquiryText = (params as {inquiry?: string}).inquiry
            }
            // Show either inquiry (from structure) or chat message text
            const newConversation = createConversation(agents, inquiryText)
            updatedConversations.push(newConversation)
            finalConversations = updatedConversations
        }

        return {
            success: true,
            newCounts: updatedCounts,
            newConversations: finalConversations,
        }
    } catch (error) {
        sendNotification(NotificationType.error, "Agent conversation error")
        console.error("Agent conversation error:", error)
        return {
            success: false,
            newCounts: agentCountsMap,
            newConversations: currentConversations,
        }
    }
}
