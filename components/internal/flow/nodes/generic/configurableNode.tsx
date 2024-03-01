import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {Modal} from "antd"
import {Text as EvergreenText, InfoSignIcon, Popover, Position, Tab, Tablist, Tooltip} from "evergreen-ui"
import {Dispatch, FC, MouseEvent as ReactMouseEvent, SetStateAction, useEffect, useState} from "react"
import {Card, Col, Collapse, Container, Row} from "react-bootstrap"
import {AiFillDelete} from "react-icons/ai"
import {GrSettingsOption} from "react-icons/gr"
import {Handle, Position as HandlePosition, NodeProps, Node as RFNode} from "reactflow"

import {BaseParameterType, ConfigurableNodeState, NodeParams} from "./types"
import ConfigNumeric from "../../confignumeric"

// Define an interface for the structure of the node
export interface ConfigurableNodeData {
    // The ID of the nodes. This will be important for applying IDs to form elements.
    // The form elements thus will have IDs like nodeID-formElementType
    readonly NodeID: string

    // For syncing up state with outer containing "flow" component. Once we implement
    // centralized state management, this should no longer be necessary.
    readonly ParentNodeState: ConfigurableNodeState
    readonly SetParentNodeState: Dispatch<SetStateAction<ConfigurableNodeState>>

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number

    // Set of parameters that can be configured for this node
    readonly ParameterSet?: NodeParams

    // Title to be displayed on the node
    readonly NodeTitle?: string

    // idExtension used to set unique Id
    idExtension?: string

    SelectedDataSourceId?: number

    // Optional tab props for multi-tab popovers
    tabs?: {
        title: string
        component: JSX.Element
    }[]

    hideShowAdvanced?: boolean

    enableCAOActions?: boolean
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
    const {
        NodeID,
        ParentNodeState,
        SetParentNodeState,
        DeleteNode,
        GetElementIndex,
        ParameterSet,
        NodeTitle,
        tabs,
        enableCAOActions = false,
    } = data

    // Allows the trash icon to change color when hovered over
    const [trashHover, setTrashHover] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const trashColor = trashHover ? "var(--bs-red)" : null
    const [selectedIndex, setSelectedIndex] = useState(0)

    const handleDelete = (event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        setShowDeleteModal(true)
        Modal.confirm({
            title: (
                <span id={`delete-confirm-${flowPrefix}-title${idExtension}`}>
                    Delete node &quot;{NodeTitle}&quot;?
                </span>
            ),
            content: (
                <span id={`delete-confirm-${flowPrefix}-message${idExtension}`}>
                    The node will be removed permanently{" "}
                    <b id={`bold-tag-${flowPrefix}-${idExtension}`}>along with any associated downstream nodes.</b> This
                    cannot be undone.
                </span>
            ),
            centered: true,
            closable: true,
            okButtonProps: {
                id: `delete-confirm-${flowPrefix}-ok-button${idExtension}`,
            },
            okText: "Delete",
            onOk: async () => {
                DeleteNode(NodeID)
                setShowDeleteModal(false)
            },
            onCancel: () => {
                setShowDeleteModal(false)
            },
            cancelText: "Keep",
            cancelButtonProps: {
                id: `delete-confirm-${flowPrefix}-cancel-button${idExtension}`,
            },
        })
    }

    useEffect(() => {
        const nodeState = {...ParentNodeState}
        nodeState &&
            Object.keys(nodeState.params).forEach((key) => {
                if (nodeState.params[key].value == null) {
                    if (Array.isArray(nodeState.params[key].default_value)) {
                        // If the type has to be a choice, select the first choice
                        nodeState.params[key].value = nodeState.params[key].default_value[0]
                    } else {
                        // If the type is a number, string or a bool
                        // use the default value as the user selected value
                        nodeState.params[key].value = nodeState.params[key].default_value
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
        const paramsCopy = {...ParentNodeState.params}
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
        SetParentNodeState({
            ...ParentNodeState,
            params: paramsCopy,
        })
    }

    const onCheckboxChange = (event, paramName) => {
        /*
        This function is used to update the state of any checkbox parameters
        */
        const {checked} = event.target
        const paramsCopy = {...ParentNodeState.params}
        paramsCopy[paramName].value = checked
        SetParentNodeState({...ParentNodeState, params: paramsCopy})
    }

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `${props.type}-${flowIndex}`
    const defaultParams = ParameterSet

    // For showing advanced configuration settings
    const [showAdvanced, setShowAdvanced] = useState(false)

    function getInputComponent(param) {
        const item = ParameterSet?.[param]
        const paramPrefix = `${flowPrefix}-${param}`
        const parentNodeStateElement = ParentNodeState?.params?.[param]

        return (
            <Container id={`${paramPrefix}-container${idExtension}`}>
                <Row
                    id={`${paramPrefix}-row${idExtension}`}
                    className="mx-2 my-4"
                >
                    <Col
                        id={`${paramPrefix}-param-col${idExtension}`}
                        style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                            width: "875px",
                        }}
                    >
                        <label
                            id={`${paramPrefix}-label${idExtension}`}
                            className="capitalize"
                        >
                            {param}:{" "}
                        </label>

                        {(item.type === BaseParameterType.INT || item?.type === BaseParameterType.FLOAT) && (
                            <ConfigNumeric
                                id={`${paramPrefix}-value${idExtension}`}
                                paramName={param}
                                defaultParam={defaultParams?.[param]}
                                value={
                                    (parentNodeStateElement?.value ?? defaultParams?.[param]?.default_value) as number
                                }
                                onParamChange={(event) => onParamChange(event, param)}
                                style={{width: "100%"}}
                            />
                        )}

                        {item.type === BaseParameterType.BOOLEAN && (
                            <input
                                id={`${paramPrefix}-value${idExtension}`}
                                type="checkbox"
                                checked={Boolean(
                                    parentNodeStateElement?.value ?? defaultParams?.[param]?.default_value
                                )}
                                onChange={(event) => onCheckboxChange(event, param)}
                            />
                        )}

                        {item?.type === BaseParameterType.ENUM && item?.enum && (
                            <select
                                id={`${paramPrefix}-value${idExtension}`}
                                value={(
                                    parentNodeStateElement?.value ?? defaultParams?.[param]?.default_value
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
                                {(parentNodeStateElement?.value ?? defaultParams?.[param]?.default_value)?.toString()}
                            </textarea>
                        )}

                        <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            content={item.description}
                        >
                            <InfoSignIcon
                                id={`${paramPrefix}-tooltip-info-sign-icon${idExtension}`}
                                style={{
                                    flexShrink: 0,
                                }}
                            />
                        </Tooltip>
                    </Col>
                </Row>
            </Container>
        )
    }

    const multiTabComponent = (tabComponents) => (
        <>
            <Tablist
                id={`${flowPrefix}-settings-tablist${idExtension}`}
                marginBottom={16}
                flexBasis={240}
                marginRight={24}
            >
                {tabs?.map(({title}, index) => (
                    <Tab
                        id={`${flowPrefix}-settings-${title}${idExtension}`}
                        key={title}
                        onSelect={() => setSelectedIndex(index)}
                        isSelected={index === selectedIndex}
                        aria-controls={`panel-${title}`}
                    >
                        {title}
                    </Tab>
                ))}
            </Tablist>
            {tabComponents[selectedIndex].component}
        </>
    )

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

    const renderCAOActions = () => (
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
                        {Object.keys(ParentNodeState.caoState.outcome).map((element) => (
                            <div
                                id={`${flowPrefix}-outcomes-div-${element}${idExtension}`}
                                key={element}
                                className="grid grid-cols-2 gap-4 mb-2"
                            >
                                <label
                                    id={`${flowPrefix}-outcomes-label-${element}${idExtension}`}
                                    className="capitalize"
                                >
                                    {" "}
                                    {element}{" "}
                                </label>
                                <input
                                    name={element}
                                    id={`${flowPrefix}-outcomes-input-${element}${idExtension}`}
                                    type="checkbox"
                                    defaultChecked={false}
                                    checked={ParentNodeState.caoState.outcome[element]}
                                    onChange={(event) => onUpdateCAOState(event, "outcome")}
                                />
                            </div>
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
                                tabs?.length ? (
                                    multiTabComponent(tabs)
                                ) : (
                                    <Card.Body
                                        id={`${flowPrefix}-config${idExtension}`}
                                        className="h-45 text-xs"
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
                                            className="mt-4 mb-2 pl-4"
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
                                            className="pl-4"
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
                                                    .filter((key) => ParameterSet?.[key].isAdvanced)
                                                    .map((param) => getInputComponent(param))}
                                            </div>
                                        </Collapse>
                                    </Card.Body>
                                )
                            }
                            statelessProps={{
                                backgroundColor: "ghostwhite",
                                paddingBottom: "12px",
                                overflowY: "scroll",
                                margin: 0,
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
                        {enableCAOActions ? renderCAOActions() : null}
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
                        onClick={(event: ReactMouseEvent<HTMLElement>) => {
                            if (!showDeleteModal) {
                                handleDelete(event)
                            }
                        }}
                    >
                        <AiFillDelete
                            id={`${flowPrefix}-delete-button-fill${idExtension}`}
                            size="15"
                            color={trashColor}
                            onMouseEnter={() => setTrashHover(true)}
                            onMouseLeave={() => setTrashHover(false)}
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
