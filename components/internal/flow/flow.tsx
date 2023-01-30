// React Flow
import ReactFlow, {
    Background,
    Controls,
    getConnectedEdges, getIncomers,
    getOutgoers,
    removeElements
} from 'react-flow-renderer'

// Framework
import React, {useEffect, useState} from 'react'

// ID Gen
import uuid from "react-uuid"

// Dagre (graph layout library)
import dagre from 'dagre'

// Custom components
import {FlowQueries} from "./flowqueries"
import {useStateWithCallback} from "../../../utils/react_utils"

// 3rd party components
import {Button, Container} from "react-bootstrap"

//  Constants
import {EvaluateCandidateCode, InputDataNodeID, MaximumBlue, OutputOverrideCode} from '../../../const'

// Types
import {CAOChecked, PredictorState} from "./nodes/predictornode"
import EdgeTypes from './edges/types'
import NodeTypes from './nodes/types'
import {UNCERTAINTY_MODEL_PARAMS, UncertaintyModelParams} from "./uncertaintymodelinfo"
import {DataSource} from "../../../controller/datasources/types";
import {CAOType, DataTag} from "../../../controller/datatag/types";
import {NotificationType, sendNotification} from "../../../controller/notification";
import {PredictorParams} from "./predictorinfo"

// Debug
import Debug from "debug"

const debug = Debug("flow")

/**
 * This interface is used to define the props
 * that the flow expects.
 */
interface FlowProps {
    // The project id this experiment belongs to
    ProjectID: number,

    // A parent state update handle such that it can
    // update the flow in the parent container.
    SetParentState?

    // Flow passed down if it exists
    Flow?

    // If this is set to true, it disables the buttons
    // and the flow from update
    ElementsSelectable: boolean
}

/**
 * This is the main flow component/function. It handles display the experiment graph and allowing the user to
 * update the graph by adding and removing nodes, dragging nodes, zooming in and out etc.
 * Most of the actual work is done by the {@link https://reactflow.dev/|react-flow component}
 * @param props Input props for this component. See {@link FlowProps} interface for details.
 */
export default function Flow(props: FlowProps) {

    const projectId = props.ProjectID

    const setParentState = props.SetParentState

    const elementsSelectable = props.ElementsSelectable

    const [flowInstance, setFlowInstance] = useState(null)

    let initialFlowValue
    if (props.Flow && props.Flow.length > 0) {

        // If an existing flow is passed, we just assign the nodes the handlers
        initialFlowValue = props.Flow.map(node => {
            if (node.type === 'datanode') {
                node.data = {
                    ...node.data,
                    SelfStateUpdateHandler: DataNodeStateUpdateHandler
                }
            } else if (node.type === 'predictornode') {
                node.data = {
                    ...node.data,
                    SetParentPredictorState: state => PredictorSetStateHandler(state, node.id),
                    DeleteNode: nodeId => _deleteNodeById(nodeId),
                    AddUncertaintyModelNode: nodeId => _addUncertaintyNodes([nodeId]),
                    GetFlow: () => GetFlow(),
                    GetElementIndex: nodeId => _getElementIndex(nodeId)
                }
            } else if (node.type === 'prescriptornode') {
                node.data = {
                    ...node.data,
                    SetParentPrescriptorState: state => PrescriptorSetStateHandler(state, node.id),
                    DeleteNode: nodeId => _deleteNodeById(nodeId),
                    GetElementIndex: nodeId => _getElementIndex(nodeId)
                }
            } else if (node.type === 'uncertaintymodelnode') {
                node.data = {
                    ...node.data,
                    SetParentUncertaintyNodeState: state => UncertaintyNodeSetStateHandler(state, node.id),
                    DeleteNode: prescriptorNodeId => _deleteNodeById(prescriptorNodeId)
                }
            } else if (node.type === "prescriptoredge") {
                node.data = {
                    ...node.data,
                    UpdateOutputOverrideCode: value => UpdateOutputOverrideCode(node.id, value)
                }
            }

            return node
        })
    } else {
        initialFlowValue = _initializeFlow()
    }

    debug("FS: ", initialFlowValue)

    // The flow is the collection of nodes and edges all identified by a node type and a uuid
    const [flow, setFlow] = useStateWithCallback(initialFlowValue)

    // Tidy flow when nodes are added or removed
    useEffect(() => tidyView(), [flow.length])

    // Initial population of the element type -> uuid list mapping used for simplified testing ids
    let initialMap = FlowQueries.getElementTypeToUuidList(flow)
    const [elementTypeToUuidList, setElementTypeToUuidList] = useStateWithCallback(initialMap)

    function DataNodeStateUpdateHandler(dataSource: DataSource, dataTag: DataTag) {
        /*
        This handler is used to update the predictor
        and prescriptor nodes with the new data tag
        */

        // Update the selected data source
        setFlow(
            flow.map(node => {
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

    function UncertaintyNodeSetStateHandler(newState, NodeID) {
        /*
        Called by uncertainty model nodes to update their state in the flow
         */
        setFlow(
            flow.map(node => {
                    // If this is the right uncertainty model node
                    if (node.id === NodeID) {
                        node.data = {
                            ...node.data,
                            ParentUncertaintyNodeState: newState
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

        setFlow(
            flow.map(node => {
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

                    // Get all predictors in the experiment except the one that just got updated because the data in
                    // that node is stale. Remember, we are inside the set state handler so the state there
                    // is before the update.
                    const predictors = FlowQueries.getPredictorNodes(flow).filter(node => node.id !== NodeID)

                    // Take the Union of all the checked outcomes on the predictors
                    let checkedOutcomes = FlowQueries.extractCheckedFields(predictors, CAOType.OUTCOME)

                    // Append the new state outcome
                    Object.keys(newState.caoState.outcome).forEach(outcome => {
                        if (newState.caoState.outcome[outcome]) {
                            checkedOutcomes.push(outcome)
                        }
                    })

                    // Remove dupe outcomes
                    checkedOutcomes = checkedOutcomes.filter((value, index, self) => self.indexOf(value) === index)

                    // Convert checkedOutcomes to fitness structure
                    const fitness = checkedOutcomes.map(outcome => {
                        // Maintain the state if it exists otherwise set maximize to true
                        const maximize = node.data.ParentPrescriptorState.evolution.fitness.filter(
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
                            ...node.data.ParentPrescriptorState,
                            evolution: {
                                ...node.data.ParentPrescriptorState.evolution,
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
        setFlow(
            flow.map(node => {
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

    function UpdateEvaluateOverrideCode(prescriptorNodeID, value) {
        /*
        This function is used to update the code block in the predictor Edge
        used to override the output of the predictor.
        */
        setFlow(
            flow.map(node => {
                if (node.id === prescriptorNodeID) {
                    node.data = {
                        ...node.data,
                        EvaluatorOverrideCode: value
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

        setFlow(
            flow.map(node => {
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
        // Create an empty graph
        const initialGraph = []

        // Add Data Node. The Data node has a constant ID
        // described by the constant InputDataNodeID. At the moment
        // We only support one data source and thus this suffices.
        // In a later implementation when this has to change, we
        // can describe it otherwise.
        initialGraph.push({
            id: InputDataNodeID,
            type: 'datanode',
            data: {
                ProjectID: projectId,
                SelfStateUpdateHandler: DataNodeStateUpdateHandler
            },
            position: {x: 100, y: 100}
        })

        return initialGraph
    }

    function _addEdgeToPrescriptorNode(graph,
                              predictorNodeID, prescriptorNodeID) {

        const graphCopy = [...graph]
        const EdgeId = uuid()
        graphCopy.push({
            id: EdgeId,
            source: predictorNodeID,
            target: prescriptorNodeID,
            animated: false,
            type: 'prescriptoredge',
            data: {
                OutputOverrideCode: OutputOverrideCode,
                UpdateOutputOverrideCode: value => UpdateOutputOverrideCode(
                    EdgeId, value)
            }
        })

        return graphCopy
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
     */
    function _addUncertaintyModelNodes() {
        const predictorNodes = FlowQueries.getPredictorNodes(flow)
        if (predictorNodes.length === 0) {
            sendNotification(NotificationType.warning,
                "Please add at least one predictor before adding uncertainty model nodes.")
            return
        }

        // Only add uncertainty nodes to those predictor nodes that currently don't have one and are not classifiers,
        // which do not support the current type of uncertainty nodes. (Once we implement RED, they will.)
        const predictorsWithoutUncertaintyNodes =
            predictorNodes
                .filter(node => node.data.ParentPredictorState.selectedPredictorType !== "classifier" &&
                    getOutgoers(node, flow).every(node => node.type !== "uncertaintymodelnode"))
                .map(node => node.id)
        if (predictorsWithoutUncertaintyNodes.length === 0) {
            sendNotification(NotificationType.warning,
                "All predictors that support uncertainty model nodes already have such nodes attached " +
                "and only one such node per predictor is supported.")
            return
        }

        _addUncertaintyNodes(predictorsWithoutUncertaintyNodes)
    }

    function GetFlow() {
        return flow
    }

    function _getElementIndex(nodeID: string) {
        const map = elementTypeToUuidList;

        let element = FlowQueries.getNodeById(map, nodeID);
        let index = FlowQueries.getIndexForElement(map, element);
        return index
    }

    function _addPredictorNode() {
        /*
        This function adds a predictor node to the Graph while supplying
        several constraints.
        1. The predictor nodes are always added as attached to the data source
        node.
        2. If a prescriptor node exists, the predictor is attached to that node.
        */

        // Make a copy of the graph
        let graphCopy = flow.slice()

        // Create a unique ID
        const NodeID = uuid()

        // Add the Predictor Node
        const flowInstanceElem = flowInstance.getElements()
        const MaxPredictorNodeY = Math.max(
            ...FlowQueries.getPredictorNodes(flowInstanceElem).map(node => node.position.y),
            flowInstanceElem[0].position.y - 100
        )

        graphCopy.push({
            id: NodeID,
            type: 'predictornode',
            data: {
                NodeID: NodeID,
                SelectedDataSourceId: flow[0].data.DataSource.id,
                ParentPredictorState: _getInitialPredictorState(),
                SetParentPredictorState: state => PredictorSetStateHandler(state, NodeID),
                DeleteNode: predictorNodeId => _deleteNodeById(predictorNodeId),
                AddUncertaintyModelNode: predictorNodeId => _addUncertaintyNodes([predictorNodeId]),
                GetFlow: () => GetFlow(),
                GetElementIndex: NodeID => _getElementIndex(NodeID)
            },
            position: {
                x: flowInstanceElem[0].position.x + 250,
                y: MaxPredictorNodeY + 100
            }
        })

        // Add an Edge to the data node
        graphCopy.push({
            id: uuid(),
            source: InputDataNodeID,
            target: NodeID,
            animated: false,
            type: 'predictoredge'
        })

        // Check if Prescriptor Node exists
        const prescriptorNodes = FlowQueries.getPrescriptorNodes(flow)

        // If there's already a prescriptor node, add edge to that prescriptor node
        if (prescriptorNodes.length != 0) {
            const prescriptorNode = prescriptorNodes[0]
            graphCopy = _addEdgeToPrescriptorNode(
                graphCopy,
                NodeID, prescriptorNode.id
            )
        }

        setFlow(graphCopy)
        setParentState(graphCopy)
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
        const prescriptorExists = (FlowQueries.getPrescriptorNodes(flow)).length != 0

        // If it already exists, return
        if (prescriptorExists) {
            sendNotification(NotificationType.warning, "Only one prescriptor per experiment is currently supported")
            return flow
        }

        // Make sure predictor nodes exist, if not alert
        const predictorNodes = FlowQueries.getPredictorNodes(flow)
        if (predictorNodes.length == 0) {
            sendNotification(NotificationType.warning, "Add at least one predictor before adding a prescriptor")
            return flow
        }

        // If above conditions are satisfied edit the graph
        let graphCopy = flow.slice()

        // Create a unique ID
        const NodeID = uuid()

        // Get outcomes from all current predictors to use for prescriptor fitness
        let outcomes = FlowQueries.extractCheckedFields(predictorNodes, CAOType.OUTCOME)

        // Make this a set
        outcomes = outcomes.filter((value, index, self) => self.indexOf(value) === index)

        // Default to maximizing outcomes until user tells us otherwise
        const fitness = outcomes.map(outcome => ({metric_name: outcome, maximize: true}))

        // Add a Prescriptor Node

        // Figure out a logical x-y location for the new prescriptor node based on existing nodes
        const uncertaintyModelNodes = FlowQueries.getUncertaintyModelNodes(flow)
        const prescriptorNodeXPos = uncertaintyModelNodes.length > 0
            ? uncertaintyModelNodes[uncertaintyModelNodes.length - 1].position.x + 250
            : predictorNodes[predictorNodes.length - 1].position.x + 250
        const prescriptorNodeYPos = uncertaintyModelNodes.length > 0
            ? uncertaintyModelNodes[0].position.y
            : predictorNodes[0].position.y;
        graphCopy.push({
            id: NodeID,
            type: "prescriptornode",
            data: {
                NodeID: NodeID,
                SelectedDataSourceId: flow[0].data.DataSource.id,
                ParentPrescriptorState: _getInitialPrescriptorState(fitness),
                SetParentPrescriptorState: state => PrescriptorSetStateHandler(state, NodeID),
                EvaluatorOverrideCode: EvaluateCandidateCode,
                UpdateEvaluateOverrideCode: value => UpdateEvaluateOverrideCode(NodeID, value),
                DeleteNode: prescriptorNodeId => _deleteNodeById(prescriptorNodeId),
                GetElementIndex: NodeID => _getElementIndex(NodeID)
            },
            position: {
                x: prescriptorNodeXPos,
                y: prescriptorNodeYPos
            },
        })

        // Add edges to all the predictor nodes
        predictorNodes.forEach(predictorNode => {
            const downstreamNodes = getOutgoers(predictorNode, graphCopy)
            if (downstreamNodes && downstreamNodes.length > 0) {
                const uncertaintyModelNodes = downstreamNodes.filter(node => node.type === "uncertaintymodelnode")
                if (uncertaintyModelNodes && uncertaintyModelNodes.length === 1) {
                    // should only be one uncertainty model node per predictor!
                    const uncertaintyModelNode = uncertaintyModelNodes[0]
                    graphCopy = _addEdgeToPrescriptorNode(
                        graphCopy,
                        uncertaintyModelNode.id, NodeID
                    )
                }
            } else {
                // This predictor has no uncertainty model, so just connect the new prescriptor directly to the
                // predictor.
                graphCopy = _addEdgeToPrescriptorNode(
                    graphCopy,
                    predictorNode.id, NodeID
                )
            }
        })

        setFlow(graphCopy)
        setParentState(graphCopy)
        _addElementUuid("prescriptornode", NodeID)
    }

    function  _getInitialUncertaintyNodeState(): UncertaintyModelParams {
        /*
       This function returns the initial uncertainty node state for when a user first adds the node to the flow
       */

        return structuredClone(UNCERTAINTY_MODEL_PARAMS)
    }

    // Adds uncertainty model nodes to the specified Predictor(s)
    function _addUncertaintyNodes(predictorNodeIDs: string[]): void {
        // Make a copy of the graph
        let graphCopy = flow.slice()
        predictorNodeIDs.forEach(predictorNodeID => {
            // Find associated predictor for this RIO node
            const predictorNode = FlowQueries.getPredictorNode(flow, predictorNodeID)
            if (!predictorNode) {
                console.error(`Unable to locate predictor with node ID ${predictorNodeID}`)
                return
            }

            // Only one RIO node allowed per Predictor
            const downstreamNodes = getOutgoers(predictorNode, flow)
            const alreadyHasUncertaintyNode = downstreamNodes && downstreamNodes.length > 0 &&
                downstreamNodes.some(node => node.type === "uncertaintymodelnode")
            if (alreadyHasUncertaintyNode) {
                sendNotification(NotificationType.warning, "This predictor already has an uncertainty model node",
                    "Only one uncertainty model node is allowed per predictor")
                return
            }

            // Check if Prescriptor Node exists
            const prescriptorNodes = FlowQueries.getPrescriptorNodes(flow)
            const prescriptorNode = prescriptorNodes && prescriptorNodes.length > 0 ? prescriptorNodes[0] : null

            const uncertaintyNodeXPos = prescriptorNode
                ? (predictorNode.position.x + prescriptorNode.position.x) / 2
                : predictorNode.position.x + 200

            // Create a unique ID
            const newNodeID = uuid()

            // Add the uncertainty model node
            graphCopy.push({
                id: newNodeID,
                type: "uncertaintymodelnode",
                data: {
                    NodeID: newNodeID,
                    ParentUncertaintyNodeState: _getInitialUncertaintyNodeState(),
                    SetParentUncertaintyNodeState: state => UncertaintyNodeSetStateHandler(state, newNodeID),
                    DeleteNode: prescriptorNodeId => _deleteNodeById(prescriptorNodeId),
                    GetElementIndex: newNodeID => _getElementIndex(newNodeID)
                },
                position: {
                    x: uncertaintyNodeXPos,
                    y: predictorNode.position.y
                },
            })

            // Now wire up the uncertainty model node in the graph
            // Connect the Predictor to the uncertainty model node
            graphCopy.push({
                id: uuid(),
                source: predictorNode.id,
                target: newNodeID,
                animated: false,
                type: 'predictoredge'
            })

            // If there's a Prescriptor, connect the new uncertainty model node to that.
            if (prescriptorNode) {
                // Disconnect the existing edge from Predictor to Prescriptor
                const edges = getConnectedEdges([predictorNode], flow)
                for (const edge of edges) {
                    if (edge.type === "prescriptoredge") {
                        graphCopy = removeElements([edge], graphCopy)
                    }
                }

                // Connect the uncertainty model node to the prescriptor
                graphCopy = _addEdgeToPrescriptorNode(graphCopy, newNodeID, prescriptorNode.id)
            }
        })

        // Save the updated Flow
        setFlow(graphCopy)
        setParentState(graphCopy)
        _addElementUuid("uncertaintymodelnode", newNodeID)
    }

    function _addElementUuid(elementType: string, elementId: string) {
        /*
        Adds a uuid for a particular element type to our indexing map used
        for testing ids.
        */

        const map = elementTypeToUuidList

        // Allow for the list of elementType not to exist just yet
        let uuidList = string[] = [];
        if (elementType in map) {
            uuidList = uuidList.push(elementId)
        }
        map[elementType] = uuidList

        setElementTypeToUuidList(map)
    }

    function _deleteNodeById(nodeID: string) {
        /*
        Simple "shim" method to allow nodes to delete themselves using their own NodeID, which
        each node knows.
         */
        const graph = flow
        _deleteNode([FlowQueries.getNodeByID(graph, nodeID)], graph)
    }

    function _deleteNode(elementsToRemove, graph) {
        /*
        Since we supply constraints on how nodes interact, i.e in an ESP
        fashion we cannot allow deletion of any nodes.
        1. Data Nodes cannot be deleted
        2. If only one predictor exists, deleting that will also delete
        the prescriptor node if it exists.

        Note: This edits the graph inPlace
        */

        // Do not allow deletion of data nodes
        const dataNodeDeleted = elementsToRemove.some(element => element.type === "datanode")
        if (dataNodeDeleted) {
            sendNotification(NotificationType.warning, "Data nodes cannot be deleted.", "In order to use a different " +
                "data node, create a new experiment with the required data source.")
            return
        }

        const removableElements = elementsToRemove.filter(element => element.type != "datanode")

        const predictorNodesBeingRemoved = FlowQueries.getPredictorNodes(elementsToRemove)
        const predictorIdsBeingRemoved = predictorNodesBeingRemoved.map(node => node.id)

        const uncertaintyNodesBeingRemoved = FlowQueries.getUncertaintyModelNodes(elementsToRemove)

        const prescriptorNodes = FlowQueries.getPrescriptorNodes(graph)

        // // If we're deleting a predictor, delete associated Uncertainty nodes connected to this predictor
        if (predictorIdsBeingRemoved && predictorIdsBeingRemoved.length > 0) {
            const uncertaintyNodesToRemove = predictorNodesBeingRemoved
                .flatMap(node => getOutgoers(node, graph)
                    .filter(node => node.type === "uncertaintymodelnode"))
            removableElements.push(...uncertaintyNodesToRemove)
        }

        // If this delete will remove all predictors, also delete the prescriptor
        const numPredictorNodesLeft = FlowQueries.getPredictorNodes(graph).length - predictorIdsBeingRemoved.length
        if (numPredictorNodesLeft == 0) {
            removableElements.push(...prescriptorNodes)
        } else {
            // Also if the removable elements have predictor nodes we
            // need to clean up their outcomes from showing in the prescriptor
            const predictorsLeft = graph.filter(node => node.type === "predictornode" &&
                !predictorIdsBeingRemoved.includes(node.id))

            // Connect any remaining predictors to the prescriptor
            if (uncertaintyNodesBeingRemoved && prescriptorNodes && prescriptorNodes.length > 0) {
                const predictorNodesWithUncertaintyNodesBeingRemoved = uncertaintyNodesBeingRemoved
                    .flatMap(node => getIncomers(node, graph)
                        .filter(node => node.type === "predictornode"))
                for (const node of predictorNodesWithUncertaintyNodesBeingRemoved) {
                    graph = _addEdgeToPrescriptorNode(graph, node.id, prescriptorNodes[0].id)
                }
            }

            // Get outcomes from all current predictors to use for prescriptor fitness
            let outcomes = FlowQueries.extractCheckedFields(predictorsLeft, CAOType.OUTCOME)

            // Make this a set
            outcomes = outcomes.filter((value, index, self) => self.indexOf(value) === index)

            // Default to maximizing outcomes until user tells us otherwise
            const fitness = outcomes.map(outcome => ({metric_name: outcome, maximize: true}))

            graph = graph.map(node => {
                if (node.type === "prescriptornode") {
                    node.data = {
                        ...node.data,
                        ParentPrescriptorState: {
                            ...node.data.ParentPrescriptorState,
                            evolution: {
                                ...node.data.ParentPrescriptorState.evolution,
                                fitness
                            }
                        }
                    }
                }
                return node
            })

        }

        // Update the uuid index map for testing ids
        let map = elementTypeToUuidList;
        removableElements.forEach( (element) => {
            let uuidIndex = FlowQueries.getIndexForElement(map, element);
            if (uuidIndex >= 0) {

                let uuidList = map[element.type].

                // Update the list with a marker that says the node has been deleted
                // This lets the other indexes in the list not to have to change.
                uuidList[uuidIndex] = "deleted";
                map[element.type] = uuidList;
            }
        });

        // Update the flow, removing the deleted nodes
        const flowWithElementsDeleted = removeElements(removableElements, graph);
        setFlow(flowWithElementsDeleted)
        setParentState(flowWithElementsDeleted)
        setElementTypeToUuidList(map)
    }

    function onNodeDragStop(event, node) {
        /*
        This event handler is called when a user moves a node in the flow such as data node, predictor node or
        prescriptor node.
        It is only called when the user finishes moving the node. It updates the current state with the new position
        for the dragged node.
         */
        const graphCopy = flow.slice()

        // Locate which node was moved
        const movedNode = graphCopy.find(n => n.id === node.id);
        if (movedNode) {
            // Only update if we found the node. There should be no circumstances where the node is not found here
            // since we're in the event handler for the node itself, but just to be careful.
            movedNode.position = node.position
            setFlow(graphCopy)
        }
    }

    function _onElementsRemove(elementsToRemove) {
        _deleteNode(elementsToRemove, flow)
    }

    function _onLoad(reactFlowInstance) {
        /*
        Helper function to adjust the flow when its loaded.
        */
        reactFlowInstance.fitView()
        setFlowInstance(reactFlowInstance)
    }

    useEffect(() => {
        setParentState && setParentState(flow)
    })

    /**
     * Tidies up the experiment graph using the "dagr" library
     * See example {@link https://reactflow.dev/docs/examples/layout/dagre/|here}
     */
    function tidyView() {
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))

        // Configure for left-to-right layout
        dagreGraph.setGraph({ rankdir: "LR"})

        const nodeWidth = 172;
        const nodeHeight = 36;

        // Don't want to update nodes directly in existing flow so make a copy
        const flowCopy = flow.slice()
        const nodes = FlowQueries.getAllNodes(flowCopy)
        const edges = FlowQueries.getAllEdges(flowCopy)

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        // Convert dagre's layout to what our flow graph needs
        nodes.forEach(node => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.targetPosition = 'left'
            node.sourcePosition = 'right'

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
        const predictorNodes = FlowQueries.getPredictorNodes(nodes)
        if (predictorNodes.length > 1) {
            const minX = Math.min(...predictorNodes.map(node => node.position.x))
            predictorNodes.forEach(node => {node.position.x = minX})
        }

        // Update flow with new tidied nodes and fit to view
        const newNodes = nodes.concat(edges);
        setFlow(newNodes, () => {flowInstance && flowInstance.fitView()})
    }

    // Build the Contents of the Flow
    const buttonStyle = {background: MaximumBlue, borderColor: MaximumBlue};
    return <Container>
        {/* Only render if ElementsSelectable is true */}
        {elementsSelectable &&
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            </div>
        }
        <div style={{width: '100%', height: "50vh"}}>
            <ReactFlow
                elements={flow}
                onElementsRemove={(elements) => _onElementsRemove(elements)}
                onConnect={void(0)}  // Prevent user manually connecting nodes
                onLoad={(instance) => _onLoad(instance)}
                snapToGrid={true}
                snapGrid={[10, 10]}
                nodeTypes={NodeTypes}
                edgeTypes={EdgeTypes}
                onNodeDragStop={(event, node) => onNodeDragStop(event, node)}
            >
                <Controls
                    style={{
                        position: "absolute",
                        top: "0px",
                        left: "0px"
                    }}
                    onFitView={() => tidyView()}
                />
                <Background color="#000" gap={5}/>
            </ReactFlow>
        </div>
    </Container>
}
