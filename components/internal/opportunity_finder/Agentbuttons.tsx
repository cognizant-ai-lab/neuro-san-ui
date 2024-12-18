import {styled} from "@mui/material"
import Tooltip from "@mui/material/Tooltip"
import {BsDatabaseAdd} from "react-icons/bs"
import {FaArrowRightLong} from "react-icons/fa6"
import {LuBrainCircuit} from "react-icons/lu"
import {RiMenuSearchLine} from "react-icons/ri"
import {TfiPencilAlt} from "react-icons/tfi"

import {MaximumBlue, SecondaryBlue} from "../../../const"
import {OpportunityFinderRequestType} from "../../../pages/api/gpt/opportunityFinder/types"

// #region: Types
interface AgentButtonsProps {
    id: string
    awaitingResponse: boolean
    enableOrchestration: boolean
    selectedAgent: OpportunityFinderRequestType
    setSelectedAgent: (agent: OpportunityFinderRequestType) => void
}
// #endregion: Types

// #region: Constants
// Icon sizes
const AGENT_ICON_SIZE = 70
const ARROW_SIZE = 65
// #endregion: Constants

// #region: Styled Components
const AgentIconDiv = styled("div")({
    alignItems: "center",
    display: "flex",
    height: "100%",
    justifyContent: "space-evenly",
    marginTop: "2rem",
    marginBottom: "2rem",
    marginLeft: "6rem",
    marginRight: "6rem",
})

const AgentDiv = styled("div")(({enabled, selected}) => ({
    alignItems: "center",
    backgroundColor: selected ? SecondaryBlue : null,
    border: "4px solid #cad1d7",
    borderColor: selected ? MaximumBlue : null,
    borderRadius: "30px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    minHeight: "165px",
    opacity: enabled ? 1 : 0.5,
    padding: "13px 0",
    textAlign: "center",
    transition: "all 0.3s ease",
    width: "190px",

    "&:hover": {
        borderColor: MaximumBlue,
    },
}))
// #endregion: Styled Components

/**
 * Generate the agent buttons for the Opportunity Finder agents.
 * @returns A div containing the agent buttons
 */
export const AgentButtons: React.FC<AgentButtonsProps> = ({
    awaitingResponse,
    enableOrchestration,
    id,
    selectedAgent,
    setSelectedAgent,
}) => (
    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
    <AgentIconDiv id={id || "agent-buttons"}>
        <AgentDiv
            enabled={!awaitingResponse}
            id="opp-finder-agent-div"
            onClick={() => !awaitingResponse && setSelectedAgent("OpportunityFinder")}
            selected={selectedAgent === "OpportunityFinder"}
        >
            <RiMenuSearchLine
                className="mt-2 mb-2.5"
                id="opp-finder-agent-icon"
                size={AGENT_ICON_SIZE}
            />
            Opportunity Finder
        </AgentDiv>
        <FaArrowRightLong
            id="arrow1"
            size={ARROW_SIZE}
            color="var(--bs-primary)"
        />
        <AgentDiv
            enabled={!awaitingResponse}
            id="scoping-agent-div"
            onClick={() => !awaitingResponse && setSelectedAgent("ScopingAgent")}
            selected={selectedAgent === "ScopingAgent"}
        >
            <TfiPencilAlt
                className="mt-2 mb-2.5"
                id="scoping-agent-icon"
                size={AGENT_ICON_SIZE}
            />
            Scoping Agent
        </AgentDiv>
        <FaArrowRightLong
            id="arrow2"
            size={ARROW_SIZE}
            color="var(--bs-primary)"
        />
        <AgentDiv
            enabled={!awaitingResponse}
            id="data-generator-agent-div"
            onClick={() => !awaitingResponse && setSelectedAgent("DataGenerator")}
            selected={selectedAgent === "DataGenerator"}
        >
            <BsDatabaseAdd
                className="mt-2 mb-2.5"
                id="db-agent-icon"
                size={AGENT_ICON_SIZE}
            />
            Data Generator
        </AgentDiv>
        <FaArrowRightLong
            id="arrow3"
            size={ARROW_SIZE}
            color="var(--bs-primary)"
        />
        <Tooltip
            id="orchestration-tooltip"
            title={enableOrchestration ? undefined : "Please complete the previous steps first"}
        >
            <AgentDiv
                enabled={enableOrchestration}
                id="orchestration-agent-div"
                onClick={() => enableOrchestration && setSelectedAgent("OrchestrationAgent")}
                selected={selectedAgent === "OrchestrationAgent"}
            >
                <LuBrainCircuit
                    className="mt-2 mb-2.5"
                    id="db-agent-icon"
                    size={AGENT_ICON_SIZE}
                />
                <div
                    className="text-center"
                    id="orchestration-agent-text"
                >
                    Orchestrator
                </div>
            </AgentDiv>
        </Tooltip>
    </AgentIconDiv>
)
