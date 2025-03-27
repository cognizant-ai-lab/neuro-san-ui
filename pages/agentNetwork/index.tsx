import Grid from "@mui/material/Grid2"
import {useEffect, useState} from "react"
import {ReactFlowProvider} from "reactflow"

import {ChatCommon} from "../../components/AgentChat/ChatCommon"
import {chatMessageFromChunk, cleanUpAgentName} from "../../components/AgentChat/Utils"
import AgentFlow from "../../components/AgentNetwork/AgentFlow"
import Sidebar from "../../components/AgentNetwork/Sidebar"
import {NotificationType, sendNotification} from "../../components/notification"
import {getConnectivity} from "../../controller/agent/agent"
import {AgentType} from "../../generated/metadata"
import {ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro_san/api/grpc/agent"
import {Origin} from "../../generated/neuro_san/api/grpc/chat"
import {useAuthentication} from "../../utils/authentication"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function AgentNetworkPage() {
    // For access to logged in session and current user name
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    const [originInfo, setOriginInfo] = useState<Origin[]>([])

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    const [selectedNetwork, setSelectedNetwork] = useState<AgentType>(AgentType.TELCO_NETWORK_SUPPORT)

    useEffect(() => {
        ;(async () => {
            try {
                const connectivity: ConnectivityResponse = await getConnectivity(userName, selectedNetwork)
                const agentsInNetworkSorted = connectivity.connectivityInfo.sort((a, b) =>
                    a.origin.localeCompare(b.origin)
                )
                setAgentsInNetwork(agentsInNetworkSorted)
            } catch (e) {
                sendNotification(
                    NotificationType.error,
                    `Failed to get connectivity info for ${cleanUpAgentName(selectedNetwork)}. Error: ${e}`
                )
            }
        })()
    }, [selectedNetwork])

    const onChunkReceived = (chunk: string) => {
        // Obtain origin info if present
        const chatMessage = chatMessageFromChunk(chunk)
        if (chatMessage?.origin.length > 0) {
            setOriginInfo(chatMessage.origin)
        }

        return true
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
                    id="multi-agent-accelerator-sidebar"
                    selectedNetwork={selectedNetwork}
                    setSelectedNetwork={setSelectedNetwork}
                    isAwaitingLlm={isAwaitingLlm}
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
                    id="agent-network-ui"
                    currentUser={userName}
                    userImage={userImage}
                    setIsAwaitingLlm={setIsAwaitingLlm}
                    isAwaitingLlm={isAwaitingLlm}
                    targetAgent={selectedNetwork}
                    onChunkReceived={onChunkReceived}
                    onStreamingComplete={onStreamingComplete}
                    clearChatOnNewAgent={true}
                />
            </Grid>
        </Grid>
    )
}

AgentNetworkPage.authRequired = true
AgentNetworkPage.pageContext = "Agent Network UI."
