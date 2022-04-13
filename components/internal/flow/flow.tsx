// Import React Flow
import ReactFlow, {addEdge, Background, Controls, removeElements} from 'react-flow-renderer'

// Import Framework
import React from 'react'

// Import ID Gen
import uuid from "react-uuid"

// Import Custom Nodes and Edges
import EdgeTypes from './edges/types'
import NodeTypes from './nodes/types'

// Import 3rd party components
import {Button, Container} from "react-bootstrap"

// Import Constants
import {EvaluateCandidateCode, InputDataNodeID, MaximumBlue, OutputOverrideCode} from '../../../const'

// Import types
import {CAOChecked, PredictorState} from "./nodes/predictornode"
import {NotificationType, sendNotification} from "../../../controller/notification";
import {PredictorParams} from "../../../predictorinfo";
import {DataSource} from "../../../controller/datasources/types";
import {CAOType, DataTag} from "../../../controller/datatag/types";
import {FlowQueries} from "./flowqueries";

const debug = require('debug')('flow')

/*
The following interface is used to define the props
that the flow expects.
*/
export interface FlowProps {
    // The project id this experiment belongs to
    ProjectID: number,

    // A parent state update handle such that it can
    // update the flow in the parent container.
    SetParentState?: any

    // Flow passed down if it exists
    Flow?: any

    // If this is set to true, it disables the buttons
    // and the flow from update
    ElementsSelectable: boolean
}

class FlowState extends React.Component {
    // Declare class Variables
    ProjectID: number
    SetParentState: any
    protected ElementsSelectable: boolean

    constructor(props: FlowProps) {

        // Pass Props to parent class
        super(props)

        // Unpack the variables
        this.ProjectID = props.ProjectID
        this.SetParentState = props.SetParentState
        this.ElementsSelectable = props.ElementsSelectable

    }
}

class FlowNodeStateUpdateHandler extends FlowState {

    state = {
        // The flow is the collection of nodes and
        // edges all identified by a node type and
        // a uuid
        flow: [],
        flowInstance: null
    }


    DataNodeStateUpdateHandler(dataSource: DataSource, dataTag: DataTag) {
        /*
        This handler is used to update the predictor
        and prescriptor nodes with the new data tag
        */

        const flow = this.state.flow

        // Update the selected data source
        this.setState({
            flow: flow.map(node => {
                if (node.type === 'datanode') {
                    debug("Recreating Data node: ", node.type)
                    node.data = {
                        ...node.data,
                        DataSource: dataSource,
                        DataTag: dataTag,
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
        })

    }

    PredictorSetStateHandler(newState, NodeID) {
        /*
        This Handler is supposed to be triggered by a predictor node
        to update the data it stores withing itself and the related
        prescriptor edges linked to it.
        The NodeID parameter is used to bind it to the state
        */
        // TODO: This logic will start to break when we have intermediate nodes for eg: RIO

        const flow = this.state.flow

        // Get all the outgoing prescriptor edges from this predictor and get the
        // target node id

        const outgoingPrescriptorIds = flow
            .filter(elem => elem.type === "prescriptoredge" && elem.source === NodeID)
            .map(elem => elem.target)

        this.setState({
            flow: flow.map(node => {
                // If this is the right predictor node

                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentPredictorState: newState
                    }
                }

                // If the node is a prescriptor that is connected to this node
                if (node.type === "prescriptornode" && outgoingPrescriptorIds.includes(node.id)) {

                    // Find all the predictors connected to this node except the one that triggered
                    // this update. We don't fetch the one that just got updated because the data in
                    // that node is stale. Remember, we are inside the set state handler so the state there
                    // is before the update
                    const predictorIds = flow.
                    filter(elem => elem.type === "prescriptoredge" && elem.target === node.id && elem.source != NodeID).
                        map(elem => elem.source)
                    const predictors = flow.filter(elem => predictorIds.includes(elem.id))

                    // Take the Union of all the checked outcomes on the predictors
                    let checkedOutcomes = FlowQueries.extractCheckedFields(predictors, CAOType.OUTCOME)

                    // Append the new state outcome
                    Object.keys(newState.caoState.outcome).forEach(outcome => {
                        if (newState.caoState.outcome[outcome]) {
                            checkedOutcomes.push(outcome)
                        }
                    })

                    // Make this a set
                    checkedOutcomes = checkedOutcomes.filter((value, index, self) => self.indexOf(value) === index)

                    let fitness = checkedOutcomes.map(outcome => {

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
            }),
        })
    }

    UpdateOutputOverrideCode(prescriptorEdgeID, value) {
        /*
        This function is used to update the code block in the predictor Edge
        used to override the output of the predictor.
        */
        const flow = this.state.flow
        this.setState({
            flow: flow.map(node => {
                if (node.id === prescriptorEdgeID) {
                    node.data = {
                        ...node.data,
                        OutputOverrideCode: value
                    }
                }
                return node
            })
        })
    }

    UpdateEvaluateOverrideCode(prescriptorNodeID, value) {
        /*
        This function is used to update the code block in the predictor Edge
        used to override the output of the predictor.
        */
        const flow = this.state.flow
        this.setState({
            flow: flow.map(node => {
                if (node.id === prescriptorNodeID) {
                    node.data = {
                        ...node.data,
                        EvaluatorOverrideCode: value
                    }
                }
                return node
            })
        })
    }

    PrescriptorSetStateHandler(newState, NodeID) {
        /*
        This Handler is supposed to be triggered by a prescriptor node
        to update the data it stores withing itself 
        The NodeID parameter is used to bind it to the state
        */
        const flow = this.state.flow

        this.setState({
            flow: flow.map(node => {
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        ParentPrescriptorState: newState
                    }
                }
                return node
            })
        })

    }

}

class FlowUtils extends FlowNodeStateUpdateHandler {

    constructor(props) {

        // Pass Props to parent class
        super(props)

        // Initialize the Flow
        if (props.Flow) {

            // If an external flow is passed, we just assign the nodes the handlers
            this.state.flow = props.Flow.map(node => {

                if (node.type === 'datanode') {
                    node.data = {
                        ...node.data,
                        SelfStateUpdateHandler: this.DataNodeStateUpdateHandler.bind(this)
                    }
                } else if (node.type === 'predictornode') {
                    node.data = {
                        ...node.data,
                        SetParentPredictorState: state => this.PredictorSetStateHandler(state, node.id)
                    }
                } else if (node.type === 'prescriptornode') {
                    node.data = {
                        ...node.data,
                        SetParentPrescriptorState: state => this.PrescriptorSetStateHandler(state, node.id)
                    }
                } else if (node.type === "prescriptoredge") {
                    node.data = {
                        ...node.data,
                        UpdateOutputOverrideCode: value => this.UpdateOutputOverrideCode(node.id, value)
                    }
                }

                return node

            })

            debug("FS: ", this.state.flow)

        } else {
            this.state.flow = this._initializeFlow()
        }
    }


    _initializeFlow() {
        /*
        This function resets the graphs and attaches a Data node.
        */
        // Create an empty graph
        let initialGraph = []

        // Add Data Node. The Data node has a constant ID
        // described by the constant InputDataNodeID. At the moment
        // We only support one data source and thus this suffices.
        // In a later implementation when this has to change, we
        // can describe it otherwise.
        initialGraph.push({
            id: InputDataNodeID,
            type: 'datanode',
            data: { 
                ProjectID: this.ProjectID,
                SelfStateUpdateHandler: this.DataNodeStateUpdateHandler.bind(this)
            },
            position: { x: 100, y: 100 }
        })

        return initialGraph
    }

    _addEdgeToPrescriptorNode(graph,
        predictorNodeID, prescriptorNodeID) {

        let graphCopy = [...graph]
        const EdgeId = uuid()
        graphCopy.push({ 
            id: EdgeId, 
            source: predictorNodeID, 
            target: prescriptorNodeID, 
            animated: false,
            type: 'prescriptoredge',
            data: {
                OutputOverrideCode: OutputOverrideCode,
                UpdateOutputOverrideCode: value => this.UpdateOutputOverrideCode(
                    EdgeId, value)
            }
        })

        return graphCopy

    }

    _getInitialPredictorState() {
        /*
        This function returns the initial state of the predictor
        */
        let initialCAOState: CAOChecked = {
            context: {},
            action: {},
            outcome: {}
        }
        let predictorParams: PredictorParams = {}
        let initialState: PredictorState = {
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

    _addPredictorNode() {
        /*
        This function adds a predictor node to the Graph while supplying
        several constraints.
        1. The predictor nodes are always added as attached to the data source
        node.
        2. If a prescriptor node exists, the predictor is attached to that node.
        */
    
        // Make a copy of the graph
        let graphCopy = this.state.flow.slice()
    
        // Create a unique ID
        const NodeID = uuid()

        // Add the Predictor Node
        const flowInstanceElem = this.state.flowInstance.getElements()
        const MaxPredictorNodeY = Math.max(
            ...FlowQueries.getPredictorNodes(flowInstanceElem).map(node => node.position.y),
            flowInstanceElem[0].position.y - 100
        )

        graphCopy.push({
            id: NodeID,
            type: 'predictornode',
            data: { 
                NodeID: NodeID,
                SelectedDataSourceId: this.state.flow[0].data.DataSource.id,
                ParentPredictorState: this._getInitialPredictorState(),
                SetParentPredictorState: state => this.PredictorSetStateHandler(state, NodeID)
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
        const prescriptorNodes = FlowQueries.getPrescriptorNodes(this.state.flow)

        // If there's already a prescriptor node, add edge to that prescriptor node
        if (prescriptorNodes.length != 0) { 
            const prescriptorNode = prescriptorNodes[0]
            graphCopy = this._addEdgeToPrescriptorNode(
                graphCopy,
                NodeID, prescriptorNode.id
            )
        }

        this.setState({flow: graphCopy})
    }

    _getInitialPrescriptorState(fitness) {
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

    _addPrescriptorNode() {
        /*
        This function adds a prescriptor node to the Graph. The only
        requirement for this is that at least one predictor exists.
    
    
        @param graph: Current state of the graph
        @param CAOMapping: CAOMapping for the Data Source that the user has selected
        */
    
        // Check if Prescriptor Node exists
        const prescriptorExists = (
            FlowQueries.getPrescriptorNodes(this.state.flow)).length != 0
    
        // If it already exists, return
        if (prescriptorExists) {
            sendNotification(NotificationType.warning, "Only one prescriptor per experiment is currently supported")
            return this.state.flow
        }
    
        // Make sure predictor nodes exist, if not alert
        const predictorNodes = FlowQueries.getPredictorNodes(this.state.flow)
        if (predictorNodes.length == 0) {
            sendNotification(NotificationType.warning, "Add at least one predictor before adding a prescriptor")
            return this.state.flow
        }
        
        // If above conditions are satisfied edit the graph
        let graphCopy = this.state.flow.slice()
    
        // Create a unique ID
        const NodeID = uuid()

        // Get outcomes from all current predictors to use for prescriptor fitness
        let outcomes = FlowQueries.extractCheckedFields(predictorNodes, CAOType.OUTCOME)

        // Make this a set
        outcomes = outcomes.filter((value, index, self) => self.indexOf(value) === index)

        // Default to maximizing outcomes until user tells us otherwise
        const fitness = outcomes.map(outcome => ({ metric_name: outcome, maximize: true}))

        // Add a Prescriptor Node
        const flowInstanceElem = this.state.flowInstance.getElements()
        graphCopy.push({
            id: NodeID,
            type: "prescriptornode",
            data:  { 
                NodeID: NodeID,
                SelectedDataSourceId: this.state.flow[0].data.DataSource.id,
                ParentPrescriptorState: this._getInitialPrescriptorState(fitness),
                SetParentPrescriptorState: state => this.PrescriptorSetStateHandler(state, NodeID),
                EvaluatorOverrideCode: EvaluateCandidateCode,
                UpdateEvaluateOverrideCode: value => this.UpdateEvaluateOverrideCode(NodeID, value)
            },
            position: { 
                x: flowInstanceElem[0].position.x + 750, 
                y: flowInstanceElem[0].position.y 
            },
        })
    
        // Add edges to all the predictor nodes
        predictorNodes.forEach(predictorNode => {
            graphCopy = this._addEdgeToPrescriptorNode(
                graphCopy,
                predictorNode.id, NodeID
            )
        })
    
        this.setState({flow: graphCopy})
    }

    _deleteNode(elementsToRemove, graph) {
        /*
        Since we supply constraints on how nodes interact, i.e in an ESP
        fashion we cannot allow deletion of any nodes. 
        1. Data Nodes cannot be deleted
        2. If only one predictor exists, deleting that will also delete
        the prescriptor node if it exists.
    
        Note: This edits the graph inPlace
        */
        // Make sure there are no data nodes
        const removableElements = elementsToRemove.filter(element => element.type != "datanode")

        const predictorIdsBeingRemoved = FlowQueries.getPredictorNodes(elementsToRemove).
            map(node => node.id)

        // If this delete will remove all predictors, also delete the prescriptor
        const numPredictorNodesLeft = FlowQueries.getPredictorNodes(graph).length - predictorIdsBeingRemoved.length
        if (numPredictorNodesLeft == 0) {
            removableElements.push(...FlowQueries.getPrescriptorNodes(graph))


        } else {
            // Also if the removable elements have predictor nodes we
            // need to clean up their outcomes from showing in the prescriptor
            const predictorsLeft = graph.filter(node => node.type === "predictornode" && !predictorIdsBeingRemoved.includes(node.id))
            // Get outcomes from all current predictors to use for prescriptor fitness
            let outcomes = FlowQueries.extractCheckedFields(predictorsLeft, CAOType.OUTCOME)
            // Make this a set
            outcomes = outcomes.filter((value, index, self) => self.indexOf(value) === index)
            // Default to maximizing outcomes until user tells us otherwise
            const fitness = outcomes.map(outcome => ({ metric_name: outcome, maximize: true}))

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


        // Clean the node state
        this.setState({
            flow: removeElements(removableElements, graph)
        })
        
    }

    onNodeDragStop(event, node) {
        /*
        This event handler is called when a user moves a node in the flow such as data node, predictor node or
        prescriptor node.
        It is only called when the user finishes moving the node. It updates the current state with the new position
        for the dragged node.
         */
        const graphCopy = this.state.flow.slice()

        // Locate which node was moved
        const movedNode = graphCopy.find(n => n.id === node.id);
        if (movedNode) {
            // Only update if we found the node. There should be no circumstances where the node is not found here
            // since we're in the event handler for the node itself, but just to be careful.
            movedNode.position = node.position
            this.setState({flow: graphCopy})
        }
    }

}

export default class Flow extends FlowUtils {

    constructor(props: FlowProps) {
        super(props);
    }

    _onElementsRemove(elementsToRemove) {
        this._deleteNode(elementsToRemove, this.state.flow)
    }
    _onConnect(params) { 
        this.setState({flow: addEdge(params, this.state.flow)}) 
    }

    _onLoad(reactFlowInstance) {
        /*
        Helper function to adjust the flow when its loaded.
        */
        reactFlowInstance.fitView();
        this.setState({flowInstance: reactFlowInstance})
    }

    componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any) {
        this.SetParentState && this.SetParentState(this.state.flow)
    }

    render() {
        // Build the Contents of the Flow
        return <Container>

            {/* Only render if ElementsSelectable is true */}
            {this.ElementsSelectable && <div className="grid grid-cols-2 gap-4 mb-4">
                <Button size="sm"
                        onClick={this._addPredictorNode.bind(this)}
                        type="button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                >
                    Add Predictor
                </Button>
                <Button size="sm"
                        onClick={this._addPrescriptorNode.bind(this)}
                        type="button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                >
                    Add Prescriptor
                </Button>
            </div>}
            <div style={{width: '100%', height: "50vh"}}>
                <ReactFlow
                    elements={this.state.flow}
                    onElementsRemove={this._onElementsRemove.bind(this)}
                    onConnect={this._onConnect}
                    onLoad={this._onLoad.bind(this)}
                    snapToGrid={true}
                    snapGrid={[10, 10]}
                    nodeTypes={NodeTypes}
                    edgeTypes={EdgeTypes}
                    onNodeDragStop={this.onNodeDragStop.bind(this)}
                >
                    <Controls
                        style={{
                            position: "absolute",
                            top: "0px",
                            left: "0px",
                            zIndex: 100
                        }}
                    />
                    <Background color="#000" gap={5} />
                </ReactFlow>
            </div>
        </Container>
    }

}


