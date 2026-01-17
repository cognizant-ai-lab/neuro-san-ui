/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * AgentFlowWrapper - Self-contained chart component with data fetching
 *
 * This wrapper handles all data fetching and state management for the agent network chart,
 * while delegating pure visualization to AgentFlow.
 *
 * RESPONSIBILITIES:
 * - Fetches agent connectivity when network is selected
 * - Manages conversation state and thought bubbles
 * - Processes streaming chat chunks
 * - Wraps AgentFlow in ReactFlowProvider
 * - Passes data down to pure AgentFlow component
 *
 * EXTERNAL CONSUMER USAGE:
 * ```tsx
 * import { AgentFlowWrapper } from '@your-package/ui-common'
 *
 * <AgentFlowWrapper
 *   neuroSanURL="https://api.example.com"
 *   selectedNetwork="my-network"
 *   userName="alice"
 *   isAwaitingLlm={isAwaitingLlm}
 *   setIsAwaitingLlm={setIsAwaitingLlm}
 *   onChunkReceived={handleChunk}
 *   onStreamingStarted={handleStart}
 *   onStreamingComplete={handleComplete}
 * />
 * ```
 */

import Box from "@mui/material/Box"
import {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {Edge, EdgeProps, ReactFlowProvider} from "reactflow"

import {AgentFlow} from "./AgentFlow"
import {getConnectivity} from "../../controller/agent/Agent"
import {ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {AgentConversation, processChatChunk} from "../../utils/agentConversations"
import {cleanUpAgentName} from "../AgentChat/Utils"
import {NotificationType, sendNotification} from "../Common/notification"

export interface AgentFlowWrapperProps {
    /**
     * Backend Neuro-San API URL for fetching agent connectivity
     */
    readonly neuroSanURL: string

    /**
     * Currently selected network ID to fetch agents for
     */
    readonly selectedNetwork: string | null

    /**
     * Current user's username for authentication
     */
    readonly userName: string

    /**
     * Whether currently waiting for LLM response
     */
    readonly isAwaitingLlm: boolean

    /**
     * Whether streaming animation is active
     */
    readonly isStreaming: boolean

    /**
     * Optional ref for agent counts (for internal parent coordination)
     */
    readonly agentCountsRef?: React.MutableRefObject<Map<string, number>>

    /**
     * Optional custom container styles
     */
    readonly containerStyle?: React.CSSProperties

    /**
     * Optional callback when streaming chunk is received (for external consumers)
     */
    readonly onChunkReceived?: (chunk: string) => boolean

    /**
     * Optional callback when streaming starts (for external consumers)
     */
    readonly onStreamingStarted?: () => void

    /**
     * Optional callback when streaming completes (for external consumers)
     */
    readonly onStreamingComplete?: () => void
}

export interface AgentFlowWrapperHandle {
    processChunk: (chunk: string) => boolean
    onStreamingStarted: () => void
    onStreamingComplete: () => void
}

/**
 * AgentFlowWrapper component - handles data fetching and state for the agent chart
 */
export const AgentFlowWrapper = forwardRef<AgentFlowWrapperHandle, AgentFlowWrapperProps>(
    (
        {
            neuroSanURL,
            selectedNetwork,
            userName,
            isAwaitingLlm,
            isStreaming,
            agentCountsRef: externalAgentCountsRef,
            containerStyle,
            onChunkReceived,
            onStreamingStarted,
            onStreamingComplete,
        },
        ref
    ) => {
        // ============================================================================
        // STATE MANAGEMENT
        // ============================================================================
        const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])
        // Conversations and counts are managed here so incoming chat chunks can
        // drive thought-bubble animations directly.
        const [currentConversations, setCurrentConversations] = useState<AgentConversation[] | null>(null)
        const [thoughtBubbleEdges, setThoughtBubbleEdges] = useState<
            Map<string, {edge: Edge<EdgeProps>; timestamp: number}>
        >(new Map())

        // Internal agent counts ref - use external if provided, otherwise create internal
        const internalAgentCountsRef = useRef<Map<string, number>>(new Map())
        const agentCountsRef = externalAgentCountsRef || internalAgentCountsRef

        // Expose imperative handlers so the parent `ChatCommon` can forward streaming events
        useImperativeHandle(ref, () => ({
            processChunk: (chunk: string) => {
                const result = processChatChunk(chunk, agentCountsRef.current, currentConversations)
                if (result.success) {
                    agentCountsRef.current = result.newCounts
                    setCurrentConversations(result.newConversations)
                }
                if (onChunkReceived) {
                    return onChunkReceived(chunk)
                }
                return result.success
            },
            onStreamingStarted: () => {
                onStreamingStarted?.()
            },
            onStreamingComplete: () => {
                setCurrentConversations(null)
                agentCountsRef.current = new Map<string, number>()
                setThoughtBubbleEdges(new Map())
                onStreamingComplete?.()
            },
        }))

        // ============================================================================
        // EFFECT: FETCH CONNECTIVITY INFO FOR SELECTED NETWORK
        // ============================================================================
        useEffect(() => {
            ;(async () => {
                if (selectedNetwork) {
                    try {
                        const connectivity: ConnectivityResponse = await getConnectivity(
                            neuroSanURL,
                            selectedNetwork,
                            userName
                        )
                        const agentsInNetworkSorted: ConnectivityInfo[] = connectivity.connectivity_info
                            .concat()
                            .sort((a, b) => a?.origin.localeCompare(b?.origin))
                        setAgentsInNetwork(agentsInNetworkSorted)
                    } catch (e) {
                        const networkName = cleanUpAgentName(selectedNetwork)
                        sendNotification(
                            NotificationType.error,
                            "Connection error",
                            // eslint-disable-next-line max-len
                            `Unable to get agent list for "${networkName}". Verify that ${neuroSanURL} is a valid Multi-Agent Accelerator Server. Error: ${e}.`
                        )
                        setAgentsInNetwork([])
                    }
                }
            })()
        }, [neuroSanURL, selectedNetwork, userName])

        // ============================================================================
        // RENDER
        // ============================================================================
        return (
            <ReactFlowProvider>
                <Box
                    id="multi-agent-accelerator-agent-flow-container"
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "100%",
                        maxWidth: 1000,
                        margin: "0 auto",
                        ...containerStyle,
                    }}
                >
                    <AgentFlow
                        agentCounts={agentCountsRef.current}
                        agentsInNetwork={agentsInNetwork}
                        id="multi-agent-accelerator-agent-flow"
                        currentConversations={currentConversations}
                        isAwaitingLlm={isAwaitingLlm}
                        isStreaming={isStreaming}
                        thoughtBubbleEdges={thoughtBubbleEdges}
                        setThoughtBubbleEdges={setThoughtBubbleEdges}
                    />
                </Box>
            </ReactFlowProvider>
        )
    }
)

AgentFlowWrapper.displayName = "AgentFlowWrapper"
