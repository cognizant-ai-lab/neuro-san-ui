import {useCallback, useRef, useState} from "react"

import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {ChatMessageType} from "../generated/neuro-san/NeuroSanClient"
import {Origin} from "../generated/neuro-san/OpenAPITypes"

export interface AgentConversations {
    // The set of agents involved in the conversations
    agents: Set<string>
    // Timestamp when the conversation started
    startedAt: Date
}

interface AgentConversationsState {
    agentCounts: Map<string, number>
    currentConversations: AgentConversations | null
    isProcessing: boolean
    onChunkReceived: (chunk: string) => boolean
    onStreamingComplete: () => void
    onStreamingStarted: () => void
}

const isFinalMessage = (chatMessage: {
    structure?: {tool_end?: boolean; total_tokens?: number}
    text?: string
}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.structure?.tool_end
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export function useAgentConversations(): AgentConversationsState {
    const [currentConversations, setCurrentConversations] = useState<AgentConversations | null>(null)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const agentCountsRef = useRef<Map<string, number>>(new Map())

    const createConversation = useCallback((): AgentConversations => {
        return {
            agents: new Set<string>(),
            startedAt: new Date(),
        }
    }, [])

    const updateAgentCounts = useCallback((origins: readonly Origin[]): void => {
        // Update agent counts.
        // Note: we increment an agent's count each time it appears in the origin info, but another strategy
        // would be to only count an agent when it is the "end destination" of the chain. Needs some thought to
        // determine which is more useful.
        agentCountsRef.current = origins.reduce((acc, {tool}) => {
            // If the agent is not already in the counts map, initialize it to 0 aka "upsert"
            acc.set(tool, (acc.get(tool) || 0) + 1)
            return acc
        }, new Map(agentCountsRef.current))
    }, [])

    const conversationWithNewAgents = useCallback(
        (conversations: AgentConversations, origins: readonly Origin[]): AgentConversations => {
            const newTools = origins.map((originData) => originData.tool).filter(Boolean)
            return {
                ...conversations,
                agents: new Set([...conversations.agents, ...newTools]),
            }
        },
        []
    )

    const conversationWithRemainingAgents = useCallback(
        (conversations: AgentConversations, completedOrigins: readonly Origin[]): AgentConversations => {
            const completedTools = new Set(
                completedOrigins.map((completedOrigin) => completedOrigin.tool).filter(Boolean)
            )
            return {
                ...conversations,
                agents: new Set([...conversations.agents].filter((agent) => !completedTools.has(agent))),
            }
        },
        []
    )

    const onChunkReceived = useCallback(
        (chunk: string): boolean => {
            setIsProcessing(true)

            try {
                // Get chat message if it's a known message type
                const chatMessage = chatMessageFromChunk(chunk)

                if (!chatMessage?.origin?.length) {
                    return true
                }

                updateAgentCounts(chatMessage.origin)

                // Track current conversations
                setCurrentConversations((prevConversation) => {
                    let conversation = prevConversation
                    if (!conversation) {
                        conversation = createConversation()
                    }

                    const isFinal = isFinalMessage(chatMessage)

                    // Check if this is an AGENT message and if it's a final message, i.e. an end event
                    if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
                        // Updated conversation with remaining agents
                        const updatedConversation = conversationWithRemainingAgents(conversation, chatMessage.origin)

                        // If no agents remain, set conversation to null
                        if (updatedConversation.agents.size === 0) {
                            return null
                        }

                        return updatedConversation
                    } else {
                        // Updated conversation with newly added agents
                        return conversationWithNewAgents(conversation, chatMessage.origin)
                    }
                })

                return true
            } catch (error) {
                console.error("Error processing chunk in agent tracking:", error)
                return false
            } finally {
                setIsProcessing(false)
            }
        },
        [conversationWithNewAgents, conversationWithRemainingAgents, createConversation, updateAgentCounts]
    )

    const onStreamingStarted = useCallback((): void => {
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(true)
        // Create a new conversation for the new streaming session
        const newConversation = createConversation()
        setCurrentConversations(newConversation)
    }, [createConversation])

    const onStreamingComplete = useCallback((): void => {
        setCurrentConversations(null)
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(false)
    }, [])

    return {
        agentCounts: agentCountsRef.current,
        currentConversations,
        isProcessing,
        onChunkReceived,
        onStreamingComplete,
        onStreamingStarted,
    }
}
