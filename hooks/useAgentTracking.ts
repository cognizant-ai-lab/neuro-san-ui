import {useCallback, useMemo, useRef, useState} from "react"

import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {ChatMessageType} from "../generated/neuro-san/NeuroSanClient"
import {Origin} from "../generated/neuro-san/OpenAPITypes"

enum ConversationType {
    AGENT_TO_AGENT = "agent-to-agent",
    AGENT_TO_TOOL = "agent-to-tool",
}

interface Conversation {
    // The set of agents involved in this conversation
    agents: Set<string>
    // Timestamp when the conversation started
    startedAt: Date
    // Current origin information for active agents
    currentOrigins: Origin[]
    // Type of conversation (could evolve to include different conversation types)
    type: ConversationType
    // Whether this conversation is currently active
    isActive: boolean
}

interface UseAgentTrackingReturn {
    agentCounts: Map<string, number>
    conversations: Map<Date, Conversation>
    currentConversation: Conversation | null
    isProcessing: boolean
    onChunkReceived: (chunk: string) => boolean
    onStreamingComplete: () => void
    onStreamingStarted: () => void
    resetTracking: () => void
}

// Helper function to determine if a message is a final response
const isFinalMessage = (chatMessage: {structure?: {total_tokens?: number}; text?: string}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.text?.startsWith("Got result:")
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export function useAgentTracking(): UseAgentTrackingReturn {
    const [conversations, setConversations] = useState<Map<Date, Conversation>>(new Map())
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const agentCountsRef = useRef<Map<string, number>>(new Map())

    // Helper function to create a new conversation
    const createConversation = useCallback((): Conversation => {
        return {
            agents: new Set<string>(),
            startedAt: new Date(),
            currentOrigins: [],
            type: ConversationType.AGENT_TO_AGENT,
            isActive: true,
        }
    }, [])

    // Helper function to update agent counts
    const updateAgentCounts = useCallback((origins: readonly Origin[]) => {
        const agentCounts = agentCountsRef.current
        for (const agent of origins) {
            if (agent.tool) {
                agentCounts.set(agent.tool, (agentCounts.get(agent.tool) || 0) + 1)
            }
        }
    }, [])

    // Helper function to add agents to current conversation
    const addAgentsToConversation = useCallback((conversation: Conversation, origins: readonly Origin[]) => {
        const newAgents = new Set(conversation.agents)
        origins.forEach((originData) => {
            if (originData.tool) {
                newAgents.add(originData.tool)
            }
        })
        return {
            ...conversation,
            agents: newAgents,
            currentOrigins: [...origins],
        }
    }, [])

    // Helper function to remove completed agents from conversation
    const removeCompletedAgents = useCallback((conversation: Conversation, completedOrigins: readonly Origin[]) => {
        const remainingAgents = new Set(conversation.agents)
        completedOrigins.forEach((originData) => {
            if (originData.tool) {
                remainingAgents.delete(originData.tool)
            }
        })
        return {
            ...conversation,
            agents: remainingAgents,
            currentOrigins: conversation.currentOrigins.filter(
                (originData) => !completedOrigins.some((completed) => completed.tool === originData.tool)
            ),
        }
    }, [])

    const onChunkReceived = useCallback(
        (chunk: string): boolean => {
            setIsProcessing(true)

            try {
                const chatMessage = chatMessageFromChunk(chunk)

                if (!chatMessage?.origin?.length) {
                    return true
                }

                // Update agent counts
                updateAgentCounts(chatMessage.origin)

                // Ensure we have a current conversation
                setCurrentConversation((prevConversation) => {
                    let conversation = prevConversation
                    if (!conversation) {
                        conversation = createConversation()
                    }

                    const isFinal = isFinalMessage(chatMessage)

                    if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
                        // Remove completed agents from conversation
                        return removeCompletedAgents(conversation, chatMessage.origin)
                    } else {
                        // Add new agents to conversation
                        return addAgentsToConversation(conversation, chatMessage.origin)
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
        [updateAgentCounts, createConversation, addAgentsToConversation, removeCompletedAgents]
    )

    const onStreamingStarted = useCallback(() => {
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(true)
        // Create a new conversation for the new streaming session
        const newConversation = createConversation()
        setCurrentConversation(newConversation)
        setConversations((prev) => {
            const newConversations = new Map(prev)
            newConversations.set(newConversation.startedAt, newConversation)
            return newConversations
        })
    }, [createConversation])

    const onStreamingComplete = useCallback(() => {
        setIsProcessing(false)
        // Mark current conversation as inactive
        setCurrentConversation((prev) => {
            if (prev) {
                const completedConversation = {...prev, isActive: false}
                setConversations((conversationData) => {
                    const updated = new Map(conversationData)
                    updated.set(prev.startedAt, completedConversation)
                    return updated
                })
                return null
            }
            return prev
        })
    }, [])

    const resetTracking = useCallback(() => {
        setCurrentConversation(null)
        setConversations(new Map())
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(false)
    }, [])

    // Memoize the agent counts to prevent unnecessary re-renders
    const agentCounts = useMemo(() => agentCountsRef.current, [agentCountsRef.current])

    return {
        agentCounts,
        conversations,
        currentConversation,
        isProcessing,
        onChunkReceived,
        onStreamingComplete,
        onStreamingStarted,
        resetTracking,
    }
}
