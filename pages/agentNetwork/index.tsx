import {BaseMessage} from "@langchain/core/messages"
import Grid from "@mui/material/Grid2"
import {useEffect, useRef, useState} from "react"
import {ReactFlowProvider} from "reactflow"

import {AgentChatCommon} from "../../components/AgentChat/AgentChatCommon"

import {cleanUpAgentName} from "../../components/AgentChat/Utils"
import {tryParseJson} from "../../components/AgentChat/Utils"
import AgentFlow from "../../components/AgentNetwork/AgentFlow"
import Sidebar from "../../components/AgentNetwork/Sidebar"
import {NotificationType, sendNotification} from "../../components/notification"
import {getConnectivity} from "../../controller/agent/agent"
import "../../styles/AgentNetwork.module.css"
import {AgentType} from "../../generated/metadata"
import {ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro_san/api/grpc/agent"
import {useAuthentication} from "../../utils/authentication"

// #region: Types

// no-shadow doesn't do well with enum types
// eslint-disable-next-line no-shadow
enum AgentNetworkEvents {
    CALLED = "CALLED",
    RETURNED = "RETURNED",
}

// #endregion: Types

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

    const [selectedAgentId, setSelectedAgentId] = useState<string>("")

    const [agentsInNetwork, setAgentsInNetwork] = useState<ConnectivityInfo[]>([])

    const [selectedNetwork, setSelectedNetwork] = useState<AgentType>(AgentType.TELCO_NETWORK_SUPPORT)

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<BaseMessage[]>([])

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

    const detectSelectedAgent = (chatMessageText: string) => {
        // TODO: replace this with a strategy using "origins" info now available in Neuro-san API
        const calledIndexOf = chatMessageText.indexOf(AgentNetworkEvents.CALLED)
        const returnedIndexOf = chatMessageText.indexOf(AgentNetworkEvents.RETURNED)
        let agentName: string

        if (calledIndexOf > -1) {
            agentName = chatMessageText.slice(0, calledIndexOf)
        } else if (returnedIndexOf > -1) {
            agentName = chatMessageText.slice(0, returnedIndexOf)
        }

        if (agentName) {
            setSelectedAgentId(agentName)
        }
    }

    const handleStreamingReceived = (chunk: string) => {
        const chatMessage = tryParseJson(chunk)

        // Messages that contain agent origin info currently are only the "string" ones, not JSON
        if (!chatMessage || typeof chatMessage !== "string") {
            return true
        }

        detectSelectedAgent(chatMessage)

        return true
    }

    const onStreamingComplete = (): void => {
        setSelectedAgentId("")
    }

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids

        <Grid
            id="multi-agent-accelerator-grid"
            container
            columns={18}
            sx={{
                border: "solid 1px #CFCFDC",
                borderRadius: "var(--bs-border-radius)",
                height: "100%",
                marginTop: "1rem",
                minWidth: "1450px",
                padding: "1rem",
            }}
        >
            <Grid
                id="multi-agent-accelerator-grid-sidebar"
                size={3.25}
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
            >
                <ReactFlowProvider>
                    <AgentFlow
                        agentsInNetwork={agentsInNetwork}
                        id="multi-agent-accelerator-agent-flow"
                        selectedAgentId={selectedAgentId}
                    />
                </ReactFlowProvider>
            </Grid>
            <Grid
                id="multi-agent-accelerator-grid-agent-chat-common"
                size={6.5}
            >
                <AgentChatCommon
                    id="agent-network-ui"
                    currentUser={userName}
                    userImage={userImage}
                    setIsAwaitingLlm={setIsAwaitingLlm}
                    isAwaitingLlm={isAwaitingLlm}
                    targetAgent={selectedNetwork}
                    setChatHistory={(val: BaseMessage[]) => {
                        chatHistory.current = val
                    }}
                    getChatHistory={() => chatHistory.current}
                    onChunkReceived={handleStreamingReceived}
                    onStreamingComplete={onStreamingComplete}
                />
            </Grid>
        </Grid>
    )
}

AgentNetworkPage.authRequired = true
AgentNetworkPage.pageContext = "Agent Network UI."
