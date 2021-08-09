// Import React Flow
import ReactFlow, {
    addEdge,
    Background
} from 'react-flow-renderer'

// Import Framework
import { useState } from 'react'

// Import Custom graph utils
import {
    initializeGraph,
    getPredictorNodes,
    getPrescriptorNodes,
    addPredictorNode,
    addPrescriptorNode,
    onLoad,
    deleteNode
} from './graphutils'

// Import Custom Nodes
import NodeTypes from './nodes'

// Import 3rd party components
import { 
    Button, 
    Container 
} from "react-bootstrap"

// Import Constants
import { 
    MaximumBlue, 
    InputDataNodeID
} from '../../../const'
import { useEffect } from 'react'

export default function Flow({ProjectID}) {
    /*
    This function is responsible for rendering the new experiments
    content
    */

    // This is an unusual case where the state ideally should live in the
    // the Data Node, but here needs to live in the parent container. Reason being,
    // this state needs to be passed to other components. This is following reacts pattern
    // of Lifting up State.
    let [selectedSourceCAOMap, setSelectedSourceCAOMap] = useState({})

    // Setup the Graph
    let initState = {}
    initState[InputDataNodeID] = {}
    let [nodeDefs, setNodeDefs] = useState(initState)

    let [graph, setGraph] = useState(initializeGraph(ProjectID, 
                                     nodeDefs, setNodeDefs,
                                     setSelectedSourceCAOMap))

    // We need to track internal state of all nodes
    console.log("FLOW STATE: ", nodeDefs)
    
    // Declare Wrapper functions around node deletion and connect
    // around our graph editing methods to conform to the library
    // specification
    const onElementsRemove = (elementsToRemove) =>
        setGraph(graph => deleteNode(elementsToRemove, graph, nodeDefs, setNodeDefs))
    const onConnect = (params) => setGraph(graph => addEdge(params, graph))

    // Build the Contents of the Flow
    return <Container>
                <div className="grid grid-cols-2 gap-4 mb-4">
                        <Button size="sm" 
                        onClick={() => setGraph(addPredictorNode(graph,
                                                                 nodeDefs, setNodeDefs, 
                                                                 selectedSourceCAOMap))}
                        type="button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                        >
                            Add Predictor
                        </Button>
                        <Button size="sm" 
                        onClick={() => setGraph(addPrescriptorNode(graph, selectedSourceCAOMap))} 
                        type="button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                        >
                            Add Prescriptor
                        </Button>
                </div>
                <div style={{width: '100%', height: "50vh"}}>
                    <ReactFlow
                        elements={graph}
                        onElementsRemove={onElementsRemove}
                        onConnect={onConnect}
                        onLoad={onLoad}
                        snapToGrid={true}
                        snapGrid={[10, 10]}
                        nodeTypes={NodeTypes}
                        >
                            <Background color="#000" gap={5} />
                        </ReactFlow>
                </div>
                
            </Container>
}
