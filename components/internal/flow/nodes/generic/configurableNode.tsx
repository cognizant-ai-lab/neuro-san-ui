import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {Modal} from "antd"
import {Text as EvergreenText, Popover, Tab, Tablist} from "evergreen-ui"
import {Dispatch, FC, MouseEvent as ReactMouseEvent, SetStateAction, useEffect, useState} from "react"
import {Card, Collapse} from "react-bootstrap"
import {AiFillDelete} from "react-icons/ai"
import {GrSettingsOption} from "react-icons/gr"
import {Handle, Position as HandlePosition, NodeProps, Node as RFNode} from "reactflow"

import CAOButtons from "./CAOButtons"
import NodeConfigPanel from "./NodeConfigPanel"
import {ConfigurableNodeState, NodeParams, NodeTabs} from "./types"
import {DataTagField} from "../../../../../generated/metadata"

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
    tabs?: NodeTabs[]

    enableCAOActions?: boolean

    // Data tag fields that can be passed to predictor nodes for CAO formatting
    dataSourceFields?: {[key: string]: DataTagField}

    // Disables deleting of flow node.
    readonly readOnly: boolean
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
        dataSourceFields,
        readOnly,
    } = data

    // Allows the trash icon to change color when hovered over
    const [trashHover, setTrashHover] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const trashColor = trashHover ? "var(--bs-red)" : null
    const [selectedIndex, setSelectedIndex] = useState(0)
    // For showing advanced configuration settings
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [showConfig, setShowConfig] = useState(false)

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

    const handleShowConfig = (event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        setShowConfig((prevShowConfig) => !prevShowConfig)
    }

    const handleShowAdvanced = (event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        setShowAdvanced(!showAdvanced)

        /*
         ** Increasing the size of the popover doesn't re-render the popover
         ** To trigger a re-render, we'll close and reopen the configuration panel.
         ** The setTimeouts are used to prevent React from batching the state updates.
         */
        setTimeout(() => {
            setShowConfig(false)
        }, 10)

        setTimeout(() => {
            setShowConfig(true)
        }, 20)
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

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `${props.type}-${flowIndex}`

    function getInputComponent(updatedParameterSet) {
        // create the configuration panel
        return (
            <NodeConfigPanel
                id={`${flowPrefix}-container${idExtension}`}
                defaultParams={updatedParameterSet}
                flowPrefix={flowPrefix}
                idExtension={idExtension}
                parentNodeState={ParentNodeState}
                setParentNodeState={SetParentNodeState}
                inputTypes={new Set(["inputs", "showTextArea"])}
                customStyles={{
                    inputsCardHeight: "h-100",
                    inputRowWidth: "w-100",
                    inputCompnentStyles: {
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        width: "875px",
                    },
                }}
            />
        )
    }

    const multiTabComponent = (tabComponentsData) => {
        const tabComponents = tabComponentsData.map((componentData) => {
            const {tabComponentProps, component} = componentData

            if (component) return component
            return (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <NodeConfigPanel
                    id={`${tabComponentProps["id"]}`}
                    defaultParams={ParameterSet}
                    flowPrefix={tabComponentProps.flowPrefix}
                    idExtension={idExtension}
                    parentNodeState={ParentNodeState}
                    setParentNodeState={SetParentNodeState}
                    inputTypes={tabComponentProps.inputTypes}
                    key={`${tabComponentProps["id"]}`}
                />
            )
        })

        return (
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
                {tabComponents[selectedIndex]}
            </>
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
                            isShown={showConfig}
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
                                            {getInputComponent(
                                                Object.keys(ParameterSet)
                                                    .filter((key) => !ParameterSet?.[key].isAdvanced)
                                                    .reduce((res, key) => {
                                                        res[key] = ParameterSet[key]
                                                        return res
                                                    }, {})
                                            )}
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
                                            onClick={handleShowAdvanced}
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
                                                {getInputComponent(
                                                    Object.keys(ParameterSet)
                                                        .filter((key) => ParameterSet?.[key].isAdvanced)
                                                        .reduce((res, key) => {
                                                            res[key] = ParameterSet[key]
                                                            return res
                                                        }, {})
                                                )}
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
                            onClose={() => setShowConfig(false)}
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
                                    onClick={handleShowConfig}
                                >
                                    <GrSettingsOption
                                        id={`${flowPrefix}-show-config-button-settings-option${idExtension}`}
                                    />
                                </button>
                            </div>
                        </Popover>
                        {enableCAOActions ? (
                            // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                            <CAOButtons
                                ParentNodeState={ParentNodeState}
                                SetParentNodeState={SetParentNodeState}
                                flowPrefix={flowPrefix}
                                idExtension={idExtension}
                                fields={dataSourceFields}
                            />
                        ) : null}
                    </div>
                </Card.Body>
                {!readOnly ? (
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
                ) : null}
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
