import {useCallback, useRef, useState} from "react"

import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {ChatMessageType} from "../generated/neuro-san/NeuroSanClient"
import {Origin} from "../generated/neuro-san/OpenAPITypes"

export enum ConversationType {
    AGENT_TO_AGENT = "agent-to-agent",
    AGENT_TO_TOOL = "agent-to-tool",
}

export interface Conversation {
    // The set of agents involved in this conversation
    agents: Set<string>
    // Timestamp when the conversation started
    startedAt: Date
    // Current origin information for active agents
    currentOrigins: Origin[]
    // Type of conversation (could evolve to include different conversation types)
    type: ConversationType
}

interface UseAgentTrackingReturn {
    agentCounts: Map<string, number>
    conversations: Map<number, Conversation>
    currentConversation: Conversation | null
    isProcessing: boolean
    onChunkReceived: (chunk: string) => boolean
    onStreamingComplete: () => void
    onStreamingStarted: () => void
}

// Helper function to determine if a message is a final response
const isFinalMessage = (chatMessage: {structure?: {total_tokens?: number}; text?: string}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.text?.startsWith("Got result:")
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

export function useAgentTracking(): UseAgentTrackingReturn {
    const [conversations, setConversations] = useState<Map<number, Conversation>>(new Map())
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
        }
    }, [])

    // Helper function to update agent counts
    const updateAgentCounts = useCallback((origins: readonly Origin[]) => {
        const agentCounts = agentCountsRef.current
        origins
            .map((originData) => originData.tool)
            .reduce((_, tool) => {
                agentCounts.set(tool, (agentCounts.get(tool) || 0) + 1)
                return agentCounts
            }, agentCounts)
    }, [])

    // Helper function to add agents to current conversation
    const addAgentsToConversation = useCallback((conversation: Conversation, origins: readonly Origin[]) => {
        const newTools = origins.map((originData) => originData.tool).filter(Boolean)
        return {
            ...conversation,
            agents: new Set([...conversation.agents, ...newTools]),
            currentOrigins: [...origins],
        }
    }, [])

    // Helper function to remove completed agents from conversation
    const removeCompletedAgents = useCallback((conversation: Conversation, completedOrigins: readonly Origin[]) => {
        const completedTools = new Set(completedOrigins.map((completedOrigin) => completedOrigin.tool).filter(Boolean))
        return {
            ...conversation,
            agents: new Set([...conversation.agents].filter((agent) => !completedTools.has(agent))),
            currentOrigins: conversation.currentOrigins.filter(
                (currentOrigin) => !completedTools.has(currentOrigin.tool)
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
                        const updatedConversation = removeCompletedAgents(conversation, chatMessage.origin)

                        // If no agents remain, set conversation to null
                        if (updatedConversation.agents.size === 0) {
                            return null
                        }

                        return updatedConversation
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
            newConversations.set(newConversation.startedAt.getTime(), newConversation)
            return newConversations
        })
    }, [createConversation])

    const onStreamingComplete = useCallback(() => {
        setCurrentConversation(null)
        setConversations(new Map())
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(false)
    }, [])

    return {
        agentCounts: agentCountsRef.current,
        conversations,
        currentConversation,
        isProcessing,
        onChunkReceived,
        onStreamingComplete,
        onStreamingStarted,
    }
}
