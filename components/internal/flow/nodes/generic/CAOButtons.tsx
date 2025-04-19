import Card from "@mui/material/Card"
import Tooltip from "@mui/material/Tooltip"
import {useEffect, useState} from "react"

import {ZIndexLayers} from "../../../../../utils/zIndexLayers"
import NodePopper from "../../../../nodepopper"
import {addDisabledPropertyToOutcomes, Outcomes} from "../utils"

// Renders the C A O call to action buttons on the flow node.
const CAOButtons = (props) => {
    const {ParentNodeState, SetParentNodeState, flowPrefix, idExtension, fields} = props
    const [dataOutcomes, setDataOutcomes] = useState<Outcomes>(null)

    useEffect(() => {
        // extract outcomes object to include a disabled property to disable outcomes of
        // incorrect predictor type <--> outcome type match
        const formattedOutcomes: Outcomes = addDisabledPropertyToOutcomes(ParentNodeState, fields)
        setDataOutcomes(formattedOutcomes)
    }, [fields, ParentNodeState])

    useEffect(() => {
        // If outcome type and predictor type become mismatched, we have to uncheck the mismatched outcomes
        // by getting all of the updated outcomes and updating the parent node state with it.
        const formattedOutcomes: Outcomes = addDisabledPropertyToOutcomes(ParentNodeState, fields)
        const updatedOutcomes = Object.fromEntries(
            Object.entries(formattedOutcomes).map(([key, value]) => [key, value.outcome])
        )

        SetParentNodeState({
            ...ParentNodeState,
            caoState: {
                ...ParentNodeState.caoState,
                outcome: updatedOutcomes,
            },
        })
    }, [ParentNodeState.selectedPredictorType])

    const onUpdateCAOState = (event, espType: string) => {
        // eslint-disable-next-line no-shadow
        const {name, checked} = event.target
        const caoStateCopy = {...ParentNodeState.caoState}

        caoStateCopy[espType][name] = checked

        SetParentNodeState({
            ...ParentNodeState,
            caoState: caoStateCopy,
        })
    }

    return (
        <>
            <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                buttonProps={{
                    btnContent: "C",
                    btnSxProps: {
                        left: "-2.2rem",
                        height: 0,
                        position: "absolute",
                        top: "1rem",
                    },
                    id: `${flowPrefix}-context-button${idExtension}`,
                }}
                popperProps={{
                    id: `${flowPrefix}-context-popper${idExtension}`,
                    placement: "left",
                    style: {
                        borderRadius: "0.5rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    },
                }}
            >
                <Card
                    id={`${flowPrefix}-context-card${idExtension}`}
                    sx={{
                        fontSize: "0.75rem",
                        height: "10rem",
                        overflowY: "auto",
                    }}
                >
                    <span
                        id={`${flowPrefix}-context-text${idExtension}`}
                        style={{marginBottom: "0.5rem"}}
                    >
                        Context
                    </span>
                    {Object.keys(ParentNodeState?.caoState?.context).map((element) => (
                        <div
                            id={`${flowPrefix}-context-div${idExtension}`}
                            key={element}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "1rem",
                                marginBottom: "0.5rem",
                            }}
                        >
                            <label
                                id={`${flowPrefix}-context-label-${element}${idExtension}`}
                                style={{textTransform: "capitalize"}}
                            >
                                {" "}
                                {element}{" "}
                            </label>
                            <input
                                name={element}
                                id={`${flowPrefix}-context-input-${element}${idExtension}`}
                                type="checkbox"
                                disabled={props.readOnlyNode}
                                checked={ParentNodeState?.caoState?.context[element]}
                                onChange={(event) => onUpdateCAOState(event, "context")}
                            />
                        </div>
                    ))}
                </Card>
            </NodePopper>
            <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                buttonProps={{
                    btnContent: "A",
                    btnSxProps: {
                        bottom: "0.55rem",
                        height: 0,
                        left: "-2.2rem",
                        position: "absolute",
                    },
                    id: `${flowPrefix}-actions-button${idExtension}`,
                }}
                popperProps={{
                    id: `${flowPrefix}-actions-popper${idExtension}`,
                    placement: "left",
                    style: {
                        borderRadius: "0.5rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    },
                }}
            >
                <Card
                    id={`${flowPrefix}-actions-card${idExtension}`}
                    sx={{
                        fontSize: "0.75rem",
                        height: "10rem",
                        overflowY: "auto",
                        zIndex: ZIndexLayers.LAYER_2,
                    }}
                >
                    <span
                        id={`${flowPrefix}-actions-text${idExtension}`}
                        style={{marginBottom: "0.5rem"}}
                    >
                        Actions
                    </span>
                    {Object.keys(ParentNodeState.caoState.action).map((element) => (
                        <div
                            id={`${flowPrefix}-actions-div-${element}${idExtension}`}
                            key={element}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "1rem",
                                marginBottom: "0.5rem",
                            }}
                        >
                            <label
                                id={`${flowPrefix}-actions-label-${element}${idExtension}`}
                                style={{textTransform: "capitalize"}}
                            >
                                {" "}
                                {element}{" "}
                            </label>
                            <input
                                id={`${flowPrefix}-actions-input-${element}${idExtension}`}
                                name={element}
                                type="checkbox"
                                checked={ParentNodeState.caoState.action[element]}
                                disabled={props.readOnlyNode}
                                onChange={(event) => onUpdateCAOState(event, "action")}
                            />
                        </div>
                    ))}
                </Card>
            </NodePopper>
            <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                buttonProps={{
                    btnContent: "O",
                    btnSxProps: {
                        height: 0,
                        position: "absolute",
                        right: "-2.1rem",
                        top: "1.7rem",
                    },
                    id: `${flowPrefix}-outcomes-button${idExtension}`,
                }}
                popperProps={{
                    id: `${flowPrefix}-outcomes-popper${idExtension}`,
                    placement: "right",
                    style: {
                        borderRadius: "0.5rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    },
                }}
            >
                <Card
                    id={`${flowPrefix}-outcomes-card${idExtension}`}
                    sx={{
                        fontSize: "0.75rem",
                        height: "10rem",
                        overflowY: "auto",
                    }}
                >
                    <span
                        id={`${flowPrefix}-outcomes-text${idExtension}`}
                        style={{marginBottom: "0.5rem"}}
                    >
                        Outcomes
                    </span>
                    {dataOutcomes &&
                        Object.keys(dataOutcomes).map((element) => (
                            <Tooltip
                                id={`${flowPrefix}-disabled-outcomes__tooltip`}
                                placement="right"
                                key={element}
                                title={
                                    dataOutcomes[element].disabled
                                        ? "This outcome is not applicable for the chosen predictor type"
                                        : ""
                                }
                            >
                                <div
                                    id={`${flowPrefix}-outcomes-div-${element}${idExtension}`}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(2, 1fr)",
                                        gap: "1rem",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <label
                                        id={`${flowPrefix}-outcomes-label-${element}${idExtension}`}
                                        style={{
                                            ...(dataOutcomes[element].disabled && {opacity: "50%"}),
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {" "}
                                        {element}{" "}
                                    </label>
                                    <input
                                        name={element}
                                        id={`${flowPrefix}-outcomes-input-${element}${idExtension}`}
                                        type="checkbox"
                                        checked={dataOutcomes[element].outcome}
                                        onChange={(event) => onUpdateCAOState(event, "outcome")}
                                        disabled={dataOutcomes[element].disabled || props.readOnlyNode}
                                    />
                                </div>
                            </Tooltip>
                        ))}
                </Card>
            </NodePopper>
        </>
    )
}

export default CAOButtons
