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

interface UseAgentTrackingReturn {
    agentCounts: Map<string, number>
    currentConversations: AgentConversations | null
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
    const [currentConversations, setCurrentConversations] = useState<AgentConversations | null>(null)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const agentCountsRef = useRef<Map<string, number>>(new Map())

    const createConversation = useCallback((): AgentConversations => {
        return {
            agents: new Set<string>(),
            startedAt: new Date(),
        }
    }, [])

    const updateAgentCounts = useCallback((origins: readonly Origin[]) => {
        const agentCounts = agentCountsRef.current
        origins
            .map((originData) => originData.tool)
            .reduce((_, tool) => {
                agentCounts.set(tool, (agentCounts.get(tool) || 0) + 1)
                return agentCounts
            }, agentCounts)
    }, [])

    const addAgentsToConversation = useCallback((conversations: AgentConversations, origins: readonly Origin[]) => {
        const newTools = origins.map((originData) => originData.tool).filter(Boolean)
        return {
            ...conversations,
            agents: new Set([...conversations.agents, ...newTools]),
        }
    }, [])

    const removeCompletedAgents = useCallback(
        (conversations: AgentConversations, completedOrigins: readonly Origin[]) => {
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
                const chatMessage = chatMessageFromChunk(chunk)

                if (!chatMessage?.origin?.length) {
                    return true
                }

                updateAgentCounts(chatMessage.origin)

                setCurrentConversations((prevConversation) => {
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
        setCurrentConversations(newConversation)
    }, [createConversation])

    const onStreamingComplete = useCallback(() => {
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
