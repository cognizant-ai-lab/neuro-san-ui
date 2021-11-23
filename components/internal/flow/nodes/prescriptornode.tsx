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

import { Controlled as CodeMirror } from 'react-codemirror2'
import {loadDataTag} from "../../../../controller/fetchdatataglist";

// Define an interface for the structure
// of the nodes
export interface PrescriptorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly EvaluatorOverrideCode: any,
    readonly UpdateEvaluateOverrideCode: any,

    readonly ParentPrescriptorState: any,
    readonly SetParentPrescriptorState: any
}


export default function PrescriptorNode(props): React.ReactElement {
    /*
    This function is responsible for rendering the prescriptor node.
    */

    const data: PrescriptorNodeData = props.data

    // Unpack the mapping
    const { 
        NodeID, 
        ParentPrescriptorState, SetParentPrescriptorState,
        EvaluatorOverrideCode, UpdateEvaluateOverrideCode
    } = data

     console.log(ParentPrescriptorState)

    const updateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        let caoStateCopy = { ...ParentPrescriptorState.caoState }

        caoStateCopy[espType][name] = checked

        SetParentPrescriptorState({
            ...ParentPrescriptorState,
            caoState: caoStateCopy
        })
    }

    // Since predictors change
    const [taggedData, setTaggedData] = useState(null)

    // Fetch the Data Tag
    useEffect(() => {
        (async () => setTaggedData(await loadDataTag(data.SelectedDataSourceId)))()
    }, [data.SelectedDataSourceId])

    useEffect(() => {

        if (taggedData) {

            // Build the CAO State for the data tag from the given data source id
            const CAOState = ParentPrescriptorState.caoState

            if (taggedData) {
                Object.keys(taggedData.fields).forEach(fieldName => {
                    const field = taggedData.fields[fieldName]
                    switch (field.esp_type.toString()) {
                        case "CONTEXT":
                            CAOState.context[fieldName] = CAOState.context[fieldName] ?? true
                            break
                        case "ACTION":
                            CAOState.action[fieldName] = CAOState.action[fieldName] ?? true
                            break
                    }
                })
            }

            let initializedState = {...ParentPrescriptorState}
            initializedState.caoState = CAOState
            initializedState.network.inputs[0].size = CAOState.context.length
            initializedState.network.hidden_layers[0].layer_params.units = 2 * CAOState.context.length
            initializedState.network.outputs[0].size = CAOState.action.length

            SetParentPrescriptorState({
                ...initializedState,
                caoState: CAOState
            })

        }
        
    }, [taggedData])

    // We want to have a tabbed prescriptor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Representation', 'Evolution Parameters', 'Objective Configuration', 'Override Evaluator'])
    console.log(ParentPrescriptorState.evolution.fitness)

    // Create a min/max selector for each desired outcome
    const ObjectiveConfigurationPanel = ParentPrescriptorState.evolution.fitness
        .map((metric, _) => {
            return <div className="p-2 grid grid-cols-2 gap-4 mb-2" key={metric.metric_name} >
                <label>{metric.metric_name}: </label>
                <select
                    key="objective-select"
                    value={metric.maximize}
                    onChange={event => {
                        // Update maximize/minimize status for selected outcome
                        let fitness = ParentPrescriptorState.evolution.fitness
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
                        SetParentPrescriptorState({
                            ...ParentPrescriptorState,
                            evolution: {
                                ...ParentPrescriptorState.evolution,
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
                    let stateCopy = {...ParentPrescriptorState}
                    stateCopy.network.hidden_layers.splice(idx, 1)
                    SetParentPrescriptorState(stateCopy)
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
                            let modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(event.target.value)
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    /> 
                </div>
                <div>
                    <label className="mr-2">Activation: </label>
                    <select 
                        defaultValue="tanh"
                        value={ hiddenLayer.layer_params.activation }
                        onChange={event => {
                            let modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation = event.target.value
                            SetParentPrescriptorState(modifiedHiddenLayerState)
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
                            let modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.use_bias = event.target.checked
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    />
                </div>
            </div>
        </div>
    )
    const NeuralNetworkConfiguration = ParentPrescriptorState.network.hidden_layers.map((hiddenLayer, idx) => createNeuralNetworkLayer(hiddenLayer, idx))

    const PrescriptorRepresentationPanel = <Card.Body>

                                                <div className="flex justify-between mb-4 content-center">
                                                    <label>Representation: </label>
                                                    <select 
                                                        name={ `${NodeID}-representation` } 
                                                        onChange={ event => SetParentPrescriptorState({
                                                            ...ParentPrescriptorState,
                                                            LEAF: {
                                                                ...ParentPrescriptorState.LEAF,
                                                                representation: event.target.value
                                                            }
                                                        })} 
                                                        value={ParentPrescriptorState.LEAF.representation}
                                                        className="w-32" >
                                                            <option value="NNWeights">Neural Network</option>
                                                            <option disabled value="RuleSet">Rules (Coming Soon)</option>
                                                    </select>    
                                                </div>
                                                <hr />
                                                <div className="mb-4">
                                                    {
                                                        ParentPrescriptorState.LEAF.representation === "NNWeights" && <div>
                                                            {NeuralNetworkConfiguration}
                                                            <button type="button" className="float-right" onClick={_ => {
                                                                let stateCopy = {...ParentPrescriptorState}
                                                                stateCopy.network.hidden_layers.push({
                                                                    layer_name: `hidden-${ParentPrescriptorState.network.hidden_layers.length}`,
                                                                    layer_type: 'dense',
                                                                    layer_params: {
                                                                        units: 2 * Object.keys(ParentPrescriptorState.caoState.context).length,
                                                                        activation: 'tanh',
                                                                        use_bias: true
                                                                    }  
                                                                })
                                                                SetParentPrescriptorState(stateCopy)
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
                                                                            value={ ParentPrescriptorState.network.outputs[0].activation }
                                                                            onChange={event => {
                                                                                let modifiedOpLayerState = {...ParentPrescriptorState}
                                                                                modifiedOpLayerState.network.outputs[0].activation = event.target.value
                                                                                SetParentPrescriptorState(modifiedOpLayerState)
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
                                                                            checked={ ParentPrescriptorState.network.outputs[0].use_bias }
                                                                            onChange={event => {
                                                                                let modifiedOpLayerState = {...ParentPrescriptorState}
                                                                                modifiedOpLayerState.network.outputs[0].use_bias = event.target.checked
                                                                                SetParentPrescriptorState(modifiedOpLayerState)
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
                                                        value={ ParentPrescriptorState.evolution.nb_generations }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.population_size }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.nb_elites }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
                                                                        nb_elites: parseInt(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Parent Selection</label>
                                                    <select defaultValue="tournament"
                                                        value={ ParentPrescriptorState.evolution.parent_selection }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.remove_population_pct }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
                                                                        remove_population_pct: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Mutation Type</label>
                                                    <select defaultValue="gaussian_noise_percentage"
                                                        value={ ParentPrescriptorState.evolution.mutation_type }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.mutation_probability }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.mutation_factor }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
                                                                        mutation_factor: parseFloat(event.target.value)
                                                                    }
                                                                })
                                                            }
                                                    /> 
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Initialization Distribution</label>
                                                    <select defaultValue="orthogonal"
                                                        value={ ParentPrescriptorState.evolution.initialization_distribution }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                                                        value={ ParentPrescriptorState.evolution.initialization_range }
                                                        onChange={
                                                            event => SetParentPrescriptorState({
                                                                    ...ParentPrescriptorState,
                                                                    evolution: {
                                                                        ...ParentPrescriptorState.evolution,
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
                        <Text className="mr-2">{ ParentPrescriptorState.selectedPredictor || "Prescriptor" }</Text>
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
                                        Object.keys(ParentPrescriptorState.caoState.context).map(element =>
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={true}
                                            checked={ParentPrescriptorState.caoState.context[element]}
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
                                        Object.keys(ParentPrescriptorState.caoState.action).map(element =>
                                        <div 
                                        key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={true}
                                            checked={ParentPrescriptorState.caoState.action[element]}
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
