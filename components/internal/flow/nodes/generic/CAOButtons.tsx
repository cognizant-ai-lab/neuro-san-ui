import Tooltip from "@mui/material/Tooltip"
import {useEffect, useState} from "react"
import {Card} from "react-bootstrap"

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
                    id: `${flowPrefix}-context-button${idExtension}`,
                    className: "absolute top-2 -left-4",
                    style: {height: 0},
                    btnContent: "C",
                }}
                popperProps={{
                    id: `${flowPrefix}-context-popper${idExtension}`,
                    className: "rounded-sm shadow-2xl",
                    placement: "left",
                }}
            >
                <Card
                    id={`${flowPrefix}-context-card${idExtension}`}
                    className="overflow-y-auto h-40 text-xs"
                >
                    <span
                        id={`${flowPrefix}-context-text${idExtension}`}
                        className="mb-2"
                    >
                        Context
                    </span>
                    {Object.keys(ParentNodeState?.caoState?.context).map((element) => (
                        <div
                            id={`${flowPrefix}-context-div${idExtension}`}
                            key={element}
                            className="grid grid-cols-2 gap-4 mb-2"
                        >
                            <label
                                id={`${flowPrefix}-context-label-${element}${idExtension}`}
                                className="capitalize"
                            >
                                {" "}
                                {element}{" "}
                            </label>
                            <input
                                name={element}
                                id={`${flowPrefix}-context-input-${element}${idExtension}`}
                                type="checkbox"
                                defaultChecked={true}
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
                    id: `${flowPrefix}-actions-button${idExtension}`,
                    className: "absolute bottom-6 -left-4",
                    style: {height: 0},
                    btnContent: "A",
                }}
                popperProps={{
                    id: `${flowPrefix}-actions-popper${idExtension}`,
                    className: "rounded-sm shadow-2xl",
                    placement: "left",
                }}
            >
                <Card
                    id={`${flowPrefix}-actions-card${idExtension}`}
                    className="overflow-y-auto h-40 text-xs"
                    style={{zIndex: 1000}}
                >
                    <span
                        id={`${flowPrefix}-actions-text${idExtension}`}
                        className="mb-2"
                    >
                        Actions
                    </span>
                    {Object.keys(ParentNodeState.caoState.action).map((element) => (
                        <div
                            id={`${flowPrefix}-actions-div-${element}${idExtension}`}
                            key={element}
                            className="grid grid-cols-2 gap-4 mb-2"
                        >
                            <label
                                id={`${flowPrefix}-actions-label-${element}${idExtension}`}
                                className="capitalize"
                            >
                                {" "}
                                {element}{" "}
                            </label>
                            <input
                                id={`${flowPrefix}-actions-input-${element}${idExtension}`}
                                name={element}
                                type="checkbox"
                                defaultChecked={true}
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
                    id: `${flowPrefix}-outcomes-button${idExtension}`,
                    className: "absolute top-5 -right-4",
                    style: {height: 0},
                    btnContent: "O",
                }}
                popperProps={{
                    id: `${flowPrefix}-outcomes-popper${idExtension}`,
                    className: "rounded-sm shadow-2xl",
                    placement: "right",
                }}
            >
                <Card
                    id={`${flowPrefix}-outcomes-card${idExtension}`}
                    className="overflow-y-auto h-40 text-xs"
                >
                    <span
                        id={`${flowPrefix}-outcomes-text${idExtension}`}
                        className="mb-2"
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
                                    className="grid grid-cols-2 gap-4 mb-2"
                                >
                                    <label
                                        id={`${flowPrefix}-outcomes-label-${element}${idExtension}`}
                                        className="capitalize"
                                        style={{
                                            ...(dataOutcomes[element].disabled && {opacity: "50%"}),
                                        }}
                                    >
                                        {" "}
                                        {element}{" "}
                                    </label>
                                    <input
                                        name={element}
                                        id={`${flowPrefix}-outcomes-input-${element}${idExtension}`}
                                        type="checkbox"
                                        defaultChecked={false}
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
