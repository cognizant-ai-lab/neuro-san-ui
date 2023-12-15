import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {Text as EvergreenText, InfoSignIcon, Popover, Tooltip} from "evergreen-ui"
import {Dispatch, FC, SetStateAction, useEffect, useState} from "react"
import {Card, Col, Collapse, Container, Row} from "react-bootstrap"
import {AiFillDelete} from "react-icons/ai"
import {GrSettingsOption} from "react-icons/gr"
import {Handle, Position as HandlePosition, NodeProps, Node as RFNode} from "reactflow"

import {BaseParameterType, NodeParams} from "./types"
import ConfigNumeric from "../../confignumeric"

// Define an interface for the structure of the node
export interface ConfigurableNodeData {
    // The ID of the nodes. This will be important for applying IDs to form elements.
    // The form elements thus will have IDs like nodeID-formElementType
    readonly NodeID: string

    // For syncing up state with outer containing "flow" component. Once we implement
    // centralized state management, this should no longer be necessary.
    readonly ParentNodeState: NodeParams
    readonly SetParentNodeState: Dispatch<SetStateAction<NodeParams>>

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number

    // Set of parameters that can be configured for this node
    readonly ParameterSet: NodeParams

    // Title to be displayed on the node
    readonly NodeTitle: string

    // idExtension used to set unique Id
    idExtension?: string
}

export type ConfigurableNode = RFNode<ConfigurableNodeData>

/**
 * This component is used to render a generic flow node that can be configured
 * by the user.
 *
 * The subtype of the node is stored in the `type` property, inherited from react-flow `Node`.
 * For example: `type: 'uncertaintymodelnode'` or `type: 'llmnode'`
 *
 * Why not be all object-oriented about this, and have a base `OurNode` class with subclasses
 * like `UncertaintyNode` etc.? Because react-flow doesn't work that way. It's a functional component.
 * They prefer to use a type discriminator in the properties (aptly named `type`) and then use that to determine
 * which component we are dealing with. So we have to do it their way.
 *
 */
const ConfigurableNodeComponent: FC<NodeProps<ConfigurableNodeData>> = (props) => {
    // Unpack props
    const data = props.data
    const {idExtension = ""} = data

    // Unpack the data
    const {NodeID, ParentNodeState, SetParentNodeState, DeleteNode, GetElementIndex, ParameterSet, NodeTitle} = data

    useEffect(() => {
        const nodeState = {...ParentNodeState}
        nodeState &&
            Object.keys(nodeState).forEach((key) => {
                if (nodeState[key].value == null) {
                    if (Array.isArray(nodeState[key].default_value)) {
                        // If the type has to be a choice, select the first choice
                        nodeState[key].value = nodeState[key].default_value[0]
                    } else {
                        // If the type is a number, string or a bool
                        // use the default value as the user selected value
                        nodeState[key].value = nodeState[key].default_value
                    }
                }
            })
        SetParentNodeState(nodeState)
    }, [])

    /**
     * This function is used to update the state of any parameter based on a user event (e.g. onChange)
     *
     * @param event UI event that triggered the change
     * @param paramName Name of the parameter that changed
     */
    const onParamChange = (event, paramName: string) => {
        const {value} = event.target
        const paramsCopy = {...ParentNodeState}
        switch (paramsCopy[paramName].type) {
            case BaseParameterType.INT:
            case BaseParameterType.FLOAT:
                paramsCopy[paramName].value = Number(value)
                break
            case BaseParameterType.BOOLEAN:
                paramsCopy[paramName].value = Boolean(value)
                break
            case BaseParameterType.STRING:
            case BaseParameterType.ENUM:
            default:
                paramsCopy[paramName].value = value
        }
        SetParentNodeState(paramsCopy)
    }

    const onCheckboxChange = (event, paramName) => {
        /*
        This function is used to update the state of any checkbox parameters
        */
        const {checked} = event.target
        const paramsCopy = {...ParentNodeState}
        paramsCopy[paramName].value = checked
        SetParentNodeState(paramsCopy)
    }

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `${props.type}-${flowIndex}`
    const defaultParams = ParameterSet

    // For showing advanced configuration settings
    const [showAdvanced, setShowAdvanced] = useState(false)

    function getInputComponent(param) {
        const item = ParameterSet[param]
        const paramPrefix = `${flowPrefix}-${param}`
        const parentNodeStateElement = ParentNodeState?.[param]

        return (
            <Container id={`${paramPrefix}-container${idExtension}`}>
                <Row
                    id={`${paramPrefix}-row${idExtension}`}
                    className="mx-2 my-4"
                >
                    <Col
                        id={`${paramPrefix}-param-col${idExtension}`}
                        md={2}
                    >
                        <label
                            id={`${paramPrefix}-label${idExtension}`}
                            className="capitalize"
                        >
                            {param}:{" "}
                        </label>
                    </Col>
                    <Col id={`${paramPrefix}-param-val-col${idExtension}`}>
                        {(item.type === BaseParameterType.INT || item.type === BaseParameterType.FLOAT) && (
                            <ConfigNumeric
                                id={`${paramPrefix}-value${idExtension}`}
                                paramName={param}
                                defaultParam={defaultParams[param]}
                                value={(parentNodeStateElement?.value ?? defaultParams[param]?.default_value) as number}
                                onParamChange={(event) => onParamChange(event, param)}
                                style={{width: "100%"}}
                            />
                        )}
                        {item.type === BaseParameterType.BOOLEAN && (
                            <input
                                id={`${paramPrefix}-value${idExtension}`}
                                type="checkbox"
                                checked={Boolean(parentNodeStateElement?.value ?? defaultParams[param]?.default_value)}
                                onChange={(event) => onCheckboxChange(event, param)}
                            />
                        )}
                        {item.type === BaseParameterType.ENUM && item.enum && (
                            <select
                                id={`${paramPrefix}-value${idExtension}`}
                                value={(
                                    parentNodeStateElement?.value ?? defaultParams[param]?.default_value
                                )?.toString()}
                                onChange={(event) => onParamChange(event, param)}
                                style={{width: "100%"}}
                            >
                                {Object.entries(item.enum)
                                    .sort((first, second) => first[0].localeCompare(second[0]))
                                    .map((enumItem) => (
                                        <option
                                            id={`${paramPrefix}-${enumItem[0]}${idExtension}`}
                                            key={enumItem[0]}
                                            value={enumItem[1].toString()}
                                        >
                                            {enumItem[0]}
                                        </option>
                                    ))}
                            </select>
                        )}
                        {item.type === BaseParameterType.STRING && (
                            <textarea
                                style={{width: "100%", fontFamily: "monospace"}}
                                rows={item.rows || 10}
                                id={`${paramPrefix}-value${idExtension}`}
                                onChange={(event) => onParamChange(event, param)}
                            >
                                {(parentNodeStateElement?.value ?? defaultParams[param]?.default_value)?.toString()}
                            </textarea>
                        )}
                    </Col>
                    <Col
                        id={`${paramPrefix}-tooltip${idExtension}`}
                        md={1}
                    >
                        <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            content={item.description}
                        >
                            <InfoSignIcon id={`${paramPrefix}-tooltip-info-sign-icon${idExtension}`} />
                        </Tooltip>
                    </Col>
                </Row>
            </Container>
        )
    }

    // Create the outer Card
    return (
        <BlueprintCard
            id={`${flowPrefix}${idExtension}`}
            interactive={true}
            elevation={Elevation.TWO}
            style={{padding: 0, width: "10rem", height: "4rem"}}
        >
            <Card
                id={`${flowPrefix}-card-1${idExtension}`}
                border="warning"
                style={{height: "100%"}}
            >
                <Card.Body
                    id={`${flowPrefix}-card-2${idExtension}`}
                    className="flex justify-center content-center"
                >
                    <EvergreenText
                        id={`${flowPrefix}-text${idExtension}`}
                        className="mr-2"
                    >
                        {NodeTitle}
                    </EvergreenText>
                    <div
                        id={`${flowPrefix}-popover-div${idExtension}`}
                        onMouseDown={(event) => {
                            event.stopPropagation()
                        }}
                    >
                        <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Popover does not have an id property when compiling
                            content={
                                <Card.Body
                                    id={`${flowPrefix}-config${idExtension}`}
                                    className="h-40 text-xs"
                                >
                                    <div
                                        id={`${flowPrefix}-basic-settings-div${idExtension}`}
                                        className="mt-3"
                                    >
                                        {Object.keys(ParameterSet)
                                            .filter((key) => !ParameterSet[key].isAdvanced)
                                            .map((param) => getInputComponent(param))}
                                    </div>
                                    <div
                                        id={`${flowPrefix}-advanced-settings-label-div${idExtension}`}
                                        className="mt-4 mb-2"
                                    >
                                        <EvergreenText id={`${flowPrefix}-advanced-settings-text${idExtension}`}>
                                            <b id={`${flowPrefix}-advanced-settings-label${idExtension}`}>
                                                Advanced settings
                                            </b>{" "}
                                            (most users should not change these)
                                        </EvergreenText>
                                    </div>
                                    <button
                                        id={`${flowPrefix}-show-advanced-settings-button${idExtension}`}
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                    >
                                        {showAdvanced ? (
                                            <u id={`${flowPrefix}-show-advanced-settings${idExtension}`}>Hide</u>
                                        ) : (
                                            <u id={`${flowPrefix}-hide-advanced-settings${idExtension}`}>Show</u>
                                        )}
                                    </button>
                                    <Collapse // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                        // 2/6/23 DEF - Collapse does not have an id property when compiling
                                        in={showAdvanced}
                                        timeout={5}
                                    >
                                        <div
                                            id={`${flowPrefix}-basic-settings-div${idExtension}`}
                                            className="mt-3"
                                        >
                                            {Object.keys(ParameterSet)
                                                .filter((key) => ParameterSet[key].isAdvanced)
                                                .map((param) => getInputComponent(param))}
                                        </div>
                                    </Collapse>
                                </Card.Body>
                            }
                            statelessProps={{
                                height: "800px",
                                width: "1200px",
                                backgroundColor: "ghostwhite",
                            }}
                        >
                            <div
                                id={`${flowPrefix}-show-config${idExtension}`}
                                className="flex"
                            >
                                <button
                                    id={`${flowPrefix}-show-config-button${idExtension}`}
                                    type="button"
                                    className="mt-1"
                                    style={{height: 0}}
                                >
                                    <GrSettingsOption
                                        id={`${flowPrefix}-show-config-button-settings-option${idExtension}`}
                                    />
                                </button>
                            </div>
                        </Popover>
                    </div>
                </Card.Body>
                <div
                    id={`${flowPrefix}-delete-button-div${idExtension}`}
                    className="px-1 my-1"
                    style={{position: "absolute", bottom: "0px", right: "1px"}}
                >
                    <button
                        id={`${flowPrefix}-delete-button${idExtension}`}
                        type="button"
                        className="hover:text-red-700 text-xs"
                        onClick={() => {
                            DeleteNode(NodeID)
                        }}
                    >
                        <AiFillDelete
                            id={`${flowPrefix}-delete-button-fill${idExtension}`}
                            size="15"
                            color="red"
                        />
                    </button>
                </div>
            </Card>
            <Handle
                id={`${flowPrefix}-source-handle${idExtension}`}
                type="source"
                position={HandlePosition.Right}
            />
            <Handle
                id={`${flowPrefix}-target-handle${idExtension}`}
                type="target"
                position={HandlePosition.Left}
            />
        </BlueprintCard>
    )
}

export default ConfigurableNodeComponent
