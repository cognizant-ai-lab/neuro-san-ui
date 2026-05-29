import {FC, useEffect, useState} from "react"

import {AgentConnectivity} from "./AgentConnectivity"
import {SampleQueries} from "./SampleQueries"
import {getAgentFunction, getConnectivity} from "../../../controller/agent/Agent"
import {ConnectivityInfo, ConnectivityResponse} from "../../../generated/neuro-san/NeuroSanClient"
import {NotificationType, sendNotification} from "../../Common/notification"
import {isLegacyAgentType} from "../Common/Types"

interface AgentMetadataDisplayProps {
    readonly currentUser: string
    readonly disableQueries: boolean
    readonly handleSend: (query: string) => Promise<void>
    readonly id: string
    readonly neuroSanURL: string
    readonly targetAgent: string
}

/**
 * Component to display agent metadata, including connectivity info and sample queries.
 */
export const AgentMetadata: FC<AgentMetadataDisplayProps> = ({
    currentUser,
    disableQueries,
    handleSend,
    id,
    neuroSanURL,
    targetAgent,
}) => {
    const [sampleQueries, setSampleQueries] = useState<string[]>([])
    const [connectivityInfo, setConnectivityInfo] = useState<readonly ConnectivityInfo[]>([])
    const [description, setDescription] = useState<string>("")

    useEffect(() => {
        const fetchAgentDetails = async () => {
            // It is a Neuro-san agent, so get the function and connectivity info
            try {
                const agentFunction = await getAgentFunction(neuroSanURL, targetAgent, currentUser)
                setDescription(agentFunction?.function?.description || "")
            } catch {
                // For now, just return. May be a legacy agent without a functional description in Neuro-san.
                return
            }

            try {
                const connectivity: ConnectivityResponse = await getConnectivity(neuroSanURL, targetAgent, currentUser)
                setConnectivityInfo(connectivity?.connectivity_info)

                const sampleQueriesTmp = (connectivity?.metadata?.["sample_queries"] || []) as string[]
                setSampleQueries(sampleQueriesTmp)
            } catch (e) {
                // If we got here, it means we got the agent function successfully, but failed to get connectivity info.
                // This is unexpected.
                sendNotification(
                    NotificationType.error,
                    `Failed to get connectivity info for ${targetAgent}. Error: ${e}`
                )
            }
        }

        if (targetAgent && !isLegacyAgentType(targetAgent)) {
            void fetchAgentDetails()
        }
    }, [currentUser, neuroSanURL, targetAgent])

    return (
        <>
            {sampleQueries?.length > 0 && (
                <SampleQueries
                    disabled={disableQueries}
                    handleSend={handleSend}
                    sampleQueries={sampleQueries}
                />
            )}
        </>
    )
}
