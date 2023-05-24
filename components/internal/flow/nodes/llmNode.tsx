// React components
import {Dispatch, SetStateAction, useState} from 'react'

// 3rd party components
import {Card, Col, Collapse, Container, Row} from "react-bootstrap"
import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {InfoSignIcon, Popover, Text, Tooltip,} from "evergreen-ui"
import {Handle, Position as HandlePosition, NodeProps, Node} from 'reactflow'
import {AiFillDelete} from "react-icons/ai";
import {GrSettingsOption} from "react-icons/gr"
import {NotificationType, sendNotification} from "../../../../controller/notification";
import ConfigNumeric from "../confignumeric"

// Custom components
import {LlmModelParams, ParamType,} from "../llmInfo"

// Define an interface for the structure
// of the node
interface LlmNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,
    readonly ParentUncertaintyNodeState: LlmModelParams,
    readonly SetParentUncertaintyNodeState: Dispatch<SetStateAction<LlmModelParams>>,

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number

    readonly ParameterSet: LlmModelParams

    readonly NodeTitle: string
}

export type LLmNode = Node<LlmNodeData>;

const LlmNodeComponent: React.FC<NodeProps<LlmNodeData>> = (props) => {
    /*
    This function renders the LLM node
    */

    // Unpack props
    const data = props.data

    // Unpack the data
    const {
        NodeID,
        ParentUncertaintyNodeState,
        SetParentUncertaintyNodeState,
        DeleteNode,
        GetElementIndex,
        ParameterSet,
        NodeTitle
    } = data

    // For showing advanced configuration settings
    const [showAdvanced] = useState(false)

    const onParamChange = (event, paramName: string) => {
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
    const flowPrefix = `llmnode-${flowIndex}`
    const defaultParams = ParameterSet

    function getInputComponent(param, item) {
        const paramPrefix = `${flowPrefix}-${param}`
        return <Container id={`${paramPrefix}-container`}>
            <Row id={`${paramPrefix}-row`} className="mx-2 my-4">
                <Col id={`${paramPrefix}-param-col`} md={2}>
                    <label id={`${paramPrefix}-label`} className="capitalize">{param}: </label>
                </Col>
                <Col id={`${paramPrefix}-param-val-col`}>
                    {
                        (item.type === ParamType.INT ||
                            item.type === ParamType.FLOAT) &&
                        <ConfigNumeric
                            id={`${paramPrefix}-value`}
                            paramName={param}
                            defaultParam={defaultParams[param]}
                            value={
                                (ParentUncertaintyNodeState[param] != null &&
                                    ParentUncertaintyNodeState[param].value != null)
                                    ? (ParentUncertaintyNodeState[param].value as number)
                                    : defaultParams[param].default_value != null
                                        ? (defaultParams[param].default_value as number)
                                        : undefined
                            }
                            onParamChange={event => onParamChange(event, param)}
                            style={{width: "100%"}}
                        />
                    }
                    {
                        item.type === ParamType.BOOLEAN &&
                        <input
                            id={`${paramPrefix}-value`}
                            type="checkbox"
                            checked={
                                (ParentUncertaintyNodeState[param] != null &&
                                    ParentUncertaintyNodeState[param].value != null)
                                    ? Boolean(ParentUncertaintyNodeState[param].value)
                                    : defaultParams[param].default_value != null
                                        ? Boolean(defaultParams[param].default_value)
                                        : undefined
                            }
                            onChange={event => onCheckboxChange(event, param)}
                        />
                    }
                    {
                        item.type === ParamType.ENUM &&
                        <select
                            id={`${paramPrefix}-value`}
                            value={
                                (ParentUncertaintyNodeState[param] != null &&
                                    ParentUncertaintyNodeState[param].value != null)
                                    ? ParentUncertaintyNodeState[param].value.toString()
                                    : defaultParams[param].default_value != null
                                        ? defaultParams[param].default_value.toString()
                                        : undefined
                            }
                            onChange={event => onParamChange(event, param)}
                            style={{width: "100%"}}
                        >
                            {
                                (item.allValues as Array<string>).map(
                                    value =>
                                        <option
                                            id={`${paramPrefix}-${value}`}
                                            key={value} value={value}>
                                            {value}
                                        </option>
                                )
                            }
                        </select>
                    }
                    {
                        item.type === ParamType.STRING &&
                        <textarea
                            style={{width: "100%", fontFamily: "monospace"}}
                            rows={item.rows || 10}
                            id={`${paramPrefix}-value`}
                            onChange={event => onParamChange(event, param)}
                        >
                       {(ParentUncertaintyNodeState[param] != null &&
                           ParentUncertaintyNodeState[param].value != null)
                           ? ParentUncertaintyNodeState[param].value as string
                           : defaultParams[param].default_value.toString()
                       }
                    </textarea>
                    }
                </Col>
                <Col id={`${paramPrefix}-tooltip`} md={1}>
                    <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                        content={item.description}>
                        <InfoSignIcon id={`${paramPrefix}-tooltip-info-sign-icon`}/>
                    </Tooltip>
                </Col>
            </Row>
        </Container>
    }

    // Create the outer Card
    return <BlueprintCard id={ `${flowPrefix}` }
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }
    >
        <Card id={ `${flowPrefix}-llm-card-1` } 
            border="warning" style={{height: "100%"}}>
            <Card.Body id={ `${flowPrefix}-llm-card-2` }
                className="flex justify-center content-center">
                <Text id={ `${flowPrefix}-llm-text` }
                    className="mr-2">
                    {NodeTitle}
                </Text>
                <div id={ `${flowPrefix}-popover-div` }
                    onMouseDown={(event) => {event.stopPropagation()}}>
                    <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Popover does not have an id property when compiling
                        content={
                        <>
                            <Card.Body id={ `${flowPrefix}-llm-config` }
                                className="h-40 text-xs">
                                <div id={ `${flowPrefix}-basic-settings-div` }
                                    className="mt-3">
                                    {
                                        Object.keys(ParameterSet)
                                            .filter(key => !ParameterSet[key].isAdvanced)
                                            .map(key => {
                                                return getInputComponent(key, ParameterSet[key])
                                            })
                                    }
                                </div>
                                <Collapse       // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                // 2/6/23 DEF - Collapse does not have an id property when compiling
                                    in={showAdvanced} timeout={5}>
                                    <div id={ `${flowPrefix}-advanced-settings-div` }
                                        className="mt-3 mb-4">
                                        {
                                            Object.keys(ParameterSet)
                                                .filter(key => ParameterSet[key].isAdvanced)
                                                .map(key => {
                                                    return getInputComponent(key, ParameterSet[key])
                                                })
                                        }
                                    </div>
                                </Collapse>
                            </Card.Body>
                        </>
                    }
                         statelessProps={{
                             height: "600px",
                             width: "1200px",
                             backgroundColor: "ghostwhite"
                         }}
                    >
                    <div id={ `${flowPrefix}-show-llm-config` } className="flex">
                        <button id={ `${flowPrefix}-show-llm-config-button` }
                                type="button"
                                className="mt-1"
                                style={{height: 0}}>
                            <GrSettingsOption
                                id={ `${flowPrefix}-show-llm-config-button-settings-option` }/>
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
                            sendNotification(NotificationType.success, "LLM node deleted")
                        }}
                >
                    <AiFillDelete id={ `${flowPrefix}-delete-button-fill` } size="10"/>
                </button>
            </div>
        </Card>
        <Handle id={ `${flowPrefix}-source-handle` } type="source" position={HandlePosition.Right} />
        <Handle id={ `${flowPrefix}-target-handle` } type="target" position={HandlePosition.Left} />
    </BlueprintCard>
}

export default LlmNodeComponent;