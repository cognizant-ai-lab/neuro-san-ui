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

import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Slide from "@mui/material/Slide"
import {JSX as ReactJSX, useCallback, useEffect, useRef, useState} from "react"
import {Edge, EdgeProps, ReactFlowProvider} from "reactflow"

import {AgentFlow} from "./AgentFlow"
import {Sidebar} from "./Sidebar/Sidebar"
import {
    getAgentIconSuggestions,
    getAgentNetworks,
    getConnectivity,
    getNetworkIconSuggestions,
} from "../../controller/agent/Agent"
import {AgentInfo, ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {AgentConversation, processChatChunk} from "../../utils/agentConversations"
import {useLocalStorage} from "../../utils/useLocalStorage"
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

    const [networks, setNetworks] = useState<readonly AgentInfo[]>([])
    const [iconSuggestions, setIconSuggestions] = useState<Record<string, string>>({})

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])
    const [agentIconSuggestions, setAgentIconSuggestions] = useState<Record<string, string>>({})

    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)

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

    // Handle external stop button click - stops streaming and exits zen mode
    const handleExternalStop = useCallback(() => {
        chatRef.current?.handleStop()
        resetState()
    }, [])

    useEffect(() => {
        async function getNetworks() {
            try {
                const networksTmp: readonly AgentInfo[] = await getAgentNetworks(neuroSanURL)
                const iconSuggestionsTmp = await getNetworkIconSuggestions(networksTmp)
                console.debug("fetched icon suggestions:", iconSuggestionsTmp)
                // Batch state updates together to prevent stale render
                setNetworks(networksTmp)
                setIconSuggestions(iconSuggestionsTmp)
                closeNotification()
            } catch (e) {
                sendNotification(
                    NotificationType.error,
                    "Connection error",
                    `Unable to get list of Agent Networks. Verify that ${neuroSanURL} is a valid ` +
                        `Multi-Agent Accelerator Server. Error: ${e}.`
                )
                setNetworks([])
                setSelectedNetwork(null)
                setIconSuggestions({})
            }
        }

        void getNetworks()
    }, [neuroSanURL])

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

                    const agentIconSuggestionsTmp = await getAgentIconSuggestions(connectivity)
                    setAgentIconSuggestions(agentIconSuggestionsTmp)
                    closeNotification()
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

        return result.success
    }, [])

    const onStreamingStarted = useCallback((): void => {
        // Reset agent counts
        agentCountsRef.current = new Map()

        // Show info popup only once per session
        if (!haveShownPopup) {
            sendNotification(NotificationType.info, "Agents working", "Click the stop button or hit Escape to exit.")
            setHaveShownPopup(true)
        }

        // Mark that streaming has started
        setIsStreaming(true)
    }, [haveShownPopup])

    const onStreamingComplete = useCallback((): void => {
        // When streaming is complete, clean up any refs and state
        conversationsRef.current = null
        setCurrentConversations(null)
        resetState()
    }, [])

    const getLeftPanel = () => {
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
                        iconSuggestions={iconSuggestions}
                        setSelectedNetwork={(newNetwork) => {
                            agentCountsRef.current = new Map()
                            setSelectedNetwork(newNetwork)
                        }}
                    />
                </Grid>
            </Slide>
        )
    }

    const getCenterPanel = () => {
        return (
            <Grid
                id="multi-agent-accelerator-grid-agent-flow"
                size={isStreaming ? 18 : 8.25}
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
                            maxWidth: 1000,
                            margin: "0 auto",
                        }}
                    >
                        <AgentFlow
                            agentCounts={agentCountsRef.current}
                            agentsInNetwork={agentsInNetwork}
                            agentIconSuggestions={agentIconSuggestions}
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
                        // backgroundColor={darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-secondary-blue)"}
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
