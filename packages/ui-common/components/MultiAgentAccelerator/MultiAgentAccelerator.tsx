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
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import CloseIcon from "@mui/icons-material/Close"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import SkipNextIcon from "@mui/icons-material/SkipNext"
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious"
import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import IconButton from "@mui/material/IconButton"
import Slide from "@mui/material/Slide"
import {useTheme} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {ReactFlowProvider} from "@xyflow/react"
import {FC, JSX as ReactJSX, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {useJoyride} from "react-joyride"

import {AgentConversation, extractConversations} from "./AgentConversations"
import {getUpdatedAgentCounts} from "./AgentCounts"
import {AgentFlow} from "./AgentFlow"
import {extractAgentNetworkDesignerProgress} from "./AgentNetworkDesigner"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_HOCON,
    AGENT_NETWORK_NAME_KEY,
    AgentNetworkDefinitionEntry,
    TRIGGER_APP_TOUR_EVENT_NAME,
} from "./const"
import {Sidebar} from "./Sidebar/Sidebar"
import {extractTemporaryNetworksFromMessage, isTemporaryNetwork, mergeNetworks} from "./TemporaryNetworks"
import {ThoughtBubbleEdgeShape} from "./ThoughtBubbleEdge"
import {
    getAgentFunction,
    getAgentIconSuggestions,
    getAgentNetworks,
    getConnectivity,
    getNetworkIconSuggestions,
    sendNetworkDesignerUpdate,
} from "../../controller/agent/Agent"
import {AgentIconSuggestions} from "../../controller/Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../../controller/Types/NetworkIconSuggestions"
import {AgentInfo, ChatMessage, ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {useAgentChatHistoryStore} from "../../state/ChatHistory"
import {useSettingsStore} from "../../state/Settings"
import {TemporaryNetwork, useTempNetworksStore} from "../../state/TemporaryNetworks"
import {TourPromptState, useTourStore} from "../../state/Tour"
import {useLocalStorage} from "../../utils/useLocalStorage"
import {getZIndex} from "../../utils/zIndexLayers"
import {ChatCommon, ChatCommonHandle} from "../AgentChat/ChatCommon/ChatCommon"
import {SmallLlmChatButton} from "../AgentChat/Common/LlmChatButton"
import {isLegacyAgentType} from "../AgentChat/Common/Types"
import {chatMessageFromChunk, cleanUpAgentName, removeTrailingUuid} from "../AgentChat/Common/Utils"
import {ConfirmationModal, StyledButton} from "../Common/ConfirmationModal"
import {closeNotification, NotificationType, sendNotification} from "../Common/notification"
import {MAIN_TOUR_STEPS} from "./Tour/MainTourSteps"
import {MUIDialog} from "../Common/MUIDialog"

export interface MultiAgentAcceleratorProps {
    readonly userInfo: {userName: string; userImage: string}
    readonly backendNeuroSanApiUrl: string
}

// Check for expired networks every this many milliseconds
const EXPIRED_NETWORKS_CHECK_INTERVAL_MS = 10 * 1000

// Display expired temporary networks for this amount of time after they expire so users can see what happened
export const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes

// Animation time for the left and right panels to slide in or out when launching the animation
const GROW_ANIMATION_TIME_MS = 800

// Optimization to avoid creating a new empty map on every render
const EMPTY_THOUGHT_BUBBLE_EDGES = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>()

// We show the tour modal after this amount of time so as not to "pounce" on the user when they first open the app
export const SHOW_TOUR_DELAY_MS = 5000

const DEBUG_PLAY_INTERVAL_MS = 1000

// #region: Agent-save helpers

/**
 * Extracts TemporaryNetworks from a single streamed chunk, merging into `accumulated`.
 * Returns `accumulated` unchanged if the chunk yields no reservations or on parse error.
 */
const collectNetworksFromChunk = (
    chunk: string,
    updated: AgentNetworkDefinitionEntry[],
    accumulated: TemporaryNetwork[]
): TemporaryNetwork[] => {
    try {
        const chatMessage = chatMessageFromChunk(chunk)
        if (!chatMessage) return accumulated

        // Always use the user's edited definition as the authoritative value.
        const converted = extractTemporaryNetworksFromMessage(chatMessage, updated)
        if (converted.length === 0) return accumulated
        return mergeNetworks(accumulated, converted)
    } catch (e: unknown) {
        console.warn("Failed to process chunk from network designer:", e)
        return accumulated
    }
}

/** Logs and notifies about a save error. Suppresses AbortError (user-cancelled). */
const notifySaveError = (agentName: string, e: unknown): void => {
    if (e instanceof DOMException && e.name === "AbortError") return
    console.error("Failed to submit agent network update:", e)
    const detail =
        e instanceof DOMException && e.name === "TimeoutError"
            ? "The request timed out waiting for the server. Please try again."
            : String(e)
    sendNotification(NotificationType.error, `Failed to update network "${agentName}".`, detail)
}

// #endregion: Agent-save helpers

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
    // MUI theme
    const theme = useTheme()

    const enableZenMode = useSettingsStore((state) => state.settings.behavior.enableZenMode)

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    const [isEditingNetwork, setIsEditingNetwork] = useState(false)

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

    const [sampleQueries, setSampleQueries] = useState<string[]>([])

    // Agents in network under construction by Agent Network Designer -
    // updated in real time as we receive progress messages from the backend.
    const [agentsInNetworkDesigner, setAgentsInNetworkDesigner] = useState<ConnectivityInfo[]>([])

    const [agentIconSuggestions, setAgentIconSuggestions] = useState<AgentIconSuggestions | null>(null)

    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
    const [networkDescription, setNetworkDescription] = useState<string>("")

    const networkDisplayName = useMemo(() => cleanUpAgentName(removeTrailingUuid(selectedNetwork)), [selectedNetwork])

    const [customURLLocalStorage, setCustomURLLocalStorage] = useLocalStorage("customAgentNetworkURL", null)

    // An extra set of quotes is making it in the string in local storage.
    const [neuroSanURL, setNeuroSanURL] = useState<string>(
        customURLLocalStorage?.replaceAll('"', "") || backendNeuroSanApiUrl
    )

    // Tracks how many times each agent has been involved in the conversation
    const [agentCounts, setAgentCounts] = useState<Map<string, number>>(new Map())

    const conversationsRef = useRef<AgentConversation[] | null>(null)

    const [currentConversations, setCurrentConversations] = useState<AgentConversation[]>([])

    const [networkToBeDeleted, setNetworkToBeDeleted] = useState<string | null>(null)

    // State to hold thought bubble edges - avoids duplicates across layout recalculations
    const [thoughtBubbleEdges, setThoughtBubbleEdges] = useState<
        Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>
    >(new Map())

    const [confirmationModalOpen, setConfirmationModalOpen] = useState<boolean>(false)
    const [tourModalOpen, setTourModalOpen] = useState<boolean>(false)
    const [haveShownTourModal, setHaveShownTourModal] = useState<boolean>(false)

    const [debugMode, setDebugMode] = useState<boolean>(false)
    const [currentDebugStep, setCurrentDebugStep] = useState<number>(0)
    // Add near existing debug state
    const [isDebugPlaying, setIsDebugPlaying] = useState<boolean>(false)
    const debugPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [detailChatMessageNumber, setDetailChatMessageNumber] = useState<number | null>(null)
    const [showMessageDetailsPopper, setShowMessageDetailsPopper] = useState<boolean>(false)

    //common function to change the selected network and reset related state
    const changeSelectedNetwork = useCallback((next: string | null) => {
        setSelectedNetwork(next)
        setAgentCounts(new Map())
        setChatMessages([])
        setCurrentDebugStep(0)
    }, [])

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

    // Introductory tour

    // Track that the user requested the tour, and we should start it once network data is available
    const [tourRequested, setTourRequested] = useState<boolean>(false)

    // Tour persisted status
    const tourStatus = useTourStore((s) => s.status)
    const setTourStatus = useTourStore((s) => s.setStatus)

    const {controls, Tour} = useJoyride({
        continuous: true,
        steps: MAIN_TOUR_STEPS,
        options: {
            buttons: ["back", "close", "primary", "skip"],
            backgroundColor: "var(--bs-secondary)",
            textColor: "var(--bs-white)",
            primaryColor: "var(--bs-accent3-medium)",
            arrowColor: "var(--bs-secondary)",
            overlayColor: "rgba(var(--bs-primary-rgb), 0.82)",
            showProgress: true,
            zIndex: getZIndex(3, theme),
            skipBeacon: true,
            skipScroll: true,
        },
        locale: {
            last: "End Tour",
            skip: "Exit Tour",
        },
    })

    const resetState = useCallback(() => {
        setThoughtBubbleEdges(new Map())
        setIsStreaming(false)
    }, [])

    // Reference to the ChatCommon component to allow external stop button to call its handleStop method
    const chatRef = useRef<ChatCommonHandle | null>(null)

    // Clear chat whenever the user navigates to the Agent Network Designer, so they start fresh each time
    useEffect(() => {
        if (selectedNetwork === AGENT_NETWORK_DESIGNER_ID) {
            chatRef.current?.handleClearChat()
        }
    }, [selectedNetwork])

    // Special mode of operation where user is using Agent Network Designer to create a new network
    const isNetworkDesignerMode = selectedNetwork === AGENT_NETWORK_DESIGNER_ID

    // Whether the currently selected network is a temporary network (agent reservation)
    const isSelectedNetworkTemporary = isTemporaryNetwork(selectedNetwork, temporaryNetworks)

    // For temp networks, agent_network_definition and agent_network_name live in localStorage (not IndexedDB slyData).
    // Supply them as extraSlyData so ChatCommon bounces them back to the backend on every request.
    const currentTempNetwork = isSelectedNetworkTemporary
        ? temporaryNetworks.find((n) => n.agentInfo.agent_name === selectedNetwork)
        : undefined

    // For Agent Network Designer: the backend echoes agent_network_name into IndexedDB sly_data as the conversation
    // progresses. We read it back here to find the matching temp network and override agent_network_definition in the
    // outgoing request — leaving what's in IndexedDB untouched.
    const designerSlyData = useAgentChatHistoryStore((state) => state.history[AGENT_NETWORK_DESIGNER_ID]?.slyData)
    const designerNetworkName = isNetworkDesignerMode
        ? (designerSlyData?.[AGENT_NETWORK_NAME_KEY] as string | undefined)
        : undefined
    const designerTempNetwork = designerNetworkName
        ? temporaryNetworks.find((n) => n.agentNetworkName === designerNetworkName)
        : undefined

    const extraSlyData: Record<string, unknown> | undefined = currentTempNetwork
        ? {
              [AGENT_NETWORK_DEFINITION_KEY]: currentTempNetwork.agentNetworkDefinition,
              // Use the agentNetworkName, not reservation_id
              ...(currentTempNetwork.agentNetworkName
                  ? {[AGENT_NETWORK_NAME_KEY]: currentTempNetwork.agentNetworkName}
                  : {}),
              ...(currentTempNetwork.networkHocon ? {[AGENT_NETWORK_HOCON]: currentTempNetwork.networkHocon} : {}),
          }
        : designerTempNetwork
          ? {[AGENT_NETWORK_DEFINITION_KEY]: designerTempNetwork.agentNetworkDefinition}
          : undefined

    // Handle external stop button click - stops streaming and exits zen mode
    const handleExternalStop = useCallback(() => {
        chatRef.current?.handleStop()
        resetState()
    }, [resetState])

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
                changeSelectedNetwork(null)
            }
        })()
    }, [neuroSanURL, changeSelectedNetwork])

    useEffect(() => {
        const fetchAgentDetails = async () => {
            // It is a Neuro-san agent, so get the function and connectivity info
            try {
                const agentFunction = await getAgentFunction(neuroSanURL, selectedNetwork, userInfo.userName)
                setNetworkDescription(agentFunction?.function?.description || "")
            } catch {
                // Ignore. May be a legacy agent without a functional description in Neuro-san.
            }
        }

        if (selectedNetwork && !isLegacyAgentType(selectedNetwork)) {
            void fetchAgentDetails()
        }
    }, [neuroSanURL, selectedNetwork, userInfo.userName])

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
                    const agentsInNetworkSorted: ConnectivityInfo[] = [...connectivity.connectivity_info].sort((a, b) =>
                        a?.origin.localeCompare(b?.origin)
                    )
                    setAgentsInNetwork(agentsInNetworkSorted)
                    setSampleQueries(connectivity?.metadata?.["sample_queries"] as string[])
                    setAgentIconSuggestions(null)
                    closeNotification()
                } catch (e) {
                    sendNotification(
                        NotificationType.error,
                        "Connection error",
                        `Unable to get agent list for "${networkDisplayName}". Verify that ${neuroSanURL} is a valid ` +
                            `Multi-Agent Accelerator Server. Error: ${e}.`
                    )
                    setAgentsInNetwork([])
                }
            } else {
                setAgentsInNetwork([])
            }
        })()
    }, [networkDisplayName, neuroSanURL, selectedNetwork, userInfo.userName])

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
    }, [agentNamesKey, agentsInNetwork])

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
            const reapCutoff = now - GRACE_PERIOD_MS / 1000

            const currentTemporaryNetworks = useTempNetworksStore.getState().tempNetworks

            // Networks past the grace period get fully purged: removed from the store AND have their
            // chat history / sly_data cleared from IndexedDB
            const survivingNetworks: TemporaryNetwork[] = []
            for (const network of currentTemporaryNetworks) {
                if (network.reservation.expiration_time_in_seconds <= reapCutoff) {
                    // This network has been expired for more than the grace period, so purge it
                    useAgentChatHistoryStore.getState().resetHistory(network.agentInfo.agent_name)
                } else {
                    survivingNetworks.push(network)
                }
            }
            useTempNetworksStore.getState().setTempNetworks(survivingNetworks)

            // If the selected network has expired on the server (not including our grace period), deselect it
            const selectedHasExpired = currentTemporaryNetworks.some(
                (network) =>
                    network.agentInfo.agent_name === selectedNetwork &&
                    network.reservation.expiration_time_in_seconds <= now
            )
            if (selectedHasExpired) {
                changeSelectedNetwork(null)
            }
        }, EXPIRED_NETWORKS_CHECK_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [changeSelectedNetwork, temporaryNetworks, selectedNetwork])

    const dismissTourModal = () => {
        setTourModalOpen(false)
        setHaveShownTourModal(true)
    }

    const handleExternalTourRequest = useCallback(() => {
        // If nothing is selected, prime the network selection first
        if (selectedNetwork == null && networks?.length > 0) {
            setSelectedNetwork(networks[0].agent_name)
        }

        // Close the modal if open
        setTourModalOpen(false)
        setTourRequested(true)
    }, [networks, selectedNetwork])

    useEffect(() => {
        window.addEventListener(TRIGGER_APP_TOUR_EVENT_NAME, handleExternalTourRequest)
        return () => window.removeEventListener(TRIGGER_APP_TOUR_EVENT_NAME, handleExternalTourRequest)
    }, [handleExternalTourRequest, networks, selectedNetwork])

    const onChatMessageReceived = useCallback(
        (chatMessage: ChatMessage) => {
            // Conversations between agents
            const result = extractConversations(chatMessage, conversationsRef.current)
            if (result != null) {
                conversationsRef.current = result
                setCurrentConversations(result)
            }

            // Update agent hit counts
            setAgentCounts((prevCounts) => {
                return getUpdatedAgentCounts(prevCounts, chatMessage.origin)
            })

            // Agent network designer progress messages
            if (isNetworkDesignerMode) {
                const networkInProgress = extractAgentNetworkDesignerProgress(chatMessage)
                if (networkInProgress?.length > 0) {
                    setAgentsInNetworkDesigner(networkInProgress)
                }
            }

            // Handle agent reservations (temporary networks) that come in through the chat stream.
            const newTemporaryNetworks = extractTemporaryNetworksFromMessage(chatMessage)
            if (newTemporaryNetworks.length > 0) {
                const upserted = useTempNetworksStore.getState().upsertTempNetworks(newTemporaryNetworks)

                // Record the new temporary networks so we can highlight them for the user.
                // For now, we only care about the first one since that's the only active use case
                setNewlyAddedTemporaryNetworks(new Set(upserted.map((network) => network.agentInfo.agent_name)))
            }
        },
        [isNetworkDesignerMode]
    )

    const onChunkReceived = useCallback(
        (chunk: string): boolean => {
            // Extract ChatMessage structure
            const chatMessage = chatMessageFromChunk(chunk)
            if (!chatMessage) {
                return true
            }

            setChatMessages((prev) => [...prev, chatMessage])

            onChatMessageReceived(chatMessage)

            return true
        },
        [onChatMessageReceived]
    )

    /**
     * Handles a save from the AgentFlow popup: streams the updated definition to the network designer,
     * collects reservations from each chunk, then upserts the result and navigates if the network changed.
     */
    const onSaveAgent = useCallback(
        async (
            agentName: string,
            updated: AgentNetworkDefinitionEntry[],
            agentNetworkName: string | undefined,
            signal: AbortSignal
        ): Promise<void> => {
            try {
                let newNetworks: TemporaryNetwork[] = []
                await sendNetworkDesignerUpdate(
                    neuroSanURL,
                    signal,
                    agentName,
                    updated,
                    agentNetworkName,
                    userInfo.userName,
                    (chunk) => {
                        newNetworks = collectNetworksFromChunk(chunk, updated, newNetworks)
                    }
                )

                if (newNetworks.length === 0) {
                    sendNotification(
                        NotificationType.error,
                        `Failed to update network "${agentName}".`,
                        "The network designer did not return a reservation. Please try again."
                    )
                    return
                }

                const replacement = newNetworks.find((n) => n.agentNetworkName === agentNetworkName)
                if (replacement) {
                    useTempNetworksStore.getState().upsertTempNetworks(newNetworks)
                    if (selectedNetwork) {
                        useAgentChatHistoryStore
                            .getState()
                            .copyHistory(selectedNetwork, replacement.agentInfo.agent_name)
                        setSelectedNetwork(replacement.agentInfo.agent_name)
                    }
                } else {
                    sendNotification(
                        NotificationType.error,
                        `Failed to update network "${agentName}".`,
                        "A reservation was returned but did not match the current network. Please try again."
                    )
                }
            } catch (e: unknown) {
                notifySaveError(agentName, e)
            }
        },
        [neuroSanURL, userInfo.userName, selectedNetwork]
    )

    const onStreamingStarted = useCallback((): void => {
        // Reset chat messages
        setChatMessages([])
        setCurrentDebugStep(0)

        // Reset agent counts
        setAgentCounts(new Map())

        // Reset newly added temporary networks
        setNewlyAddedTemporaryNetworks(new Set())

        // Reset Agent Network Designer preview
        setAgentsInNetworkDesigner([])

        // Mark that streaming has started
        setIsStreaming(true)
    }, [])

    const onStreamingComplete = useCallback(() => {
        // When streaming is complete, clean up any refs and state
        conversationsRef.current = null
        setCurrentConversations(null)
        setAgentsInNetworkDesigner([])
        resetState()
    }, [chatMessages, resetState])

    const handleDeleteNetwork = (networkId: string, isExpired: boolean) => {
        if (isExpired) {
            // It's expired so just delete it without confirmation
            const tempNetworksWithoutThisOne = temporaryNetworks.filter(
                (network) => network.agentInfo.agent_name !== networkId
            )
            useTempNetworksStore.getState().setTempNetworks(tempNetworksWithoutThisOne)
            useAgentChatHistoryStore.getState().resetHistory(networkId)
            if (selectedNetwork === networkId) {
                changeSelectedNetwork(null)
            }
        } else {
            setNetworkToBeDeleted(networkId)
            setConfirmationModalOpen(true)
        }
    }

    const handleEditNetwork = (_networkId: string) => {
        setIsEditingNetwork(true)
    }

    useEffect(() => {
        // Don't show the tour modal if any of these are true
        if (
            haveShownTourModal ||
            tourStatus === TourPromptState.Taken ||
            tourStatus === TourPromptState.DontShowAgain ||
            tourRequested
        ) {
            return undefined
        }

        // Show tour modal after a delay
        const timer = setTimeout(() => {
            setTourModalOpen(true)
        }, SHOW_TOUR_DELAY_MS)

        return () => {
            clearTimeout(timer)
        }
    }, [haveShownTourModal, tourRequested, tourStatus])

    useEffect(() => {
        if (!tourRequested) return

        // Determine whether the sample network for the tour is ready
        const networkReady = selectedNetwork != null && agentsInNetwork?.length > 0

        if (networkReady) {
            setTourStatus(TourPromptState.Taken)
            controls.start()
            setTourRequested(false)
        }
    }, [tourRequested, selectedNetwork, agentsInNetwork, networks, controls, setTourStatus])

    const stopDebugPlayback = useCallback(() => {
        if (debugPlayIntervalRef.current) {
            clearInterval(debugPlayIntervalRef.current)
            debugPlayIntervalRef.current = null
        }
        setIsDebugPlaying(false)
    }, [])

    const handleDebugPlay = useCallback(() => {
        if (!chatMessages?.length) return

        // toggle off
        if (isDebugPlaying) {
            stopDebugPlayback()
            return
        }

        // optional: restart if already at end
        if (currentDebugStep >= chatMessages.length - 1) {
            onStreamingComplete()
            setCurrentDebugStep(0)
        }

        setIsDebugPlaying(true)

        debugPlayIntervalRef.current = setInterval(() => {
            setCurrentDebugStep((prev) => {
                const next = prev + 1
                const last = chatMessages.length - 1

                if (next > last) {
                    stopDebugPlayback()
                    return prev
                }

                // Replay this single next message into derived UI state
                onChatMessageReceived(chatMessages[next])

                if (next === last) {
                    stopDebugPlayback()
                }

                return next
            })
        }, DEBUG_PLAY_INTERVAL_MS)
    }, [chatMessages, isDebugPlaying, currentDebugStep, onChatMessageReceived, onStreamingComplete, stopDebugPlayback])

    const handleDebugSingleStepForward = () => {
        if (currentDebugStep < chatMessages?.length - 1) {
            onChatMessageReceived(chatMessages[currentDebugStep])
            setCurrentDebugStep((prev) => prev + 1)
        }
    }

    const handleDebugBeginning = () => {
        setCurrentDebugStep(0)
        onStreamingComplete()
    }

    const handleDebugSingleStepBackwards = () => {
        setCurrentDebugStep((prev) => {
            if (prev > 0) {
                // Reset state and replay all messages up to the new step
                onStreamingComplete()
                for (let i = 0; i < prev - 1; i += 1) {
                    onChatMessageReceived(chatMessages[i])
                }
                return prev - 1
            } else {
                return prev
            }
        })
    }

    const handleDebugEnd = () => {
        setCurrentDebugStep(chatMessages.length - 1)
        for (const message of chatMessages.slice(currentDebugStep)) {
            onChatMessageReceived(message)
        }
    }

    const onClickChatMessage = (messageNumber: number) => {
        setDetailChatMessageNumber(messageNumber)
        setShowMessageDetailsPopper(true)
    }

    const isDebugDisabled = !chatMessages || chatMessages.length === 0

    const getDebugOverlay = () => {
        const iconButtonSx = {
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            p: 0.5,
            color: theme.palette.text.secondary,
            backgroundColor: theme.palette.background.paper,
            transition: "all 160ms ease",
            "&:hover": {
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.primary,
                borderColor: theme.palette.text.secondary,
            },
        }

        return (
            <Slide
                direction="up"
                in={debugMode}
                mountOnEnter
                unmountOnExit
                timeout={750}
            >
                <Box
                    sx={{
                        gap: 0.0,
                        marginBottom: "1rem",
                        marginTop: "4rem",
                        padding: "0.5rem",
                        width: "85%",
                    }}
                >
                    <Box
                        id="multi-agent-accelerator-debug-controls"
                        sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderLeft: `3px solid ${theme.palette.warning.main}`,
                            borderRadius: 2,
                            backgroundColor: theme.palette.background.paper,
                            boxShadow: theme.shadows[2],
                            padding: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        <Typography
                            variant="overline"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: 0.8,
                                lineHeight: 1,
                                color: theme.palette.text.secondary,
                            }}
                        >
                            Debug Controls
                        </Typography>

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                opacity: isDebugDisabled ? 0.45 : 1,
                                pointerEvents: isDebugDisabled ? "none" : "auto",
                                filter: isDebugDisabled ? "grayscale(0.25)" : "none",
                                transition: "opacity 160ms ease",
                            }}
                        >
                            <IconButton
                                size="small"
                                aria-label="Skip to start"
                                sx={iconButtonSx}
                                onClick={handleDebugBeginning}
                            >
                                <SkipPreviousIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                                size="small"
                                aria-label="Step back"
                                sx={iconButtonSx}
                                onClick={handleDebugSingleStepBackwards}
                                disabled={isDebugDisabled}
                            >
                                <ChevronLeftIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                                size="small"
                                aria-label={isDebugPlaying ? "Stop playback" : "Play"}
                                disabled={isDebugDisabled}
                                sx={{
                                    ...iconButtonSx,
                                    color: theme.palette.primary.contrastText,
                                    backgroundColor: isDebugPlaying
                                        ? theme.palette.error.main
                                        : theme.palette.primary.main,
                                    borderColor: isDebugPlaying ? theme.palette.error.main : theme.palette.primary.main,
                                    boxShadow: isDebugPlaying ? `0 0 0 2px ${theme.palette.error.light}` : undefined,
                                    "&:hover": {
                                        backgroundColor: isDebugPlaying
                                            ? theme.palette.error.dark
                                            : theme.palette.primary.dark,
                                        borderColor: isDebugPlaying
                                            ? theme.palette.error.dark
                                            : theme.palette.primary.dark,
                                        color: theme.palette.primary.contrastText,
                                    },
                                }}
                                onClick={handleDebugPlay}
                            >
                                {isDebugPlaying ? <StopCircle fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                            </IconButton>

                            <IconButton
                                size="small"
                                aria-label="Step forward"
                                sx={iconButtonSx}
                                disabled={isDebugDisabled}
                                onClick={handleDebugSingleStepForward}
                            >
                                <ChevronRightIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                                size="small"
                                aria-label="Skip to end"
                                sx={iconButtonSx}
                                onClick={handleDebugEnd}
                                disabled={isDebugDisabled}
                            >
                                <SkipNextIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Typography
                            variant="overline"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: 0.8,
                                lineHeight: 1,
                                color: theme.palette.text.secondary,
                            }}
                        >
                            Step: {isDebugDisabled ? "n/a" : `${currentDebugStep + 1} / ${chatMessages.length}`}
                        </Typography>

                        {isDebugDisabled && (
                            <Typography
                                id="multi-agent-accelerator-debug-disabled-hint"
                                variant="caption"
                                sx={{
                                    display: "block",
                                    mt: -0.5,
                                    color: theme.palette.text.disabled,
                                    fontStyle: "italic",
                                    letterSpacing: 0.1,
                                }}
                            >
                                No messages captured yet. Start a chat stream to enable debug controls.
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Slide>
        )
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
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        minHeight: 0, // critical for nested flex scrolling
                    }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
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
                            onEditNetwork={handleEditNetwork}
                            onDeleteNetwork={handleDeleteNetwork}
                            setSelectedNetwork={(newNetwork) => changeSelectedNetwork(newNetwork)}
                            temporaryNetworks={temporaryNetworks}
                        />
                    </Box>

                    {debugMode && (
                        <Box
                            id="multi-agent-accelerator-debug-overlay-container"
                            sx={{
                                borderRightStyle: "solid",
                                borderRightWidth: "0.75px",
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            {getDebugOverlay()}
                        </Box>
                    )}
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
                            agentCounts={agentCounts}
                            agentsInNetwork={agentsInNetwork}
                            agentIconSuggestions={agentIconSuggestions}
                            id="multi-agent-accelerator-agent-flow"
                            key="multi-agent-accelerator-agent-flow"
                            currentConversations={currentConversations}
                            currentUser={userInfo.userName}
                            isAwaitingLlm={isAwaitingLlm}
                            isEditMode={isEditingNetwork}
                            isStreaming={isStreaming}
                            isSelectedNetworkTemporary={isSelectedNetworkTemporary}
                            networkDisplayName={selectedNetwork || undefined}
                            networkId={isSelectedNetworkTemporary ? selectedNetwork : undefined}
                            neuroSanURL={neuroSanURL}
                            onEnterEditMode={() => setIsEditingNetwork(true)}
                            onExitEditMode={() => setIsEditingNetwork(false)}
                            onNetworkReplaced={(_old, newId) => changeSelectedNetwork(newId)}
                            onSaveAgent={onSaveAgent}
                            thoughtBubbleEdges={thoughtBubbleEdges}
                            setThoughtBubbleEdges={setThoughtBubbleEdges}
                            toggleDebugMode={() => setDebugMode((prev) => !prev)}
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
                        customAgentGreetings={{
                            [AGENT_NETWORK_DESIGNER_ID]: "Let's build a network together!",
                        }}
                        agentPlaceholders={{
                            [AGENT_NETWORK_DESIGNER_ID]:
                                "Describe in plain language the network you would like to build.",
                        }}
                        currentUser={userInfo.userName}
                        debugMessages={debugMode && chatMessages ? chatMessages : undefined}
                        debugStep={debugMode ? currentDebugStep : undefined}
                        extraSlyData={extraSlyData}
                        id="agent-network-ui"
                        isAwaitingLlm={isAwaitingLlm}
                        key={selectedNetwork ?? "no-network"}
                        networkDescription={networkDescription}
                        neuroSanURL={neuroSanURL}
                        onChunkReceived={onChunkReceived}
                        onClickChatMessage={onClickChatMessage}
                        onStreamingComplete={onStreamingComplete}
                        onStreamingStarted={onStreamingStarted}
                        ref={chatRef}
                        sampleQueries={sampleQueries}
                        setIsAwaitingLlm={setIsAwaitingLlm}
                        targetAgent={selectedNetwork}
                        userImage={userInfo.userImage}
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

    const getDeleteNetworkConfirmationModal = () =>
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
                    useAgentChatHistoryStore.getState().resetHistory(networkToBeDeleted)
                    if (selectedNetwork === networkToBeDeleted) {
                        changeSelectedNetwork(null)
                    }
                    setNetworkToBeDeleted(null)
                    setConfirmationModalOpen(false)
                }}
                title="Delete Network"
            />
        ) : null

    const getTourModal = () =>
        tourModalOpen && (
            <MUIDialog
                contentSx={{fontSize: "0.8rem", minWidth: "550px", paddingTop: "0"}}
                footer={
                    <>
                        <StyledButton
                            id="tour-dont-show-again"
                            onClick={() => {
                                setTourStatus(TourPromptState.DontShowAgain)
                                dismissTourModal()
                            }}
                            variant="outlined"
                        >
                            Don&#39;t show this again
                        </StyledButton>
                        <StyledButton
                            id="tour-not-now"
                            onClick={() => {
                                dismissTourModal()
                            }}
                            variant="outlined"
                        >
                            Not now
                        </StyledButton>
                        <StyledButton
                            id="tour-take"
                            onClick={() => {
                                // If no network selected, select one so we have something to show
                                if (selectedNetwork == null) {
                                    setSelectedNetwork(networks?.[0]?.agent_name ?? null)
                                }
                                dismissTourModal()

                                // Defer starting the tour until the selected network's data is available.
                                setTourRequested(true)
                            }}
                            variant="contained"
                        >
                            Take the tour
                        </StyledButton>
                    </>
                }
                id="multi-agent-accelerator-tour-modal"
                isOpen={tourModalOpen}
                onClose={() => {
                    dismissTourModal()
                }}
                title="Tour"
            >
                Would you like to take a tour of the application? (2 mins)
            </MUIDialog>
        )

    /**
     * Popper to show real-time progress of the Agent Network Designer output as we receive it from the backend.
     * Only displayed when Agent Network Designer is active.
     */
    const getProgressPopper = () => (
        <Box
            sx={{
                display: isStreaming && isNetworkDesignerMode ? "block" : "none",
                position: "absolute",
                top: 0,
                left: 0,
                width: "600px",
                height: "600px",
                zIndex: getZIndex(2, theme),
            }}
        >
            <ReactFlowProvider>
                <Box
                    sx={{
                        alignItems: "center",
                        background: "var(--bs-secondary)",
                        border: "4px solid var(--bs-yellow)",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        justifyContent: "center",
                        margin: "0 auto",
                        maxWidth: 1000,
                        opacity: "95%",
                        width: "100%",
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
                            thoughtBubbleEdges={EMPTY_THOUGHT_BUBBLE_EDGES}
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
        </Box>
    )

    const getChatMessageDetailsPopper = () => (
        <Box
            role="dialog"
            aria-modal="false"
            aria-label="Message details"
            sx={{
                display: showMessageDetailsPopper ? "flex" : "none",
                flexDirection: "column",
                position: "absolute",
                top: "8%",
                left: "50%",
                transform: "translateX(-50%)",
                width: {xs: "92%", sm: "78%", md: "52%", lg: "42%"},
                maxWidth: 760,
                maxHeight: "72%",
                zIndex: getZIndex(2, theme),

                // Softer, theme-consistent visual treatment
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                boxShadow: theme.shadows[8],
                backdropFilter: "blur(2px)",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[50],
                }}
            >
                <Typography
                    variant="subtitle1"
                    sx={{fontWeight: 700, letterSpacing: 0.2}}
                >
                    Message Details
                </Typography>

                <IconButton
                    aria-label="Close message details"
                    onClick={() => setShowMessageDetailsPopper(false)}
                    size="small"
                    sx={{
                        color: theme.palette.text.secondary,
                        "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                            color: theme.palette.text.primary,
                        },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Content */}
            <Box
                sx={{
                    p: 2,
                    overflowY: "auto",
                    lineHeight: 1.55,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                }}
            >
                {(() => {
                    const msg = chatMessages?.[detailChatMessageNumber ?? -1]

                    const sectionSx = {
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        p: 1.25,
                        backgroundColor:
                            theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : theme.palette.grey[50],
                    } as const

                    const codeSx = {
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
                        fontSize: "0.78rem",
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.03)",
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    } as const

                    if (!msg) {
                        return <Typography variant="body1">No message selected.</Typography>
                    }

                    return (
                        <>
                            <Typography
                                variant="caption"
                                sx={{color: theme.palette.text.secondary}}
                            >
                                Message #{(detailChatMessageNumber ?? 0) + 1}
                            </Typography>

                            {/* Core */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    Core
                                </Typography>
                                <Typography variant="body2">
                                    <strong>type:</strong> {msg.type ?? "n/a"}
                                </Typography>
                            </Box>

                            {/* Text (scrollable) */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    text
                                </Typography>
                                <Box
                                    sx={{
                                        ...codeSx,
                                        maxHeight: 240,
                                        overflowY: "auto",
                                        mt: 0.5,
                                    }}
                                >
                                    {msg.text ?? "n/a"}
                                </Box>
                            </Box>

                            {/* Origin[] */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    origin[] (Origin)
                                </Typography>
                                {msg.origin?.length ? (
                                    <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5}}>
                                        {msg.origin.map((o, i) => (
                                            <Box
                                                key={`origin-${i}`}
                                                sx={codeSx}
                                            >
                                                {`[${i}] tool=${o?.tool ?? "n/a"} | instantiation_index=${o?.instantiation_index ?? "n/a"}`}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="body2">n/a</Typography>
                                )}
                            </Box>

                            {/* tool_result_origin[] */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    tool_result_origin[] (Origin)
                                </Typography>
                                {msg.tool_result_origin?.length ? (
                                    <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5}}>
                                        {msg.tool_result_origin.map((o, i) => (
                                            <Box
                                                key={`tool-origin-${i}`}
                                                sx={codeSx}
                                            >
                                                {`[${i}] tool=${o?.tool ?? "n/a"} | instantiation_index=${o?.instantiation_index ?? "n/a"}`}
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="body2">n/a</Typography>
                                )}
                            </Box>

                            {/* mime_data[] */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    mime_data[] (MimeData)
                                </Typography>
                                {msg.mime_data?.length ? (
                                    <Box sx={{display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5}}>
                                        {msg.mime_data.map((m, i) => (
                                            <Box
                                                key={`mime-${i}`}
                                                sx={codeSx}
                                            >
                                                <div>{`[${i}] mime_type=${m?.mime_type ?? "n/a"}`}</div>
                                                <div>{`mime_bytes length=${m?.mime_bytes?.length ?? 0}`}</div>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="body2">n/a</Typography>
                                )}
                            </Box>

                            {/* structure */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    structure (Record&lt;string, unknown&gt;)
                                </Typography>
                                <Box sx={{...codeSx, mt: 0.5}}>
                                    {msg.structure ? JSON.stringify(msg.structure, null, 2) : "n/a"}
                                </Box>
                            </Box>

                            {/* sly_data */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    sly_data (Record&lt;string, unknown&gt;)
                                </Typography>
                                <Box sx={{...codeSx, mt: 0.5}}>
                                    {msg.sly_data ? JSON.stringify(msg.sly_data, null, 2) : "n/a"}
                                </Box>
                            </Box>

                            {/* chat_context */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    chat_context (ChatContext)
                                </Typography>

                                {msg.chat_context ? (
                                    <>
                                        <Typography
                                            variant="body2"
                                            sx={{mt: 0.5}}
                                        >
                                            <strong>chat_histories count:</strong>{" "}
                                            {msg.chat_context.chat_histories?.length ?? 0}
                                        </Typography>

                                        {msg.chat_context.chat_histories?.length ? (
                                            <Box sx={{display: "flex", flexDirection: "column", gap: 1, mt: 1}}>
                                                {msg.chat_context.chat_histories.map((h, hi) => (
                                                    <Box
                                                        key={`history-${hi}`}
                                                        sx={{
                                                            border: `1px solid ${theme.palette.divider}`,
                                                            borderRadius: 1,
                                                            p: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            sx={{color: theme.palette.text.secondary}}
                                                        >
                                                            chat_histories[{hi}] (ChatHistory)
                                                        </Typography>

                                                        <Box sx={{...codeSx, mt: 0.5}}>
                                                            {JSON.stringify(
                                                                {
                                                                    origin: h.origin,
                                                                    messages_count: h.messages?.length ?? 0,
                                                                    messages: h.messages,
                                                                },
                                                                null,
                                                                2
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ) : null}
                                    </>
                                ) : (
                                    <Typography variant="body2">n/a</Typography>
                                )}
                            </Box>

                            {/* Raw dump */}
                            <Box sx={sectionSx}>
                                <Typography
                                    variant="overline"
                                    sx={{fontWeight: 700, color: theme.palette.text.secondary}}
                                >
                                    raw (full ChatMessage JSON)
                                </Typography>
                                <Box sx={{...codeSx, mt: 0.5, maxHeight: 260}}>{JSON.stringify(msg, null, 2)}</Box>
                            </Box>
                        </>
                    )
                })()}
            </Box>
        </Box>
    )

    return (
        <>
            {Tour}
            {getTourModal()}
            {getProgressPopper()}
            {getChatMessageDetailsPopper()}
            {getDeleteNetworkConfirmationModal()}
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
