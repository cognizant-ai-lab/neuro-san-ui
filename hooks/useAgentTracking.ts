import {useCallback, useMemo, useRef, useState} from "react"

import {chatMessageFromChunk} from "../components/AgentChat/Utils"
import {ChatMessageType} from "../generated/neuro-san/NeuroSanClient"
import {Origin} from "../generated/neuro-san/OpenAPITypes"

interface UseAgentTrackingReturn {
    // State
    includedAgentIds: string[]
    originInfo: Origin[]
    agentCounts: Map<string, number>
    isProcessing: boolean
    // Actions
    onChunkReceived: (chunk: string) => boolean
    onStreamingStarted: () => void
    onStreamingComplete: () => void
    resetTracking: () => void
}

// Helper function to determine if a message is a final response
const isFinalMessage = (chatMessage: {structure?: {total_tokens?: number}; text?: string}): boolean => {
    const isAgentFinalResponse = chatMessage.structure?.total_tokens
    const isCodedToolFinalResponse = chatMessage.text?.startsWith("Got result:")
    return Boolean(isAgentFinalResponse || isCodedToolFinalResponse)
}

// Helper function to extract tool names from origin data
const extractToolNames = (origins: readonly Origin[]): string[] => {
    return origins.filter((originItem) => Boolean(originItem.tool)).map((originItem) => originItem.tool)
}

export function useAgentTracking(): UseAgentTrackingReturn {
    const [includedAgentIds, setIncludedAgentIds] = useState<string[]>([])
    const [originInfo, setOriginInfo] = useState<Origin[]>([])
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const agentCountsRef = useRef<Map<string, number>>(new Map())

    const updateAgentCounts = useCallback((origins: readonly Origin[]) => {
        const agentCounts = agentCountsRef.current
        for (const agent of origins) {
            if (agent.tool) {
                agentCounts.set(agent.tool, (agentCounts.get(agent.tool) || 0) + 1)
            }
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

                // Track active edges
                setIncludedAgentIds((prev) => {
                    const isFinal = isFinalMessage(chatMessage)

                    if (chatMessage.type === ChatMessageType.AGENT && isFinal) {
                        // Remove completed agents from active list
                        const toolsToRemove = extractToolNames(chatMessage.origin)
                        return prev.filter((agentId) => !toolsToRemove.includes(agentId))
                    } else {
                        // Set origin info for the current chat message
                        setOriginInfo([...chatMessage.origin])

                        // Add new active agents
                        const newToolNames = extractToolNames(chatMessage.origin)
                        return Array.from(new Set([...prev, ...newToolNames]))
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
        [updateAgentCounts]
    )

    const onStreamingStarted = useCallback(() => {
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(true)
    }, [])

    const onStreamingComplete = useCallback(() => {
        setIncludedAgentIds([])
        setOriginInfo([])
        setIsProcessing(false)
    }, [])

    const resetTracking = useCallback(() => {
        setIncludedAgentIds([])
        setOriginInfo([])
        agentCountsRef.current = new Map<string, number>()
        setIsProcessing(false)
    }, [])

    // Memoize the agent counts to prevent unnecessary re-renders
    const agentCounts = useMemo(() => agentCountsRef.current, [agentCountsRef.current])

    return {
        // State
        includedAgentIds,
        originInfo,
        agentCounts,
        isProcessing,
        // Actions
        onChunkReceived,
        onStreamingStarted,
        onStreamingComplete,
        resetTracking,
    }
}
