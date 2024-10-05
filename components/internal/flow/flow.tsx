import {Alert, Tooltip} from "antd"
import dagre from "dagre"
import debugModule from "debug"
import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState} from "react"
import {Button, Container} from "react-bootstrap"
import {SlMagicWand} from "react-icons/sl"
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, {
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    ControlButton,
    Controls,
    EdgeRemoveChange,
    getConnectedEdges,
    getIncomers,
    getOutgoers,
    NodeChange,
    NodeRemoveChange,
    Position,
    ReactFlowInstance,
    ReactFlowProvider,
} from "reactflow"

import {PredictorEdge} from "./edges/predictoredge"
import {PrescriptorEdge} from "./edges/prescriptoredge"
import EdgeTypes, {EdgeType} from "./edges/types"
import {FlowQueries} from "./flowqueries"
import LLMDropdownMenu from "./LLMDropdownMenu"
import {DataSourceNode} from "./nodes/datasourcenode"
import {ConfigurableNode, ConfigurableNodeData} from "./nodes/generic/configurableNode"
import {CAOChecked, ConfigurableNodeState, NodeParams} from "./nodes/generic/types"
import {PrescriptorNode} from "./nodes/prescriptornode"
import NodeTypes, {NodeData, NodeType} from "./nodes/types"
import {getSelectedDataSource} from "./nodes/utils"
import {FlowElementsType} from "./types"
import {UNCERTAINTY_MODEL_PARAMS} from "./uncertaintymodelinfo"
import loadDataTags from "../../../controller/datatag/fetchdatataglist"
import {DataSource, DataTag, DataTagFieldCAOType} from "../../../generated/metadata"
import {TaggedDataInfo} from "../../../pages/projects/[projectID]/experiments/new"
import {useAuthentication} from "../../../utils/authentication"
import {AuthorizationInfo} from "../../../utils/authorization"
import {useStateWithCallback} from "../../../utils/react_utils"
import {NotificationType, sendNotification} from "../../notification"

const debug = debugModule("flow")

/**
 * This interface is used to define the props
 * that the flow expects.
 */
interface FlowProps {
    id: string

    // The project id this experiment belongs to
    ProjectID: number

    // A parent state update handle such that it can
    // update the flow in the parent container.
    SetParentState?: Dispatch<SetStateAction<FlowElementsType>>

    // Flow passed down if it exists.
    Flow?: FlowElementsType

    // If this is set to true, it disables the buttons
    // and the flow from update
    ElementsSelectable: boolean

    // Used to differentiate Id's in drawer vs outside
    idExtension?: string

    // Will be called when user clicks magic wand
    handleMagicWand?: () => void

    // Indicates which CRUD permissions the user has on this Flow
    readonly projectPermissions?: AuthorizationInfo
}

/**
 * This is the main flow component/function. It handles display the experiment graph and allowing the user to
 * update the graph by adding and removing nodes, dragging nodes, zooming in and out etc.
 * Most of the actual work is done by the {@link https://reactflow.dev/|react-flow component}
 * @param props Input props for this component. See {@link FlowProps} interface for details.
 */
export default function Flow(props: FlowProps) {
    const projectId = props.ProjectID

    const idExtension = props.idExtension

    const setParentState = props.SetParentState

    const elementsSelectable = props.ElementsSelectable

    const {data: session} = useAuthentication()
    const currentUser: string = session?.user?.name || ""

    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance>(null)

    const [taggedDataList, setTaggedDataList] = useState<TaggedDataInfo[]>([])
    // for loading data tags
    const [loadingDataTags, setLoadingDataTags] = useState<boolean>(true)

    const [selectedDataSourceId, setSelectedDataSourceId] = useState<number>(null)

    const readOnlyFlow = !props.projectPermissions?.update && !props.projectPermissions?.delete

    // Fetch the Data Sources and the Data Tags
    useEffect(() => {
        async function loadDataTagList() {
            try {
                if (projectId != null) {
                    setLoadingDataTags(true)
                    const taggedDataListTmp: TaggedDataInfo[] = await loadDataTags(currentUser, projectId)
                    if (taggedDataListTmp != null && taggedDataListTmp.length > 0) {
                        setTaggedDataList(taggedDataListTmp)
                        if (!selectedDataSourceId) {
                            setSelectedDataSourceId(Number(taggedDataListTmp[0]?.DataSource?.id))
                        }
                    } else {
                        // This is an internal error. Shouldn't have been able to create a project and an experiment
                        // without having data tags!
                        sendNotification(
                            NotificationType.error,
                            "Failed to load Data tags",
                            `Unable to load data tags for project ${projectId} ` +
                                "due to an internal error. Your experiment " +
                                "may not behave as expected. Please report this to the development team"
                        )
                    }
                }
            } finally {
                setLoadingDataTags(false)
            }
        }

        void loadDataTagList()
    }, [projectId])

    const [initialNodes, initialEdges] = useMemo(() => {
        let initialFlowValue
        if (props.Flow && props.Flow.length > 0) {
            // If we are loading from a persisted flow, we need to add the handlers to the nodes since the handlers
            // do not get persisted.
            const selectedDataSource = getSelectedDataSource(taggedDataList, selectedDataSourceId)
            initialFlowValue = props.Flow.map((node) => {
                switch (node.type) {
                    case "datanode":
                        node.data = {
                            ...node.data,
                            idExtension,
                            readOnlyNode: readOnlyFlow,
                            SelfStateUpdateHandler: DataNodeStateUpdateHandler,
                            taggedDataList,
                        }
                        break
                    case "predictornode":
                        node.data = {
                            ...node.data,
                            idExtension,
                            SetParentNodeState: (state) => ParentNodeSetStateHandler(state, node.id),
                            DeleteNode: (nodeId) => deleteNodeById(nodeId),
                            GetElementIndex: (nodeId) => getElementIndex(nodeId),
                            readOnlyNode: readOnlyFlow,
                            taggedData: selectedDataSource?.LatestDataTag
                                ? DataTag.fromJSON(selectedDataSource.LatestDataTag)
                                : null,
                        }
                        break
                    case "prescriptornode":
                        node.data = {
                            ...node.data,
                            idExtension,
                            SetParentPrescriptorState: (state) => PrescriptorSetStateHandler(state, node.id),
                            DeleteNode: (nodeId) => deleteNodeById(nodeId),
                            GetElementIndex: (nodeId) => getElementIndex(nodeId),
                            readOnlyNode: readOnlyFlow,
                            taggedData: selectedDataSource?.LatestDataTag
                                ? DataTag.fromJSON(selectedDataSource.LatestDataTag)
                                : null,
                        }
                        break
                    case "uncertaintymodelnode":
                        // Backward compatibility -- "uncertaintymodelnode" are now "configurableNode"
                        node.data = {
                            ...node.data,
                            idExtension,
                            SetParentNodeState: (state) => ParentNodeSetStateHandler(state, node.id),
                            DeleteNode: (nodeId) => deleteNodeById(nodeId),
                            GetElementIndex: (nodeId) => getElementIndex(nodeId),

                            // These two have to be added in since nodes in legacy experiments don't have them
                            ParameterSet: UNCERTAINTY_MODEL_PARAMS,
                            NodeTitle: "Uncertainty Model",
                            readOnlyNode: readOnlyFlow,
                        }
                        break
                    case "prescriptoredge":
                        node.data = {
                            ...node.data,
                            idExtension,
                        }
                        break
                    case "activation_node":
                    case "analytics_node":
                    case "category_reducer_node":
                    case "confabulator_node":
                    case "confabulation_node": // legacy
                    case "llmnode": // legacy
                        node.data = {
                            ...node.data,
                            idExtension,
                            SetParentNodeState: (state) => ParentNodeSetStateHandler(state, node.id),
                            DeleteNode: (nodeId) => deleteNodeById(nodeId),
                            GetElementIndex: (nodeId) => getElementIndex(nodeId),
                            readOnlyNode: readOnlyFlow,
                        }
                        break
                    default:
                        // Not a node that we need to modify; let it pass through as-is
                        break
                }

                return node
            })
        } else {
            initialFlowValue = initializeFlow()
        }
        return [FlowQueries.getAllNodes(initialFlowValue), FlowQueries.getAllEdges(initialFlowValue)]
    }, [props.Flow, taggedDataList])

    // The flow is the collection of nodes and edges all identified by a node type and a uuid
    const [nodes, setNodes] = useState<NodeType[]>(FlowQueries.getAllNodes(initialNodes))
    const [edges, setEdges] = useState<EdgeType[]>(initialEdges)

    /**
     * Updates the <code>elementTypeToUuidList</code> state variable, setting any deleted nodes to "deleted" in the
     * list.
     * @param deletedNodes List of nodes that have been deleted
     * @return Nothing, but updates the state of the <code>elementTypeToUuidList</code> variable
     */
    function updateUuidList(deletedNodes: FlowElementsType) {
        // Make a copy
        const uuidListCopy = new Map(elementTypeToUuidList)

        // For all deleted, flag them as "deleted" in the UUID list. This way we don't have to shuffle when items
        // are deleted.
        deletedNodes.forEach((element) => {
            const elementType = String(element.type)
            const itemsForType = uuidListCopy.get(elementType)
            if (itemsForType) {
                const itemIndex = itemsForType.indexOf(element.id)
                if (itemIndex !== -1) {
                    itemsForType[itemIndex] = "deleted"
                    uuidListCopy.set(elementType, itemsForType)
                }
            }
        })

        setElementTypeToUuidList(uuidListCopy)
    }

    /**
     * Removes a given node, and "repairs" the graph by reconnecting the graph to patch the hole
     *
     * Example 1:
     * <pre>
     *     Before:  A -> B -> C -> D
     *
     *     smartDeleteNode(C, nodes, edges, [D])
     *
     *     After: A -> B
     * </pre>
     *
     * Example 2:
     * <pre>
     *     Before: A-> B -> C -> D
     *
     *     smartDeleteNode(B, nodes, edges)
     *
     *     After: A -> C -> D
     *
     *  </pre>
     * @param nodeToDelete The node to delete
     * @param currentNodes The current list of nodes
     * @param currentEdges The current list of edges
     * @param additionalNodesToDelete Any additional nodes that should be deleted along with the specified node
     * @return Nothing, but updates the state of the graph in place
     */
    function smartDeleteNode(
        nodeToDelete: NodeType,
        currentNodes: NodeType[],
        currentEdges: EdgeType[],
        additionalNodesToDelete: FlowElementsType = []
    ) {
        // Make a copy of the graph
        let nodesCopy: NodeType[] = currentNodes.slice()
        let edgesCopy = currentEdges.slice()

        // Record incoming
        const incomingNodes = getIncomers<NodeData, NodeData>(nodeToDelete, nodesCopy, edgesCopy)
        edgesCopy.filter((edge) => edge.target === nodeToDelete.id)

        // Record outgoing
        const outgoingNodes = getOutgoers<NodeData, NodeData>(nodeToDelete, nodesCopy, edgesCopy)
        edgesCopy.filter((edge) => edge.source === nodeToDelete.id)

        // Remove the node and associated edges
        nodesCopy = nodesCopy.filter((node) => node.id !== nodeToDelete.id)
        edgesCopy = edgesCopy.filter((edge) => edge.source !== nodeToDelete.id && edge.target !== nodeToDelete.id)

        // Reconnect the graph
        incomingNodes.forEach((incomingNode) => {
            outgoingNodes.forEach((outgoingNode) => {
                const edge =
                    outgoingNode.type === "prescriptornode"
                        ? getPrescriptorEdge(incomingNode.id, outgoingNode.id)
                        : getGeneralEdge(incomingNode.id, outgoingNode.id)

                edgesCopy.push(edge)
            })
        })

        if (additionalNodesToDelete?.length > 0) {
            additionalNodesToDelete.forEach((node) => {
                nodesCopy = nodesCopy.filter((aNode) => aNode.id !== node.id)
                edgesCopy = edgesCopy.filter((edge) => edge.source !== node.id && edge.target !== node.id)
            })
        }

        // Housekeeping -- update UUID tracking list for deleted nodes
        updateUuidList([nodeToDelete, ...additionalNodesToDelete])

        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
    }

    function deletePrescriptorNode(nodeToDelete: NodeType, currentNodes: NodeType[], currentEdges: EdgeType[]) {
        // Delete Prescriptor node and any associated Activation node
        const activationNodes = FlowQueries.getNodesByType(currentNodes, "activation_node")
        smartDeleteNode(nodeToDelete, currentNodes, currentEdges, activationNodes)
    }

    // Tidy flow when nodes are added or removed
    useEffect(() => {
        tidyView()
        // UN-1135 Make sure fitView is called after ReactFlow finishes rendering.
        flowInstance && setTimeout(flowInstance.fitView, 50)
    }, [nodes.length, edges.length])

    // Initial population of the element type -> uuid list mapping used for simplified testing ids
    const initialMap = FlowQueries.getElementTypeToUuidList(initialNodes, initialEdges)
    debug("initial uuid map: ", initialMap)

    const [elementTypeToUuidList, setElementTypeToUuidList] = useStateWithCallback(initialMap)

    // Part of this function may not be needed anymore if the BE doesn't rely on
    // selectedDataSourceId coming from prescriptor or predictor nodes
    // confirm with Dan after he's back from vacation. File clean up ticket.
    function DataNodeStateUpdateHandler(dataSource: DataSource, dataTag: DataTag) {
        /*
        This handler is used to update the predictor
        and prescriptor nodes with the new data tag
        */

        // Update the selected data source
        setSelectedDataSourceId(Number(dataSource.id))
        setNodes(
            nodes.map((node) => {
                if (node.type === "datanode") {
                    debug("Recreating Data node: ", node.type)
                    node.data = {
                        ...node.data,
                        DataSource: dataSource,
                        DataTag: dataTag,
                    }
                }
                if (node.type === "predictornode" || node.type === "prescriptornode") {
                    debug("Recreating node: ", node.type)
                    node.data = {
                        ...node.data,
                        SelectedDataSourceId: dataSource.id,
                    }
                }
                return node
            })
        )
    }

    function ParentNodeSetStateHandler(newState, NodeID) {
        /*
        Called by nodes to update their state in the flow
         */
        setNodes(
            nodes.map((node) => {
                // If this is the right node
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentNodeState: newState,
                    }
                } else if (node.type === "prescriptornode") {
                    // Update prescriptor with outcomes from all predictors.
                    // NOTE: this is simplified logic since we only support one prescriptor right now, so all predictors
                    // are necessarily connected to it. Will need to revisit this if we ever support multiple
                    // prescriptors.

                    const _node = node as PrescriptorNode

                    // Get all predictors in the experiment except the one that just got updated because the data in
                    // that node is stale. Remember, we are inside the set state handler so the state there
                    // is before the update.
                    const predictors = FlowQueries.getPredictorNodes(nodes).filter((aNode) => aNode.id !== NodeID)

                    // Take the Union of all the checked outcomes on the predictors
                    let checkedOutcomes = FlowQueries.extractCheckedFields(predictors, DataTagFieldCAOType.OUTCOME)

                    // Append the new state outcome
                    if (newState.caoState) {
                        Object.keys(newState.caoState.outcome).forEach((outcome) => {
                            if (newState.caoState.outcome[outcome]) {
                                checkedOutcomes.push(outcome)
                            }
                        })

                        // Remove dupe outcomes
                        checkedOutcomes = checkedOutcomes.filter(
                            (value, index, sourceArray) => sourceArray.indexOf(value) === index
                        )

                        // Convert checkedOutcomes to fitness structure
                        const fitness = checkedOutcomes.map((outcome) => {
                            // Maintain the state if it exists otherwise set maximize to true
                            const maximize = _node.data.ParentPrescriptorState.evolution.fitness
                                .filter((outcomeDict) => outcomeDict.metric_name === outcome)
                                .map((outcomeDict) => outcomeDict.maximize)
                            return {
                                metric_name: outcome,
                                maximize: maximize[0] ?? "true",
                            }
                        })

                        node.data = {
                            ...node.data,
                            ParentPrescriptorState: {
                                ..._node.data.ParentPrescriptorState,
                                evolution: {
                                    ..._node.data.ParentPrescriptorState.evolution,
                                    fitness,
                                },
                            },
                        }
                    }
                }
                return node
            })
        )
    }

    function PrescriptorSetStateHandler(newState, NodeID) {
        /*
        This Handler is supposed to be triggered by a prescriptor node
        to update the data it stores withing itself
        The NodeID parameter is used to bind it to the state
        */

        setNodes(
            nodes.map((node) => {
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentPrescriptorState: newState,
                    }
                }
                return node
            })
        )
    }

    function initializeFlow() {
        /*
        This function resets the graphs and attaches a Data node.
        */
        // Create an empty node list
        const nodesTmp = []

        // Add Data Node. The Data node has a constant ID
        // described by the constant InputDataNodeID. At the moment
        // We only support one data source and thus this suffices.
        // In a later implementation when this has to change, we
        // can describe it otherwise.
        const dataSourceNode: DataSourceNode = {
            id: "root",
            type: "datanode",
            data: {
                ProjectID: projectId,
                SelfStateUpdateHandler: DataNodeStateUpdateHandler,
                idExtension,
                readOnlyNode: readOnlyFlow,
                taggedDataList,
            },
            position: {x: 500, y: 500},
        }
        nodesTmp.push(dataSourceNode)

        return nodesTmp
    }

    /**
     * Constructs a new edge between any node and a prescriptor node. Prescriptor edges are special because
     * they have an output override code block that can be used to override the output of the predictor.
     * @param sourceNodeID ID of the source node
     * @param targetPrescriptorNodeID ID of the target prescriptor node
     * @return The new edge with a random UUID
     */
    function getPrescriptorEdge(sourceNodeID: string, targetPrescriptorNodeID: string): PrescriptorEdge {
        const edgeId = crypto.randomUUID()
        return {
            id: edgeId,
            source: sourceNodeID,
            target: targetPrescriptorNodeID,
            animated: false,
            type: "prescriptoredge",
            data: {
                idExtension,
            },
        }
    }

    /**
     * Generates an edge for connecting any two non-prescriptor nodes in the graph.
     * Despite the name, "predictor edges" are used to connect any two nodes that are not prescriptor nodes.
     * The naming is for legacy reasons.
     *
     * @param sourceNodeID ID of the source node
     * @param targetNodeID ID of the target node
     * @return The new edge with a randomly generated UUID
     */
    function getGeneralEdge(sourceNodeID: string, targetNodeID: string): PredictorEdge {
        return {
            id: crypto.randomUUID(),
            source: sourceNodeID,
            target: targetNodeID,
            animated: false,
            type: "predictoredge",
        }
    }

    function getInitialPredictorState() {
        /*
        This function returns the initial state of the predictor
        */
        const initialCAOState: CAOChecked = {
            context: {},
            action: {},
            outcome: {},
        }
        const predictorParams: NodeParams = {}
        const initialState: ConfigurableNodeState = {
            selectedPredictorType: "regressor",
            selectedPredictor: "",
            selectedMetric: "",
            params: predictorParams,
            caoState: initialCAOState,
            trainSliderValue: 80,
            testSliderValue: 20,
            rngSeedValue: null,
        }

        return initialState
    }

    /**
     * Adds uncertainty model nodes to all predictors in the graph that currently do not have such nodes attached.
     * Predictors that aren't allowed to have uncertainty nodes -- classifiers, multiple outcomes -- are skipped.
     */
    function addUncertaintyModelNodes() {
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes.length === 0) {
            sendNotification(
                NotificationType.warning,
                "Please add at least one predictor before adding uncertainty model nodes."
            )
            return
        }

        // Only add uncertainty nodes to those predictor nodes that currently don't have one and are not classifiers,
        // which do not support the current type of uncertainty nodes. (Once we implement RED, they will.)
        // We also do not support uncertainty nodes for predictors with multiple outcomes
        const predictorsWithoutUncertaintyNodes = predictorNodes
            .filter(
                (node) =>
                    node.data.ParentNodeState.selectedPredictorType !== "classifier" &&
                    getOutgoers<NodeData, ConfigurableNodeData>(node, nodes, edges).every(
                        (aNode) => aNode.type !== "uncertaintymodelnode"
                    ) &&
                    !FlowQueries.hasMultipleOutcomes(node)
            )
            .map((node) => node.id)
        if (predictorsWithoutUncertaintyNodes.length === 0) {
            sendNotification(
                NotificationType.warning,
                "All predictors that support uncertainty model nodes already have such nodes attached " +
                    "and only one such node per predictor is supported.",
                "Note that uncertainty model nodes are not supported for classifier predictors, nor for predictors " +
                    "that predict more than one outcome."
            )
            return
        }

        addUncertaintyNodes(predictorsWithoutUncertaintyNodes)
    }

    function getElementIndex(nodeID: string) {
        /*
        Function used as a means for Flow graph elements to query what their
        per-element index is for creating easier to handle id strings for testing.
        */
        const element = FlowQueries.getNodeByID(nodes, nodeID)
        return FlowQueries.getIndexForElement(elementTypeToUuidList, element)
    }

    function addPredictorNode(currentNodes: NodeType[], currentEdges: EdgeType[]) {
        /*
        This function adds a predictor node to the Graph while supplying
        several constraints.
        1. The predictor nodes are always added as attached to the data source
        node, or after any LLM data nodes attached to the data source
        2. If a prescriptor node exists, the predictor is attached to that node.
        */

        let addAfter = null

        // Locate the data source node
        const dataSourceNodes = FlowQueries.getDataNodes(currentNodes)
        if (dataSourceNodes?.length !== 1) {
            sendNotification(NotificationType.error, "Cannot add Predictor node", "Unable to locate a data source node")
        }

        // Make a copy of the nodes
        const nodesCopy = currentNodes.slice()
        const edgesCopy = currentEdges.slice()

        // If there's an analytics node, add after that
        const analyticsNodes = FlowQueries.getNodesByType(nodes, "analytics_node")
        if (analyticsNodes?.length === 1) {
            addAfter = analyticsNodes[0]
        }

        // If there's a category reducer node, add after that
        if (!addAfter) {
            const categoryReducerNodes = FlowQueries.getNodesByType(nodes, "category_reducer_node")
            if (categoryReducerNodes?.length === 1) {
                addAfter = categoryReducerNodes[0]
            }
        }

        // If there's a confabulator node, add after that
        if (!addAfter) {
            const confabulatorNodes = FlowQueries.getNodesByType(nodes, "confabulator_node")
            if (confabulatorNodes?.length === 1) {
                addAfter = confabulatorNodes[0]
            }
        }

        // If not, add after the data source node
        if (!addAfter) {
            addAfter = dataSourceNodes[0]
        }

        // Create a unique ID
        const predictorNodeID = crypto.randomUUID()

        // Add the Predictor Node
        const maxPredictorNodeY = Math.max(
            ...FlowQueries.getPredictorNodes(nodes).map((node) => node.position.y),
            nodes[0].position.y - 100
        )

        const initialPredictorState = getInitialPredictorState()
        const selectedDataSource = getSelectedDataSource(taggedDataList, selectedDataSourceId)
        nodesCopy.push({
            id: predictorNodeID,
            type: "predictornode",
            data: {
                NodeID: predictorNodeID,
                SelectedDataSourceId: selectedDataSourceId,
                ParentNodeState: initialPredictorState,
                ParameterSet: initialPredictorState.params,
                SetParentNodeState: (state) => ParentNodeSetStateHandler(state, predictorNodeID),
                DeleteNode: (predictorNodeId) => deleteNodeById(predictorNodeId),
                GetElementIndex: (id) => getElementIndex(id),
                idExtension,
                readOnlyNode: readOnlyFlow,
                taggedData: selectedDataSource?.LatestDataTag
                    ? DataTag.fromJSON(selectedDataSource.LatestDataTag)
                    : null,
            },
            position: {
                x: nodes[0].position.x + 250,
                y: maxPredictorNodeY + 100,
            },
        })

        // Add an Edge to the source node
        const edge = getGeneralEdge(addAfter.id, predictorNodeID)
        edgesCopy.push(edge)

        // Check if Prescriptor Node exists
        const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)

        // If there's already a prescriptor node, add edge to that prescriptor node
        if (prescriptorNodes.length !== 0) {
            const prescriptorNode = prescriptorNodes[0]
            const prescriptorEdge = getPrescriptorEdge(predictorNodeID, prescriptorNode.id)
            edgesCopy.push(prescriptorEdge)
        }

        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
        addElementUuid("predictornode", predictorNodeID)
    }

    function getInitialPrescriptorState(fitness) {
        /*
        This function returns the initial prescriptor
        state.
        */
        return {
            network: {
                inputs: [
                    {
                        name: "Context",
                        size: 0,
                        values: ["float"],
                    },
                ],
                hidden_layers: [
                    {
                        layer_name: "hidden_1",
                        layer_type: "dense",
                        layer_params: {
                            units: 16,
                            activation: "tanh",
                            use_bias: true,
                        },
                    },
                ],
                outputs: [
                    {
                        name: "Action",
                        size: 0,
                        activation: "softmax",
                        use_bias: true,
                    },
                ],
            },
            evolution: {
                nb_generations: 40,
                population_size: 10,
                nb_elites: 5,
                parent_selection: "tournament",
                remove_population_pct: 0.8,
                mutation_type: "gaussian_noise_percentage",
                mutation_probability: 0.1,
                mutation_factor: 0.1,
                initialization_distribution: "orthogonal",
                initialization_range: 1,
                fitness: fitness,
            },
            LEAF: {
                representation: "NNWeights",
            },
            caoState: {
                context: {},
                action: {},
                outcome: {},
            },
        }
    }

    function addPrescriptorNode() {
        /*
        This function adds a prescriptor node to the Graph. The only
        requirement for this is that at least one predictor exists.

        For predictor nodes that already have uncertainty nodes attached, the newly added prescriptor node is
        connected to the uncertainty node(s) instead of directly to the predictor.
        */

        // Check if Prescriptor Node exists
        const prescriptorExists = FlowQueries.getPrescriptorNodes(nodes).length !== 0

        // If it already exists, return
        if (prescriptorExists) {
            sendNotification(NotificationType.warning, "Only one prescriptor per experiment is currently supported")
            return
        }

        // Make sure predictor nodes exist, if not alert
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes.length === 0) {
            sendNotification(NotificationType.warning, "Add at least one predictor before adding a prescriptor")
            return
        }

        // If above conditions are satisfied edit the graph
        const nodesCopy = nodes.slice()
        const edgesCopy = edges.slice()

        // Create a unique ID
        const prescriptorNodeID = crypto.randomUUID()

        // Get outcomes from all current predictors to use for prescriptor fitness
        let outcomes = FlowQueries.extractCheckedFields(predictorNodes, DataTagFieldCAOType.OUTCOME)

        // Make this a set
        outcomes = outcomes.filter((value, index, sourceArray) => sourceArray.indexOf(value) === index)

        // Default to maximizing outcomes until user tells us otherwise
        const fitness = outcomes.map((outcome) => ({metric_name: outcome, maximize: true}))

        // Add a Prescriptor Node

        // Figure out a logical x-y location for the new prescriptor node based on existing nodes
        const uncertaintyModelNodes = FlowQueries.getUncertaintyModelNodes(nodes)
        const prescriptorNodeXPos =
            uncertaintyModelNodes.length > 0
                ? uncertaintyModelNodes[uncertaintyModelNodes.length - 1].position.x + 250
                : predictorNodes[predictorNodes.length - 1].position.x + 250
        const prescriptorNodeYPos =
            uncertaintyModelNodes.length > 0 ? uncertaintyModelNodes[0].position.y : predictorNodes[0].position.y
        const selectedDataSource = getSelectedDataSource(taggedDataList, selectedDataSourceId)
        nodesCopy.push({
            id: prescriptorNodeID,
            type: "prescriptornode",
            data: {
                NodeID: prescriptorNodeID,
                SelectedDataSourceId: FlowQueries.getDataNodes(nodes)[0].data.DataSource.id,
                ParentPrescriptorState: getInitialPrescriptorState(fitness),
                SetParentPrescriptorState: (state) => PrescriptorSetStateHandler(state, prescriptorNodeID),
                DeleteNode: (prescriptorNodeId) => deleteNodeById(prescriptorNodeId),
                GetElementIndex: (id) => getElementIndex(id),
                idExtension,
                readOnlyNode: readOnlyFlow,
                taggedData: selectedDataSource?.LatestDataTag
                    ? DataTag.fromJSON(selectedDataSource.LatestDataTag)
                    : null,
            },
            position: {
                x: prescriptorNodeXPos,
                y: prescriptorNodeYPos,
            },
        })

        // Add edges to all the predictor nodes
        predictorNodes.forEach((predictorNode) => {
            const downstreamNodes = getOutgoers<NodeData, ConfigurableNodeData>(predictorNode, nodes, edges)
            if (downstreamNodes && downstreamNodes.length > 0) {
                const downStreamUncertaintyModelNodes = downstreamNodes.filter(
                    (node) => node.type === "uncertaintymodelnode"
                )
                if (downStreamUncertaintyModelNodes && downStreamUncertaintyModelNodes.length === 1) {
                    // should only be one uncertainty model node per predictor!
                    const uncertaintyModelNode = downStreamUncertaintyModelNodes[0]
                    const prescriptorEdge = getPrescriptorEdge(uncertaintyModelNode.id, prescriptorNodeID)
                    edgesCopy.push(prescriptorEdge)
                }
            } else {
                // This predictor has no uncertainty model, so just connect the new prescriptor directly to the
                // predictor.
                const prescriptorEdge = getPrescriptorEdge(predictorNode.id, prescriptorNodeID)
                edgesCopy.push(prescriptorEdge)
            }
        })

        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
        addElementUuid("prescriptornode", prescriptorNodeID)
    }

    // Adds uncertainty model nodes to the specified Predictor(s)
    function addUncertaintyNodes(predictorNodeIDs: string[]): void {
        // Make a copy of the graph
        const nodesCopy = nodes.slice()
        let edgesCopy = edges.slice()
        predictorNodeIDs.forEach((predictorNodeID) => {
            // Find associated predictor for this RIO node
            const predictorNode = FlowQueries.getPredictorNode(nodes, predictorNodeID)
            if (!predictorNode) {
                console.error(`Unable to locate predictor with node ID ${predictorNodeID}`)
                return
            }

            // Only one RIO node allowed per Predictor
            const downstreamNodes = getOutgoers<NodeData, ConfigurableNodeData>(predictorNode, nodes, edges)

            const alreadyHasUncertaintyNode =
                downstreamNodes &&
                downstreamNodes.length > 0 &&
                downstreamNodes.some((node) => node.type === "uncertaintymodelnode")
            if (alreadyHasUncertaintyNode) {
                sendNotification(
                    NotificationType.warning,
                    "This predictor already has an uncertainty model node",
                    "Only one uncertainty model node is allowed per predictor"
                )
                return
            }

            // Check if Prescriptor Node exists
            const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)
            const prescriptorNode = prescriptorNodes && prescriptorNodes.length > 0 ? prescriptorNodes[0] : null

            const uncertaintyNodeXPos = prescriptorNode
                ? (predictorNode.position.x + prescriptorNode.position.x) / 2
                : predictorNode.position.x + 200

            // Create a unique ID
            const uncertaintyNodeID = crypto.randomUUID()

            // Add the uncertainty model node
            const uncertaintyNode: ConfigurableNode = {
                id: uncertaintyNodeID,
                type: "uncertaintymodelnode",
                data: {
                    NodeID: uncertaintyNodeID,
                    ParentNodeState: structuredClone({params: UNCERTAINTY_MODEL_PARAMS}),
                    SetParentNodeState: (state) => ParentNodeSetStateHandler(state, uncertaintyNodeID),
                    DeleteNode: (id) => deleteNodeById(id),
                    GetElementIndex: (id) => getElementIndex(id),
                    ParameterSet: UNCERTAINTY_MODEL_PARAMS,
                    NodeTitle: "Uncertainty Model",
                    idExtension,
                    readOnlyNode: readOnlyFlow,
                },
                position: {
                    x: uncertaintyNodeXPos,
                    y: predictorNode.position.y,
                },
            }
            nodesCopy.push(uncertaintyNode)

            // Now wire up the uncertainty model node in the graph
            // Connect the Predictor to the uncertainty model node
            const newEdge = getGeneralEdge(predictorNode.id, uncertaintyNodeID)
            edgesCopy.push(newEdge)

            // If there's a Prescriptor, connect the new uncertainty model node to that.
            if (prescriptorNode) {
                // Disconnect the existing edge from Predictor to Prescriptor
                const connectedEdges = getConnectedEdges([predictorNode], edges)
                for (const edge of connectedEdges) {
                    if (edge.type === "prescriptoredge") {
                        edgesCopy = edgesCopy.filter((e) => e.id !== edge.id)
                    }
                }

                // Connect the uncertainty model node to the prescriptor
                const prescriptorEdge = getPrescriptorEdge(uncertaintyNodeID, prescriptorNode.id)
                edgesCopy.push(prescriptorEdge)
            }

            addElementUuid("uncertaintymodelnode", uncertaintyNodeID)
        })

        // Save the updated Flow
        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
    }

    function addElementUuid(elementType: string, elementId: string) {
        /*
        Adds a uuid for a particular element type to our indexing map used
        for testing ids.
        */

        // Allow for the list of elementType not to exist just yet
        let uuidList: string[] = []
        if (elementTypeToUuidList.has(elementType)) {
            uuidList = elementTypeToUuidList.get(elementType)
        }
        uuidList.push(elementId)
        elementTypeToUuidList.set(elementType, uuidList)

        setElementTypeToUuidList(elementTypeToUuidList)
    }

    function deleteNodeById(nodeID: string) {
        /*
        Simple "shim" method to allow nodes to delete themselves using their own NodeID, which
        each node knows.
         */
        deleteNode(FlowQueries.getNodeByID(nodes, nodeID), nodes, edges)
    }

    function deletePredictorNode(nodeToDelete: NodeType, currentNodes: NodeType[], currentEdges: EdgeType[]) {
        /*
       Since we supply constraints on how nodes interact, i.e. in an ESP
       fashion we cannot allow deletion of any nodes.
       1. Data Nodes cannot be deleted
       2. If only one predictor exists, deleting that will also delete
       the prescriptor node if it exists.

       Note: This edits the graph inPlace
       */

        const nodesToDelete = [nodeToDelete]

        // Also get the edges associated with this uncertainty node
        const removableEdges = getConnectedEdges(nodesToDelete, currentEdges)

        const predictorNodesBeingRemoved = FlowQueries.getPredictorNodes(nodesToDelete)
        const predictorIdsBeingRemoved = predictorNodesBeingRemoved.map((node) => node.id)

        const uncertaintyNodesBeingRemoved = FlowQueries.getUncertaintyModelNodes(nodesToDelete)

        const prescriptorNodes = FlowQueries.getPrescriptorNodes(currentNodes)

        // If we're deleting a predictor, delete associated Uncertainty nodes connected to this predictor
        if (predictorIdsBeingRemoved && predictorIdsBeingRemoved.length > 0) {
            const uncertaintyNodesToRemove = predictorNodesBeingRemoved.flatMap<ConfigurableNode>(
                (node) =>
                    getOutgoers<NodeData, ConfigurableNodeData>(node, currentNodes, currentEdges).filter(
                        (aNode) => aNode.type === "uncertaintymodelnode"
                    ) as ConfigurableNode[]
            )
            nodesToDelete.push(...uncertaintyNodesToRemove)
            // Also get the edges associated with this uncertainty node
            removableEdges.push(...getConnectedEdges(uncertaintyNodesToRemove, currentEdges))
        }

        // If this delete will remove all predictors, also delete the prescriptor and any associated activation LLM node
        const newEdges = currentEdges
        let newNodes = currentNodes
        const numPredictorNodesLeft =
            FlowQueries.getPredictorNodes(currentNodes).length - predictorIdsBeingRemoved.length
        if (numPredictorNodesLeft === 0) {
            nodesToDelete.push(...prescriptorNodes)

            const activationNodes = FlowQueries.getNodesByType(currentNodes, "activation_node") as NodeType[]
            if (activationNodes?.length === 1) {
                nodesToDelete.push(activationNodes[0])
            }
        } else {
            // Also if the removable elements have predictor nodes we
            // need to clean up their outcomes from showing in the prescriptor
            const predictorsLeft = currentNodes.filter(
                (node) => node.type === "predictornode" && !predictorIdsBeingRemoved.includes(node.id)
            ) as ConfigurableNode[]

            // Connect any remaining predictors to the prescriptor
            if (uncertaintyNodesBeingRemoved && prescriptorNodes && prescriptorNodes.length > 0) {
                const predictorNodesWithUncertaintyNodesBeingRemoved = uncertaintyNodesBeingRemoved.flatMap((node) =>
                    getIncomers<NodeData, ConfigurableNodeData>(node, currentNodes, currentEdges).filter(
                        (aNode) => aNode.type === "predictornode"
                    )
                )
                for (const node of predictorNodesWithUncertaintyNodesBeingRemoved) {
                    newEdges.push(getPrescriptorEdge(node.id, prescriptorNodes[0].id))
                }
            }

            // Get outcomes from all current predictors to use for prescriptor fitness
            let outcomes = FlowQueries.extractCheckedFields(predictorsLeft, DataTagFieldCAOType.OUTCOME)

            // Make this a set
            outcomes = outcomes.filter((value, index, sourceArray) => sourceArray.indexOf(value) === index)

            // Default to maximizing outcomes until user tells us otherwise
            const fitness = outcomes.map((outcome) => ({metric_name: outcome, maximize: true}))

            newNodes = currentNodes.map((singleNode) => {
                const prescriptorNode = singleNode as PrescriptorNode
                if (singleNode.type === "prescriptornode") {
                    prescriptorNode.data = {
                        ...prescriptorNode.data,
                        ParentPrescriptorState: {
                            ...prescriptorNode.data.ParentPrescriptorState,
                            evolution: {
                                ...prescriptorNode.data.ParentPrescriptorState.evolution,
                                fitness,
                            },
                        },
                    }
                }
                return prescriptorNode
            })
        }

        // Update the uuid index map for testing ids
        updateUuidList(nodesToDelete)

        // Construct a list of changes
        const nodeChanges = nodesToDelete.map<NodeRemoveChange>((element) => ({
            type: "remove",
            id: element.id,
        }))

        const remainingNodes = applyNodeChanges<NodeData>(nodeChanges, newNodes) as NodeType[]

        const edgeChanges = removableEdges.map<EdgeRemoveChange>((element) => ({
            type: "remove",
            id: element.id,
        }))

        const remainingEdges = applyEdgeChanges(edgeChanges, newEdges) as EdgeType[]

        // Update the flow, removing the deleted nodes
        setNodes(remainingNodes)
        setEdges(remainingEdges)
        setParentState([...remainingNodes, ...remainingEdges])
    }

    /**
     * Deletes the specified node from the graph.
     *
     * Since this represents an experiment, we have to enforce certain rules
     *      1. Data Nodes cannot be deleted
     *      2. If only one predictor exists, deleting that will also delete the prescriptor node if it exists.
     *
     *
     * @param nodeToDelete The node to delete from the graph
     * @param currentNodes The current list of nodes in the graph
     * @param currentEdges The current list of edges in the graph
     * @return Nothing: does its work by modifying the nodes and edges of the graph in place
     */
    function deleteNode(nodeToDelete: NodeType, currentNodes: NodeType[], currentEdges: EdgeType[]) {
        switch (nodeToDelete.type) {
            case "datanode":
                sendNotification(
                    NotificationType.warning,
                    "Data nodes cannot be deleted.",
                    "In order to use a different data node, create a new experiment with the required data source."
                )
                break
            case "predictornode":
                deletePredictorNode(nodeToDelete, currentNodes, currentEdges)
                break
            case "prescriptornode":
                deletePrescriptorNode(nodeToDelete, currentNodes, currentEdges)
                break
            case "uncertaintymodelnode":
            case "category_reducer_node":
            case "analytics_node":
            case "activation_node":
            case "confabulator_node":
            case "confabulation_node":
            case "llmnode":
                smartDeleteNode(nodeToDelete, currentNodes, currentEdges)
                break
            default:
                // Unknown node type -- do nothing
                sendNotification(
                    NotificationType.warning,
                    "Internal error: attempting to delete unknown node type",
                    `Unknown node type ${nodeToDelete.type}`
                )
                console.error(`Unknown node type ${nodeToDelete.type}`)
        }
    }

    function onNodeDragStop(_event, node) {
        /*
        This event handler is called when a user moves a node in the flow such as data node, predictor node or
        prescriptor node.
        It is only called when the user finishes moving the node. It updates the current state with the new position
        for the dragged node.
         */
        const nodesCopy = nodes.slice()

        // Locate which node was moved
        const movedNode = nodesCopy.find((n) => n.id === node.id)
        if (movedNode) {
            // Only update if we found the node. There should be no circumstances where the node is not found here
            // since we're in the event handler for the node itself, but just to be careful.
            movedNode.position = node.position
            setNodes(nodesCopy)
        }
    }

    function onLoad(reactFlowInstance) {
        /*
        Helper function to adjust the flow when it is loaded.
        */
        reactFlowInstance.fitView()
        setFlowInstance(reactFlowInstance)
    }

    useEffect(() => {
        setParentState && setParentState([...nodes, ...edges])
    }, [nodes, edges])

    /**
     * Tidies up the experiment graph using the "dagr" library
     * See example {@link https://reactflow.dev/docs/examples/layout/dagre/|here}
     */
    function tidyView() {
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))

        // Configure for left-to-right layout
        dagreGraph.setGraph({rankdir: "LR"})

        const nodeWidth = 250
        const nodeHeight = 36

        // Don't want to update nodes directly in existing flow so make a copy
        const nodesTmp = nodes.slice()

        nodesTmp.forEach((node) => {
            dagreGraph.setNode(node.id, {width: nodeWidth, height: nodeHeight})
        })

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target)
        })

        dagre.layout(dagreGraph)

        // Convert dagre's layout to what our flow graph needs
        nodesTmp.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id)
            node.targetPosition = Position.Left
            node.sourcePosition = Position.Right

            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            node.position = {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            }
        })

        // Align nodes by type -- dagre cannot do this for us as it has no concept of node types. But we want
        // predictors to align together etc. For now, aligning predictors is enough since uncertainty nodes will
        // naturally already be aligned, and there can only be one prescriptor node currently.
        const predictorNodes = FlowQueries.getPredictorNodes(nodesTmp)
        if (predictorNodes.length > 1) {
            const minX = Math.min(...predictorNodes.map((node) => node.position.x))
            predictorNodes.forEach((node) => {
                node.position.x = minX
            })
        }

        // Update flow with new tidied nodes and fit to view
        setNodes(nodesTmp)
    }

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        // Get the Id of the data node
        const dataNode = FlowQueries.getDataNodes(nodes)[0]
        if (changes.some((change) => change.type === "remove" && change.id === dataNode.id)) {
            // If the node being removed is a data node, then we do not remove it
            return
        }
        setNodes((ns) => applyNodeChanges<NodeData>(changes, ns) as NodeType[])
    }, [])
    const onEdgesChange = useCallback((changes) => setEdges((es) => applyEdgeChanges(changes, es)), [])

    function getFlowButtons() {
        const selectedDataSource = getSelectedDataSource(taggedDataList, selectedDataSourceId)
        return (
            <div
                id="flow-buttons"
                className="grid grid-cols-4 gap-4 mb-4"
            >
                <Button
                    id="add_predictor_btn"
                    size="sm"
                    onClick={() => addPredictorNode(nodes, edges)}
                    type="button"
                >
                    Add Predictor
                </Button>
                <Button
                    id="add_uncertainty_model_btn"
                    size="sm"
                    onClick={() => addUncertaintyModelNodes()}
                    type="button"
                >
                    Add Uncertainty Model
                </Button>
                <Button
                    id="add_prescriptor_btn"
                    size="sm"
                    onClick={() => addPrescriptorNode()}
                    type="button"
                >
                    Add Prescriptor
                </Button>
                <LLMDropdownMenu // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    deleteNodeById={deleteNodeById}
                    getPrescriptorEdge={getPrescriptorEdge}
                    getGeneralEdge={getGeneralEdge}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    setParentState={setParentState}
                    addElementUuid={addElementUuid}
                    ParentNodeSetStateHandler={ParentNodeSetStateHandler}
                    nodes={nodes}
                    getElementIndex={getElementIndex}
                    idExtension={idExtension}
                    readOnlyNode={readOnlyFlow}
                    loadingDataTags={loadingDataTags}
                    edges={edges}
                    dataTagfields={selectedDataSource?.LatestDataTag?.fields}
                />
            </div>
        )
    }

    function getFlow() {
        return (
            <div
                id="react-flow-div"
                style={{width: "100%", height: "50vh"}}
            >
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <ReactFlowProvider>
                    <ReactFlow
                        id="react-flow"
                        nodes={[...nodes]} // Ensure flow updates on initial load
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodesDelete={(nodesToDelete) => deleteNode(nodesToDelete[0], nodes, edges)}
                        onConnect={void 0} // Prevent user manually connecting nodes
                        onInit={(instance) => onLoad(instance)}
                        snapToGrid={true}
                        snapGrid={[10, 10]}
                        nodeTypes={NodeTypes}
                        edgeTypes={EdgeTypes}
                        onNodeDragStop={onNodeDragStop}
                        fitView
                        preventScrolling={false}
                        nodesDraggable={true}
                    >
                        <Controls
                            id="react-flow-controls"
                            style={{
                                position: "absolute",
                                top: "0px",
                                left: "0px",
                            }}
                            showInteractive={true}
                            onFitView={() => tidyView()}
                        >
                            <Tooltip
                                id="magic-wand-tooltip"
                                title="Use a powerful LLM to analyze your experiment and suggest improvements"
                            >
                                {props.handleMagicWand && (
                                    <ControlButton
                                        id="magic-wand"
                                        onClick={props.handleMagicWand}
                                        className="pulsing-button"
                                    >
                                        <SlMagicWand
                                            id="magic-wand-icon"
                                            color="black"
                                            strokeWidth={10}
                                            size={20}
                                        />
                                    </ControlButton>
                                )}
                            </Tooltip>
                        </Controls>
                        {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                        <Background
                            color="#000048"
                            gap={5}
                        />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        )
    }

    const propsId = props.id

    return (
        <Container
            id={propsId}
            className="mt-5"
        >
            {/* Only render buttons if ElementsSelectable is true and readOnly is, meaning Flow is editable */}
            {elementsSelectable && !readOnlyFlow && getFlowButtons()}
            {readOnlyFlow ? (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    type="error"
                    message={
                        <span
                            id="no-permissions-alert"
                            style={{fontSize: "x-large", color: "inherit"}}
                        >
                            🔒 You do not have the required permissions to make changes to this experiment.
                        </span>
                    }
                    showIcon={true}
                    style={{marginBottom: "1rem"}}
                />
            ) : null}

            {/*Get the flow diagram itself*/}
            {getFlow()}
        </Container>
    )
}
