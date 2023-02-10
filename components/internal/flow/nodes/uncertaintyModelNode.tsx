// React components
import {Dispatch, ReactElement, SetStateAction, useState} from 'react'

// 3rd party components
import {Card, Collapse} from "react-bootstrap"
import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {InfoSignIcon, Popover, Text, Tooltip,} from "evergreen-ui"
import {Handle, Position as HandlePosition} from 'react-flow-renderer'
import {AiFillDelete} from "react-icons/ai";
import {GrSettingsOption} from "react-icons/gr"
import {NotificationType, sendNotification} from "../../../../controller/notification";

// Custom components
import {ParamType, UNCERTAINTY_MODEL_PARAMS} from "../uncertaintymodelinfo"

// State of the uncertainty node
interface UncertaintyNodeState {
    confidenceInterval: number,
    useArd: boolean,
    maxIterationsOptimizer: number,
    numSvgInducingPoints: number,
    frameworkVariant: string,
    kernelType: string
}

// Define an interface for the structure
// of the node
interface UncertaintyModelNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,
    readonly ParentUncertaintyNodeState: UncertaintyNodeState,
    readonly SetParentUncertaintyNodeState: Dispatch<SetStateAction<UncertaintyNodeState>>,

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number
}

export default function UncertaintyModelNode(props): ReactElement {
    /*
    This function renders the uncertainty model node
    */

    // Unpack props
    const data: UncertaintyModelNodeData = props.data

    // Unpack the data
    const {
        NodeID,
        ParentUncertaintyNodeState,
        SetParentUncertaintyNodeState,
        DeleteNode,
        GetElementIndex
    } = data

    // For showing advanced configuration settings
    const [showAdvanced, setShowAdvanced] = useState(false)

    const onParamChange = (event, paramName) => {
        /*
        This function is used to update the state of the predictor
        parameters.
        */
        const { value } = event.target
        const paramsCopy = {...ParentUncertaintyNodeState}
        paramsCopy[paramName].value = value
        SetParentUncertaintyNodeState(paramsCopy)
    }

    const onCheckboxChange = (event, paramName) => {
        /*
        This function is used to update the state of any checkbox parameters
        */
        const { checked } = event.target
        const paramsCopy = {...ParentUncertaintyNodeState}
        paramsCopy[paramName].value = checked
        SetParentUncertaintyNodeState(paramsCopy)
    }

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `uncertaintynode-${flowIndex}`

    function getInputComponent(param, item) {
        const paramPrefix = `${flowPrefix}-${param}`
        return <div id={ `${paramPrefix}-input-component` }
                    className="grid grid-cols-10 gap-4 mb-2" key={param} >
            <div id={ `${paramPrefix}-input-component-div` } className="item1 col-span-5">
                <label id={ `${paramPrefix}-label` } className="capitalize">{param}: </label>
            </div>
            <div id={ `${paramPrefix}-data-type-div` }
                className="item2 col-span-4">
                {
                    item.type === ParamType.INT &&
                    <input
                        id={`${paramPrefix}-value`}
                        type="number"
                        step="1"
                        value={ParentUncertaintyNodeState[param].value.toString()}
                        onChange={event => onParamChange(event, param)}
                        style={{width: "100%"}}
                    />
                }
                {
                    item.type === ParamType.BOOLEAN && 
                        <input
                            id={`${paramPrefix}-value`}
                            type="checkbox"
                            checked={Boolean(ParentUncertaintyNodeState[param].value)}
                            onChange={event => onCheckboxChange(event, param)}
                        />
                }
                {
                    item.type === ParamType.ENUM &&
                    <select
                        id={`${paramPrefix}-value`}
                        value={ParentUncertaintyNodeState[param].value.toString()}
                        onChange={event => onParamChange(event, param)}
                        style={{width: "100%"}}
                    >
                        {
                            (item.allValues as Array<string>).map(
                                value =>
                                    <option
                                        id={`${paramPrefix}-${value}`}
                                        key={value} value={ value }>
                                        { value }
                                    </option>
                            )
                        }
                    </select>
                }
            </div>
            <div id={ `${paramPrefix}-tooltip-div` }
                className="item3 col-span-1">
                <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                    content={item.description} >
                    <InfoSignIcon id={ `${paramPrefix}-tooltip-info-sign-icon` }/>
                </Tooltip>
            </div>
        </div>
    }

    // Create the outer Card
    return <BlueprintCard id={ `${flowPrefix}` }
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }
    >
        <Card id={ `${flowPrefix}-uncertainty-model-card-1` } 
            border="warning" style={{height: "100%"}}>
            <Card.Body id={ `${flowPrefix}-uncertainty-model-card-2` }
                className="flex justify-center content-center">
                <Text id={ `${flowPrefix}-uncertainty-model-text` }
                    className="mr-2">
                    Uncertainty model
                </Text>
                <div id={ `${flowPrefix}-popover-div` }
                    onMouseDown={(event) => {event.stopPropagation()}}>
                    <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Popover does not have an id property when compiling
                        content={
                        <>
                            <Card.Body id={ `${flowPrefix}-uncertainty-model-config` }
                                className="h-40 text-xs">
                                <div id={ `${flowPrefix}-more-info-div` }
                                    className="mt-1 mb-2 mx-1">
                                    <a id={ `${flowPrefix}-more-info-anchor` }
                                        target="_blank"
                                        href="https://gpflow.github.io/GPflow/" rel="noreferrer">
                                        For more information on these settings, view the GPFlow documentation here.
                                    </a>
                                </div>
                                <div id={ `${flowPrefix}-basic-settings-label-div` }
                                    className="mt-4 mb-2">
                                    <Text id={ `${flowPrefix}-basic-settings-text` }>
                                        <b id={ `${flowPrefix}-basic-settings-label` }>
                                            Basic settings
                                        </b>
                                    </Text>
                                </div>
                                <div id={ `${flowPrefix}-basic-settings-div` }
                                    className="mt-3">
                                    {
                                        Object.keys(UNCERTAINTY_MODEL_PARAMS)
                                            .filter(key => !UNCERTAINTY_MODEL_PARAMS[key].isAdvanced)
                                            .map(key => {
                                                return getInputComponent(key, UNCERTAINTY_MODEL_PARAMS[key])
                                            })
                                    }
                                </div>
                                <div id={ `${flowPrefix}-advanced-settings-label-div` } className="mt-4 mb-2">
                                    <Text id={ `${flowPrefix}-advanced-settings-text` }>
                                        <b id={ `${flowPrefix}-advanced-settings-label` }>
                                            Advanced settings
                                        </b> (most users should not change these)
                                    </Text>
                                </div>
                                <button id={ `${flowPrefix}-show-advanced-settings-uncert-model-button` }
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    {showAdvanced
                                        ? <u id={ `${flowPrefix}-show-advanced-settings` }>Hide</u>
                                        : <u id={ `${flowPrefix}-hide-advanced-settings` }>Show</u>
                                    }
                                </button>
                                <Collapse       // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                // 2/6/23 DEF - Collapse does not have an id property when compiling
                                    in={showAdvanced} timeout={5}>
                                    <div id={ `${flowPrefix}-advanced-settings-div` }
                                        className="mt-3 mb-4">
                                        {
                                            Object.keys(UNCERTAINTY_MODEL_PARAMS)
                                                .filter(key => UNCERTAINTY_MODEL_PARAMS[key].isAdvanced)
                                                .map(key => {
                                                    return getInputComponent(key, UNCERTAINTY_MODEL_PARAMS[key])
                                                })
                                        }
                                    </div>
                                </Collapse>
                            </Card.Body>
                        </>
                    }
                         statelessProps={{
                             height: "325px",
                             width: "650px",
                             backgroundColor: "ghostwhite"
                         }}
                    >
                    <div id={ `${flowPrefix}-show-uncertainty-model-config` }className="flex">
                        <button id={ `${flowPrefix}-show-uncertainty-model-config-button` }
                                type="button"
                                className="mt-1"
                                style={{height: 0}}>
                            <GrSettingsOption
                                id={ `${flowPrefix}-show-uncertainty-model-config-button-settings-option` }/>
                        </button>
                    </div>
                    </Popover>
                </div>
            </Card.Body>
            <div id={ `${flowPrefix}-delete-button-div` } 
                className="px-1 my-1" style={{position: "absolute", bottom: "0px", right: "1px"}}>
                <button id={ `${flowPrefix}-delete-button` }
                        type="button"
                        className="hover:text-red-700 text-xs"
                        onClick={() => {
                            DeleteNode(NodeID)
                            sendNotification(NotificationType.success, "Uncertainty model node deleted")
                        }}
                >
                    <AiFillDelete id={ `${flowPrefix}-delete-button-fill` }size="10"/>
                </button>
            </div>
        </Card>
        <Handle id={ `${flowPrefix}-source-handle` } type="source" position={HandlePosition.Right} />
        <Handle id={ `${flowPrefix}-target-handle` } type="target" position={HandlePosition.Left} />
    </BlueprintCard>
}
