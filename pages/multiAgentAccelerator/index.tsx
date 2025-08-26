import {StopCircle} from "@mui/icons-material"
import {Box, Grid, Slide} from "@mui/material"
import {useCallback, useEffect, useRef, useState} from "react"
import {ReactFlowProvider} from "reactflow"

import {ChatCommon, ChatCommonHandle} from "../../components/AgentChat/ChatCommon"
import {SmallLlmChatButton} from "../../components/AgentChat/LlmChatButton"
import {cleanUpAgentName} from "../../components/AgentChat/Utils"
import {closeNotification, NotificationType, sendNotification} from "../../components/Common/notification"
import {AgentFlow} from "../../components/MultiAgentAccelerator/AgentFlow"
import {Sidebar} from "../../components/MultiAgentAccelerator/Sidebar"
import {getAgentNetworks, getConnectivity} from "../../controller/agent/Agent"
import {ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro-san/NeuroSanClient"
import useEnvironmentStore from "../../state/environment"
import {usePreferences} from "../../state/Preferences"
import {AgentConversation, processChatChunk} from "../../utils/agentConversations"
import {useAuthentication} from "../../utils/Authentication"
import {useLocalStorage} from "../../utils/use_local_storage"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function MultiAgentAcceleratorPage() {
    // Animation time for the left and right panels to slide in or out when launching the animation
    const GROW_ANIMATION_TIME_MS = 800

    // For access to logged in session and current user name
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    const [networks, setNetworks] = useState<string[]>([])

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)

    const [hideOuterPanels, setHideOuterPanels] = useState<boolean>(false)

    // Track whether we've shown the info popup so we don't keep bugging the user with it
    const [haveShownPopup, setHaveShownPopup] = useState<boolean>(false)

    const {backendNeuroSanApiUrl} = useEnvironmentStore()

    const [customURLLocalStorage, setCustomURLLocalStorage] = useLocalStorage("customAgentNetworkURL", null)

    // An extra set of quotes is making it in the the string in local storage.
    const [neuroSanURL, setNeuroSanURL] = useState<string>(
        customURLLocalStorage?.replaceAll('"', "") || backendNeuroSanApiUrl
    )

    const agentCountsRef = useRef<Map<string, number>>(new Map())

    const conversationsRef = useRef<AgentConversation[] | null>(null)

    const [currentConversations, setCurrentConversations] = useState<AgentConversation[] | null>(null)

    // Dark mode
    const {darkMode} = usePreferences()

    const customURLCallback = useCallback(
        (url: string) => {
            setNeuroSanURL(url || backendNeuroSanApiUrl)
            setCustomURLLocalStorage(url === "" ? null : url)
        },
        [backendNeuroSanApiUrl, setCustomURLLocalStorage]
    )

    // Reference to the ChatCommon component to allow external stop button to call its handleStop method
    const chatRef = useRef<ChatCommonHandle | null>(null)

    // Handle external stop button click during zen mode
    const handleExternalStop = useCallback(() => {
        chatRef.current?.handleStop()
        setHideOuterPanels(false)
    }, [])

    useEffect(() => {
        async function getNetworks() {
            try {
                const networksTmp: string[] = await getAgentNetworks(neuroSanURL)
                const sortedNetworks = networksTmp.sort((a, b) => a.localeCompare(b))
                setNetworks(sortedNetworks)
                // Set the first network as the selected network
                setSelectedNetwork(sortedNetworks[0])
                closeNotification()
            } catch (e) {
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

    // Effect to reset the hideOuterPanels state when isAwaitingLlm changes
    useEffect(() => {
        if (!isAwaitingLlm) {
            setHideOuterPanels(false)
        }
    }, [isAwaitingLlm])

    const onChunkReceived = useCallback((chunk: string): boolean => {
        const result = processChatChunk(
            chunk,
            agentCountsRef.current,
            (newCounts: Map<string, number>) => {
                agentCountsRef.current = newCounts
            },
            (newConversations: AgentConversation[] | null) => {
                conversationsRef.current = newConversations
                setCurrentConversations(newConversations)
            },
            conversationsRef.current
        )
        return result
    }, [])

    const onStreamingStarted = useCallback((): void => {
        // Show info popup only once per session
        if (!haveShownPopup) {
            sendNotification(NotificationType.info, "Agents working", "Click the stop button or hit Escape to exit.")
            setHaveShownPopup(true)
        }
    }, [haveShownPopup])

    const onStreamingComplete = useCallback((): void => {
        // When streaming is complete, clean up any refs and state
        conversationsRef.current = null
        agentCountsRef.current = new Map<string, number>()
        setCurrentConversations(null)
    }, [])

    const getLeftPanel = () => {
        return (
            <Slide
                id="multi-agent-accelerator-grid-sidebar-slide"
                in={!isAwaitingLlm}
                direction="right"
                timeout={GROW_ANIMATION_TIME_MS}
                onExited={() => {
                    setHideOuterPanels(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-sidebar"
                    size={hideOuterPanels ? 0 : 3.25}
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
                        setSelectedNetwork={setSelectedNetwork}
                    />
                </Grid>
            </Slide>
        )
    }

    const getCenterPanel = () => {
        return (
            <Grid
                id="multi-agent-accelerator-grid-agent-flow"
                size={hideOuterPanels ? 18 : 8.25}
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
                            id="multi-agent-accelerator-agent-flow"
                            currentConversations={currentConversations}
                            isAwaitingLlm={isAwaitingLlm}
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
                    setHideOuterPanels(true)
                }}
            >
                <Grid
                    id="multi-agent-accelerator-grid-agent-chat-common"
                    size={hideOuterPanels ? 0 : 6.5}
                    sx={{
                        height: "100%",
                    }}
                >
                    <ChatCommon
                        ref={chatRef}
                        neuroSanURL={neuroSanURL}
                        id="agent-network-ui"
                        currentUser={userName}
                        userImage={userImage}
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

MultiAgentAcceleratorPage.authRequired = true
MultiAgentAcceleratorPage.isContainedInViewport = true
MultiAgentAcceleratorPage.pageContext = `The Multi-Agent Accelerator (Neuro-San) UI presents an interactive view of an
    Agent Network. Users can browse different networks from the left menu, while the central graph visualizes how agents
    connect and collaborate to complete tasks. A chat panel on the right allows users to ask questions and receive
    answers.`
