import Grid from "@mui/material/Grid2"
import {useEffect, useRef, useState} from "react"
import {ReactFlowProvider} from "reactflow"

import {ChatCommon} from "../../components/AgentChat/ChatCommon"
import {chatMessageFromChunk, cleanUpAgentName} from "../../components/AgentChat/Utils"
import {closeNotification, NotificationType, sendNotification} from "../../components/Common/notification"
import AgentFlow from "../../components/MultiAgentAccelerator/AgentFlow"
import Sidebar from "../../components/MultiAgentAccelerator/Sidebar"
import {getAgentNetworks, getConnectivity} from "../../controller/agent/Agent"
import {ConnectivityInfo, ConnectivityResponse, Origin} from "../../generated/neuro-san/OpenAPITypes"
import useEnvironmentStore from "../../state/environment"
import {usePreferences} from "../../state/Preferences"
import {useAuthentication} from "../../utils/Authentication"
import {useLocalStorage} from "../../utils/use_local_storage"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function MultiAgentAcceleratorPage() {
    // For access to logged in session and current user name
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    const [networks, setNetworks] = useState<string[]>([])

    const [originInfo, setOriginInfo] = useState<Origin[]>([])

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)

    const {backendNeuroSanApiUrl} = useEnvironmentStore()

    const [customURLLocalStorage, setCustomURLLocalStorage] = useLocalStorage("customAgentNetworkURL", null)

    // An extra set of quotes is making it in the the string in local storage.
    const [neuroSanURL, setNeuroSanURL] = useState<string>(
        customURLLocalStorage?.replaceAll('"', "") || backendNeuroSanApiUrl
    )

    const agentCountsRef = useRef<Map<string, number>>(new Map<string, number>())

    // Dark mode
    const {darkMode} = usePreferences()

    const customURLCallback = (url: string) => {
        setNeuroSanURL(url || backendNeuroSanApiUrl)
        setCustomURLLocalStorage(url === "" ? null : url)
    }

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

        getNetworks()
    }, [neuroSanURL])

    useEffect(() => {
        ;(async () => {
            if (selectedNetwork) {
                try {
                    const connectivity: ConnectivityResponse = await getConnectivity(neuroSanURL, selectedNetwork)
                    const agentsInNetworkSorted: ConnectivityInfo[] = connectivity.connectivity_info
                        .concat()
                        .sort((a, b) => a?.origin.localeCompare(b?.origin))
                    setAgentsInNetwork(agentsInNetworkSorted)
                } catch (e) {
                    const agentName = cleanUpAgentName(selectedNetwork)
                    sendNotification(
                        NotificationType.error,
                        "Connection error",
                        // eslint-disable-next-line max-len
                        `Unable to get agent list for "${agentName}". Verify that ${neuroSanURL} is a valid Multi-Agent Accelerator Server. Error: ${e}.`
                    )
                    setAgentsInNetwork([])
                }
            }
        })()
    }, [neuroSanURL, selectedNetwork])

    const onChunkReceived = (chunk: string) => {
        // Obtain origin info if present
        const chatMessage = chatMessageFromChunk(chunk)
        if (chatMessage && chatMessage.origin?.length > 0) {
            setOriginInfo([...chatMessage.origin])

            // Update agent counts.
            // Note: we increment an agent's count each time it appears in the origin info, but another strategy would
            // be to only count an agent when it is the "end destination" of the chain. Needs some thought to determine
            // which is more useful.
            const agentCounts = agentCountsRef.current
            for (const agent of chatMessage.origin) {
                // If the agent is not already in the counts map, initialize it to 0 aka "upsert"
                agentCounts.set(agent.tool, (agentCounts.get(agent.tool) || 0) + 1)
            }
        }

        return true
    }

    const onStreamingStarted = (): void => {
        // reset agent counts when a new streaming starts
        agentCountsRef.current = new Map<string, number>()
    }

    const onStreamingComplete = (): void => {
        setOriginInfo([])
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
            }}
        >
            <Grid
                id="multi-agent-accelerator-grid-sidebar"
                size={3.25}
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
            <Grid
                id="multi-agent-accelerator-grid-agent-flow"
                size={8.25}
                sx={{
                    height: "100%",
                }}
            >
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <ReactFlowProvider>
                    <AgentFlow
                        agentsInNetwork={agentsInNetwork}
                        id="multi-agent-accelerator-agent-flow"
                        originInfo={originInfo}
                        selectedNetwork={selectedNetwork}
                        agentCounts={agentCountsRef.current}
                    />
                </ReactFlowProvider>
            </Grid>
            <Grid
                id="multi-agent-accelerator-grid-agent-chat-common"
                size={6.5}
                sx={{
                    height: "100%",
                }}
            >
                <ChatCommon
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
        </Grid>
    )
}

MultiAgentAcceleratorPage.authRequired = true
MultiAgentAcceleratorPage.isContainedInViewport = true
MultiAgentAcceleratorPage.pageContext = `The Multi-Agent Accelerator (Neuro-San) UI presents an interactive view of an
    Agent Network. Users can browse different networks from the left menu, while the central graph visualizes how agents
    connect and collaborate to complete tasks. A chat panel on the right allows users to ask questions and receive
    answers.`
