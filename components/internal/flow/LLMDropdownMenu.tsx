import InfoIcon from "@mui/icons-material/Info"
import {Box, Button, Menu} from "@mui/material"
import MenuItem from "@mui/material/MenuItem"
import Tooltip from "@mui/material/Tooltip"
import {Dispatch, MouseEvent as ReactMouseEvent, SetStateAction, useState} from "react"
import {getOutgoers} from "reactflow"

import {PredictorEdge} from "./edges/predictoredge"
import {PrescriptorEdge} from "./edges/prescriptoredge"
import {EdgeType} from "./edges/types"
import {FlowQueries} from "./flowqueries"
import {
    ACTIVATION_NODE_PARAMS,
    ANALYTICS_NODE_PARAMS,
    CATEGORY_REDUCER_NODE_PARAMS,
    CONFABULATOR_NODE_PARAMS,
} from "./llmInfo"
import {ConfigurableNode} from "./nodes/generic/configurableNode"
import {NodeData, NodeType} from "./nodes/types"
import {FlowElementsType} from "./types"
import {DataTagField, DataTagFieldValued} from "../../../generated/metadata"
import {NotificationType, sendNotification} from "../../notification"

type LLMDropDownPropsType = {
    deleteNodeById: (nodeID: string) => void
    getPrescriptorEdge: (sourceNodeID: string, targetPrescriptorNodeID: string) => PrescriptorEdge
    getGeneralEdge: (sourceNodeID: string, targetNodeID: string) => PredictorEdge
    setNodes: Dispatch<SetStateAction<NodeType[]>>
    setEdges: Dispatch<SetStateAction<EdgeType[]>>
    setParentState: Dispatch<SetStateAction<FlowElementsType>>
    addElementUuid: (elementType: string, elementId: string) => void
    ParentNodeSetStateHandler: (newState: object, NodeID: string) => void
    nodes: NodeType[]
    getElementIndex: (nodeID: string) => number
    idExtension: string
    readOnlyNode: boolean
    edges: EdgeType[]
    dataTagfields: {[key: string]: DataTagField}
    enableConfabAndCatReducerLLM?: boolean // See UN-2783
}

const LLMDropdownMenu = ({
    deleteNodeById,
    getPrescriptorEdge,
    getGeneralEdge,
    setNodes,
    setEdges,
    setParentState,
    addElementUuid,
    ParentNodeSetStateHandler,
    nodes,
    getElementIndex,
    idExtension,
    readOnlyNode,
    edges,
    dataTagfields,
    enableConfabAndCatReducerLLM = false,
}: LLMDropDownPropsType) => {
    // For setting the position of the MUI popup menu for the LLMs
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    // For determining if the menu is open. If anchorEl is not null, the menu is open.
    const menuOpen = anchorEl != null

    /**
     * Adds any node after the specified node, and rewires the graph accordingly.
     *
     * Example:
     * <pre>
     *     Before:  A -> B -> C
     *                   |
     *                   +--> D
     *
     *     smartAddNode(X, B, edges)
     *
     *     After: A -> B -> X -> C
     *                      |
     *                      +--> D
     *  </pre>
     *
     * @param nodeToAdd New node to be added
     * @param addAfter Node after which the new node should be added
     * @param currentNodes Current nodes in the graph
     * @param currentEdges Current edges in the graph
     * @param connectToNode If specified, the new node will be connected to this node
     * @return Nothing, but updates the state of the graph in place
     */
    const smartAddNode = (
        nodeToAdd: NodeType,
        addAfter: NodeType,
        currentNodes: NodeType[],
        currentEdges: EdgeType[],
        connectToNode?: NodeType
    ) => {
        // Make a copy of the graph
        const nodesCopy: NodeType[] = currentNodes.slice()
        let edgesCopy = currentEdges.slice()

        // First, record what addAfter node is connected to
        const addAfterOutgoing = getOutgoers<NodeData, NodeData>(addAfter, currentNodes, currentEdges)

        // Remove existing outgoing edges of addAfter node
        edgesCopy = edgesCopy.filter((edge) => edge.source !== addAfter.id)

        // Add edge from addAfter node to new node
        const edge =
            nodeToAdd.type === "prescriptornode"
                ? getPrescriptorEdge(addAfter.id, nodeToAdd.id)
                : getGeneralEdge(addAfter.id, nodeToAdd.id)
        edgesCopy.push(edge)

        // Connect new node to whatever addAfter node used to be connected to (if anything)
        addAfterOutgoing.forEach((targetNode) => {
            const newEdge =
                targetNode.type === "prescriptornode"
                    ? getPrescriptorEdge(nodeToAdd.id, targetNode.id)
                    : getGeneralEdge(nodeToAdd.id, targetNode.id)
            edgesCopy.push(newEdge)
        })

        // If specified, connect new node to the specified node
        if (connectToNode) {
            const newEdge =
                connectToNode.type === "prescriptornode"
                    ? getPrescriptorEdge(nodeToAdd.id, connectToNode.id)
                    : getGeneralEdge(nodeToAdd.id, connectToNode.id)
            edgesCopy.push(newEdge)
        }

        // Add the new node
        nodesCopy.push(nodeToAdd)

        // Update graph
        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])

        // Record ID for testing
        addElementUuid(nodeToAdd.type, nodeToAdd.id)
    }

    /**
     * @param shortId
     * @param itemDescription
     * @param itemName
     */
    const getLlmMenuItem = (shortId: string, itemDescription: string, itemName: string) => (
        <div
            id={`${shortId}-div`}
            style={{display: "flex"}}
        >
            {itemName}
            <Tooltip
                id={`${shortId}-tooltip`}
                title={itemDescription}
            >
                <span id={`${shortId}-icon-span`}>
                    <InfoIcon
                        id={`${shortId}-info-icon`}
                        sx={{width: "0.75rem", height: "0.75rem", marginLeft: "0.5rem"}}
                    />
                </span>
            </Tooltip>
        </div>
    )

    const addActivationLlm = (currentNodes: NodeType[], currentEdges: EdgeType[]) => {
        // Only one LLM of this type allowed per experiment
        const hasActivationNodes = FlowQueries.getNodesByType(nodes, "activation_node").length > 0
        if (hasActivationNodes) {
            sendNotification(
                NotificationType.warning,
                "Unable to add activation LLM node",
                "Only one activation LLM node is allowed per experiment and this experiment already has an " +
                    "activation LLM node."
            )
            return
        }

        const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)
        if (!prescriptorNodes || prescriptorNodes.length === 0) {
            // No prescriptor node or more than one prescriptor node -- can't add LLM
            sendNotification(
                NotificationType.warning,
                "Cannot add activation LLM node",
                "A prescriptor node must be added before adding an activation LLM node"
            )
            return
        }

        const prescriptorNode = prescriptorNodes[0]
        // Add Activation LLM after prescriptor

        // Create a unique ID
        const actuationLlmNodeID = crypto.randomUUID()

        // LLM after prescriptor
        const actuationLlmNode: ConfigurableNode = {
            id: actuationLlmNodeID,
            type: "activation_node",
            data: {
                NodeID: actuationLlmNodeID,
                ParentNodeState: structuredClone({params: ACTIVATION_NODE_PARAMS}),
                SetParentNodeState: (state) => ParentNodeSetStateHandler(state, actuationLlmNodeID),
                DeleteNode: (nodeID) => deleteNodeById(nodeID),
                GetElementIndex: (nodeID) => getElementIndex(nodeID),
                ParameterSet: ACTIVATION_NODE_PARAMS,
                NodeTitle: "Activation LLM",
                idExtension,
                readOnlyNode,
            },
            position: {
                x: prescriptorNode.position.x + 200,
                y: prescriptorNode.position.y,
            },
        }

        smartAddNode(actuationLlmNode, prescriptorNode, currentNodes, currentEdges)
    }

    const addAnalyticsLlm = (currentNodes: NodeType[], currentEdges: EdgeType[]) => {
        // Only one LLM of this type allowed per experiment
        const hasAnalyticsNodes = FlowQueries.getNodesByType(nodes, "analytics_node")?.length > 0
        if (hasAnalyticsNodes) {
            sendNotification(
                NotificationType.warning,
                "Unable to add Analytics LLM node",
                "Only one Analytics LLM node is allowed per experiment and this experiment already has an " +
                    "Analytics LLM node."
            )
            return
        }

        let addAfter = null

        // By default, add after the data source node
        const dataSourceNodes = FlowQueries.getDataNodes(nodes)
        if (dataSourceNodes && dataSourceNodes.length === 1) {
            addAfter = dataSourceNodes[0]
        }

        // If there's a category reducer node, add after that
        const categoryReducerNodes = FlowQueries.getNodesByType(nodes, "category_reducer_node")
        if (categoryReducerNodes && categoryReducerNodes.length === 1) {
            addAfter = categoryReducerNodes[0]
        } else {
            // If there's a confabulator node, add after that
            const confabulatorNodes = FlowQueries.getNodesByType(nodes, "confabulator_node")
            if (confabulatorNodes && confabulatorNodes.length === 1) {
                addAfter = confabulatorNodes[0]
            }
        }

        if (!addAfter) {
            sendNotification(
                NotificationType.warning,
                "Cannot add analytics LLM node",
                "A data node must be added before adding an analytics LLM node"
            )
            return
        }

        // Create new node
        const analyticsNodeID = crypto.randomUUID()
        const analyticsNode: NodeType = {
            id: analyticsNodeID,
            type: "analytics_node",
            data: {
                NodeID: analyticsNodeID,
                ParentNodeState: structuredClone({params: ANALYTICS_NODE_PARAMS}),
                SetParentNodeState: (state) => ParentNodeSetStateHandler(state, analyticsNodeID),
                DeleteNode: (id) => deleteNodeById(id),
                GetElementIndex: (id) => getElementIndex(id),
                ParameterSet: ANALYTICS_NODE_PARAMS,
                NodeTitle: "Analytics LLM",
                idExtension,
                readOnlyNode,
            },
            position: {x: addAfter.position.x + 250, y: addAfter.position.y},
        }

        smartAddNode(analyticsNode, addAfter, currentNodes, currentEdges)
    }

    const addCategoryReducerLLM = (currentNodes: NodeType[], currentEdges: EdgeType[]) => {
        // Only one LLM of this type allowed per experiment
        const hasCategoryReducerNodes = FlowQueries.getNodesByType(nodes, "category_reducer_node")?.length > 0
        if (hasCategoryReducerNodes) {
            sendNotification(
                NotificationType.warning,
                "Unable to add Category Reducer LLM node",
                "Only one Category Reducer LLM node is allowed per experiment and this experiment already has a " +
                    "Category Reducer LLM node."
            )
            return
        }

        let addAfter = null

        // Get data source node
        const dataSourceNodes = FlowQueries.getDataNodes(currentNodes)
        if (dataSourceNodes?.length !== 1) {
            sendNotification(NotificationType.error, "Cannot add Predictor node", "Unable to locate a data source node")
        }

        // If there's a confabulator node, add after that
        const confabulatorNodes = FlowQueries.getNodesByType(nodes, "confabulator_node")
        if (confabulatorNodes?.length === 1) {
            addAfter = confabulatorNodes[0]
        }

        // If not, add after the data source node
        if (!addAfter) {
            addAfter = dataSourceNodes[0]
        }

        if (!addAfter) {
            sendNotification(
                NotificationType.warning,
                "Cannot add Category Reducer node",
                "Unable to locate a suitable node to connect the Category Reducer node to"
            )
            return
        }

        // Create new node
        const categoryReducerNodeID = crypto.randomUUID()
        const categoryReducerNode: NodeType = {
            id: categoryReducerNodeID,
            type: "category_reducer_node",
            data: {
                NodeID: categoryReducerNodeID,
                ParentNodeState: structuredClone({params: CATEGORY_REDUCER_NODE_PARAMS}),
                SetParentNodeState: (state) => ParentNodeSetStateHandler(state, categoryReducerNodeID),
                DeleteNode: (id) => deleteNodeById(id),
                GetElementIndex: (id) => getElementIndex(id),
                ParameterSet: CATEGORY_REDUCER_NODE_PARAMS,
                NodeTitle: "Category Reducer LLM",
                idExtension,
                readOnlyNode,
            },
            position: {x: addAfter.position.x + 250, y: addAfter.position.y},
        }

        smartAddNode(categoryReducerNode, addAfter, currentNodes, currentEdges)
    }

    const addConfabulatorNode = (currentNodes: NodeType[], currentEdges: EdgeType[]) => {
        // Only one LLM of this type allowed per experiment
        const hasConfabulatorNodes = FlowQueries.getNodesByType(nodes, "confabulator_node")?.length > 0
        if (hasConfabulatorNodes) {
            sendNotification(
                NotificationType.warning,
                "Unable to add confabulator LLM node",
                "Only one confabulator LLM node is allowed per experiment and this experiment already has a " +
                    "confabulator LLM node."
            )
            return
        }

        // Locate data node
        const dataNodes = FlowQueries.getDataNodes(currentNodes)
        if (!dataNodes || dataNodes.length !== 1) {
            // No data node or more than one data node -- can't add LLM
            sendNotification(
                NotificationType.warning,
                "Cannot add confabulator LLM node",
                `There must be exactly one data node in the experiment but there are ${dataNodes?.length}`
            )
            return
        }

        // Confabulator node goes after data node
        const dataNode = dataNodes[0]

        // Create a unique ID
        const confabulatorNodeID = crypto.randomUUID()

        // Create new node
        const confabulatorNode = {
            id: confabulatorNodeID,
            type: "confabulator_node",
            data: {
                NodeID: confabulatorNodeID,
                ParentNodeState: structuredClone({params: CONFABULATOR_NODE_PARAMS}),
                SetParentNodeState: (state) => ParentNodeSetStateHandler(state, confabulatorNodeID),
                DeleteNode: (id) => deleteNodeById(id),
                GetElementIndex: (id) => getElementIndex(id),
                ParameterSet: CONFABULATOR_NODE_PARAMS,
                NodeTitle: "Confabulator LLM",
                idExtension,
                readOnlyNode,
            },
            position: {
                x: dataNode.position.x + 250,
                y: dataNode.position.y,
            },
        }

        smartAddNode(confabulatorNode, dataNode, currentNodes, currentEdges)
    }

    const dataTagFieldHasNaN = (dataTagFields) =>
        dataTagFields && Object.keys(dataTagFields)?.some((field) => dataTagFields[field].has_nan)

    const dataTagFieldHasCategoricalValue = (dataTagFields) =>
        dataTagFields &&
        Object.keys(dataTagFields)?.some((field) => dataTagFields[field].valued === DataTagFieldValued.CATEGORICAL)
    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
        setAnchorEl(null)
    }

    return (
        <Box id="add-llm-dropdown">
            <Button
                id="dropdown-basic"
                sx={{color: "white", width: "100%", height: "1.75rem"}}
                onClick={handleClick}
            >
                Add LLM ▼
            </Button>

            <Menu
                id="llm-dropdown-menu"
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        style: {
                            width: anchorEl?.clientWidth,
                        },
                    },
                }}
            >
                <MenuItem
                    id="add-activation-llm-btn"
                    value="activation"
                    onClick={() => addActivationLlm(nodes, edges)}
                >
                    {getLlmMenuItem(
                        "activation",
                        "Maps the intent of the prescriptor to front-end interactions and back-end and model API calls",
                        "Activation"
                    )}
                </MenuItem>
                <MenuItem
                    id="add-analytics-llm-btn"
                    value="analytics"
                    onClick={() => addAnalyticsLlm(nodes, edges)}
                >
                    {getLlmMenuItem(
                        "analytics",
                        "Helps data scientists analyze the data with smart, LLM-enabled queries",
                        "Analytics"
                    )}
                </MenuItem>
                {enableConfabAndCatReducerLLM && dataTagFieldHasCategoricalValue(dataTagfields) && (
                    <MenuItem
                        id="add-category-reducer-llm-btn"
                        value="category-reducer"
                        onClick={() => addCategoryReducerLLM(nodes, edges)}
                    >
                        {getLlmMenuItem(
                            "category-reducer",
                            "Attempts to reduce the number of categories in categorical fields intelligently by " +
                                "using an LLM. For example, a field that contains categories 'carrot', " +
                                "'onion', and 'pea' might be reduced to 'vegetable'",
                            "Category reducer"
                        )}
                    </MenuItem>
                )}
                {enableConfabAndCatReducerLLM && dataTagFieldHasNaN(dataTagfields) && (
                    <MenuItem
                        id="add-confabulator-llm-btn"
                        value="confabulator"
                        onClick={() => addConfabulatorNode(nodes, edges)}
                    >
                        {getLlmMenuItem(
                            "confabulator",
                            "Confabulates (synthesizes) missing data using an LLM to provide reasonable values, " +
                                "based on the values in the rest of your data set",
                            "Confabulator"
                        )}
                    </MenuItem>
                )}
            </Menu>
        </Box>
    )
}

export default LLMDropdownMenu
