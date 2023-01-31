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
}

export default function UncertaintyModelNode(props): ReactElement {
    /*
    This function renders the uncertainty model node
    */

    // Unpack props
    const data: UncertaintyModelNodeData = props.data

    // Unpack the data
    const {NodeID, ParentUncertaintyNodeState, DeleteNode, SetParentUncertaintyNodeState} = data

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

    function getInputComponent(param, item) {
        return <div className="grid grid-cols-10 gap-4 mb-2" key={param} >
                <div className="item1 col-span-5">
                    <label className="capitalize" id={`${param}-label`}>{param}: </label>
                </div>
                <div className="item2 col-span-4">
                    {
                        item.type === ParamType.INT &&
                        <input
                            id={`${param}-value`}
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
                                id={`${param}-value`}
                                type="checkbox"
                                checked={Boolean(ParentUncertaintyNodeState[param].value)}
                                onChange={event => onCheckboxChange(event, param)}
                            />
                    }
                    {
                        item.type === ParamType.ENUM &&
                        <select
                            id={`${param}-value`}
                            value={ParentUncertaintyNodeState[param].value.toString()}
                            onChange={event => onParamChange(event, param)}
                            style={{width: "100%"}}
                        >
                            {
                                (item.allValues as Array<string>).map(
                                    value =>
                                        <option
                                            id={`${param}-${value}`}
                                            key={value} value={ value }>
                                            { value }
                                        </option>
                                )
                            }
                        </select>
                    }
                </div>
                <div className="item3 col-span-1">
                    <Tooltip content={item.description} >
                        <InfoSignIcon />
                    </Tooltip>
                </div>
            </div>
    }

    // Create the outer Card
    return <BlueprintCard
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }
    >
        <Card border="warning" style={{height: "100%"}}>
            <Card.Body className="flex justify-center content-center">
                <Text className="mr-2">Uncertainty model</Text>
                <div onMouseDown={(event) => {event.stopPropagation()}}>
                    <Popover content={
                        <>
                            <Card.Body className="h-40 text-xs" id={ "uncertainty_model_config" }>
                                <div className="mt-1 mb-2 mx-1">
                                    <a target="_blank" href="https://gpflow.github.io/GPflow/" rel="noreferrer">
                                        For more information on these settings, view the GPFlow documentation here.
                                    </a>
                                </div>
                                <div className="mt-4 mb-2">
                                    <Text>
                                        <b>Basic settings</b>
                                    </Text>
                                </div>
                                <div className="mt-3">
                                    {
                                        Object.keys(UNCERTAINTY_MODEL_PARAMS)
                                            .filter(key => !UNCERTAINTY_MODEL_PARAMS[key].isAdvanced)
                                            .map(key => {
                                                return getInputComponent(key, UNCERTAINTY_MODEL_PARAMS[key])
                                            })
                                    }
                                </div>
                                <div className="mt-4 mb-2">
                                    <Text>
                                        <b>Advanced settings</b> (most users should not change these)
                                    </Text>
                                </div>
                                <button
                                    id="show-advanced-settings-uncert-model"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    {showAdvanced ? <u>Hide</u> : <u>Show</u>}
                                </button>
                                <Collapse in={showAdvanced} timeout={5}>
                                    <div className="mt-3 mb-4">
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
                    <div className="flex">
                        <button type="button"
                                id="show-uncertainty-model-config"
                                className="mt-1"
                                style={{height: 0}}>
                            <GrSettingsOption/>
                        </button>
                    </div>
                    </Popover>
                </div>
            </Card.Body>
            <div className="px-1 my-1" style={{position: "absolute", bottom: "0px", right: "1px"}}>
                <button type="button"
                        id="delete-me"
                        className="hover:text-red-700 text-xs"
                        onClick={() => {
                            DeleteNode(NodeID)
                            sendNotification(NotificationType.success, "Uncertainty model node deleted")
                        }}
                >
                    <AiFillDelete size="10"/>
                </button>
            </div>
        </Card>
        <Handle type="source" position={HandlePosition.Right} />
        <Handle type="target" position={HandlePosition.Left} />
    </BlueprintCard>
}
