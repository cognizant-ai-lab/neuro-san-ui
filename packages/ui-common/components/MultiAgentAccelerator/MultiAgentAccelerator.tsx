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
import Popper from "@mui/material/Popper"
import Slide from "@mui/material/Slide"
import Typography from "@mui/material/Typography"
import {ReactFlowProvider} from "@xyflow/react"
import {FC, JSX as ReactJSX, useCallback, useEffect, useMemo, useRef, useState} from "react"

import {AgentConversation, extractConversations} from "./AgentConversations"
import {getUpdatedAgentCounts} from "./AgentCounts"
import {AgentFlow} from "./AgentFlow"
import {extractNetworkProgress} from "./AgentNetworkDesigner"
import {TEMPORARY_NETWORK_FOLDER} from "./const"
import {Sidebar} from "./Sidebar/Sidebar"
import {AgentReservation, extractNetworkHocon, extractReservations} from "./TemporaryNetworks"
import {ThoughtBubbleEdgeShape} from "./ThoughtBubbleEdge"
import {
    getAgentIconSuggestions,
    getAgentNetworks,
    getConnectivity,
    getNetworkIconSuggestions,
} from "../../controller/agent/Agent"
import {AgentIconSuggestions} from "../../controller/Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../../controller/Types/NetworkIconSuggestions"
import {AgentInfo, ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../state/Settings"
import {TemporaryNetwork, useTempNetworksStore} from "../../state/TemporaryNetworks"
import {useLocalStorage} from "../../utils/useLocalStorage"
import {ChatCommon, ChatCommonHandle} from "../AgentChat/ChatCommon"
import {SmallLlmChatButton} from "../AgentChat/LlmChatButton"
import {chatMessageFromChunk, cleanUpAgentName, removeTrailingUuid} from "../AgentChat/Utils"
import {ConfirmationModal} from "../Common/ConfirmationModal"
import {closeNotification, NotificationType, sendNotification} from "../Common/notification"

interface MultiAgentAcceleratorProps {
    readonly userInfo: {userName: string; userImage: string}
    readonly backendNeuroSanApiUrl: string
}

// Display expired temporary networks for this amount of time after they expire so users can see what happened
const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes

// Animation time for the left and right panels to slide in or out when launching the animation
const GROW_ANIMATION_TIME_MS = 800

/**
 * Helper function to convert agent reservations received from the backend into temporary networks that can be displayed
 * in the tree.
 * @param agentReservations List of "agent reservations" (temporary networks) received from the backend
 * @param networkHocon Optional network HOCON string that may be included in the same message as the
 * reservations. Note: for now we assume that all reservations are associated with the same network definition.
 * This will fail if ever we get multiple reservations for different networks in a single chat stream, but that is
 * not a valid scenario currently; we are focusing on Agent Network Design which has a simple output.
 * @returns List of TemporaryNetwork objects that can be displayed in the UI
 */
const convertReservationsToNetworks = (
    agentReservations: AgentReservation[],
    networkHocon: string | null
): TemporaryNetwork[] => {
    return agentReservations.map((reservation) => ({
        reservation,
        agentInfo: {
            agent_name: `${TEMPORARY_NETWORK_FOLDER}/${reservation.reservation_id}`,
            origin: reservation.reservation_id,
            status: "active",
        },
        networkHocon,
    }))
}

/**
 * Main Multi-Agent Accelerator component that contains the sidebar, agent flow, and chat components.
 * @param backendNeuroSanApiUrl Initial URL of the backend Neuro-San API. User can change this in the UI.
 * @param darkMode Whether dark mode is enabled.
 * @param userInfo Information about the current user, including userName and userImage.
 */
export const MultiAgentAccelerator: FC<MultiAgentAcceleratorProps> = ({
    backendNeuroSanApiUrl,
    userInfo,
}): ReactJSX.Element => {
    const enableZenMode = useSettingsStore((state) => state.settings.behavior.enableZenMode)

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // Track streaming state - controls thought bubble cleanup timer, and enables "zen mode" (hides outer panels after
    // animation)
    const [isStreaming, setIsStreaming] = useState(false)

    const [networks, setNetworks] = useState<readonly AgentInfo[]>([])

    // List of known temporary networks (agent reservations) received from the backend
    const temporaryNetworks = useTempNetworksStore((state) => state.tempNetworks)

    // Track newly added temp networks so we can highlight them
    const [newlyAddedTemporaryNetworks, setNewlyAddedTemporaryNetworks] = useState<Set<string>>(new Set())

    const [networkIconSuggestions, setNetworkIconSuggestions] = useState<NetworkIconSuggestions>({})

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    // Agents in network under construction by Agent Network Designer -
    // updated in real time as we receive progress messages from the backend.
    const [agentsInNetworkDesigner, setAgentsInNetworkDesigner] = useState<ConnectivityInfo[]>([])

    const [agentIconSuggestions, setAgentIconSuggestions] = useState<AgentIconSuggestions | null>(null)

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

    const [currentConversations, setCurrentConversations] = useState<AgentConversation[]>([])

    const [networkToBeDeleted, setNetworkToBeDeleted] = useState<string | null>(null)

    // State to hold thought bubble edges - avoids duplicates across layout recalculations
    const [thoughtBubbleEdges, setThoughtBubbleEdges] = useState<
        Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>
    >(new Map())

    const customURLCallback = useCallback(
        (url: string) => {
            setNeuroSanURL(url || backendNeuroSanApiUrl)
            setCustomURLLocalStorage(url === "" ? null : url)
        },
        [backendNeuroSanApiUrl, setCustomURLLocalStorage]
    )

    // Memoized key for agent names to trigger icon suggestion updates when the set of agents changes, not just
    // when sorting/other operations on the agents list
    const agentNamesKey = useMemo(
        () =>
            agentsInNetwork
                .map((agent) => agent.origin)
                .sort()
                .join(","),
        [agentsInNetwork]
    )

    const resetState = useCallback(() => {
        setThoughtBubbleEdges(new Map())
        setIsStreaming(false)
    }, [])

    // Reference to the ChatCommon component to allow external stop button to call its handleStop method
    const chatRef = useRef<ChatCommonHandle | null>(null)

    const isNetworkDesignerMode = selectedNetwork === "agent_network_designer"

    // Handle external stop button click - stops streaming and exits zen mode
    const handleExternalStop = useCallback(() => {
        chatRef.current?.handleStop()
        resetState()
    }, [])

    useEffect(() => {
        ;(async () => {
            try {
                const networksTmp: readonly AgentInfo[] = await getAgentNetworks(neuroSanURL)
                setNetworks(networksTmp)
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
            }
        })()
    }, [neuroSanURL])

    useEffect(() => {
        ;(async () => {
            if (networks?.length > 0) {
                try {
                    const suggestions = await getNetworkIconSuggestions(networks)
                    setNetworkIconSuggestions(suggestions)
                } catch (e) {
                    console.warn("Unable to get network icon suggestions from LLM:", e)
                    setNetworkIconSuggestions({})
                }
            }
        })()
    }, [networks])

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
                    setAgentIconSuggestions(null)
                    closeNotification()
                } catch (e) {
                    const networkName = cleanUpAgentName(selectedNetwork)
                    sendNotification(
                        NotificationType.error,
                        "Connection error",
                        `Unable to get agent list for "${networkName}". Verify that ${neuroSanURL} is a valid ` +
                            `Multi-Agent Accelerator Server. Error: ${e}.`
                    )
                    setAgentsInNetwork([])
                }
            } else {
                setAgentsInNetwork([])
            }
        })()
    }, [neuroSanURL, selectedNetwork])

    useEffect(() => {
        ;(async () => {
            if (agentsInNetwork.length > 0) {
                try {
                    const connectivity: ConnectivityResponse = {connectivity_info: agentsInNetwork}
                    const agentIconSuggestionsTmp = await getAgentIconSuggestions(connectivity)
                    setAgentIconSuggestions(agentIconSuggestionsTmp)
                } catch (e) {
                    console.warn("Unable to get agent icon suggestions:", e)
                    setAgentIconSuggestions(null)
                }
            }
        })()
    }, [agentNamesKey])

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

    // Reaper: remove temporary networks that have been expired for more than GRACE_PERIOD_MS
    useEffect(() => {
        if (temporaryNetworks.length === 0) return undefined

        const interval = setInterval(() => {
            const now = Date.now() / 1000 // convert to seconds since epoch

            const currentTemporaryNetworks = useTempNetworksStore.getState().tempNetworks

            // Remove networks that have been expired for more than GRACE_PERIOD_MS
            useTempNetworksStore
                .getState()
                .setTempNetworks(
                    currentTemporaryNetworks.filter(
                        (n) => n.reservation.expiration_time_in_seconds > now - GRACE_PERIOD_MS / 1000
                    )
                )

            // Figure out which networks have expired on the server (not including our grace period) so we can
            // deselect them if they're currently selected
            const expiredNetwork = currentTemporaryNetworks.filter(
                (network) => network.reservation.expiration_time_in_seconds <= now
            )
            // If the selected network is one of the expired ones, deselect it
            if (expiredNetwork.some((n) => n.agentInfo.agent_name === selectedNetwork)) {
                setSelectedNetwork(null)
                agentCountsRef.current = new Map()
            }
        }, 10_000) // check every 10s

        return () => clearInterval(interval)
    }, [temporaryNetworks, selectedNetwork])

    const onChunkReceived = useCallback(
        (chunk: string): boolean => {
            // Extract ChatMessage structure
            const chatMessage = chatMessageFromChunk(chunk)
            if (!chatMessage) {
                return true
            }

            // Conversations between agents
            const result = extractConversations(chatMessage, conversationsRef.current)
            if (result != null) {
                conversationsRef.current = result
                setCurrentConversations(result)
            }

            // Agent hit counts
            agentCountsRef.current = getUpdatedAgentCounts(agentCountsRef.current, chatMessage?.origin)

            // Agent network designer progress messages
            if (isNetworkDesignerMode) {
                const networkInProgress = extractNetworkProgress(chatMessage)
                if (networkInProgress?.length > 0) {
                    setAgentsInNetworkDesigner(networkInProgress)
                }
            }

            // Temporary networks/reservations
            const reservationsResult = extractReservations(chatMessage)

            // Handle agent reservations (temporary networks) that come in through the chat stream.
            if (reservationsResult?.length > 0) {
                // Retrieve network definition, if present
                const networkHocon = extractNetworkHocon(chatMessage)

                const newTemporaryNetworks = convertReservationsToNetworks(reservationsResult, networkHocon)

                const currentNetworks = useTempNetworksStore.getState().tempNetworks
                useTempNetworksStore.getState().setTempNetworks([...currentNetworks, ...newTemporaryNetworks])

                // record the new temporary networks so we can select them for the user. For now, we only
                // care about the first one.
                setNewlyAddedTemporaryNetworks(
                    new Set(newTemporaryNetworks.map((network) => network.agentInfo.agent_name))
                )
            }

        return true
    }, [isNetworkDesignerMode])

    const onStreamingStarted = useCallback((): void => {
        // Reset agent counts
        agentCountsRef.current = new Map()

        // Reset newly added temporary networks
        setNewlyAddedTemporaryNetworks(new Set())

        // Reset Agent Network Designer preview
        setAgentsInNetworkDesigner([])

        // Show info popup only once per session
        if (!haveShownPopup) {
            sendNotification(NotificationType.info, "Agents working", "Click the stop button or hit Escape to exit.")
            setHaveShownPopup(true)
        }

        // Mark that streaming has started
        setIsStreaming(true)
    }, [haveShownPopup])

    const onStreamingComplete = useCallback(() => {
        // When streaming is complete, clean up any refs and state
        conversationsRef.current = null
        setCurrentConversations(null)
        setAgentsInNetworkDesigner([])
        resetState()
    }, [newlyAddedTemporaryNetworks])

    const [confirmationModalOpen, setConfirmationModalOpen] = useState<boolean>(false)

    const handleDeleteNetwork = (networkId: string, isExpired: boolean) => {
        if (isExpired) {
            // It's expired so just delete it without confirmation
            const tempNetworksWithoutThisOne = temporaryNetworks.filter(
                (network) => network.agentInfo.agent_name !== networkId
            )
            useTempNetworksStore.getState().setTempNetworks(tempNetworksWithoutThisOne)
        } else {
            setNetworkToBeDeleted(networkId)
            setConfirmationModalOpen(true)
        }
    }

    const getLeftPanel = () => {
        return (
            <Slide
                id="multi-agent-accelerator-grid-sidebar-slide"
                in={!enableZenMode || !isAwaitingLlm}
                direction="right"
                timeout={GROW_ANIMATION_TIME_MS}
                onExited={() => {
                    setIsStreaming(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-sidebar"
                    size={enableZenMode && isStreaming ? 0 : 3.25}
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
                        networkIconSuggestions={networkIconSuggestions}
                        newlyAddedTemporaryNetworks={newlyAddedTemporaryNetworks}
                        onDeleteNetwork={handleDeleteNetwork}
                        setSelectedNetwork={(newNetwork) => {
                            agentCountsRef.current = new Map()
                            setSelectedNetwork(newNetwork)
                        }}
                        temporaryNetworks={temporaryNetworks}
                    />
                </Grid>
            </Slide>
        )
    }

    const getCenterPanel = () => {
        return (
            <Grid
                id="multi-agent-accelerator-grid-agent-flow"
                size={enableZenMode && isStreaming ? 18 : 8.25}
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
                            key="multi-agent-accelerator-agent-flow"
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
                in={!enableZenMode || !isAwaitingLlm}
                direction="left"
                timeout={GROW_ANIMATION_TIME_MS}
                onExited={() => {
                    setIsStreaming(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-agent-chat-common"
                    size={enableZenMode && isStreaming ? 0 : 6.5}
                    sx={{
                        height: "100%",
                    }}
                >
                    <ChatCommon
                        key={selectedNetwork ?? "no-network"}
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
                    />
                </Grid>
            </Slide>
        )
    }

    const getStopButton = () => {
        return (
            <>
                {isAwaitingLlm && enableZenMode && (
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

    const getConfirmationModal = () =>
        confirmationModalOpen ? (
            <ConfirmationModal
                id="delete-network-confirmation-modal"
                content={
                    `The network "${cleanUpAgentName(removeTrailingUuid(networkToBeDeleted))}" will be deleted. ` +
                    "This action cannot be undone. Are you sure you want to proceed?"
                }
                handleCancel={() => {
                    setConfirmationModalOpen(false)
                    setNetworkToBeDeleted(null)
                }}
                handleOk={() => {
                    useTempNetworksStore
                        .getState()
                        .setTempNetworks(
                            temporaryNetworks.filter((network) => network.agentInfo.agent_name !== networkToBeDeleted)
                        )
                    setNetworkToBeDeleted(null)
                    setConfirmationModalOpen(false)
                }}
                title="Delete Network"
            />
        ) : null

    return (
        <>
            <Popper
                open={isStreaming && isNetworkDesignerMode}
                anchorEl={null}
                sx={{
                    width: "600px",
                    height: "600px",
                    zIndex: 9999,
                }}
            >
                <ReactFlowProvider>
                    <Box
                        id="multi-agent-accelerator-agent-flow-container"
                        sx={{
                            border: "4px solid var(--bs-yellow)",
                            display: "flex",
                            flexDirection: "column",
                            color: "white",
                            justifyContent: "center",
                            alignItems: "center",
                            background: "var(--bs-secondary)",
                            width: "100%",
                            height: "100%",
                            opacity: "95%",
                            maxWidth: 1000,
                            margin: "0 auto",
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{padding: "0.5rem 1rem", fontWeight: "bold", color: "white"}}
                        >
                            Network Preview
                        </Typography>
                        {agentsInNetworkDesigner?.length > 0 ? (
                            <AgentFlow
                                id="and-network-preview"
                                key="and-network-preview"
                                agentsInNetwork={agentsInNetworkDesigner}
                                isAgentNetworkDesignerMode={true}
                                isAwaitingLlm={false}
                                isStreaming={false}
                                thoughtBubbleEdges={new Map()}
                                setThoughtBubbleEdges={() => {
                                    // test
                                }}
                            />
                        ) : (
                            <Typography
                                variant="body1"
                                sx={{color: "white"}}
                            >
                                Awaiting status from Agent Network Designer...
                            </Typography>
                        )}
                    </Box>
                </ReactFlowProvider>
            </Popper>
            {getConfirmationModal()}
            <Grid
                id="multi-agent-accelerator-grid"
                container
                columns={18}
                sx={{
                    display: "flex",
                    flex: 1,
                    height: "85%",
                    justifyContent: isAwaitingLlm ? "center" : "unset",
                    marginTop: "1rem",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {getLeftPanel()}
                {getCenterPanel()}
                {getRightPanel()}
                {getStopButton()}
            </Grid>
        </>
    )
}
