// Import React components
import { 
    useState, 
    useEffect 
} from 'react'
import dynamic from 'next/dynamic'

// Import 3rd pary components
import { 
    Card
} from "react-bootstrap"
import { 
    Popover, 
    Text, 
    Position, 
    Tablist, 
    Tab
} from "evergreen-ui"
import { GrSettingsOption } from "react-icons/gr"
import { MdDelete } from "react-icons/md"
import { BiPlusMedical } from "react-icons/bi"
import { 
    Card as BleuprintCard, 
    Elevation 
} from "@blueprintjs/core";


// Import React Flow
import {
    Handle,
    Position as HandlePosition
} from 'react-flow-renderer'

// Import Controller
import {
    DataTag,
    CAOType
} from "../../../../controller/datatag/types"

import { Controlled as CodeMirror } from 'react-codemirror2'

// Define an interface for the structure
// of the nodes
export interface PrescriptorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataTag: DataTag,

    readonly EvaluatorOverrideCode: any,
    readonly UpdateEvaluateOverrideCode: any,

    readonly state: any,
    readonly setState: any
}


export default function PrescriptorNode(props): React.ReactElement {
    /*
    This function is responsible for rendering the prescriptor node.
    NOTE: THIS RENDERS FORMS ELEMENT BUT NOT THE FORM ITSELF
    THE FORM MUST BE RENDERED AS A PARENT CONTAINER OF THIS.
    */

    const data: PrescriptorNodeData = props.data

    // Unpack the mapping
    const { 
        NodeID, 
        state, setState,
        EvaluatorOverrideCode, UpdateEvaluateOverrideCode
    } = data

    const updateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        let caoStateCopy = { ...state.caoState }

        caoStateCopy[espType][name] = checked

        setState({
            ...state,
            caoState: caoStateCopy
        })
    }

    useEffect(() => {

        // Construct the CAO Map
        let CAOMapping = {
            context: [],
            action: [],
            outcome: []
        }
        Object.keys(data.SelectedDataTag.fields).forEach(fieldName => {
            const field = data.SelectedDataTag.fields[fieldName]
            switch (field.esp_type.toString()) {
                case "CONTEXT":
                    CAOMapping.context.push(fieldName)
                    break
                case "ACTION":
                    CAOMapping.action.push(fieldName)
                    break
                case "OUTCOME":
                    CAOMapping.outcome.push(fieldName)
                    break
            }
        })

        // Create the initial state for the CAO Map
        let CAOState = {
            context: {},
            action: {},
            outcome: {}
        }

        CAOMapping.context.forEach(context => {
            if (context in state.caoState.context) {
                CAOState.context[context] = state.caoState.context[context]
            } else {
                CAOState.context[context] = true
            }
            
        })
        CAOMapping.action.forEach(action => {
            if (action in state.caoState.action) {
                CAOState.action[action] = state.caoState.action[action]
            } else {
                CAOState.action[action] = true
            }
        })

        CAOMapping.outcome.forEach(outcome => {
            if (outcome in state.caoState.outcome) {
                CAOState.outcome[outcome] = {
                    checked: state.caoState.outcome[outcome].checked,
                    maximize: state.caoState.outcome[outcome].maximize
                }
            } else {
                CAOState.outcome[outcome] = {
                    checked: false,
                    maximize: true
                }
            }
        })
        
        let initializedState = {...state}
        initializedState.caoState = CAOState
        initializedState.network.inputs[0].size = CAOMapping.context.length
        initializedState.network.hidden_layers[0].layer_params.units = 2 * CAOMapping.context.length
        initializedState.network.outputs[0].size = CAOMapping.action.length

        setState({
            ...initializedState,
            caoState: CAOState
        })
        
    }, [data.SelectedDataTag])

    // We want to have a tabbed prescriptor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Representation', 'Evolution Parameters', 'Objective Configuration', 'Override Evaluator'])

    // Create a min/max selector for each desired outcome
    const ObjectiveConfigurationPanel = state.evolution.fitness
        .map((metric, _) => {
            return <div className="p-2 grid grid-cols-2 gap-4 mb-2" key={metric.metric_name} >
                <label>{metric.metric_name}: </label>
                <select
                    key="objective-select"
                    value={metric.maximize}
                    onChange={event => {
                        // Update maximize/minimize status for selected outcome
                        let fitness = state.evolution.fitness
                            .map(f => {
                                if (f.metric_name === metric.metric_name) {
                                    return {
                                        metric_name: f.metric_name,
                                        maximize: event.target.value
                                    }
                                } else {
                                    return f
                                }
                            })

                        console.log('New fitness: ' + JSON.stringify(fitness))
                        // Update settings for this objective in the state
                        setState({
                            ...state,
                            evolution: {
                                ...state.evolution,
                                fitness: fitness
                            },
                        })
                    }}
                    >
                    <option value="true">Maximize</option>
                    <option value="false">Minimize</option>
                </select>
            </div>
    })
    
    const EvaluatorOverridePanel = <Card.Body>
                                        <CodeMirror
                                            value={EvaluatorOverrideCode}
                                            options={{
                                                tabSize: 4,
                                                theme: 'material',
                                                lineNumbers: true,
                                                mode: 'python',
                                            }}
                                            onBeforeChange={(editor, editorData, value) => {
                                                UpdateEvaluateOverrideCode(value)
                                            }}
                                            onChange={(editor, editorData, value) => {}}
                                            />

                                    </Card.Body>
    
    // We need to maintain state for selected Representation
    // Possible options are: 
    // 1. neural-network
    // 2. rules

    // Create the Neural Network Hidden layer utility
    const ActivationFunctions = [
        "tanh",
        "relu",
        "linear",
        "sigmoid",
        "softmax",
        "elu",
        "selu"
    ]
    const createNeuralNetworkLayer = (hiddenLayer, idx) => (
        <div key={`${NodeID}-hiddenlayer-${idx}`}>
            <h6 style={{display: "inline"}}>Hidden Layer {idx + 1} </h6>
            <button
                style={{width: "1rem"}}
                className="mb-2"
                type="button" onClick={_ => {
                    let stateCopy = {...state}
                    stateCopy.network.hidden_layers.splice(idx, 1)
                    setState(stateCopy)
                }}><MdDelete /></button>
            <div className="grid grid-cols-3 gap-1 mb-2 justify-items-center"
            >
                <div>
                    <label className="mr-2">Units: </label>
                    <input style={{width: "2rem"}}
                        type="number" 
                        step="1" 
                        value={ hiddenLayer.layer_params.units }
                        onChange={event => {
                            let modifiedHiddenLayerState = {...state}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(event.target.value)
                            setState(modifiedHiddenLayerState)
                        }}
                    /> 
                </div>
                <div>
                    <label className="mr-2">Activation: </label>
                    <select 
                        defaultValue="tanh"
                        value={ hiddenLayer.layer_params.activation }
                        onChange={event => {
                            let modifiedHiddenLayerState = {...state}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation = event.target.value
                            setState(modifiedHiddenLayerState)
                        }}
                    >
                        {ActivationFunctions.map((activationFn, _) => <option value={activationFn}>{activationFn}</option>)}
                    </select> 
                </div>

                <div>
                    <label className="mr-2">Use Bias: </label>
                    <input 
                        type="checkbox" 
                        defaultChecked={ true }
                        checked={ hiddenLayer.layer_params.use_bias }
                        onChange={event => {
                            let modifiedHiddenLayerState = {...state}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.use_bias = event.target.checked
                            setState(modifiedHiddenLayerState)
                        }}
                    />
                </div>
            </div>
        </div>
    )
    const NeuralNetworkConfiguration = state.network.hidden_layers.map((hiddenLayer, idx) => createNeuralNetworkLayer(hiddenLayer, idx))

    const PrescriptorRepresentationPanel = <Card.Body>

                                                <div className="flex justify-between mb-4 content-center">
                                                    <label>Representation: </label>
                                                    <select 
                                                        name={ `${NodeID}-representation` } 
                                                        onChange={ event => setState({
                                                            ...state,
                                                            LEAF: {
                                                                ...state.LEAF,
                                                                representation: event.target.value
                                                            }
                                                        })} 
                                                        value={state.LEAF.representation}
                                                        className="w-32" >
                                                            <option value="NNWeights">Neural Network</option>
                                                            <option disabled value="RuleSet">Rules (Coming Soon)</option>
                                                    </select>    
                                                </div>
                                                <hr />
                                                <div className="mb-4">
                                                    {
                                                        state.LEAF.representation === "NNWeights" && <div>
                                                            {NeuralNetworkConfiguration}
                                                            <button type="button" className="float-right" onClick={_ => {
                                                                let stateCopy = {...state}
                                                                stateCopy.network.hidden_layers.push({
                                                                    layer_name: `hidden-${state.network.hidden_layers.length}`,
                                                                    layer_type: 'dense',
                                                                    layer_params: {
                                                                        units: 2 * Object.keys(state.caoState.context).length,
                                                                        activation: 'tanh',
                                                                        use_bias: true
                                                                    }  
                                                                })
                                                                setState(stateCopy)
                                                            }}><BiPlusMedical /></button><br />
                                                            <hr />
                                                            <div key={`${NodeID}-op-layer`}>
                                                                <h6 className="mb-2">Output Layer</h6>
                                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-center"
                                                                >
                                                                    <div>
                                                                        <label className="mr-2">Activation: </label>
                                                                        <select 
                                                                            defaultValue="relu"
                                                                            value={ state.network.outputs[0].activation }
                                                                            onChange={event => {
                                                                                let modifiedOpLayerState = {...state}
                                                                                modifiedOpLayerState.network.outputs[0].activation = event.target.value
                                                                                setState(modifiedOpLayerState)
                                                                            }}
                                                                        >
                                                                            {ActivationFunctions.map((activationFn, _) => <option value={activationFn}>{activationFn}</option>)}
                                                                        </select> 
                                                                    </div>

                                                                    <div>
                                                                        <label className="mr-2">Use Bias: </label>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            defaultChecked={ true }
                                                                            checked={ state.network.outputs[0].use_bias }
                                                                            onChange={event => {
                                                                                let modifiedOpLayerState = {...state}
                                                                                modifiedOpLayerState.network.outputs[0].use_bias = event.target.checked
                                                                                setState(modifiedOpLayerState)
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    }
                                                </div>

                                           </Card.Body>

    // Create the configuration Panel
    const EvolutionConfigurationPanel = <Card.Body className="overflow-y-auto h-40 text-xs">

                                            <div className="flex flex-col mb-2">
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Num Generations</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="1" 
                                                        defaultValue={ 10 }
                                                        value={ state.evolution.nb_generations }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        nb_generations: parseInt(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Population Size</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="1" 
                                                        defaultValue={ 10 }
                                                        value={ state.evolution.population_size }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        population_size: parseInt(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Num Elites</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="1" 
                                                        defaultValue={ 2 }
                                                        value={ state.evolution.nb_elites }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        nb_elites: parseInt(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Parent Selection</label>
                                                    <select defaultValue="tournament"
                                                        value={ state.evolution.parent_selection }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        parent_selection: event.target.value
                                                                    }
                                                                })
                                                            }
                                                    >
                                                        <option value="tournament">Tournament</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Remove Population %</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="0.01" 
                                                        defaultValue={ 0.8 }
                                                        value={ state.evolution.remove_population_pct }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        remove_population_pct: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Mutation Type</label>
                                                    <select defaultValue="gaussian_noise_percentage"
                                                        value={ state.evolution.mutation_type }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        mutation_type: event.target.value
                                                                    }
                                                                })
                                                            }
                                                    >
                                                        <option value="gaussian_noise_percentage">Gaussian Noise Percentage</option>
                                                        <option value="gaussian_noise_fixed">Gaussian Noise Fixed</option>
                                                        <option value="uniform_reset">Uniform Reset</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Mutation Probability</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="0.01" 
                                                        defaultValue={ 0.1 }
                                                        value={ state.evolution.mutation_probability }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        mutation_probability: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Mutation Factor</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="0.01" 
                                                        defaultValue={ 0.1 }
                                                        value={ state.evolution.mutation_factor }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        mutation_factor: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Initialization Distribution</label>
                                                    <select defaultValue="orthogonal"
                                                        value={ state.evolution.initialization_distribution }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        initialization_distribution: event.target.value
                                                                    }
                                                                })
                                                            }
                                                    >
                                                        <option value="orthogonal">Orthogonal</option>
                                                        <option value="uniform">Uniform</option>
                                                        <option value="normal">Normal</option>
                                                        <option value="cauchy">Cauchy</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Initialization Range</label>
                                                    <input style={{width: "2rem"}}
                                                        type="number" 
                                                        step="0.01" 
                                                        defaultValue={ 1 }
                                                        value={ state.evolution.initialization_range }
                                                        onChange={
                                                            event => setState({
                                                                    ...state,
                                                                    evolution: {
                                                                        ...state.evolution,
                                                                        initialization_range: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                            </div>
                                            
                                        </Card.Body>

    // Create the Component structure
    return <BleuprintCard 
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }>
                
            <Card border="warning" style={{ height: "100%" }}>
                    <Card.Body className="flex justify-center content-center">
                        <Text className="mr-2">{ state.selectedPredictor || "Prescriptor" }</Text>
                        <Popover
                        content={
                            <>
                                <Tablist marginBottom={16} flexBasis={240} marginRight={24}>
                                        {tabs.map((tab, index) => (
                                    <Tab
                                        key={tab}
                                        id={tab}
                                        onSelect={() => setSelectedIndex(index)}
                                        isSelected={index === selectedIndex}
                                        aria-controls={`panel-${tab}`}
                                    >
                                        {tab}
                                    </Tab>
                                    ))}
                                </Tablist>
                                { selectedIndex === 0  && PrescriptorRepresentationPanel }
                                { selectedIndex === 1  && EvolutionConfigurationPanel }
                                { selectedIndex === 2  && ObjectiveConfigurationPanel }
                                { selectedIndex === 3  && EvaluatorOverridePanel }
                            </>
                        }
                        >   
                            <div className="flex">
                                
                                <button type="button" className="mt-1"  style={{height: 0}}> <GrSettingsOption /></button>
                            </div>
                        </Popover>
                        <Popover
                            position={Position.LEFT}
                            content={
                                <Card.Body 
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Context</Text>
                                    {
                                        Object.keys(state.caoState.context).map(element => 
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={true}
                                            checked={state.caoState.context[element]}
                                            onChange={event => updateCAOState(event, "context")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button" className="absolute top-5 -left-4" style={{height: 0}}>C</button>
                        </Popover>
                        <Popover
                            position={Position.RIGHT}
                            content={
                                <Card.Body 
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Actions</Text>
                                    {
                                        Object.keys(state.caoState.action).map(element => 
                                        <div 
                                        key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={true}
                                            checked={state.caoState.action[element]}
                                            onChange={event => updateCAOState(event, "action")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button" className="absolute top-5 -right-4" style={{height: 0}}>A</button>
                        </Popover>

                    </Card.Body>
                </Card>

                <Handle type="source" position={HandlePosition.Right} />
                <Handle type="target" position={HandlePosition.Left} />
        </BleuprintCard>
}
