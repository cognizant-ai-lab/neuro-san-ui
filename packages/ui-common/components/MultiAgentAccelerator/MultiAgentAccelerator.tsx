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

import {StopCircle} from "@mui/icons-material"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Slide from "@mui/material/Slide"
import {JSX as ReactJSX, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {Edge, EdgeProps, ReactFlowProvider} from "reactflow"

import {AgentFlow} from "./AgentFlow"
import {Sidebar} from "./Sidebar"
import {getAgentNetworks, getConnectivity} from "../../controller/agent/Agent"
import {ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {AgentConversation, processChatChunk} from "../../utils/agentConversations"
import {useLocalStorage} from "../../utils/useLocalStorage"
import {getUrlParameter, setUrlParameter} from "../../utils/urlParams"
import {ChatCommon, ChatCommonHandle} from "../AgentChat/ChatCommon"
import {SmallLlmChatButton} from "../AgentChat/LlmChatButton"
import {cleanUpAgentName} from "../AgentChat/Utils"
import {closeNotification, NotificationType, sendNotification} from "../Common/notification"

interface MultiAgentAcceleratorProps {
    readonly userInfo: {userName: string; userImage: string}
    readonly backendNeuroSanApiUrl: string
    readonly darkMode: boolean
}

/**
 * Main Multi-Agent Accelerator component that contains the sidebar, agent flow, and chat components.
 * @param backendNeuroSanApiUrl Initial URL of the backend Neuro-San API. User can change this in the UI.
 * @param darkMode Whether dark mode is enabled.
 * @param userInfo Information about the current user, including userName and userImage.
 */
export const MultiAgentAccelerator = ({
    backendNeuroSanApiUrl,
    darkMode,
    userInfo,
}: MultiAgentAcceleratorProps): ReactJSX.Element => {
    // Animation time for the left and right panels to slide in or out when launching the animation
    const GROW_ANIMATION_TIME_MS = 800

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // Track streaming state - controls thought bubble cleanup timer, and enables "zen mode" (hides outer panels after
    // animation)
    const [isStreaming, setIsStreaming] = useState(false)

    const [networks, setNetworks] = useState<string[]>([])

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)

    // Wrapper function to update both selectedNetwork state and URL parameter
    const setSelectedNetworkWithUrl = useCallback((network: string | null) => {
        setSelectedNetwork(network)
        // Update URL parameter when network is selected manually
        setUrlParameter("selectedNetwork", network)
    }, [])

    // Track whether we've shown the info popup so we don't keep bugging the user with it
    const [haveShownPopup, setHaveShownPopup] = useState<boolean>(false)

    const [customURLLocalStorage, setCustomURLLocalStorage] = useLocalStorage("customAgentNetworkURL", null)

    // An extra set of quotes is making it in the string in local storage.
    const [neuroSanURL, setNeuroSanURL] = useState<string>(
        customURLLocalStorage?.replaceAll('"', "") || backendNeuroSanApiUrl
    )

    const agentCountsRef = useRef<Map<string, number>>(new Map())

    const conversationsRef = useRef<AgentConversation[] | null>(null)

    const [currentConversations, setCurrentConversations] = useState<AgentConversation[] | null>(null)

    // State to hold thought bubble edges - avoids duplicates across layout recalculations
    const [thoughtBubbleEdges, setThoughtBubbleEdges] = useState<
        Map<string, {edge: Edge<EdgeProps>; timestamp: number}>
    >(new Map())

    const customURLCallback = useCallback(
        (url: string) => {
            setNeuroSanURL(url || backendNeuroSanApiUrl)
            setCustomURLLocalStorage(url === "" ? null : url)
        },
        [backendNeuroSanApiUrl, setCustomURLLocalStorage]
    )

    const resetState = useCallback(() => {
        setThoughtBubbleEdges(new Map())
        setIsStreaming(false)
    }, [])

    // Reference to the ChatCommon component to allow external stop button to call its handleStop method
    const chatRef = useRef<ChatCommonHandle | null>(null)

    // State for tracking VS Code extension communication
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const responseBufferRef = useRef<string>("")



    // Handle external stop button click - stops streaming and exits zen mode
    const handleExternalStop = useCallback(() => {
        chatRef.current?.handleStop()
        resetState()
    }, [])

    useEffect(() => {
        async function getNetworks() {
            console.log('[MultiAgentAccelerator] Loading networks from:', neuroSanURL)
            try {
                const networksTmp: string[] = await getAgentNetworks(neuroSanURL)
                const sortedNetworks = networksTmp?.sort((a, b) => a.localeCompare(b))
                console.log('[MultiAgentAccelerator] Networks loaded:', sortedNetworks)
                setNetworks(sortedNetworks)
                // Set default network first
                setSelectedNetwork(sortedNetworks[0])
                console.log('[MultiAgentAccelerator] Default network set to:', sortedNetworks[0])
                closeNotification()
            } catch (e) {
                console.error('[MultiAgentAccelerator] Error loading networks:', e)
                sendNotification(
                    NotificationType.error,
                    "Connection error",
                    // eslint-disable-next-line max-len
                    `Unable to get list of Agent Networks. Verify that ${neuroSanURL} is a valid Multi-Agent Accelerator Server. Error: ${e}.`
                )
                setNetworks([])
                setSelectedNetwork(null)
            }
        }

        void getNetworks()
    }, [neuroSanURL])

    // Read hideChat parameter from URL
    const hideChat = useMemo(() => getUrlParameter("hideChat") === "true", [])

    // Separate effect to handle URL parameter selection after networks are loaded
    useEffect(() => {
        console.log('[MultiAgentAccelerator] URL parameter effect - networks:', networks.length)
        if (networks.length === 0) {
            console.log('[MultiAgentAccelerator] Waiting for networks to be loaded')
            return // Wait for networks to be loaded
        }

        const urlSelectedNetwork = getUrlParameter("selectedNetwork")
        console.log('[MultiAgentAccelerator] URL selectedNetwork param:', urlSelectedNetwork)
        
        if (urlSelectedNetwork) {
            // Try exact match first (direct backend name)
            let matchedNetwork = networks.find(
                (network) => network === urlSelectedNetwork
            )
            console.log('[MultiAgentAccelerator] Exact match result:', matchedNetwork)
            
            // If no exact match, try case-insensitive match
            if (!matchedNetwork) {
                matchedNetwork = networks.find(
                    (network) => network.toLowerCase() === urlSelectedNetwork.toLowerCase()
                )
                console.log('[MultiAgentAccelerator] Case-insensitive match result:', matchedNetwork)
            }
            
            // If still no match, try matching against the cleaned display names
            // This allows URLs like "?selectedNetwork=Cpg Agents" to match "cpg_agents"
            if (!matchedNetwork) {
                matchedNetwork = networks.find(
                    (network) => {
                        const cleanedNetworkName = cleanUpAgentName(network)
                        return cleanedNetworkName.toLowerCase() === urlSelectedNetwork.toLowerCase()
                    }
                )
                console.log('[MultiAgentAccelerator] Cleaned name match result:', matchedNetwork)
            }
            
            if (matchedNetwork && matchedNetwork !== selectedNetwork) {
                console.log('[MultiAgentAccelerator] Setting matched network:', matchedNetwork)
                setSelectedNetwork(matchedNetwork)
            } else {
                console.log('[MultiAgentAccelerator] No network change needed. Current:', selectedNetwork)
            }
        } else {
            console.log('[MultiAgentAccelerator] No URL selectedNetwork parameter found')
        }
    }, [networks]) // Run when networks change

    useEffect(() => {
        ;(async () => {
            if (selectedNetwork) {
                try {
                    const connectivity: ConnectivityResponse = await getConnectivity(
                        neuroSanURL,
                        selectedNetwork,
                        userInfo.userName
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
    }, [neuroSanURL, selectedNetwork])

    // Set up handler to allow Escape key to stop the interaction with the LLM.
    useEffect(() => {
        if (!isAwaitingLlm) {
            return undefined
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleExternalStop()
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isAwaitingLlm, handleExternalStop])

    // Set up postMessage listener for VS Code extension communication
    useEffect(() => {
        if (!hideChat) return undefined

        console.log('[MultiAgentAccelerator] VS Code mode enabled, setting up message listener')
        
        // Use a more isolated approach
        const handleVSCodeMessage = (e: MessageEvent) => {
            console.log('[MultiAgentAccelerator] Raw message received:', e.origin, e.data)
            
            // Only process messages meant for us
            if (!e.data || typeof e.data !== 'object' || e.data.type !== 'chat:send') {
                console.log('[MultiAgentAccelerator] Ignoring message:', e.data)
                return
            }

            const { convId, text } = e.data
            console.log('[MultiAgentAccelerator] Received VS Code message:', { convId, text })
            
            // Store conversation ID and process with real agent
            console.log('[MultiAgentAccelerator] Setting up for agent processing')
            
            try {
                setCurrentConversationId(convId)
                responseBufferRef.current = ""
                
                // Use URL parameter or hardcoded fallback for VS Code mode
                const targetNetwork = selectedNetwork || getUrlParameter("selectedNetwork") || "airline_policy"
                console.log('[MultiAgentAccelerator] Using target network:', targetNetwork)
                
                console.log('[MultiAgentAccelerator] Starting direct agent processing with network:', targetNetwork)
                
                // Call agent directly without ChatCommon to avoid page reload issues
                handleDirectAgentCall(text, convId, targetNetwork)
                
            } catch (error) {
                console.error('[MultiAgentAccelerator] Error in message processing setup:', error)
                
                // Send error back to VS Code
                try {
                    window.parent?.postMessage({
                        type: 'chat:error',
                        convId,
                        error: 'Failed to process message'
                    }, '*')
                } catch (postError) {
                    console.error('[MultiAgentAccelerator] Failed to send setup error to VS Code:', postError)
                }
            }
        }

        window.addEventListener('message', handleVSCodeMessage, { passive: true })
        console.log('[MultiAgentAccelerator] Message listener attached')
        
        return () => {
            window.removeEventListener('message', handleVSCodeMessage)
            console.log('[MultiAgentAccelerator] Message listener removed')
        }
    }, [])

    // Effect to exit zen mode when streaming ends
    useEffect(() => {
        if (!isAwaitingLlm) {
            setIsStreaming(false)
        }
    }, [isAwaitingLlm])

    const onChunkReceived = useCallback((chunk: string): boolean => {
        const result = processChatChunk(chunk, agentCountsRef.current, conversationsRef.current)
        if (result.success) {
            agentCountsRef.current = result.newCounts
            conversationsRef.current = result.newConversations
            setCurrentConversations(result.newConversations)
        }

        // If we have a conversation ID from VS Code, capture the chunk for postMessage response
        if (currentConversationId) {
            responseBufferRef.current += chunk
        }

        return result.success
    }, [currentConversationId])

    const onStreamingStarted = useCallback((): void => {
        // Show info popup only once per session
        if (!haveShownPopup) {
            sendNotification(NotificationType.info, "Agents working", "Click the stop button or hit Escape to exit.")
            setHaveShownPopup(true)
        }

        // Mark that streaming has started
        setIsStreaming(true)
    }, [haveShownPopup])

    const onStreamingComplete = useCallback((): void => {
        console.log('[MultiAgentAccelerator] onStreamingComplete called')
        
        // When streaming is complete, clean up any refs and state
        console.log('[MultiAgentAccelerator] Resetting all state')
        conversationsRef.current = null
        agentCountsRef.current = new Map<string, number>()
        setCurrentConversations(null)
        resetState()
    }, [hideChat])

    // Direct agent call bypassing ChatCommon to avoid page reload issues
    const handleDirectAgentCall = useCallback(async (text: string, convId: string, targetNetwork: string) => {
        try {
            console.log('[MultiAgentAccelerator] Starting direct agent call')
            console.log('[MultiAgentAccelerator] Preserving conversation ID:', convId)
            console.log('[MultiAgentAccelerator] Using neuroSanURL:', neuroSanURL)
            
            // Ensure conversation ID is preserved throughout the call
            setCurrentConversationId(convId)
            
            // For VS Code mode, always use localhost backend
            const apiUrl = hideChat ? 'http://localhost:8080' : neuroSanURL
            console.log('[MultiAgentAccelerator] API URL for request:', apiUrl)
            
            setIsAwaitingLlm(true)
            onStreamingStarted()
            
            // Import sendChatQuery dynamically
            const { sendChatQuery } = await import('../../controller/agent/Agent')
            
            // Create abort controller
            const abortController = new AbortController()
            
            console.log('[MultiAgentAccelerator] Making sendChatQuery call to:', apiUrl)
            
            // Make the agent request
            await sendChatQuery(
                apiUrl,
                abortController.signal,
                text,
                targetNetwork,
                (chunk: string) => {
                    responseBufferRef.current += chunk
                    onChunkReceived(chunk)
                },
                null, // chatContext
                {}, // slyData
                userInfo.userName // userId
            )
            
            console.log('[MultiAgentAccelerator] Agent call completed successfully')
            
        } catch (error) {
            console.error('[MultiAgentAccelerator] Error in direct agent call:', error)
            
            // Prevent any error from causing page reload
            try {
                // Send error response back to VS Code
                window.parent?.postMessage({
                    type: 'chat:error',
                    convId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, '*')
            } catch (postMessageError) {
                console.error('[MultiAgentAccelerator] Failed to send error to VS Code:', postMessageError)
            }
        } finally {
            try {
                setIsAwaitingLlm(false)
                
                // Send response back to VS Code with the preserved convId
                if (convId && responseBufferRef.current && hideChat) {
                    const response = {
                        type: 'chat:receive', 
                        convId: convId, 
                        text: responseBufferRef.current 
                    }
                    
                    console.log('[MultiAgentAccelerator] Sending response to VS Code:')
                    console.log('[MultiAgentAccelerator] Response:', responseBufferRef.current)
                    
                    window.parent?.postMessage(response, '*')
                    
                    // Clean up
                    responseBufferRef.current = ""
                    setCurrentConversationId(null)
                }
                
                onStreamingComplete()
            } catch (finallyError) {
                console.error('[MultiAgentAccelerator] Error in finally block:', finallyError)
            }
        }
    }, [neuroSanURL, hideChat, onStreamingStarted, onChunkReceived, onStreamingComplete, userInfo.userName])

    const getLeftPanel = () => {
        if (hideChat) {
            return null
        }
        
        return (
            <Slide
                id="multi-agent-accelerator-grid-sidebar-slide"
                in={!isAwaitingLlm}
                direction="right"
                timeout={GROW_ANIMATION_TIME_MS}
                onExited={() => {
                    setIsStreaming(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-sidebar"
                    size={isStreaming ? 0 : 3.25}
                    sx={{
                        height: "100%",
                    }}
                >
                    <Sidebar
                        customURLLocalStorage={customURLLocalStorage}
                        customURLCallback={customURLCallback}
                        id="multi-agent-accelerator-sidebar"
                        isAwaitingLlm={isAwaitingLlm}
                        networks={networks}
                        selectedNetwork={selectedNetwork}
                        setSelectedNetwork={setSelectedNetworkWithUrl}
                    />
                </Grid>
            </Slide>
        )
    }

    const getCenterPanel = () => {
        const getCenterGridSize = () => {
            if (hideChat || isStreaming) return 18 // Full width when in VS Code mode or streaming
            return 8.25 // Normal width with sidebar and chat
        }
        
        return (
            <Grid
                id="multi-agent-accelerator-grid-agent-flow"
                size={getCenterGridSize()}
                sx={{
                    height: "100%",
                }}
            >
                <ReactFlowProvider>
                    <Box
                        id="multi-agent-accelerator-agent-flow-container"
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            height: "100%",
                            maxWidth: hideChat ? "none" : 1000,
                            margin: "0 auto",
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
            </Grid>
        )
    }

    const getRightPanel = () => {
        if (hideChat) {
            return null // No ChatCommon needed for VS Code mode - using direct agent calls
        }
        
        return (
            <Slide
                id="multi-agent-accelerator-grid-agent-chat-common-slide"
                in={!isAwaitingLlm}
                direction="left"
                timeout={GROW_ANIMATION_TIME_MS}
                onExited={() => {
                    setIsStreaming(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-agent-chat-common"
                    size={isStreaming ? 0 : 6.5}
                    sx={{
                        height: "100%",
                    }}
                >
                    <ChatCommon
                        ref={chatRef}
                        neuroSanURL={neuroSanURL}
                        id="agent-network-ui"
                        currentUser={userInfo.userName}
                        userImage={userInfo.userImage}
                        setIsAwaitingLlm={setIsAwaitingLlm}
                        isAwaitingLlm={isAwaitingLlm}
                        targetAgent={selectedNetwork}
                        onChunkReceived={onChunkReceived}
                        onStreamingComplete={onStreamingComplete}
                        onStreamingStarted={onStreamingStarted}
                        clearChatOnNewAgent={true}
                        backgroundColor={darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-secondary-blue)"}
                    />
                </Grid>
            </Slide>
        )
    }

    const getStopButton = () => {
        return (
            <>
                {isAwaitingLlm && (
                    <Box
                        id="stop-button-container"
                        sx={{
                            position: "absolute",
                            bottom: "1rem",
                            right: "1rem",
                            zIndex: 10,
                        }}
                    >
                        <SmallLlmChatButton
                            aria-label="Stop"
                            disabled={!isAwaitingLlm}
                            id="stop-output-button"
                            onClick={handleExternalStop}
                            posBottom={8}
                            posRight={23}
                        >
                            <StopCircle
                                fontSize="small"
                                id="stop-button-icon"
                                sx={{color: "var(--bs-white)"}}
                            />
                        </SmallLlmChatButton>
                    </Box>
                )}
            </>
        )
    }
    return (
        <Grid
            id="multi-agent-accelerator-grid"
            container
            columns={18}
            sx={{
                border: "solid 1px #CFCFDC",
                borderRadius: "var(--bs-border-radius)",
                display: "flex",
                flex: 1,
                height: "85%",
                marginTop: "1rem",
                overflow: "hidden",
                padding: "1rem",
                background: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                color: darkMode ? "var(--bs-white)" : "var(--bs-primary)",
                justifyContent: isAwaitingLlm ? "center" : "unset",
                position: "relative",
            }}
        >
            {getLeftPanel()}
            {getCenterPanel()}
            {getRightPanel()}
            {getStopButton()}
        </Grid>
    )
}
