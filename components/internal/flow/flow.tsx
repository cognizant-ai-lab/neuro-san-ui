import dagre from "dagre"
// eslint-disable-next-line import/no-named-as-default
import Debug from "debug"
import {useRouter} from "next/router"
import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState} from "react"
import {Button, Container} from "react-bootstrap"
import uuid from "react-uuid"
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, {
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    Controls,
    EdgeRemoveChange,
    getConnectedEdges,
    getIncomers,
    getOutgoers,
    NodeChange,
    NodeRemoveChange,
    Position,
    ReactFlowInstance,
    ReactFlowProvider
} from "reactflow"

import {PrescriptorEdge} from "./edges/prescriptoredge"
import EdgeTypes, {EdgeType} from "./edges/types"
import {FlowQueries} from "./flowqueries"
import {LLM_MODEL_PARAMS2, LLM_MODEL_PARAMS3, LLM_MODEL_PARAMS_CATEGORY_REDUCER, LLM_MODEL_PARAMS_DATA_LLM} from "./llmInfo"
import {DataSourceNode} from "./nodes/datasourcenode"
import {ConfigurableNode, ConfigurableNodeData} from "./nodes/generic/configurableNode"
import {NodeParams} from "./nodes/generic/types"
import {CAOChecked, PredictorNode, PredictorNodeData, PredictorState} from "./nodes/predictornode"
import {PrescriptorNode} from "./nodes/prescriptornode"
import NodeTypes, {NodeData, NodeType} from "./nodes/types"
import {PredictorParams} from "./predictorinfo"
import {FlowElementsType} from "./types"
import {UNCERTAINTY_MODEL_PARAMS} from "./uncertaintymodelinfo"
import {EvaluateCandidateCode, MaximumBlue, OutputOverrideCode} from "../../../const"
import {DataSource} from "../../../controller/datasources/types"
import {CAOType, DataTag} from "../../../controller/datatag/types"
import {NotificationType, sendNotification} from "../../../controller/notification"
import {useStateWithCallback} from "../../../utils/react_utils"

const debug = Debug("flow")

/**
 * This interface is used to define the props
 * that the flow expects.
 */
interface FlowProps {
    id: string,

    // The project id this experiment belongs to
    ProjectID: number,

    // A parent state update handle such that it can
    // update the flow in the parent container.
    SetParentState?: Dispatch<SetStateAction<FlowElementsType>>,

    // Flow passed down if it exists.
    Flow?: FlowElementsType,

    // If this is set to true, it disables the buttons
    // and the flow from update
    ElementsSelectable: boolean,
}

/**
 * This is the main flow component/function. It handles display the experiment graph and allowing the user to
 * update the graph by adding and removing nodes, dragging nodes, zooming in and out etc.
 * Most of the actual work is done by the {@link https://reactflow.dev/|react-flow component}
 * @param props Input props for this component. See {@link FlowProps} interface for details.
 */
export default function Flow(props: FlowProps) {
    const router = useRouter()

    // Check if demo user as requested by URL param
    const isDemoUser = "demo" in router.query

    const projectId = props.ProjectID

    const setParentState = props.SetParentState

    const elementsSelectable = props.ElementsSelectable

    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance>(null)

    const [initialNodes, initialEdges] = useMemo(() => {
        let initialFlowValue
        if (props.Flow && props.Flow.length > 0) {
            // If we are loading from a persisted flow, we need to add the handlers to the nodes since the handlers
            // do not get persisted.
            initialFlowValue = props.Flow.map(node => {
                switch (node.type) {
                    case 'datanode':
                        node.data = {
                            ...node.data,
                            SelfStateUpdateHandler: DataNodeStateUpdateHandler
                        }
                        break
                    case 'predictornode':
                        node.data = {
                            ...node.data,
                            SetParentPredictorState: state => PredictorSetStateHandler(state, node.id),
                            DeleteNode: nodeId => _deleteNodeById(nodeId),
                            GetElementIndex: nodeId => _getElementIndex(nodeId)
                        }
                        break
                    case 'prescriptornode':
                        node.data = {
                            ...node.data,
                            SetParentPrescriptorState: state => PrescriptorSetStateHandler(state, node.id),
                            DeleteNode: nodeId => _deleteNodeById(nodeId),
                            GetElementIndex: nodeId => _getElementIndex(nodeId)
                        }
                        break
                    case 'uncertaintymodelnode': // Backward compatibility -- "uncertaintymodelnode" are now "configurableNode"
                        node.data = {
                            ...node.data,
                            SetParentNodeState: state => ParentNodeSetStateHandler(state, node.id),
                            DeleteNode: nodeId => _deleteNodeById(nodeId),
                            GetElementIndex: nodeId => _getElementIndex(nodeId),

                            // These two have to be added in since nodes in legacy experiments don't have them
                            ParameterSet: UNCERTAINTY_MODEL_PARAMS,
                            NodeTitle: "Uncertainty Model"
                        }
                        break
                    case "prescriptoredge":
                        node.data = {
                            ...node.data,
                            UpdateOutputOverrideCode: value => UpdateOutputOverrideCode(node.id, value)
                        }
                        break
                    case "llmnode":
                    case "category_reducer_node":
                        node.data = {
                            ...node.data,
                            SetParentNodeState: state => ParentNodeSetStateHandler(state, node.id),
                            DeleteNode: nodeId => _deleteNodeById(nodeId),
                            GetElementIndex: nodeId => _getElementIndex(nodeId)
                        }
                        break
                    default:
                        // Not a node that we need to modify; let it pass through as-is
                        break
                }

                return node
            })
        } else {
            initialFlowValue = _initializeFlow()
        }
        return [FlowQueries.getAllNodes(initialFlowValue), FlowQueries.getAllEdges(initialFlowValue)]
    }, [props.Flow])

    // The flow is the collection of nodes and edges all identified by a node type and a uuid
    const [nodes, setNodes] = useState<NodeType[]>(FlowQueries.getAllNodes(initialNodes))
    const [edges, setEdges] = useState<EdgeType[]>(initialEdges)

    // Tidy flow when nodes are added or removed
    useEffect(() => {
        tidyView()
        flowInstance && setTimeout(flowInstance.fitView, 50) // UN-1135 Make sure fitView is called after ReactFlow finishes rendering.
    }, [nodes.length, edges.length])

    // Initial population of the element type -> uuid list mapping used for simplified testing ids
    const initialMap = FlowQueries.getElementTypeToUuidList(initialNodes, initialEdges)
    debug("initial uuid map: ", initialMap)

    const [elementTypeToUuidList, setElementTypeToUuidList] = useStateWithCallback(initialMap)

    function DataNodeStateUpdateHandler(dataSource: DataSource, dataTag: DataTag) {
        /*
        This handler is used to update the predictor
        and prescriptor nodes with the new data tag
        */

        // Update the selected data source
        setNodes(
            nodes.map(node => {
                if (node.type === 'datanode') {
                    debug("Recreating Data node: ", node.type)
                    node.data = {
                        ...node.data,
                        DataSource: dataSource,
                        DataTag: dataTag
                    }
                }
                if (node.type === 'predictornode' || node.type === 'prescriptornode') {
                    debug("Recreating node: ", node.type)
                    node.data = {
                        ...node.data,
                        SelectedDataSourceId: dataSource.id
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
            nodes.map(node => {
                    // If this is the right node
                    if (node.id === NodeID) {
                        node.data = {
                            ...node.data,
                            ParentNodeState: newState
                        }
                    }
                    return node;
                }
            )
        )
    }

    function PredictorSetStateHandler(newState, NodeID) {
        /*
        This Handler is supposed to be triggered by a predictor node
        to update the data it stores withing itself and the related
        prescriptor edges linked to it.
        The NodeID parameter is used to bind it to the state
        */

        setNodes(
            nodes.map(node => {
                // If this is the right predictor node, update its state
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentPredictorState: newState
                    }
                } else if (node.type === "prescriptornode") {
                    // Update prescriptor with outcomes from all predictors.
                    // NOTE: this is simplified logic since we only support one prescriptor right now, so all predictors
                    // are necessarily connected to it. Will need to revisit this if we ever support multiple
                    // prescriptors.

                    const _node = node as PrescriptorNode;

                    // Get all predictors in the experiment except the one that just got updated because the data in
                    // that node is stale. Remember, we are inside the set state handler so the state there
                    // is before the update.
                    const predictors = FlowQueries.getPredictorNodes(nodes).filter(aNode => aNode.id !== NodeID)

                    // Take the Union of all the checked outcomes on the predictors
                    let checkedOutcomes = FlowQueries.extractCheckedFields(predictors, CAOType.OUTCOME)

                    // Append the new state outcome
                    Object.keys(newState.caoState.outcome).forEach(outcome => {
                        if (newState.caoState.outcome[outcome]) {
                            checkedOutcomes.push(outcome)
                        }
                    })

                    // Remove dupe outcomes
                    checkedOutcomes = checkedOutcomes
                        .filter((value, index, sourceArray) => sourceArray.indexOf(value) === index)

                    // Convert checkedOutcomes to fitness structure
                    const fitness = checkedOutcomes.map(outcome => {
                        // Maintain the state if it exists otherwise set maximize to true
                        const maximize = _node.data.ParentPrescriptorState.evolution.fitness.filter(
                            outcomeDict => outcomeDict.metric_name === outcome
                        ).map(outcomeDict => outcomeDict.maximize)
                        return {
                            metric_name: outcome,
                            maximize: maximize[0] ?? "true"
                        }
                    })

                    node.data = {
                        ...node.data,
                        ParentPrescriptorState: {
                            ..._node.data.ParentPrescriptorState,
                            evolution: {
                                ..._node.data.ParentPrescriptorState.evolution,
                                fitness
                            }
                        }
                    }
                }
                return node
            })
        )
    }

    function UpdateOutputOverrideCode(prescriptorEdgeID, value) {
        /*
        This function is used to update the code block in the predictor Edge
        used to override the output of the predictor.
        */
        setEdges(
            edges.map(node => {
                if (node.id === prescriptorEdgeID) {
                    node.data = {
                        ...node.data,
                        OutputOverrideCode: value
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
            nodes.map(node => {
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentPrescriptorState: newState
                    }
                }
                return node
            })
        )
    }


    function _initializeFlow() {
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
            id: 'root',
            type: 'datanode',
            data: {
                ProjectID: projectId,
                SelfStateUpdateHandler: DataNodeStateUpdateHandler
            },
            position: {x: 500, y: 500}
        }
        nodesTmp.push(dataSourceNode)

        return nodesTmp
    }

    function _addEdgeToPrescriptorNode(inputEdges: EdgeType[],
                              predictorNodeID: string, 
                              prescriptorNodeID: string) {

        const edgesCopy = [...inputEdges]
        const edgeId = uuid()
        const edge: PrescriptorEdge = {
            id: edgeId,
            source: predictorNodeID,
            target: prescriptorNodeID,
            animated: false,
            type: 'prescriptoredge',
            data: {
                OutputOverrideCode: OutputOverrideCode,
                UpdateOutputOverrideCode: value => UpdateOutputOverrideCode(
                    edgeId, value)
            }
        }                    
        edgesCopy.push(edge)
        return edgesCopy
    }

    function _getInitialPredictorState() {
        /*
        This function returns the initial state of the predictor
        */
        const initialCAOState: CAOChecked = {
            context: {},
            action: {},
            outcome: {}
        }
        const predictorParams: PredictorParams = {}
        const initialState: PredictorState = {
            selectedPredictorType: "regressor",
            selectedPredictor: "",
            selectedMetric: "",
            predictorParams: predictorParams,
            caoState: initialCAOState,
            trainSliderValue: 80,
            testSliderValue: 20,
            rngSeedValue: null
        }

        return initialState
    }

    /**
     * Adds uncertainty model nodes to all predictors in the graph that currently do not have such nodes attached.
     * Predictors that aren't allowed to have uncertainty nodes -- classifiers, multiple outcomes -- are skipped.
     */
    function _addUncertaintyModelNodes() {
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes.length === 0) {
            sendNotification(NotificationType.warning,
                "Please add at least one predictor before adding uncertainty model nodes.")
            return
        }

        // Only add uncertainty nodes to those predictor nodes that currently don't have one and are not classifiers,
        // which do not support the current type of uncertainty nodes. (Once we implement RED, they will.)
        // We also do not support uncertainty nodes for predictors with multiple outcomes
        const predictorsWithoutUncertaintyNodes =
            predictorNodes
                .filter(node => node.data.ParentPredictorState.selectedPredictorType !== "classifier" &&
                    getOutgoers<NodeData, PredictorNodeData>(node, nodes, edges)
                        .every(aNode => aNode.type !== "uncertaintymodelnode") &&
                    !FlowQueries.hasMultipleOutcomes(node))
                .map(node => node.id)
        if (predictorsWithoutUncertaintyNodes.length === 0) {
            sendNotification(NotificationType.warning,
                "All predictors that support uncertainty model nodes already have such nodes attached " +
                "and only one such node per predictor is supported.",
                "Note that uncertainty model nodes are not supported for classifier predictors, nor for predictors " +
                "that predict more than one outcome.")
            return
        }

        _addUncertaintyNodes(predictorsWithoutUncertaintyNodes)
    }

    function _getElementIndex(nodeID: string) {
        /*
        Function used as a means for Flow graph elements to query what their
        per-element index is for creating easier to handle id strings for testing.
        */
        const element = FlowQueries.getNodeByID(nodes, nodeID);
        return FlowQueries.getIndexForElement(elementTypeToUuidList, element)
    }

    function _addPredictorNode() {
        /*
        This function adds a predictor node to the Graph while supplying
        several constraints.
        1. The predictor nodes are always added as attached to the data source
        node.
        2. If a prescriptor node exists, the predictor is attached to that node.
        */

        // Make a copy of the nodes
        const nodesCopy = nodes.slice()
        let edgesCopy = edges.slice()

        // Create a unique ID
        const NodeID = uuid()

        // Add the Predictor Node
        const MaxPredictorNodeY = Math.max(
            ...FlowQueries.getPredictorNodes(nodes).map(node => node.position.y),
            nodes[0].position.y - 100
        )
        
        const dataSourceNode = FlowQueries.getDataNodes(nodes)[0]
        nodesCopy.push({
            id: NodeID,
            type: 'predictornode',
            data: {
                NodeID: NodeID,
                SelectedDataSourceId: dataSourceNode.data.DataSource.id,
                ParentPredictorState: _getInitialPredictorState(),
                SetParentPredictorState: state => PredictorSetStateHandler(state, NodeID),
                DeleteNode: predictorNodeId => _deleteNodeById(predictorNodeId),
                GetElementIndex: id => _getElementIndex(id)
            },
            position: {
                x: nodes[0].position.x + 250,
                y: MaxPredictorNodeY + 100
            }
        })

        // Add an Edge to the data node
        edgesCopy.push({
            id: uuid(),
            source: 'root',
            target: NodeID,
            animated: false,
            type: 'predictoredge'
        })

        // Check if Prescriptor Node exists
        const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)

        // If there's already a prescriptor node, add edge to that prescriptor node
        if (prescriptorNodes.length != 0) {
            const prescriptorNode = prescriptorNodes[0]
            edgesCopy = _addEdgeToPrescriptorNode(
                edgesCopy,
                NodeID, prescriptorNode.id
            )
        }

        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
        _addElementUuid("predictornode", NodeID)
    }

    function _getInitialPrescriptorState(fitness) {
        /*
        This function returns the initial prescriptor
        state.
        */
        return {
            network: {
                inputs: [{
                    "name": "Context",
                    "size": 0,
                    "values": ["float"]
                }],
                hidden_layers: [{
                    layer_name: 'hidden_1',
                    layer_type: 'dense',
                    layer_params: {
                        units: 16,
                        activation: 'tanh',
                        use_bias: true
                    }
                }],
                outputs: [
                    {
                        "name": "Action",
                        "size": 0,
                        "activation": "softmax",
                        "use_bias": true
                    }
                ]
            },
            evolution: {
                "nb_generations": 40,
                "population_size": 10,
                "nb_elites": 5,
                "parent_selection": "tournament",
                "remove_population_pct": 0.8,
                "mutation_type": "gaussian_noise_percentage",
                "mutation_probability": 0.1,
                "mutation_factor": 0.1,
                "initialization_distribution": "orthogonal",
                "initialization_range": 1,
                "fitness": fitness
            },
            LEAF: {
                representation: "NNWeights",
            },
            caoState: {
                "context": {},
                "action": {},
                "outcome": {}
            }
        }
    }

    function _addPrescriptorNode() {
        /*
        This function adds a prescriptor node to the Graph. The only
        requirement for this is that at least one predictor exists.

        For predictor nodes that already have uncertainty nodes attached, the newly added prescriptor node is
        connected to the uncertainty node(s) instead of directly to the predictor.
        */

        // Check if Prescriptor Node exists
        const prescriptorExists = (FlowQueries.getPrescriptorNodes(nodes)).length != 0

        // If it already exists, return
        if (prescriptorExists) {
            sendNotification(NotificationType.warning, "Only one prescriptor per experiment is currently supported")
            return
        }

        // Make sure predictor nodes exist, if not alert
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes.length == 0) {
            sendNotification(NotificationType.warning, "Add at least one predictor before adding a prescriptor")
            return
        }

        // If above conditions are satisfied edit the graph
        const nodesCopy = nodes.slice()
        let edgesCopy = edges.slice()

        // Create a unique ID
        const NodeID = uuid()

        // Get outcomes from all current predictors to use for prescriptor fitness
        let outcomes = FlowQueries.extractCheckedFields(predictorNodes, CAOType.OUTCOME)

        // Make this a set
        outcomes = outcomes.filter((value, index, sourceArray) => sourceArray.indexOf(value) === index)

        // Default to maximizing outcomes until user tells us otherwise
        const fitness = outcomes.map(outcome => ({metric_name: outcome, maximize: true}))

        // Add a Prescriptor Node

        // Figure out a logical x-y location for the new prescriptor node based on existing nodes
        const uncertaintyModelNodes = FlowQueries.getUncertaintyModelNodes(nodes)
        const prescriptorNodeXPos = uncertaintyModelNodes.length > 0
            ? uncertaintyModelNodes[uncertaintyModelNodes.length - 1].position.x + 250
            : predictorNodes[predictorNodes.length - 1].position.x + 250
        const prescriptorNodeYPos = uncertaintyModelNodes.length > 0
            ? uncertaintyModelNodes[0].position.y
            : predictorNodes[0].position.y;
        nodesCopy.push({
            id: NodeID,
            type: "prescriptornode",
            data: {
                NodeID: NodeID,
                SelectedDataSourceId: FlowQueries.getDataNodes(nodes)[0].data.DataSource.id,
                ParentPrescriptorState: _getInitialPrescriptorState(fitness),
                SetParentPrescriptorState: state => PrescriptorSetStateHandler(state, NodeID),
                EvaluatorOverrideCode: EvaluateCandidateCode,
                UpdateEvaluateOverrideCode: value => UpdateOutputOverrideCode(NodeID, value),
                DeleteNode: prescriptorNodeId => _deleteNodeById(prescriptorNodeId),
                GetElementIndex: id => _getElementIndex(id)
            },
            position: {
                x: prescriptorNodeXPos,
                y: prescriptorNodeYPos
            },
        })

        // Add edges to all the predictor nodes
        predictorNodes.forEach(predictorNode => {
            const downstreamNodes = getOutgoers<NodeData, PredictorNodeData>(predictorNode, nodes, edges)
            if (downstreamNodes && downstreamNodes.length > 0) {
                const downStreamUncertaintyModelNodes =
                    downstreamNodes.filter(node => node.type === "uncertaintymodelnode")
                if (downStreamUncertaintyModelNodes && downStreamUncertaintyModelNodes.length === 1) {
                    // should only be one uncertainty model node per predictor!
                    const uncertaintyModelNode = downStreamUncertaintyModelNodes[0]
                    edgesCopy = _addEdgeToPrescriptorNode(
                        edgesCopy,
                        uncertaintyModelNode.id, NodeID
                    )
                }
            } else {
                // This predictor has no uncertainty model, so just connect the new prescriptor directly to the
                // predictor.
                edgesCopy = _addEdgeToPrescriptorNode(
                    edgesCopy,
                    predictorNode.id, NodeID
                )
            }
        })

        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
        _addElementUuid("prescriptornode", NodeID)
    }

    function  _getInitialUncertaintyNodeState(): NodeParams {
        /*
       This function returns the initial uncertainty node state for when a user first adds the node to the flow
       */

        return structuredClone(UNCERTAINTY_MODEL_PARAMS)
    }

    // Adds uncertainty model nodes to the specified Predictor(s)
    function _addUncertaintyNodes(predictorNodeIDs: string[]): void {
        // Make a copy of the graph
        const nodesCopy = nodes.slice()
        let edgesCopy = edges.slice()
        predictorNodeIDs.forEach(predictorNodeID => {
            // Find associated predictor for this RIO node
            const predictorNode = FlowQueries.getPredictorNode(nodes, predictorNodeID)
            if (!predictorNode) {
                console.error(`Unable to locate predictor with node ID ${predictorNodeID}`)
                return
            }

            // Only one RIO node allowed per Predictor
            const downstreamNodes = getOutgoers<NodeData, PredictorNodeData>(predictorNode, nodes, edges)

            const alreadyHasUncertaintyNode = downstreamNodes && downstreamNodes.length > 0 &&
                downstreamNodes.some(node => node.type === "uncertaintymodelnode")
            if (alreadyHasUncertaintyNode) {
                sendNotification(NotificationType.warning, "This predictor already has an uncertainty model node",
                    "Only one uncertainty model node is allowed per predictor")
                return
            }

            // Check if Prescriptor Node exists
            const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)
            const prescriptorNode = prescriptorNodes && prescriptorNodes.length > 0 ? prescriptorNodes[0] : null

            const uncertaintyNodeXPos = prescriptorNode
                ? (predictorNode.position.x + prescriptorNode.position.x) / 2
                : predictorNode.position.x + 200

            // Create a unique ID
            const newNodeID = uuid()

            // Add the uncertainty model node
            const uncertaintyNode: ConfigurableNode = {
                id: newNodeID,
                type: "uncertaintymodelnode",
                data: {
                    NodeID: newNodeID,
                    ParentNodeState: _getInitialUncertaintyNodeState(),
                    SetParentNodeState: state => ParentNodeSetStateHandler(state, newNodeID),
                    DeleteNode: id => _deleteNodeById(id),
                    GetElementIndex: id => _getElementIndex(id),
                    ParameterSet: UNCERTAINTY_MODEL_PARAMS,
                    NodeTitle: "Uncertainty Model"
                },
                position: {
                    x: uncertaintyNodeXPos,
                    y: predictorNode.position.y
                },
            }
            nodesCopy.push(uncertaintyNode)

            // Now wire up the uncertainty model node in the graph
            // Connect the Predictor to the uncertainty model node
            edgesCopy.push({
                id: uuid(),
                source: predictorNode.id,
                target: newNodeID,
                animated: false,
                type: 'predictoredge'
            })

            // If there's a Prescriptor, connect the new uncertainty model node to that.
            if (prescriptorNode) {
                // Disconnect the existing edge from Predictor to Prescriptor
                const connectedEdges = getConnectedEdges([predictorNode], edges)
                for (const edge of connectedEdges) {
                    if (edge.type === "prescriptoredge") {
                        edgesCopy = edgesCopy.filter(e => e.id !== edge.id)
                    }
                }

                // Connect the uncertainty model node to the prescriptor
                edgesCopy = _addEdgeToPrescriptorNode(edgesCopy, newNodeID, prescriptorNode.id)
            }

            _addElementUuid("uncertaintymodelnode", newNodeID)
        })

        // Save the updated Flow
        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
    }

    function _addLlms() {
        // Make a copy of the graph
        const nodesCopy = nodes.slice()
        let edgesCopy = edges.slice()
        const dataNodes = FlowQueries.getDataNodes(nodesCopy)
        if (!dataNodes || dataNodes.length !== 1) {
            return
        }
        const dataNode = dataNodes[0]

        // Disconnect data source from predictors
        const dataSourceOutgoingEdges = getConnectedEdges([dataNode], edges).map(e => e.id)
        edgesCopy = edgesCopy.filter(e => !dataSourceOutgoingEdges.includes(e.id))

        const dataLlmNodeID = uuid()
        // LLM after data source node
        const dataLlmNode: ConfigurableNode = {
            id: dataLlmNodeID,
            type: "llmnode",
            data: {
                NodeID: dataLlmNodeID,
                ParentNodeState: structuredClone(LLM_MODEL_PARAMS_DATA_LLM),
                SetParentNodeState: state => ParentNodeSetStateHandler(state, dataLlmNodeID),
                DeleteNode: nodeID => _deleteNodeById(nodeID),
                GetElementIndex: nodeID => _getElementIndex(nodeID),
                ParameterSet: LLM_MODEL_PARAMS_DATA_LLM,
                NodeTitle: "Confabulation LLM"
            },
            position: {
                x: dataNode.position.x + 200,
                y: dataNode.position.y
            },
        }

        nodesCopy.push(dataLlmNode)

        // Connect LLM to data source
        edgesCopy.push({
            id: uuid(),
            source: dataNode.id,
            target: dataLlmNodeID,
            animated: false,
            type: 'predictoredge'
        })


        // Category Reduction LLM Node
        const categoryReducerLlmNodeID = uuid();
        const categoryReducerLlmNode: ConfigurableNode = {
            id: categoryReducerLlmNodeID,
            type: "category_reducer_node",
            data: {
                NodeID: categoryReducerLlmNodeID,
                ParentNodeState: structuredClone(LLM_MODEL_PARAMS_CATEGORY_REDUCER),
                SetParentNodeState: state => ParentNodeSetStateHandler(state, categoryReducerLlmNodeID),
                DeleteNode: nodeID => _deleteNodeById(nodeID),
                GetElementIndex: nodeID => _getElementIndex(nodeID),
                ParameterSet: LLM_MODEL_PARAMS_CATEGORY_REDUCER,
                NodeTitle: "Category Reducer LLM"
            },
            position: {
                x: dataNode.position.x + 200,
                y: dataNode.position.y
            },
        }

        nodesCopy.push(categoryReducerLlmNode)
        edgesCopy.push({
            id: uuid(),
            source: dataLlmNodeID,
            target: categoryReducerLlmNodeID,
            animated: false,
            type: 'predictoredge'
        })

        // Create a unique ID
        
        // Analytics LLM Node
        const analyticsLlmNodeID = uuid()
        const analyticsLlmNode: ConfigurableNode = {
            id: analyticsLlmNodeID,
            type: "llmnode",
            data: {
                NodeID: analyticsLlmNodeID,
                ParentNodeState: structuredClone(LLM_MODEL_PARAMS2),
                SetParentNodeState: state => ParentNodeSetStateHandler(state, analyticsLlmNodeID),
                DeleteNode: newNodeID => _deleteNodeById(newNodeID),
                GetElementIndex: newNodeID => _getElementIndex(newNodeID),
                ParameterSet: LLM_MODEL_PARAMS2,
                NodeTitle: "Analytics LLM"
            },
            position: {
                x: dataNode.position.x + 200,
                y: dataNode.position.y
            },
        }
        nodesCopy.push(analyticsLlmNode)

        edgesCopy.push({
            id: uuid(),
            source: categoryReducerLlmNodeID,
            target: analyticsLlmNodeID,
            animated: false,
            type: 'predictoredge'
        })

        // Connect Analytics LLM to predictor(s)
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes && predictorNodes.length > 0) {
            const llmToPredictorsEdges = predictorNodes.map(node => ({
                id: uuid(),
                source: analyticsLlmNodeID,
                target: node.id,
                animated: false,
                type: 'predictoredge'
            }))

            edgesCopy.push(...llmToPredictorsEdges)
        }
        const prescriptorNodes = FlowQueries.getPrescriptorNodes(nodes)
        const prescriptorNode = prescriptorNodes && prescriptorNodes.length > 0 ? prescriptorNodes[0] : undefined

        if (prescriptorNode) { // Add LLM after prescriptor
            // Create a unique ID
            const actuationLlmNodeID = uuid()

            // LLM after prescriptor
            const actuationLlmNode: ConfigurableNode = {
                id: actuationLlmNodeID,
                type: "llmnode",
                data: {
                    NodeID: actuationLlmNodeID,
                    ParentNodeState: structuredClone(LLM_MODEL_PARAMS3),
                    SetParentNodeState: state => ParentNodeSetStateHandler(state, actuationLlmNodeID),
                    DeleteNode: nodeID => _deleteNodeById(nodeID),
                    GetElementIndex: nodeID => _getElementIndex(nodeID),
                    ParameterSet: LLM_MODEL_PARAMS3,
                    NodeTitle: "Actuation LLM"
                },
                position: {
                    x: dataNode.position.x + 200,
                    y: dataNode.position.y
                },
            }
            nodesCopy.push(actuationLlmNode)

            edgesCopy.push({
                id: uuid(),
                source: prescriptorNode.id,
                target: actuationLlmNodeID,
                animated: false,
                type: 'predictoredge'
            })
        }

        _addElementUuid("llmnode", dataLlmNodeID)
        
        // Save the updated Flow
        setNodes(nodesCopy)
        setEdges(edgesCopy)
        setParentState([...nodesCopy, ...edgesCopy])
    }

    function _addElementUuid(elementType: string, elementId: string) {
        /*
        Adds a uuid for a particular element type to our indexing map used
        for testing ids.
        */

        // Allow for the list of elementType not to exist just yet
        let uuidList: string[] = [];
        if (elementTypeToUuidList.has(elementType)) {
            uuidList = elementTypeToUuidList.get(elementType);
        }
        uuidList.push(elementId);
        elementTypeToUuidList.set(elementType, uuidList);

        setElementTypeToUuidList(elementTypeToUuidList);
    }

    function _deleteNodeById(nodeID: string) {
        /*
        Simple "shim" method to allow nodes to delete themselves using their own NodeID, which
        each node knows.
         */
        _deleteNode([FlowQueries.getNodeByID(nodes, nodeID)], nodes, edges)
    }

    function _deleteNode(nodesToDelete: NodeType[], currentNodes: NodeType[], currentEdges: EdgeType[]) {
        /*
        Since we supply constraints on how nodes interact, i.e. in an ESP
        fashion we cannot allow deletion of any nodes.
        1. Data Nodes cannot be deleted
        2. If only one predictor exists, deleting that will also delete
        the prescriptor node if it exists.

        Note: This edits the graph inPlace
        */

        // Do not allow deletion of data nodes
        const dataNodeDeleted = nodesToDelete.some(element => element.type === "datanode")
        if (dataNodeDeleted) {
            sendNotification(NotificationType.warning, "Data nodes cannot be deleted.", "In order to use a different " +
                "data node, create a new experiment with the required data source.")
            return
        }

        const removableNodes = nodesToDelete.filter(element => element.type != "datanode")
        // Also get the edges associated with this uncertainty node
        const removableEdges = getConnectedEdges(removableNodes, currentEdges)

        const predictorNodesBeingRemoved = FlowQueries.getPredictorNodes(nodesToDelete)
        const predictorIdsBeingRemoved = predictorNodesBeingRemoved.map(node => node.id)

        const uncertaintyNodesBeingRemoved = FlowQueries.getUncertaintyModelNodes(nodesToDelete)

        const prescriptorNodes = FlowQueries.getPrescriptorNodes(currentNodes)

        // If we're deleting a predictor, delete associated Uncertainty nodes connected to this predictor
        if (predictorIdsBeingRemoved && predictorIdsBeingRemoved.length > 0) {
            const uncertaintyNodesToRemove = predictorNodesBeingRemoved
                .flatMap<ConfigurableNode>(
                    node => 
                    getOutgoers<NodeData, PredictorNodeData>(node, currentNodes, currentEdges).
                    filter(aNode => aNode.type === "uncertaintymodelnode") as ConfigurableNode[]
                )
            removableNodes.push(...uncertaintyNodesToRemove)
            // Also get the edges associated with this uncertainty node
            removableEdges.push(...getConnectedEdges(uncertaintyNodesToRemove, currentEdges))
        }

        // If this delete will remove all predictors, also delete the prescriptor
        let newEdges = currentEdges
        let newNodes = currentNodes
        const numPredictorNodesLeft = FlowQueries.getPredictorNodes(currentNodes).length - predictorIdsBeingRemoved.length
        if (numPredictorNodesLeft == 0) {
            removableNodes.push(...prescriptorNodes)
        } else {
            // Also if the removable elements have predictor nodes we
            // need to clean up their outcomes from showing in the prescriptor
            const predictorsLeft = currentNodes.filter(node => node.type === "predictornode" &&
                !predictorIdsBeingRemoved.includes(node.id)) as PredictorNode[]

            // Connect any remaining predictors to the prescriptor
            if (uncertaintyNodesBeingRemoved && prescriptorNodes && prescriptorNodes.length > 0) {
                const predictorNodesWithUncertaintyNodesBeingRemoved = uncertaintyNodesBeingRemoved
                    .flatMap(node => getIncomers<NodeData, ConfigurableNodeData>(node, currentNodes, currentEdges)
                        .filter(aNode => aNode.type === "predictornode"))
                for (const node of predictorNodesWithUncertaintyNodesBeingRemoved) {
                    newEdges = _addEdgeToPrescriptorNode(currentEdges, node.id, prescriptorNodes[0].id)
                }
            }

            // Get outcomes from all current predictors to use for prescriptor fitness
            let outcomes = FlowQueries.extractCheckedFields(predictorsLeft, CAOType.OUTCOME)

            // Make this a set
            outcomes = outcomes.filter((value, index, sourceArray) => sourceArray.indexOf(value) === index)

            // Default to maximizing outcomes until user tells us otherwise
            const fitness = outcomes.map(outcome => ({metric_name: outcome, maximize: true}))

            newNodes = currentNodes.map(singleNode => {
                const prescriptorNode = singleNode as PrescriptorNode
                if (singleNode.type === "prescriptornode") {
                    prescriptorNode.data = {
                        ...prescriptorNode.data,
                        ParentPrescriptorState: {
                            ...prescriptorNode.data.ParentPrescriptorState,
                            evolution: {
                                ...prescriptorNode.data.ParentPrescriptorState.evolution,
                                fitness
                            }
                        }
                    }
                }
                return prescriptorNode
            })
        }

        // Update the uuid index map for testing ids
        removableNodes.forEach((element) => {
            const uuidIndex = FlowQueries.getIndexForElement(elementTypeToUuidList, element);
            if (uuidIndex >= 0) {

                const elementType = String(element.type);
                const uuidList = elementTypeToUuidList.get(elementType);

                // Update the list with a marker that says the node has been deleted
                // This lets the other indexes in the list not to have to change.
                uuidList[uuidIndex] = "deleted";
                elementTypeToUuidList.set(elementType, uuidList);
            }
        });

        // Construct a list of changes
        const nodeChanges = removableNodes.map<NodeRemoveChange>(element => ({
            type: "remove",
            id: element.id
        }))

        const remainingNodes = applyNodeChanges<NodeData>(nodeChanges, newNodes) as NodeType[]

        const edgeChanges = removableEdges.map<EdgeRemoveChange>(element => ({
            type: "remove",
            id: element.id
        }))
        
        const remainingEdges = applyEdgeChanges(edgeChanges, newEdges) as EdgeType[]
        
        // Update the flow, removing the deleted nodes
        setNodes(remainingNodes)
        setEdges(remainingEdges)
        setParentState([...remainingNodes, ...remainingEdges])
        setElementTypeToUuidList(elementTypeToUuidList)
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
        const movedNode = nodesCopy.find(n => n.id === node.id);
        if (movedNode) {
            // Only update if we found the node. There should be no circumstances where the node is not found here
            // since we're in the event handler for the node itself, but just to be careful.
            movedNode.position = node.position
            setNodes(nodesCopy)
        }
    }

    function _onElementsRemove(elementsToRemove: NodeType[]) {
        _deleteNode(elementsToRemove, nodes, edges)
    }

    function _onLoad(reactFlowInstance) {
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
        dagreGraph.setGraph({ rankdir: "LR"})

        const nodeWidth = 250;
        const nodeHeight = 36;

        // Don't want to update nodes directly in existing flow so make a copy
        const _nodes = nodes.slice()

        _nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        // Convert dagre's layout to what our flow graph needs
        _nodes.forEach(node => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.targetPosition = Position.Left
            node.sourcePosition = Position.Right

            // We are shifting the dagre node position (anchor=center center) to the top left
            // so it matches the React Flow node anchor point (top left).
            node.position = {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            };
        })

        // Align nodes by type -- dagre cannot do this for us as it has no concept of node types. But we want
        // predictors to align together etc. For now, aligning predictors is enough since uncertainty nodes will
        // naturally already be aligned, and there can only be one prescriptor node currently.
        const predictorNodes = FlowQueries.getPredictorNodes(_nodes)
        if (predictorNodes.length > 1) {
            const minX = Math.min(...predictorNodes.map(node => node.position.x))
            predictorNodes.forEach(node => {node.position.x = minX})
        }

        // Update flow with new tidied nodes and fit to view
        setNodes(_nodes)
    }

    // Build the Contents of the Flow
    const buttonStyle = {background: MaximumBlue, borderColor: MaximumBlue};
    const propsId = `${props.id}`

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Get the Id of the data node
            const dataNode = FlowQueries.getDataNodes(nodes)[0]
            if (changes.some(change => change.type === "remove" && change.id === dataNode.id)) {
                // If the node being removed is a data node, then we do not remove it
                return
            }
            setNodes((ns) => applyNodeChanges<NodeData>(changes, ns) as NodeType[])
        }, []
      );
      const onEdgesChange = useCallback(
        (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
        []
      );

    // Figure out how many columns we need -- one for each button (add predictor, add prescriptor, add uncertainty),
    // plus an extra one if demo mode is enabled, for the "add LLMs" button.
    const numButtonsWithAddLLMs = 4;
    const numButtonsWithoutAddLLMs = 3;
    const cols = isDemoUser ? numButtonsWithAddLLMs : numButtonsWithoutAddLLMs

    return <Container id={ `${propsId}` }>
        {/* Only render if ElementsSelectable is true */}
        {elementsSelectable &&
            <div id="flow-buttons" className={`grid grid-cols-${cols} gap-4 mb-4`}>
                <Button
                    id="add_predictor_btn"
                    size="sm"
                    onClick={() => _addPredictorNode()}
                    type="button"
                    style={buttonStyle}
                >
                    Add Predictor
                </Button>
                <Button
                    id="add_uncertainty_model_btn"
                    size="sm"
                    onClick={() => _addUncertaintyModelNodes()}
                    type="button"
                    style={buttonStyle}
                >
                    Add Uncertainty Model
                </Button>
                <Button
                    id="add_prescriptor_btn"
                    size="sm"
                    onClick={() => _addPrescriptorNode()}
                    type="button"
                    style={buttonStyle}
                >
                    Add Prescriptor
                </Button>
                {isDemoUser &&
                    // Only show "add LLMs" button if demo functionality requested
                    <Button
                        id="add_llm_btn"
                        size="sm"
                        onClick={() => _addLlms()}
                        type="button"
                        style={buttonStyle}
                    >
                        Add LLMs
                    </Button>
                }
            </div>
        }
        <div id="react-flow-div" style={{width: '100%', height: "50vh"}}>
            {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
            <ReactFlowProvider>
                <ReactFlow id="react-flow"
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={currentNodes => _onElementsRemove(currentNodes)}
                    onConnect={void (0)}  // Prevent user manually connecting nodes
                    onInit={(instance) => _onLoad(instance)}
                    snapToGrid={true} 
                    snapGrid={[10, 10]}
                    nodeTypes={NodeTypes}
                    edgeTypes={EdgeTypes}
                    onNodeDragStop={onNodeDragStop}
                    fitView
                    preventScrolling={false}
                >
                    <Controls id="react-flow-controls"
                        style={{
                            position: "absolute",
                            top: "0px",
                            left: "0px"
                        }}
                        onFitView={() => tidyView()}
                    />
                        {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                        <Background color="#000048" gap={5}/>
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    </Container>
}
