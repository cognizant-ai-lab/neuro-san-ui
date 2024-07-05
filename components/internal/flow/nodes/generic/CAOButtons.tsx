import {Tooltip} from "antd"
import {Text as EvergreenText, Popover, Position} from "evergreen-ui"
import {useEffect, useState} from "react"
import {Card} from "react-bootstrap"

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
            <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                position={Position.LEFT}
                content={
                    <Card.Body
                        id={`${flowPrefix}-context-card${idExtension}`}
                        className="overflow-y-auto h-40 text-xs"
                    >
                        <EvergreenText
                            id={`${flowPrefix}-context-text${idExtension}`}
                            className="mb-2"
                        >
                            Context
                        </EvergreenText>
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
                                    checked={ParentNodeState?.caoState?.context[element]}
                                    onChange={(event) => onUpdateCAOState(event, "context")}
                                />
                            </div>
                        ))}
                    </Card.Body>
                }
            >
                <button
                    type="button"
                    id={`${flowPrefix}-context-button${idExtension}`}
                    className="absolute top-2 -left-4"
                    style={{height: 0}}
                >
                    C
                </button>
            </Popover>
            <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                position={Position.LEFT}
                content={
                    <Card.Body
                        id={`${flowPrefix}-actions-card${idExtension}`}
                        className="overflow-y-auto h-40 text-xs"
                        style={{zIndex: 1000}}
                    >
                        <EvergreenText
                            id={`${flowPrefix}-actions-text${idExtension}`}
                            className="mb-2"
                        >
                            Actions
                        </EvergreenText>
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
                                    onChange={(event) => onUpdateCAOState(event, "action")}
                                />
                            </div>
                        ))}
                    </Card.Body>
                }
            >
                <button
                    type="button"
                    id={`${flowPrefix}-actions-button${idExtension}`}
                    className="absolute bottom-6 -left-4"
                    style={{height: 0}}
                >
                    A
                </button>
            </Popover>
            <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                position={Position.RIGHT}
                content={
                    <Card.Body
                        id={`${flowPrefix}-outcomes-card${idExtension}`}
                        className="overflow-y-auto h-40 text-xs"
                    >
                        <EvergreenText
                            id={`${flowPrefix}-outcomes-text${idExtension}`}
                            className="mb-2"
                        >
                            Outcomes
                        </EvergreenText>
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
                                            disabled={dataOutcomes[element].disabled}
                                        />
                                    </div>
                                </Tooltip>
                            ))}
                    </Card.Body>
                }
            >
                <button
                    id={`${flowPrefix}-outcomes-button${idExtension}`}
                    type="button"
                    className="absolute top-5 -right-4"
                    style={{height: 0}}
                >
                    O
                </button>
            </Popover>
        </>
    )
}

export default CAOButtons
