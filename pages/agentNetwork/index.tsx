import {BaseMessage} from "@langchain/core/messages"
import Grid from "@mui/material/Grid2"
import {Dispatch, MutableRefObject, ReactNode, SetStateAction, useEffect, useRef, useState} from "react"
import {ReactFlowProvider} from "reactflow"

import {AgentChatCommon} from "../../components/AgentChat/AgentChatCommon"
import {handleStreamingReceived, sendStreamingChatRequest} from "../../components/AgentChat/AgentChatHandling"
import {cleanUpAgentName, CombinedAgentType} from "../../components/AgentChat/common"
import AgentFlow from "../../components/AgentNetwork/AgentFlow"
import Sidebar from "../../components/AgentNetwork/Sidebar"
import {NotificationType, sendNotification} from "../../components/notification"
import {getConnectivity} from "../../controller/agent/agent"
import {AgentType} from "../../generated/metadata"
import {ChatResponse, ConnectivityInfo, ConnectivityResponse} from "../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../generated/neuro_san/api/grpc/chat"
import {useAuthentication} from "../../utils/authentication"

// #region: Types

// no-shadow doesn't do well with enum types
// eslint-disable-next-line no-shadow
enum AgentNetworkEvents {
    CALLED = "CALLED",
    RETURNED = "RETURNED",
}

// #endregion: Types

const knownAgentEventMessageTypes = [ChatMessageChatMessageType.LEGACY_LOGS]

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

    const highlightAgentNetwork = (chunk: string) => {
        let chatResponse: ChatResponse
        try {
            chatResponse = JSON.parse(chunk).result
        } catch (e) {
            console.error(`Error parsing log line: ${e}`)
            return
        }
        const chatMessage: ChatMessage = chatResponse?.response
        const messageType: ChatMessageChatMessageType = chatMessage?.type

        // Check if it's a message type we know how to handle
        if (!knownAgentEventMessageTypes.includes(messageType)) {
            return
        }

        const chatMessageText = chatMessage.text

        // TODO: Let's keep LEGACY_LOGS type since those are useful?
        // Or, we could get the markdown header instead on AI type, but that seems more error prone?
        // eg. "**Sales Engineer:**"
        const calledIndexOf = chatMessageText.indexOf(AgentNetworkEvents.CALLED)
        const returnedIndexOf = chatMessageText.indexOf(AgentNetworkEvents.RETURNED)
        let agentName

        if (calledIndexOf > -1) {
            agentName = chatMessageText.slice(0, calledIndexOf)
        } else if (returnedIndexOf > -1) {
            agentName = chatMessageText.slice(0, returnedIndexOf)
        }

        if (agentName) {
            setSelectedAgentId(agentName)
        }
    }

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <ReactFlowProvider>
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
                    <AgentFlow
                        agentsInNetwork={agentsInNetwork}
                        id="multi-agent-accelerator-agent-flow"
                        selectedAgentId={selectedAgentId}
                    />
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
                        sx={{height: "100%"}}
                        sendFunction={async function (
                            updateOutput: (node: ReactNode) => void,
                            sendFunctionSetIsAwaitingLlm: Dispatch<SetStateAction<boolean>>,
                            controller: MutableRefObject<AbortController>,
                            currentUser: string,
                            query: string,
                            targetAgent: CombinedAgentType
                        ): Promise<void> {
                            await sendStreamingChatRequest(
                                updateOutput,
                                sendFunctionSetIsAwaitingLlm,
                                controller,
                                currentUser,
                                query,
                                targetAgent,
                                (chunk) => {
                                    handleStreamingReceived(chunk, updateOutput, sendFunctionSetIsAwaitingLlm)
                                    highlightAgentNetwork(chunk)
                                }
                            )

                            setSelectedAgentId("")
                        }}
                    />
                </Grid>
            </Grid>
        </ReactFlowProvider>
    )
}

AgentNetworkPage.authRequired = true
AgentNetworkPage.pageContext = "Agent Network UI."
