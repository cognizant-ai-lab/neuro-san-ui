import {FC} from "react"

import {ConnectivityInfo} from "../../../generated/neuro-san/NeuroSanClient"
import {MUIAccordion} from "../../Common/MUIAccordion"

const renderConnectivityInfo = (connectivityInfo: readonly ConnectivityInfo[], targetAgent: string) => (
    <>
        {connectivityInfo
            // Don't show connection to self
            ?.filter((info) => info.origin.toLowerCase() !== targetAgent.toLowerCase())
            // Sort by origin name
            .sort((a, b) => a.origin.localeCompare(b.origin))
            // Render each origin and its tools
            .map((info) => (
                <li
                    id={info.origin}
                    key={info.origin}
                >
                    <b id={info.origin}>{info.origin}</b>
                    <ul
                        id={`${info.origin}-tools`}
                        style={{marginLeft: "8px"}}
                    >
                        {info?.tools?.map((tool) => (
                            <li
                                id={tool}
                                key={tool}
                            >
                                {tool}
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
    </>
)

interface AgentConnectivityProps {
    // HTML element ID for accordion element
    readonly id: string

    // Agent's description
    readonly description: string

    // Info on what other agents and tools this agent connects to
    readonly connectivityInfo: readonly ConnectivityInfo[]

    // The name of the current agent, used to filter out self from connectivity info
    readonly targetAgent: string
}

/**
 * Render the connectivity info as a list of origins and their tools
 * @returns A MUIAccordion representing the connectivity info with agents and their tools
 */
export const AgentConnectivity: FC<AgentConnectivityProps> = ({connectivityInfo, description, id, targetAgent}) => (
    <MUIAccordion
        id={`${id}-agent-details`}
        sx={{marginTop: "1rem", marginBottom: "1rem"}}
        items={[
            {
                title: "Network Details",
                content: [
                    `My description is: "${description}"`,
                    <h6
                        key="item-1"
                        id="connectivity-header"
                        style={{marginTop: "1rem"}}
                    >
                        I can connect you to the following agents
                    </h6>,
                    <ul
                        key="item-2"
                        id="connectivity-list"
                        aria-labelledby="connectivity-header"
                        style={{marginTop: "1rem"}}
                    >
                        {renderConnectivityInfo(connectivityInfo, targetAgent)}
                    </ul>,
                ],
            },
        ]}
    />
)
