// Import React components
import {
    useState,
    useEffect, ReactElement
} from 'react'

// Import 3rd party components
import { 
    Card, Col, Container, Row
} from "react-bootstrap"
import { 
    Popover, 
    Text, 
    Position, 
    Tablist, 
    Tab
} from "evergreen-ui"
import Slider from "rc-slider"
import {AiFillDelete} from "react-icons/ai";
import { GrSettingsOption } from "react-icons/gr"
import { MdDelete } from "react-icons/md"
import { BiPlusMedical } from "react-icons/bi"
import { 
    Card as BlueprintCard,
    Elevation 
} from "@blueprintjs/core";
import {Tooltip as AntdTooltip} from "antd"

// Import React Flow
import {
    Handle,
    Position as HandlePosition
} from 'react-flow-renderer'

import SyntaxHighlighter from 'react-syntax-highlighter';
import {docco} from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import {loadDataTag} from "../../../../controller/fetchdatataglist";
import {useSession} from "next-auth/react";
import {NotificationType, sendNotification} from "../../../../controller/notification";

// Define an interface for the structure
// of the nodes
interface PrescriptorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly EvaluatorOverrideCode
    readonly UpdateEvaluateOverrideCode

    readonly ParentPrescriptorState
    readonly SetParentPrescriptorState

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number
}

// For RuleBased
const defaultRepresentationConfig = {
    max_exponent: 3,
    number_of_building_block_conditions: 1,
    number_of_building_block_rules: 3
}

export default function PrescriptorNode(props): ReactElement {
    /*
    This function is responsible for rendering the prescriptor node.
    */

    const data: PrescriptorNodeData = props.data

    // Get the current user
    const { data: session } = useSession()
    const currentUser: string = session.user.name

    // Unpack the mapping
    const { 
        NodeID, 
        ParentPrescriptorState,
        SetParentPrescriptorState,
        EvaluatorOverrideCode,
        DeleteNode,
        GetElementIndex
    } = data

    const flowIndex = GetElementIndex(NodeID)

    const updateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        const caoStateCopy = { ...ParentPrescriptorState.caoState }

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
        //TODO: If the data node has the data source and tag available we should not fetch it but use that.
        //TODO: Reason: Data Tags can change and we don't version them explicitly - this will be an easy way of doing that. If they were to change and we had to re-run a run it might fail
        (async () => setTaggedData(await loadDataTag(currentUser, data.SelectedDataSourceId)))()
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

            const initializedState = {...ParentPrescriptorState}
            initializedState.caoState = CAOState

            if (ParentPrescriptorState.network.hidden_layers[0].layer_params.units === 0) {
                initializedState.network.inputs[0].size = CAOState.context.length
                initializedState.network.hidden_layers[0].layer_params.units = 2 * CAOState.context.length
                initializedState.network.outputs[0].size = CAOState.action.length
            }

            if (!("representation_config" in ParentPrescriptorState)) {
                initializedState.representation_config = defaultRepresentationConfig
            }

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

    // Create a min/max selector for each desired outcome
    const ObjectiveConfigurationPanel = ParentPrescriptorState.evolution.fitness
        .map(metric => {
            return <div className="p-2 grid grid-cols-2 gap-4 mb-2" key={metric.metric_name} >
                <label>{metric.metric_name}: </label>
                <select
                    id={ `prescriptor-${flowIndex}-objective-select-${metric.name}` }
                    key="objective-select"
                    value={metric.maximize}
                    onChange={event => {
                        // Update maximize/minimize status for selected outcome
                        const fitness = ParentPrescriptorState.evolution.fitness
                            .map(f => {
                                if (f.metric_name === metric.metric_name) {
                                    return {
                                        metric_name: f.metric_name,
                                        maximize: event.target.value === "true"
                                    }
                                } else {
                                    return f
                                }
                            })

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
                    <option
                        id={ `prescriptor-${flowIndex}-objective-maximize-${metric.name}` }
                        value="true">
                        Maximize
                    </option>
                    <option
                        id={ `prescriptor-${flowIndex}-objective-minimize-${metric.name}` }
                        value="false">
                        Minimize
                    </option>
                </select>
            </div>
    })
    
    const EvaluatorOverridePanel =
        <Card.Body>
            <SyntaxHighlighter language="python" style={docco} showLineNumbers={true}>
                {EvaluatorOverrideCode}
            </SyntaxHighlighter>
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
                id={ `prescriptor-${flowIndex}-hidden-layer-${idx}` }
                style={{width: "1rem"}}
                className="mb-2"
                type="button" onClick={() => {
                    const stateCopy = {...ParentPrescriptorState}
                    stateCopy.network.hidden_layers.splice(idx, 1)
                    SetParentPrescriptorState(stateCopy)
                }}><MdDelete /></button>
            <div className="grid grid-cols-3 gap-1 mb-2 justify-items-center"
            >
                <div>
                    <label className="mr-2">Units: </label>
                    <input style={{width: "2rem"}}
                        id={ `prescriptor-${flowIndex}-units-input` }
                        type="number" 
                        step="1" 
                        value={ hiddenLayer.layer_params.units }
                        onChange={event => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(event.target.value)
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    /> 
                </div>
                <div>
                    <label className="mr-2">Activation: </label>
                    <select 
                        id={ `prescriptor-${flowIndex}-activation-select` }
                        defaultValue="tanh"
                        value={ hiddenLayer.layer_params.activation }
                        onChange={event => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation = event.target.value
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    >
                        {ActivationFunctions.map(activationFn =>
                            <option id={ `prescriptor-${flowIndex}-activation-${activationFn}` }
                                key={`hidden-layer-activation-${activationFn}`}
                                value={activationFn}>
                                    {activationFn}
                            </option>)
                        }
                    </select> 
                </div>

                <div>
                    <label className="mr-2">Use Bias: </label>
                    <input 
                        id={ `prescriptor-${flowIndex}-use-bias-input` }
                        type="checkbox" 
                        defaultChecked={ true }
                        checked={ hiddenLayer.layer_params.use_bias }
                        onChange={event => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.use_bias = event.target.checked
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    />
                </div>
            </div>
        </div>
    )
    const NeuralNetworkConfiguration = ParentPrescriptorState.network.hidden_layers.map((hiddenLayer, idx) => createNeuralNetworkLayer(hiddenLayer, idx))

    const createRulesConfig = (representationConfig) =>
        <Container key={`${NodeID}-rules-config`} id={`prescriptor-${flowIndex}-rules-config`}
                   onMouseDown={(event) => { event.stopPropagation() }}>
            <Row className="mx-2 my-8">
                <Col id={ `prescriptor-${flowIndex}-max-exponent-label` } md={5}>
                    Max Exponent:
                </Col>
                <Col md={4}>
                    <Slider
                        step={1}
                        min={0}
                        max={9}
                        value={Number(representationConfig.max_exponent)}
                        marks={{
                            0: {label: "0"},
                            9: {label: "9", style: {color: "#666"}}  // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <AntdTooltip title={`${representationConfig.max_exponent}`}>{node}</AntdTooltip>
                            )
                        }}
                        onChange={event => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.max_exponent = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
            <Row className="mx-2 my-8">
                <Col id={`prescriptor-${flowIndex}-num-building-block-conditions-label`}  md={5}>
                    # Building Block Conditions:
                </Col>
                <Col md={4}>
                    <Slider
                        step={1}
                        min={1}
                        max={9}
                        value={Number(representationConfig.number_of_building_block_conditions)}
                        marks={{
                            1: {label: "1"},
                            9: {label: "9", style: {color: "#666"}}  // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <AntdTooltip title={`${representationConfig.number_of_building_block_conditions}`}>{node}</AntdTooltip>
                            )
                        }}
                        onChange={event => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_conditions = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
            <Row className="mx-2 my-8">
                <Col id={`prescriptor-${flowIndex}-num-building-block-rules-label`} md={5}>
                    # Building Block Rules:
                </Col>
                <Col md={4}>
                    <Slider
                        step={1}
                        min={1}
                        max={99}
                        value={Number(representationConfig.number_of_building_block_rules)}
                        marks={{
                            1: {label: "1"},
                            99: {label: "99", style: {color: "#666"}}  // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <AntdTooltip title={`${representationConfig.number_of_building_block_rules}`}>{node}</AntdTooltip>
                            )
                        }}
                        onChange={event => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_rules = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
    </Container>

    let useRepresentationConfig = defaultRepresentationConfig
    if ("representation_config" in ParentPrescriptorState) {
        useRepresentationConfig = ParentPrescriptorState.representation_config
    }

    const PrescriptorRepresentationPanel = <Card.Body>
                                                <div className="flex justify-between mb-4 content-center">
                                                    <label>Representation: </label>
                                                    <select 
                                                        id={ `prescriptor-${flowIndex}-representation-select` }
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
                                                            <option 
                                                                id={ `prescriptor-${flowIndex}-representation-nn-weights` }
                                                                value="NNWeights">
                                                                Neural Network
                                                            </option>
                                                            <option 
                                                                id={ `prescriptor-${flowIndex}-representation-rules` }
                                                                value="RuleBased">
                                                                Rules
                                                            </option>
                                                    </select>    
                                                </div>
                                                <hr />
                                                <div className="mb-4">
                                                    {
                                                        ParentPrescriptorState.LEAF.representation === "NNWeights" && <div>
                                                            {NeuralNetworkConfiguration}
                                                            <button type="button" className="float-right"
                                                                id={ `prescriptor-${flowIndex}-nn-weights-button` }
                                                                onClick={() => {
                                                                    const stateCopy = {...ParentPrescriptorState}
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
                                                                }}
                                                            >
                                                                <BiPlusMedical />
                                                            </button>
                                                        </div>
                                                    }
                                                    {
                                                        ParentPrescriptorState.LEAF.representation === "RuleBased" && <div>
                                                            {createRulesConfig(useRepresentationConfig)}
                                                        </div>
                                                    }
                                                </div>

                                           </Card.Body>

    // Create the configuration Panel
    const EvolutionConfigurationPanel = <Card.Body className="overflow-y-auto h-40 text-xs">

                                            <div className="flex flex-col mb-2">
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Num Generations</label>
                                                    <input style={{width: "3rem"}}
                                                        id={ `prescriptor-${flowIndex}-num-generations-input` }
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
                                                    <input style={{width: "3rem"}}
                                                        id={ `prescriptor-${flowIndex}-population-size-input` }
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
                                                    <input style={{width: "3rem"}}
                                                        id={ `prescriptor-${flowIndex}-num-elites-input` }
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
                                                        id={ `prescriptor-${flowIndex}-parent-selection-select` }
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
                                                        <option id={ `prescriptor-${flowIndex}-parent-selection-tournament` }
                                                            value="tournament">
                                                            Tournament
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Remove Population %</label>
                                                    <input style={{width: "3rem"}}
                                                        id={ `prescriptor-${flowIndex}-remove-population-percentage` }
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
                                                        id={ `prescriptor-${flowIndex}-mutation-select` }
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
                                                        <option id={ `prescriptor-${flowIndex}-mutation-gaussian-noise-percentage` }
                                                            value="gaussian_noise_percentage">
                                                            Gaussian Noise Percentage
                                                        </option>
                                                        <option id={ `prescriptor-${flowIndex}-mutation-gaussian-noise-fixed` }
                                                            value="gaussian_noise_fixed">
                                                            Gaussian Noise Fixed
                                                        </option>
                                                        <option id={ `prescriptor-${flowIndex}-mutation-uniform-reset` }
                                                            value="uniform_reset">
                                                            Uniform Reset
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Mutation Probability</label>
                                                    <input style={{width: "2rem"}}
                                                        id={ `prescriptor-${flowIndex}-mutation-probability-input` }
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
                                                        id={ `prescriptor-${flowIndex}-mutation-factor-input` }
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
                                                        id={ `prescriptor-${flowIndex}-distribution-select` }
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
                                                        <option id={ `prescriptor-${flowIndex}-distribution-orthogonal` }
                                                            value="orthogonal">
                                                            Orthogonal
                                                        </option>
                                                        <option id={ `prescriptor-${flowIndex}-distribution-uniform` }
                                                            value="uniform">
                                                            Uniform
                                                        </option>
                                                        <option id={ `prescriptor-${flowIndex}-distribution-normal` }
                                                            value="normal">
                                                            Normal
                                                        </option>
                                                        <option id={ `prescriptor-${flowIndex}-distribution-cauchy` }
                                                            value="cauchy">
                                                            Cauchy
                                                        </option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                                                    <label>Initialization Range</label>
                                                    <input style={{width: "2rem"}}
                                                        id={ `prescriptor-${flowIndex}-initialization-range-input` }
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
    return <BlueprintCard
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }>
                
            <Card border="warning" style={{ height: "100%" }}>
                    <Card.Body className="flex justify-center content-center">
                        <Text className="mr-2">{ ParentPrescriptorState.selectedPredictor || "Prescriptor" }</Text>
                        <Popover content={
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
                                {selectedIndex === 0 && PrescriptorRepresentationPanel}
                                {selectedIndex === 1 && EvolutionConfigurationPanel}
                                {selectedIndex === 2 && ObjectiveConfigurationPanel}
                                {selectedIndex === 3 && EvaluatorOverridePanel}
                            </>
                        }
                             statelessProps={{
                                 backgroundColor: "ghostwhite"
                             }}
                        >
                            <div className="flex">
                                
                                <button type="button" 
                                    id={ `prescriptor-${flowIndex}-gr-settings-button` }
                                    className="mt-1"  style={{height: 0}}>
                                        <GrSettingsOption />
                                </button>
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
                                            <input id={ `prescriptor-${flowIndex}-context-input` }
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
                            <button type="button"
                                id={ `prescriptor-${flowIndex}-context-button` }
                                className="absolute top-5 -left-4"
                                style={{height: 0}}>C</button>
                        </Popover>
                        <Popover
                            position={Position.RIGHT}
                            content={
                                <Card.Body 
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Actions</Text>
                                    {
                                        Object.keys(ParentPrescriptorState.caoState.action).map(element =>
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input id={ `prescriptor-${flowIndex}-actions-input` }
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
                            <button type="button"
                                id={ `prescriptor-${flowIndex}-action-button` }
                                className="absolute top-5 -right-4"
                                style={{height: 0}}>A</button>
                        </Popover>

                    </Card.Body>
                    <div className="px-1 my-1" style={{position: "absolute", bottom: "0px", right: "1px"}}>
                        <button type="button"
                                id="delete-me"
                                className="hover:text-red-700 text-xs"
                                onClick={() => {
                                    DeleteNode(NodeID)
                                    sendNotification(NotificationType.success, "Prescriptor node deleted")
                                }}
                        >
                            <AiFillDelete size="10"/>
                        </button>
                    </div>
                </Card>

                <Handle type="source" position={HandlePosition.Right} />
                <Handle type="target" position={HandlePosition.Left} />
        </BlueprintCard>
}
