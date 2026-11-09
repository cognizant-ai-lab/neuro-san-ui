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

import AddBoxRounded from "@mui/icons-material/AddBoxRounded"
import Close from "@mui/icons-material/Close"
import StopCircle from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Slide from "@mui/material/Slide"
import Snackbar from "@mui/material/Snackbar"
import {alpha, useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {ReactFlowProvider} from "@xyflow/react"
import {AnimatePresence, motion} from "motion/react"
import {FC, JSX as ReactJSX, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react"
import {useJoyride} from "react-joyride"
import {Group, Panel, PanelSize, usePanelRef} from "react-resizable-panels"

import {AgentConversation, extractConversations} from "./AgentConversations"
import {getUpdatedAgentCounts} from "./AgentCounts"
import {AgentFlow, CanvasSafeArea} from "./AgentFlow/AgentFlow"
import {extractAgentNetworkDesignerProgress} from "./AgentNetworkDesigner"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_HOCON,
    AGENT_NETWORK_NAME_KEY,
    AgentNetworkDefinitionEntry,
    EXPIRED_NETWORKS_CHECK_INTERVAL_MS,
    GRACE_PERIOD_MS,
    NEURO_SAN_CALLOUT_DELAY_MS,
    SHOW_TOUR_DELAY_MS,
    TRIGGER_APP_TOUR_EVENT_NAME,
} from "./const"
import {NeuroSanStudioCallout} from "./NeuroSanStudioCallout"
import {PanelSeparator, SEPARATOR_HIT_WIDTH} from "./PanelSeparator"
import {BYOK} from "./Schema/SlyData"
import {Sidebar} from "./Sidebar/Sidebar"
import {
    extractTemporaryNetworksFromMessage,
    isTemporaryNetwork,
    notifySaveError,
    streamNetworkDesignerUpsert,
} from "./TemporaryNetworks"
import {ThoughtBubbleEdgeShape} from "./ThoughtBubbles/ThoughtBubbleEdge"
import {MAIN_TOUR_STEPS} from "./Tour/MainTourSteps"
import {FloatingPanel} from "./Workspace/FloatingPanel"
import {getAgentFunction, getAgentNetworks, getConnectivity} from "../../controller/agent/Agent"
import {getAgentIconSuggestions, getNetworkIconSuggestions} from "../../controller/agent/IconSuggestions"
import {AgentIconSuggestions} from "../../controller/Types/AgentIconSuggestions"
import {NetworkIconSuggestions} from "../../controller/Types/NetworkIconSuggestions"
import {AgentInfo, ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import {AnnouncementId, useAnnouncementsStore} from "../../state/Announcements"
import {useAgentChatHistoryStore} from "../../state/ChatHistory"
import {ByokKeyField, getApiKey, LLM_PROVIDER_API_KEY_FIELD, LLMProvider, useSettingsStore} from "../../state/Settings"
import {TemporaryNetwork, useTempNetworksStore} from "../../state/TemporaryNetworks"
import {TourPromptState, useTourStore} from "../../state/Tour"
import {
    getSheen,
    glassSurface,
    glowShadow,
    gradientText,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_RADIUS,
    SHEEN_RADIUS_SURFACE,
    sheenGradient,
    spinningBorder,
} from "../../Theme/sheen"
import {toDisplayName} from "../../utils/AgentName"
import {getZIndex} from "../../utils/zIndexLayers"
import {ChatCommon, ChatCommonHandle} from "../AgentChat/ChatCommon/ChatCommon"
import {LlmChatButton} from "../AgentChat/Common/LlmChatButton"
import {isLegacyAgentType} from "../AgentChat/Common/Types"
import {chatMessageFromChunk} from "../AgentChat/Common/Utils"
import {ConfirmationModal, StyledButton} from "../Common/ConfirmationModal"
import {MUIAlert} from "../Common/MUIAlert"
import {MUIDialog} from "../Common/MUIDialog"
import {closeNotification, NotificationType, sendNotification} from "../Common/notification"

export interface MultiAgentAcceleratorProps {
    readonly username: string
    readonly defaultNeuroSanUrl: string
}

// Gap (px) between the floating panels and the workspace edges
const WORKSPACE_GAP = 14

// Widths (px) the side cards keep while sliding in/out, so their content slides rather than squishes
const SIDEBAR_SLIDE_WIDTH = 280
const CHAT_SLIDE_WIDTH = 380

// How long the panels' size transition runs when zen mode collapses / expands them (ms)
const PANEL_TRANSITION_MS = 650

// Before the first measurement: roughly the floating navbar's height plus its margin (px)
const DEFAULT_TOP_OFFSET = 76

// Treat panels at (or within rounding of) 0% as collapsed
const isCollapsedSize = (size: PanelSize) => size.asPercentage < 0.5

// Optimization to avoid creating a new empty map on every render
const EMPTY_THOUGHT_BUBBLE_EDGES = new Map<string, {edge: ThoughtBubbleEdgeShape; timestamp: number}>()

/**
 * Maps an API key name to the corresponding LLM provider
 */
const API_KEY_TO_PROVIDER = {
    openai_api_key: "OpenAI",
    anthropic_api_key: "Anthropic",
    google_api_key: "Google",
} as const satisfies Record<ByokKeyField, LLMProvider>

/**
 * Given a SlyData schema, returns the set of LLM providers that are supported by the agent network.
 * @param agentLlmConfig The `llm_config` property of the SlyData schema, if any.
 * @returns A Set of LLM providers for which BYOK keys are supported by the current network. Empty if none.
 * @note Semantics are "oneOf": a key must be supplied for at least one of the named providers
 */
const getSupportedLlmProviders = (agentLlmConfig: unknown): ReadonlySet<LLMProvider> => {
    const isByokKeyField = (key: string): key is ByokKeyField => Object.hasOwn(API_KEY_TO_PROVIDER, key)

    const parsedAgentLlmConfig = BYOK.safeParse(agentLlmConfig)

    if (!parsedAgentLlmConfig.success || !parsedAgentLlmConfig.data.required?.includes("llm_config")) {
        return new Set()
    }

    const providerKeys = Object.keys(parsedAgentLlmConfig.data.properties?.llm_config?.properties ?? {})

    return new Set(providerKeys.filter(isByokKeyField).map((key) => API_KEY_TO_PROVIDER[key]))
}

/**
 * Main Multi-Agent Accelerator component that contains the sidebar, agent flow, and chat components.
 * @param backendNeuroSanApiUrl Initial URL of the backend Neuro-San API. User can change this in the UI.
 * @param username Identifier to use for interactions with the backend (for personalization and tracking).
 */
export const MultiAgentAccelerator: FC<MultiAgentAcceleratorProps> = ({
    defaultNeuroSanUrl,
    username,
}): ReactJSX.Element => {
    // MUI theme
    const theme = useTheme()

    const enableZenMode = useSettingsStore((state) => state.settings.behavior.enableZenMode)

    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)

    // Display option for agent/network names
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)

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

    const networkDisplayName = useMemo(
        () => toDisplayName(selectedNetwork, useNativeNames),
        [selectedNetwork, useNativeNames]
    )

    // LLM providers for which BYOK keys are supported by the current network
    const [supportedByokProviders, setSupportedByokProviders] = useState<ReadonlySet<LLMProvider>>(new Set())

    // The sly_data_schema advertised by the current network, if any. Drives schema hints in the sly_data dialog.
    const [slyDataSchema, setSlyDataSchema] = useState<Record<string, unknown> | undefined>(undefined)

    const neuroSanURL = useSettingsStore((state) => state.settings.externalServices.neuroSanUrl) ?? defaultNeuroSanUrl

    // Tracks how many times each agent has been involved in the conversation
    const [agentCounts, setAgentCounts] = useState<Map<string, number>>(new Map())

    // Common function to change the selected network and reset related state
    const changeSelectedNetwork = useCallback((next: string | null) => {
        setSelectedNetwork(next)
        setAgentCounts(new Map())
    }, [])

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

    // Memoized key for agent names to trigger icon suggestion updates when the set of agents changes, not just
    // when sorting/other operations on the "agents" list
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

    // Tour tooltip: specular glass card with a gradient primary button (joyride takes plain inline styles)
    const sheen = getSheen(theme)
    const themeVars = theme.vars ?? theme
    const {controls, Tour} = useJoyride({
        continuous: true,
        steps: MAIN_TOUR_STEPS,
        options: {
            buttons: ["back", "close", "primary", "skip"],
            backgroundColor: themeVars.palette.background.paper,
            textColor: themeVars.palette.text.primary,
            primaryColor: themeVars.palette.primary.main,
            arrowColor: themeVars.palette.background.paper,
            overlayColor: alpha(theme.palette.background.default, 0.72),
            spotlightRadius: SHEEN_RADIUS,
            showProgress: true,
            zIndex: getZIndex(3, theme),
            skipBeacon: true,
            skipScroll: true,
        },
        styles: {
            tooltip: {
                backgroundImage: `linear-gradient(180deg, ${sheen.tint}, transparent 45%)`,
                border: `1px solid ${sheen.glassBorder}`,
                borderRadius: SHEEN_RADIUS_SURFACE,
                boxShadow: `inset 0 1px 0 ${sheen.highlight}, ${glowShadow(theme, 40)}`,
            },
            tooltipTitle: {
                fontFamily: SHEEN_FONT_DISPLAY,
                fontSize: "1.25rem",
                fontWeight: 500,
            },
            buttonPrimary: {
                backgroundImage: sheenGradient(theme),
                borderRadius: 999,
                boxShadow: glowShadow(theme, 16),
                color: themeVars.palette.primary.contrastText,
                fontWeight: 600,
                padding: "8px 16px",
            },
            buttonBack: {color: themeVars.palette.text.secondary},
            buttonSkip: {color: themeVars.palette.text.secondary},
        },
        locale: {
            last: "End Tour",
            skip: "Exit Tour",
        },
    })

    // Neuro SAN Studio callout
    const [neuroSanCalloutOpen, setNeuroSanCalloutOpen] = useState<boolean>(false)
    const haveShownNeuroSanCallout = useAnnouncementsStore((state) =>
        state.hasShown(AnnouncementId.NeuroSanStudioGithubStar)
    )
    const markAnnouncementShown = useAnnouncementsStore((state) => state.markShown)

    const resetState = useCallback(() => {
        setThoughtBubbleEdges(new Map())
        setIsStreaming(false)
    }, [])

    // Reference to the ChatCommon component to allow external stop button to call its handleStop method
    const chatRef = useRef<ChatCommonHandle | null>(null)

    const leftPanelRef = usePanelRef()
    const rightPanelRef = usePanelRef()

    // Workspace geometry. The workspace is full-bleed: it is pulled up under the floating navbar and out to the
    // viewport edges, so we measure where it would naturally start (via a zero-size sentinel) and offset by that.
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const [naturalOffset, setNaturalOffset] = useState<{top: number; left: number}>({
        top: DEFAULT_TOP_OFFSET,
        left: 0,
    })

    useLayoutEffect(() => {
        const measure = () => {
            const rect = sentinelRef.current?.getBoundingClientRect()
            if (!rect) return
            const next = {
                top: Math.max(0, Math.round(rect.top + window.scrollY)),
                left: Math.max(0, Math.round(rect.left + window.scrollX)),
            }
            setNaturalOffset((prev) => (prev.top === next.top && prev.left === next.left ? prev : next))
        }

        measure()
        window.addEventListener("resize", measure)
        // Web fonts can change the navbar's height once they load
        void document.fonts?.ready?.then(measure)
        return () => window.removeEventListener("resize", measure)
    }, [])

    // Current sizes of the side panels, for keeping the canvas chrome inside the uncovered area
    const [leftPanelSize, setLeftPanelSize] = useState<PanelSize | null>(null)
    const [rightPanelSize, setRightPanelSize] = useState<PanelSize | null>(null)
    // Collapsed state of the side panels: follows the panel sizes (e.g. dragged shut), and is set directly by zen mode
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
    const [isRightCollapsed, setIsRightCollapsed] = useState(false)
    const handleLeftPanelResize = useCallback((size: PanelSize) => {
        setLeftPanelSize(size)
        setIsLeftCollapsed(isCollapsedSize(size))
    }, [])
    const handleRightPanelResize = useCallback((size: PanelSize) => {
        setRightPanelSize(size)
        setIsRightCollapsed(isCollapsedSize(size))
    }, [])

    // True while zen mode is animating the side panels in or out
    const [isPanelTransitioning, setIsPanelTransitioning] = useState(false)
    const panelTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startPanelTransition = useCallback(() => {
        setIsPanelTransitioning(true)
        if (panelTransitionTimerRef.current) clearTimeout(panelTransitionTimerRef.current)
        panelTransitionTimerRef.current = setTimeout(() => {
            panelTransitionTimerRef.current = null
            setIsPanelTransitioning(false)
        }, PANEL_TRANSITION_MS)
    }, [])
    useEffect(
        () => () => {
            if (panelTransitionTimerRef.current) clearTimeout(panelTransitionTimerRef.current)
        },
        []
    )

    // Region of the canvas not covered by the navbar or the floating panels
    const safeArea: CanvasSafeArea = useMemo(
        () => ({
            top: naturalOffset.top + WORKSPACE_GAP,
            right: WORKSPACE_GAP + (rightPanelSize?.inPixels ?? 0) + SEPARATOR_HIT_WIDTH,
            bottom: WORKSPACE_GAP,
            left: WORKSPACE_GAP + (leftPanelSize?.inPixels ?? 0) + SEPARATOR_HIT_WIDTH,
        }),
        [leftPanelSize?.inPixels, naturalOffset.top, rightPanelSize?.inPixels]
    )

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
    const designerNetworkNameValue = designerSlyData?.[AGENT_NETWORK_NAME_KEY]
    const designerNetworkName =
        isNetworkDesignerMode && typeof designerNetworkNameValue === "string" ? designerNetworkNameValue : undefined
    const designerTempNetwork = designerNetworkName
        ? temporaryNetworks.find((n) => n.agentNetworkName === designerNetworkName)
        : undefined

    /**
     * Builds the extraSlyData object to be sent with each request, including information for Agent Network Designer
     * and (if required) API keys for LLM providers.
     */
    const buildExtraSlyData = (): Record<string, unknown> | undefined => {
        if (currentTempNetwork) {
            const result: Record<string, unknown> = {
                [AGENT_NETWORK_DEFINITION_KEY]: currentTempNetwork.agentNetworkDefinition,
            }

            // Use agentNetworkName, not reservation_id
            if (currentTempNetwork.agentNetworkName) {
                result[AGENT_NETWORK_NAME_KEY] = currentTempNetwork.agentNetworkName
            }

            if (currentTempNetwork.networkHocon) {
                result[AGENT_NETWORK_HOCON] = currentTempNetwork.networkHocon
            }

            return result
        }

        if (designerTempNetwork) {
            return {
                [AGENT_NETWORK_DEFINITION_KEY]: designerTempNetwork.agentNetworkDefinition,
            }
        }

        return undefined
    }

    // Whether any API keys are required
    const anyApiKeysRequired = supportedByokProviders.size > 0

    // Build base extraSlyData
    const baseExtraSlyData = buildExtraSlyData()

    // Add API keys to extraSlyData if needed, merging with baseExtraSlyData if it exists
    const extraSlyData: Record<string, unknown> | undefined = useMemo(() => {
        /**
         * Builds the API keys object to be sent as extraSlyData with each request, based on the LLM providers required
         * by the currently selected network. Only includes keys for providers that are required.
         */
        const apiKeysSlyData = {
            llm_config: Object.fromEntries(
                [...supportedByokProviders]
                    .map((provider): [ByokKeyField, string | undefined] => [
                        LLM_PROVIDER_API_KEY_FIELD[provider],
                        getApiKey(apiKeys, provider),
                    ])
                    .filter((entry: [ByokKeyField, string | undefined]): entry is [ByokKeyField, string] =>
                        Boolean(entry[1])
                    )
            ),
        }

        return anyApiKeysRequired || baseExtraSlyData
            ? {
                  ...baseExtraSlyData,
                  ...(anyApiKeysRequired ? apiKeysSlyData : {}),
              }
            : undefined
    }, [anyApiKeysRequired, apiKeys, baseExtraSlyData, supportedByokProviders])

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
                // Reset before fetching
                setNetworkDescription("")
                setSupportedByokProviders(new Set())
                setSlyDataSchema(undefined)

                // Get agent function from server
                const agentFunction = await getAgentFunction(neuroSanURL, selectedNetwork, username)
                setNetworkDescription(agentFunction?.function?.description || "")

                const slyDataSchemaTemp = agentFunction?.function?.sly_data_schema
                const supportedLlmProviders = getSupportedLlmProviders(slyDataSchemaTemp)
                setSupportedByokProviders(supportedLlmProviders)
                setSlyDataSchema(slyDataSchemaTemp)
            } catch (e) {
                console.warn(`Unable to get agent details for network ${selectedNetwork}:`, e)
            }
        }

        // Clear out existing
        setNetworkDescription("")
        if (selectedNetwork && !isLegacyAgentType(selectedNetwork)) {
            void fetchAgentDetails()
        }
    }, [neuroSanURL, selectedNetwork, username])

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
                        username
                    )
                    const agentsInNetworkSorted: ConnectivityInfo[] = [...connectivity.connectivity_info].sort((a, b) =>
                        a?.origin.localeCompare(b?.origin)
                    )
                    setAgentsInNetwork(agentsInNetworkSorted)
                    const sampleQueriesTmp = connectivity?.metadata?.["sample_queries"]
                    if (Array.isArray(sampleQueriesTmp)) {
                        setSampleQueries(sampleQueriesTmp)
                    } else {
                        setSampleQueries([])
                    }
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
    }, [networkDisplayName, neuroSanURL, selectedNetwork, username])

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

            return true
        },
        [isNetworkDesignerMode]
    )

    /**
     * Handles a save from the AgentFlow popup: streams the updated definition to the network designer,
     * collects reservations from each chunk, then upserts the result, and navigates if the network changed.
     */
    const onSaveAgent = useCallback(
        async (
            agentName: string,
            updated: AgentNetworkDefinitionEntry[],
            agentNetworkName: string | undefined,
            signal: AbortSignal
        ): Promise<void> => {
            try {
                const newNetworks = await streamNetworkDesignerUpsert(
                    neuroSanURL,
                    signal,
                    agentName,
                    updated,
                    agentNetworkName,
                    username,
                    extraSlyData
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
        [neuroSanURL, username, extraSlyData, selectedNetwork]
    )

    const onStreamingStarted = useCallback((): void => {
        // Reset agent counts
        setAgentCounts(new Map())

        // Reset newly added temporary networks
        setNewlyAddedTemporaryNetworks(new Set())

        // Reset Agent Network Designer preview
        setAgentsInNetworkDesigner([])

        // Mark that streaming has started
        setIsStreaming(true)

        // Collapse outer panels for Zen mode
        if (enableZenMode) {
            startPanelTransition()
            leftPanelRef?.current?.collapse()
            rightPanelRef?.current?.collapse()
            setIsLeftCollapsed(true)
            setIsRightCollapsed(true)
        }
    }, [enableZenMode, leftPanelRef, rightPanelRef, startPanelTransition])

    const onStreamingComplete = useCallback(() => {
        // When streaming is complete, clean up any refs and state
        conversationsRef.current = null
        setCurrentConversations(null)
        setAgentsInNetworkDesigner([])
        resetState()

        // Un-collapse outer panels for Zen mode
        if (enableZenMode) {
            startPanelTransition()
            leftPanelRef?.current?.expand()
            rightPanelRef?.current?.expand()
            setIsLeftCollapsed(leftPanelRef.current?.isCollapsed() === true)
            setIsRightCollapsed(rightPanelRef.current?.isCollapsed() === true)
        }
    }, [enableZenMode, leftPanelRef, resetState, rightPanelRef, startPanelTransition])

    const handleDeleteNetwork = (networkId: string, isExpired: boolean) => {
        if (isExpired) {
            // It's expired, so just delete it without confirmation
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

    // Show Neuro SAN Studio callout after a delay if the user hasn't seen it yet
    useEffect(() => {
        // If it's already open, or we've already shown it, just return
        if (neuroSanCalloutOpen || haveShownNeuroSanCallout) return undefined

        // Show callout after a delay
        const timer = setTimeout(() => {
            setNeuroSanCalloutOpen(true)
        }, NEURO_SAN_CALLOUT_DELAY_MS)

        return () => {
            clearTimeout(timer)
        }
    }, [haveShownNeuroSanCallout, neuroSanCalloutOpen])

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

    const getMissingApiKeys = (): ReadonlySet<LLMProvider> => {
        // Calculate intersection of what we have (apiKeys) and what is required (providerKeysRequired)
        const intersection = new Set([...supportedByokProviders].filter((provider) => getApiKey(apiKeys, provider)))
        return intersection.size === 0 ? supportedByokProviders : new Set()
    }

    const hasMissingApiKeys = getMissingApiKeys().size > 0

    const getLeftPanel = () => (
        <Panel
            collapsible={true}
            defaultSize="20%"
            id="multi-agent-accelerator-left-panel"
            minSize="10%"
            onResize={handleLeftPanelResize}
            panelRef={leftPanelRef}
            style={{overflow: "visible"}}
        >
            <FloatingPanel
                collapsed={isLeftCollapsed}
                id="multi-agent-accelerator-left-card"
                isTransitioning={isPanelTransitioning}
                minWidth={SIDEBAR_SLIDE_WIDTH}
                side="left"
            >
                <Sidebar
                    id="multi-agent-accelerator-sidebar"
                    isAwaitingLlm={isAwaitingLlm}
                    networkIconSuggestions={networkIconSuggestions}
                    networks={networks}
                    neuroSanServerURL={neuroSanURL}
                    newlyAddedTemporaryNetworks={newlyAddedTemporaryNetworks}
                    onDeleteNetwork={handleDeleteNetwork}
                    onEditNetwork={handleEditNetwork}
                    setSelectedNetwork={(newNetwork) => changeSelectedNetwork(newNetwork)}
                    temporaryNetworks={temporaryNetworks}
                />
            </FloatingPanel>
        </Panel>
    )

    // The center panel is a transparent window onto the canvas beneath: it only exists to be resized against (and
    // as a tour anchor). Pointer events pass through to the canvas.
    const getCenterPanel = () => (
        <Panel
            collapsible={true}
            defaultSize="45%"
            id="multi-agent-accelerator-center-panel"
            minSize="10%"
            style={{pointerEvents: "none"}}
        />
    )

    // Full-bleed canvas layer behind the floating panels
    const getCanvas = () => (
        <Box
            id="multi-agent-accelerator-canvas"
            sx={{inset: 0, position: "absolute", zIndex: 0}}
        >
            <ReactFlowProvider>
                <Box
                    id="multi-agent-accelerator-agent-flow-container"
                    sx={{
                        display: "flex",
                        height: "100%",
                        width: "100%",
                    }}
                >
                    <AgentFlow
                        agentCounts={agentCounts}
                        agentsInNetwork={agentsInNetwork}
                        agentIconSuggestions={agentIconSuggestions}
                        extraSlyData={extraSlyData}
                        id="multi-agent-accelerator-agent-flow"
                        key="multi-agent-accelerator-agent-flow"
                        currentConversations={currentConversations}
                        currentUser={username}
                        isAwaitingLlm={isAwaitingLlm}
                        isEditingNetwork={isEditingNetwork}
                        isStreaming={isStreaming}
                        isTemporaryNetwork={isSelectedNetworkTemporary}
                        networkDisplayName={networkDisplayName || ""}
                        networkId={isSelectedNetworkTemporary ? selectedNetwork : ""}
                        neuroSanURL={neuroSanURL}
                        onSaveAgent={onSaveAgent}
                        safeArea={safeArea}
                        setIsEditingNetwork={setIsEditingNetwork}
                        thoughtBubbleEdges={thoughtBubbleEdges}
                        setSelectedNetwork={changeSelectedNetwork}
                        setThoughtBubbleEdges={setThoughtBubbleEdges}
                    />
                </Box>
            </ReactFlowProvider>
        </Box>
    )

    const getRightPanel = () => (
        <Panel
            collapsible={true}
            defaultSize="35%"
            id="multi-agent-accelerator-right-panel"
            minSize="15%"
            onResize={handleRightPanelResize}
            panelRef={rightPanelRef}
            style={{overflow: "visible"}}
        >
            <FloatingPanel
                collapsed={isRightCollapsed}
                id="multi-agent-accelerator-right-card"
                isTransitioning={isPanelTransitioning}
                minWidth={CHAT_SLIDE_WIDTH}
                side="right"
            >
                <Box sx={{boxSizing: "border-box", height: "100%", p: 1}}>
                    <ChatCommon
                        agentPlaceholders={{
                            [AGENT_NETWORK_DESIGNER_ID]:
                                "Describe in plain language the network you would like to build.",
                        }}
                        currentUser={username}
                        customAgentGreetings={{
                            [AGENT_NETWORK_DESIGNER_ID]: "Let's build a network together!",
                        }}
                        extraSlyData={extraSlyData}
                        id="agent-network-ui"
                        isAwaitingLlm={isAwaitingLlm}
                        key={selectedNetwork ?? "no-network"}
                        hasMissingApiKeys={hasMissingApiKeys}
                        networkDescription={networkDescription}
                        neuroSanURL={neuroSanURL}
                        onChunkReceived={onChunkReceived}
                        onStreamingComplete={onStreamingComplete}
                        onStreamingStarted={onStreamingStarted}
                        ref={chatRef}
                        sampleQueries={sampleQueries}
                        setIsAwaitingLlm={setIsAwaitingLlm}
                        selectedNetwork={selectedNetwork}
                        setSelectedNetwork={changeSelectedNetwork}
                        slyDataSchema={slyDataSchema}
                    />
                </Box>
            </FloatingPanel>
        </Panel>
    )

    // Box positioned over the uncovered part of the canvas (between the floating panels)
    const safeAreaSx = {
        bottom: `${safeArea.bottom}px`,
        left: `${safeArea.left}px`,
        position: "absolute",
        right: `${safeArea.right}px`,
        top: `${safeArea.top}px`,
        transition: `left 0.55s ${SHEEN_EASE}, right 0.55s ${SHEEN_EASE}`,
    } as const

    /**
     * Empty state: with no network selected, a glowing prompt floats in the middle of the canvas.
     */
    const getEmptyState = () => (
        <AnimatePresence>
            {selectedNetwork == null && (
                <Box
                    id="multi-agent-accelerator-empty-state"
                    sx={{
                        ...safeAreaSx,
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "center",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                >
                    <motion.div
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -12, scale: 0.97}}
                        initial={{opacity: 0, y: 18, scale: 0.96}}
                        style={{maxWidth: 520, padding: "0 16px", position: "relative", textAlign: "center"}}
                        transition={{type: "spring", stiffness: 200, damping: 26}}
                    >
                        {/* Halo: a soft radial gradient behind the text (no blur filter: costly to repaint) */}
                        <Box
                            aria-hidden={true}
                            sx={{
                                background: `radial-gradient(circle, ${getSheen(theme).auroraA}, transparent 70%)`,
                                borderRadius: "50%",
                                height: 420,
                                left: "50%",
                                opacity: 0.8,
                                position: "absolute",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 420,
                                zIndex: -1,
                            }}
                        />
                        <Typography
                            component="h2"
                            sx={{
                                ...gradientText(theme),
                                fontFamily: SHEEN_FONT_DISPLAY,
                                fontSize: {xs: "1.75rem", md: "2.25rem"},
                                fontWeight: 500,
                                letterSpacing: "-0.01em",
                                lineHeight: 1.15,
                                mb: 1.5,
                            }}
                        >
                            Select a network
                        </Typography>
                        <Typography
                            sx={{color: "text.secondary", fontSize: "1rem", lineHeight: 1.6, pointerEvents: "auto"}}
                        >
                            {/* Short hint: the chat panel already shows the full prompt */}
                            Pick one from Agent Networks, or click
                            <IconButton
                                aria-label="Open Agent Network Designer"
                                id="multi-agent-accelerator-empty-state-designer-button"
                                onClick={() => changeSelectedNetwork(AGENT_NETWORK_DESIGNER_ID)}
                                size="small"
                                sx={{
                                    mx: 0.25,
                                    verticalAlign: "middle",
                                    "&:hover": {boxShadow: glowShadow(theme, 16)},
                                }}
                            >
                                <AddBoxRounded sx={{color: "primary.main", fontSize: "1.2rem"}} />
                            </IconButton>
                            to design your own.
                        </Typography>
                    </motion.div>
                </Box>
            )}
        </AnimatePresence>
    )

    const getStopButton = () =>
        isAwaitingLlm &&
        enableZenMode && (
            <Box
                id="stop-button-container"
                sx={{
                    position: "absolute",
                    bottom: `${WORKSPACE_GAP + 12}px`,
                    right: `${safeArea.right + 12}px`,
                    transition: `right 0.55s ${SHEEN_EASE}`,
                    zIndex: getZIndex(2, theme),
                }}
            >
                <Tooltip title="Stop response (Esc)">
                    <LlmChatButton
                        aria-label="Stop"
                        id="stop-output-button"
                        onClick={handleExternalStop}
                        sx={{
                            ...glassSurface(theme, 999),
                            color: "error.main",
                            transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                            "&:hover": {
                                backgroundColor: "error.main",
                                boxShadow: `0 0 28px -4px ${themeVars.palette.error.main}`,
                                color: "error.contrastText",
                            },
                        }}
                    >
                        <StopCircle
                            fontSize="large"
                            id="stop-button-icon"
                        />
                    </LlmChatButton>
                </Tooltip>
            </Box>
        )

    const getDeleteNetworkConfirmationModal = () =>
        confirmationModalOpen ? (
            <ConfirmationModal
                id="delete-network-confirmation-modal"
                content={
                    `The network "${toDisplayName(networkToBeDeleted)}" will be deleted. ` +
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
    const getProgressPopper = () =>
        isStreaming &&
        isNetworkDesignerMode && (
            <Box
                id="multi-agent-accelerator-network-preview"
                sx={{
                    position: "absolute",
                    top: `${safeArea.top + 64}px`,
                    left: `${safeArea.left + 12}px`,
                    width: "min(600px, 60vw)",
                    height: "min(600px, 70vh)",
                    zIndex: getZIndex(2, theme),
                }}
            >
                <ReactFlowProvider>
                    <Box
                        sx={{
                            // Live preview while the designer streams: glass with a rotating iridescent border
                            ...glassSurface(theme),
                            ...spinningBorder(theme),
                            alignItems: "center",
                            boxShadow: glowShadow(theme),
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            justifyContent: "center",
                            margin: "0 auto",
                            maxWidth: 1000,
                            overflow: "hidden",
                            width: "100%",
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                color: "text.primary",
                                fontFamily: SHEEN_FONT_DISPLAY,
                                fontWeight: 500,
                                padding: "0.5rem 1rem",
                            }}
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
                                sx={{color: "text.secondary"}}
                            >
                                Awaiting status from Agent Network Designer...
                            </Typography>
                        )}
                    </Box>
                </ReactFlowProvider>
            </Box>
        )

    const getMissingApiKeysAlert = () =>
        hasMissingApiKeys && (
            <MUIAlert
                closeable={false}
                id="llm-chat-missing-api-keys-alert"
                severity="warning"
                sx={{
                    ...glassSurface(theme, SHEEN_RADIUS),
                    boxShadow: "0 18px 50px -18px rgba(0, 0, 0, 0.6)",
                    left: `calc(${safeArea.left}px + (100% - ${safeArea.left + safeArea.right}px) / 2)`,
                    maxWidth: `min(640px, calc(100% - ${safeArea.left + safeArea.right + 24}px))`,
                    position: "absolute",
                    top: `${safeArea.top + 64}px`,
                    transform: "translateX(-50%)",
                    transition: `left 0.55s ${SHEEN_EASE}`,
                    width: "100%",
                    zIndex: getZIndex(2, theme),
                    "& .MuiAlert-message": {
                        width: "100%",
                        textAlign: "center",
                    },
                }}
            >
                <Typography sx={{fontSize: "larger"}}>
                    API key(s) required for at least one of these providers:{" "}
                    <strong>{[...getMissingApiKeys()].join(", ")}</strong>. Please add the required key(s) in
                    &quot;Settings&quot; to use this Network.
                </Typography>
            </MUIAlert>
        )

    const getNeuroSanStudioCallout = () => (
        <Snackbar
            anchorOrigin={{vertical: "bottom", horizontal: "left"}}
            open={neuroSanCalloutOpen}
            slotProps={{
                clickAwayListener: {
                    onClickAway: (event) => {
                        ;(event as (MouseEvent | TouchEvent) & {defaultMuiPrevented: boolean}).defaultMuiPrevented =
                            true
                    },
                },
                transition: {
                    timeout: {
                        enter: 500,
                        exit: 250,
                    },
                },
            }}
            slots={{transition: Slide}}
            sx={{mb: 2}}
        >
            <Box
                sx={{
                    position: "relative",
                    maxWidth: 340,
                }}
            >
                <IconButton
                    aria-label="Close Neuro SAN Studio callout"
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setNeuroSanCalloutOpen(false)
                        markAnnouncementShown(AnnouncementId.NeuroSanStudioGithubStar)
                    }}
                    role="button"
                    size="small"
                    sx={{
                        bgcolor: "background.paper",
                        position: "absolute",
                        right: 4,
                        top: 20,
                        "&:hover": {
                            bgcolor: "action.hover",
                        },
                    }}
                >
                    <Close fontSize="small" />
                </IconButton>

                <NeuroSanStudioCallout />
            </Box>
        </Snackbar>
    )

    return (
        <>
            {getNeuroSanStudioCallout()}
            {Tour}
            {getTourModal()}
            {getDeleteNetworkConfirmationModal()}

            {/* Zero-size marker for where the workspace would naturally start (below the navbar, inside the page
                gutters); the workspace below is offset by this to bleed edge-to-edge under the navbar */}
            <Box
                aria-hidden={true}
                ref={sentinelRef}
                sx={{height: 0, width: "100%"}}
            />

            <Box
                id="multi-agent-accelerator-container"
                sx={{
                    // Full-bleed "mission control" workspace: the canvas fills the viewport, panels float over it
                    flexShrink: 0,
                    height: "100dvh",
                    isolation: "isolate",
                    marginLeft: `-${naturalOffset.left}px`,
                    marginTop: `-${naturalOffset.top}px`,
                    minHeight: 480,
                    overflow: "hidden",
                    position: "relative",
                    width: `calc(100% + ${naturalOffset.left * 2}px)`,
                    zIndex: 0,
                }}
            >
                {getCanvas()}
                {getEmptyState()}

                {/* Floating side panels. The resizable Group overlays the canvas; everything but the panel cards and
                    the separators lets pointer events through to the canvas. */}
                <Box
                    id="multi-agent-accelerator-panels"
                    sx={{
                        bottom: `${WORKSPACE_GAP}px`,
                        left: `${WORKSPACE_GAP}px`,
                        pointerEvents: "none",
                        position: "absolute",
                        right: `${WORKSPACE_GAP}px`,
                        top: `${naturalOffset.top + WORKSPACE_GAP}px`,
                        zIndex: 2,
                        // Zen mode: animate the panels' sizes while they collapse / expand
                        ...(isPanelTransitioning && {
                            "& [data-panel]": {transition: `flex-grow ${PANEL_TRANSITION_MS}ms ${SHEEN_EASE}`},
                        }),
                    }}
                >
                    <Group style={{height: "100%", pointerEvents: "none"}}>
                        {getLeftPanel()}
                        <PanelSeparator />
                        {getCenterPanel()}
                        <PanelSeparator />
                        {getRightPanel()}
                    </Group>
                </Box>

                {getMissingApiKeysAlert()}
                {getProgressPopper()}
                {getStopButton()}
            </Box>
        </>
    )
}
