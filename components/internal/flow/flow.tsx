// Import React Flow
import ReactFlow, {
    addEdge,
    Background,
    removeElements
} from 'react-flow-renderer'

// Import Framework
import React from 'react'

// Import ID Gen
import uuid from "react-uuid"

// Import Custom Nodes and Edges
import EdgeTypes from './edges/types'
import NodeTypes from './nodes/types'

// Import 3rd party components
import { 
    Button, 
    Container 
} from "react-bootstrap"

// Import Constants
import { 
    MaximumBlue, 
    InputDataNodeID,
    OutputOverrideCode,
    EvaluateCandidateCode
} from '../../../const'

// Import types
import { 
    TaggedDataInfoList 
} from '../../../pages/projects/[projectID]/experiments/new'
import Notification, {NotificationProps} from "../../../controller/notification";


var debug = require('debug')('flow')

/*
The following interface is used to define the props
that the flow expects.
*/
export interface FlowProps {
    // The project id this experiment belongs to
    ProjectID: number,

    // The Data sources and data tags available to this
    // project
    TaggedDataList: TaggedDataInfoList

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
    TaggedDataList: TaggedDataInfoList
    SetParentState: any
    protected ElementsSelectable: boolean

    constructor(props: FlowProps) {

        // Pass Props to parent class
        super(props)

        // Unpack the variables
        this.ProjectID = props.ProjectID
        this.TaggedDataList = props.TaggedDataList
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

    DataNodeStateUpdateHandler(state) {
        /*
        This handler is used to update the predictor
        and prescriptor nodes with the new data tag
        */

        const flow = this.state.flow

        debug("State in Data Node: ", state)

        // Update the selected data source
        this.setState({
            flow: flow.map(node => {
                if (node.type === 'predictornode' || node.type === 'prescriptornode') {
                    debug("Recreating node: ", node.type)
                    node.data = {
                        ...node.data,
                        SelectedDataTag: state.LatestDataTag,
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

        const flow = this.state.flow

        this.setState({
            flow: flow.map(node => {

                // If this is the predictor node
                if (node.id === NodeID) {
                    node.data = {
                        ...node.data,
                        state: newState
                    }
                }

                // We also need to edit the data
                // in all the prescriptor node that are connected
                // to this node
                if (node.type === "prescriptornode") {
                    // We need the outcome Information to pass the outcomes
                    // selected
                    const outcomeData = newState.caoState.outcome
                    let fitness = []
                    
                    Object.keys(outcomeData).forEach(outcome => {
                        if (outcomeData[outcome]) {
                            fitness.push({
                                metric_name: outcome,
                                maximize: "true"
                            })
                        }
                    })
                    // debugger
                    node.data = {
                        ...node.data,
                        state: {
                            ...node.data.state,
                            evolution: {
                                ...node.data.state.evolution,
                                fitness
                            }
                        }
                    }
                }

                return node
            })
        })
    }

    UpdateMarkedOutcomes(predictorNodeID, outcomeName, maximize) {
        /*
        This function is used to update the selected outcomes within the
        predict edge whether they need to minimized or maximized.
        */
        const flow = this.state.flow
        this.setState({
            flow: flow.map(node => {
                if (node.id === predictorNodeID) {
                    debug("maximize: ", maximize)
                    let outcomeData = {...node.data.state.caoState.outcome}
                    outcomeData[outcomeName].maximize = maximize

                    node.data = {
                        ...node.data,
                        state: {
                            ...node.data.state,
                            caoState: {
                                ...node.data.state.caoState,
                                outcome: outcomeData
                            }
                        }
                    }
                }
                return node
            })
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
                        state: newState
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
                        SelfStateUpdateHandler: this.DataNodeStateUpdateHandler.bind(this),
                        TaggedDataList: props.TaggedDataList
                    }
                } else if (node.type === 'predictornode') {
                    node.data = {
                        ...node.data,
                        setState: state => this.PredictorSetStateHandler(state, node.id)
                    }
                } else if (node.type === 'prescriptornode') {
                    node.data = {
                        ...node.data,
                        setState: state => this.PrescriptorSetStateHandler(state, node.id)
                    }
                } else if (node.type === "prescriptoredge") {

                    // We need to get the predictor attached
                    // to the source of this edge
                    const predictorNodeID = this._getPredictorNodes(props.Flow).filter(predictorNode => predictorNode.id === node.source)[0].id 
                    node.data = {
                        ...node.data,
                        UpdateMarkedOutcomes: (outcomeName, 
                            maximize) => this.UpdateMarkedOutcomes(
                                predictorNodeID, 
                                outcomeName, maximize
                        ),
                        UpdateOutputOverrideCode: value => this.UpdateOutputOverrideCode(
                            node.id, value)
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
                TaggedDataList: this.TaggedDataList,
                SelectedDataTag: this.TaggedDataList[0],
                SelfStateUpdateHandler: this.DataNodeStateUpdateHandler.bind(this)
            },
            position: { x: 100, y: 100 }
        })

        return initialGraph
    }
    _getPredictorNodes(graph) {
        /*
        This function filters the predictor nodes
        from the graph and returns them
        */
        return graph.filter(
            element => element.type === 'predictornode')
    }
    _getPrescriptorNodes(graph) { 
        /*
        This function filters the prescriptor nodes
        from the graph and returns them
        */
        return graph.filter(
            element => element.type === 'prescriptornode')
    }
    _getDataNodes(graph){ 
        /*
        This function filters the data nodes
        from the graph and returns them
        */
        return graph.filter(
            element => element.type === 'datanode')
    }

    _filterCheckedOutcomes(outcomeData) {
        /*
        This function filters out the outcomes that
        are checked and returns them
        */

        let checkedOutcomes = {}
        Object.keys(outcomeData).forEach(outcome => {
            if (outcomeData[outcome].checked) {
                checkedOutcomes[outcome] = outcomeData[outcome]
            }
        })

        return checkedOutcomes

    }

    _addEdgeToPrescriptorNode(graph, checkedOutcomes, 
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
                MarkedOutcomes: checkedOutcomes,
                UpdateMarkedOutcomes: (outcomeName, 
                    maximize) => this.UpdateMarkedOutcomes(
                        predictorNodeID, 
                        outcomeName, maximize
                ),
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
        return {  
            selectedPredictorType: "regressor",
            predictors: [],
            selectedPredictor: "",
            metrics: [],
            selectedMetric: "",
            predictorParams: {},
            caoState: {
                "context": {},
                "action": {},
                "outcome": {}
            },
            trainSliderValue: 80,
            testSliderValue: 20,
            rngSeedValue: ''
        }
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
            ...this._getPredictorNodes(flowInstanceElem).map(node => node.position.y), 
            flowInstanceElem[0].position.y - 100
        )

        graphCopy.push({
            id: NodeID,
            type: 'predictornode',
            data: { 
                NodeID: NodeID,
                SelectedDataTag: this.state.flow[0].data.SelectedDataTag.LatestDataTag,
                state: this._getInitialPredictorState(),
                setState: state => this.PredictorSetStateHandler(state, NodeID)
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
        const prescriptorNodes = this._getPrescriptorNodes(this.state.flow)
    
        // If it already exists add edge to that
        if (prescriptorNodes.length != 0) { 

            const prescriptorNode = prescriptorNodes[0]
            graphCopy = this._addEdgeToPrescriptorNode(
                graphCopy, 
                this._filterCheckedOutcomes(prescriptorNode.data.state.caoState.outcome),
                NodeID, prescriptorNode.id
            )
        }
        
        this.setState({flow: graphCopy})
    }

    _getInitialPrescriptorState() {
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
                        units: 0,
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
                "fitness": []
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
            this._getPrescriptorNodes(this.state.flow)).length != 0
    
        // If it already exists, return
        if (prescriptorExists) {
            let notificationProps: NotificationProps = {
                Type: "error",
                Message: "Only one prescriptor per experiment is currently supported",
                Description: ``
            }
            Notification(notificationProps)
            return this.state.flow
        }
    
        // Make sure predictor nodes exist, if not alert
        const predictorNodes = this._getPredictorNodes(this.state.flow)
        if (predictorNodes.length == 0) {
            let notificationProps: NotificationProps = {
                Type: "error",
                Message: "Add at least one predictor before adding a prescriptor",
                Description: ``
            }
            Notification(notificationProps)
            return this.state.flow
        }
        
        // If above conditions are satisfied edit the graph
        let graphCopy = this.state.flow.slice()
    
        // Create an unique ID
        const NodeID = uuid()
    
        // Add a Prescriptor Node
        const flowInstanceElem = this.state.flowInstance.getElements()
        graphCopy.push({
            id: NodeID,
            type: "prescriptornode",
            data:  { 
                NodeID: NodeID,
                SelectedDataTag: this.state.flow[0].data.SelectedDataTag.LatestDataTag,
                state: this._getInitialPrescriptorState(),
                setState: state => this.PrescriptorSetStateHandler(state, NodeID),
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
                this._filterCheckedOutcomes(predictorNode.data.state.caoState.outcome),
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
    
        // // If this delete will remove all predictors, also delete the prescriptor
        const numPredictorNodesLeft = this._getPredictorNodes(graph).length - this._getPredictorNodes(elementsToRemove).length
        if (numPredictorNodesLeft == 0) {
            removableElements.push(...this._getPrescriptorNodes(graph))
        }
    
        // Get all the removable nodes
        const removableNodes = elementsToRemove.filter(element => !(element.source || element.target))

        // Clean the node state
        this.setState({
            predictornodesState: function() {
                let stateCopy = { ...this.state.predictornodesState }
                for (let removableNode of removableNodes) {
                    delete stateCopy[removableNode.id]
                }
                return stateCopy
            }.bind(this)(),
            prescriptornodesState: function() {
                let stateCopy = { ...this.state.prescriptornodesState }
                for (let removableNode of removableNodes) {
                    delete stateCopy[removableNode.id]
                }
                return stateCopy
            }.bind(this)(),
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
                    <Button size="sm"
                             onClick={_ => {
                                 if (this.state.flowInstance != null) {
                                     this.state.flowInstance.fitView()
                                 }
                             }}
                             style={{
                                 position: "absolute",
                                 right: "0px",
                                 top: "0px",
                                 zIndex: 1000,
                                 background: MaximumBlue,
                                 borderColor: MaximumBlue
                             }}
                    >Fit diagram</Button>
                    <Background color="#000" gap={5} />
                </ReactFlow>
            </div>
        </Container>
    }

}


