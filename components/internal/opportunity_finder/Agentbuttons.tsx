import {Tooltip} from "antd"
import {CSSProperties} from "react"
import {BsDatabaseAdd} from "react-icons/bs"
import {FaArrowRightLong} from "react-icons/fa6"
import {LuBrainCircuit} from "react-icons/lu"
import {RiMenuSearchLine} from "react-icons/ri"
import {TfiPencilAlt} from "react-icons/tfi"

import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"

interface AgentButtonsProps {
    id: string
    awaitingResponse: boolean
    enableOrchestration: boolean
    selectedAgent: OpportunityFinderRequestType
    setSelectedAgent: (agent: OpportunityFinderRequestType) => void
}

/**
 * Generate the agent buttons for the Opportunity Finder agents.
 * @returns A div containing the agent buttons
 */
export const AgentButtons = (props: AgentButtonsProps) => {
    /**
     * Get the class name for the agent button.
     * @param agentType The agent type, eg. "OpportunityFinder"
     * @returns The class name for the agent button
     */
    function getClassName(agentType: OpportunityFinderRequestType) {
        return `opp-finder-agent-div${props.selectedAgent === agentType ? " selected" : ""}`
    }

    function getAgentButtonStyle(isEnabled: boolean): CSSProperties {
        return {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: isEnabled ? 1 : 0.5,
        }
    }

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <div
            id={props.id || "agent-buttons"}
            style={{
                display: "flex",
                justifyContent: "space-evenly",
                alignItems: "center",
                height: "100%",
                marginTop: "2rem",
                marginBottom: "2rem",
                marginLeft: "6rem",
                marginRight: "6rem",
            }}
        >
            <div
                id="opp-finder-agent-div"
                style={getAgentButtonStyle(!props.awaitingResponse)}
                onClick={() => !props.awaitingResponse && props.setSelectedAgent("OpportunityFinder")}
                className={getClassName("OpportunityFinder")}
            >
                <RiMenuSearchLine
                    id="opp-finder-agent-icon"
                    size={100}
                    style={{marginBottom: "10px"}}
                />
                Opportunity Finder
            </div>
            <FaArrowRightLong
                id="arrow1"
                size={100}
                color="var(--bs-secondary)"
            />
            <div
                id="scoping-agent-div"
                style={getAgentButtonStyle(!props.awaitingResponse)}
                onClick={() => !props.awaitingResponse && props.setSelectedAgent("ScopingAgent")}
                className={getClassName("ScopingAgent")}
            >
                <TfiPencilAlt
                    id="scoping-agent-icon"
                    size={100}
                    style={{marginBottom: "10px"}}
                />
                Scoping Agent
            </div>
            <FaArrowRightLong
                id="arrow2"
                size={100}
                color="var(--bs-secondary)"
            />
            <div
                id="opp-finder-agent-div"
                style={getAgentButtonStyle(!props.awaitingResponse)}
                onClick={() => !props.awaitingResponse && props.setSelectedAgent("DataGenerator")}
                className={getClassName("DataGenerator")}
            >
                <BsDatabaseAdd
                    id="db-agent-icon"
                    size={100}
                    style={{marginBottom: "10px"}}
                />
                Data Generator
            </div>
            <FaArrowRightLong
                id="arrow3"
                size={100}
                color="var(--bs-secondary)"
            />
            <Tooltip
                id="orchestration-tooltip"
                title={props.enableOrchestration ? undefined : "Please complete the previous steps first"}
                style={getAgentButtonStyle(props.enableOrchestration)}
            >
                <div
                    id="orchestration-agent-div"
                    style={{...getAgentButtonStyle(props.enableOrchestration)}}
                    onClick={() => props.enableOrchestration && props.setSelectedAgent("OrchestrationAgent")}
                    className={getClassName("OrchestrationAgent")}
                >
                    <LuBrainCircuit
                        id="db-agent-icon"
                        size={100}
                        style={{marginBottom: "10px"}}
                    />
                    <div
                        id="orchestration-agent-text"
                        style={{textAlign: "center"}}
                    >
                        Orchestrator
                    </div>
                </div>
            </Tooltip>
        </div>
    )
}
