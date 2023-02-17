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

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `prescriptor-${flowIndex}`

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
    const ObjectiveConfigurationPanel = ParentPrescriptorState.evolution.fitness.map(metric => {
        const metricPrefix = `${flowPrefix}-metric-${metric.name}`
        return <div id={ `${metricPrefix}` }
            className="p-2 grid grid-cols-2 gap-4 mb-2"
            key={metric.metric_name} >
            <label id={ `${metricPrefix}-metric-name` }>
                {metric.metric_name}: </label>
            <select
                id={ `${metricPrefix}-objective-select` }
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
                    id={ `${metricPrefix}-objective-maximize` }
                    value="true">
                    Maximize
                </option>
                <option
                    id={ `${metricPrefix}-objective-minimize` }
                    value="false">
                    Minimize
                </option>
            </select>
        </div>
    })
    
    const EvaluatorOverridePanel =
        <Card.Body id={ `${flowPrefix}-evaluator-override-code` }>
            <SyntaxHighlighter id={ `${flowPrefix}-evaluator-override-code-syntax-highlighter` }
                language="python" style={docco} showLineNumbers={true}>
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
        <div id={ `${flowPrefix}-hidden-layer-${idx}` }
            key={`${NodeID}-hiddenlayer-${idx}`}>
            <h6 id={ `${flowPrefix}-hidden-layer-${idx}-headline` }
                style={{display: "inline"}}>
                Hidden Layer {idx + 1} </h6>
            <button id={ `${flowPrefix}-hidden-layer-${idx}-button` }
                style={{width: "1rem"}}
                className="mb-2"
                type="button" onClick={(event) => {
                    event.stopPropagation()
                    if (ParentPrescriptorState.network.hidden_layers.length === 1) {
                        sendNotification(NotificationType.warning, "Last remaining hidden layer cannot be deleted")
                    } else {
                        const stateCopy = {...ParentPrescriptorState}
                        stateCopy.network.hidden_layers.splice(idx, 1)
                        SetParentPrescriptorState(stateCopy)
                    }
                }}>
                <MdDelete id={ `${flowPrefix}-hidden-layer-${idx}-delete` }/>
            </button>
            <div id={ `${flowPrefix}-hidden-layer-${idx}-neural-net-config` }
                className="grid grid-cols-3 gap-1 mb-2 justify-items-center">
                <div id={ `${flowPrefix}-hidden-layer-${idx}-units` }>
                    <label id={ `${flowPrefix}-hidden-layer-${idx}-units-label` }className="mr-2">
                        Units: </label>
                    <input style={{width: "2rem"}}
                        id={ `${flowPrefix}-hidden-layer-${idx}-units-input` }
                        type="number" 
                        step="1" 
                        min={8}
                        max={256}
                        value={ hiddenLayer.layer_params.units }
                        onChange={event => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(event.target.value)
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    /> 
                </div>
                <div id={ `${flowPrefix}-hidden-layer-${idx}-activation` }>
                    <label id={ `${flowPrefix}-hidden-layer-${idx}-activation-label` } className="mr-2">
                        Activation: </label>
                    <select id={ `${flowPrefix}-hidden-layer-${idx}-activation-select` }
                        defaultValue="tanh"
                        value={ hiddenLayer.layer_params.activation }
                        onChange={event => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation = event.target.value
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    >
                        {ActivationFunctions.map(activationFn =>
                            <option id={ `${flowPrefix}-hidden-layer-${idx}-activation-${activationFn}` }
                                key={`hidden-layer-activation-${activationFn}`}
                                value={activationFn}>
                                    {activationFn}
                            </option>)
                        }
                    </select> 
                </div>

                <div id={ `${flowPrefix}-hidden-layer-${idx}-use-bias` }>
                    <label id={ `${flowPrefix}-hidden-layer-${idx}-use-bias-label` }className="mr-2">
                        Use Bias: </label>
                    <input id={ `${flowPrefix}-hidden-layer-${idx}-use-bias-input` }
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
        <Container id={`${flowPrefix}-rules-config`}
            key={`${NodeID}-rules-config`}> 
            <Row id={ `${flowPrefix}-max-exponent` }
                className="mx-2 my-8">
                <Col id={ `${flowPrefix}-max-exponent-label` } md={5}>
                    Max Exponent:
                </Col>
                <Col id={ `${flowPrefix}-max-exponent-slider` } md={4}>
                    <Slider     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Slider does not have an id property when compiling
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
                                <AntdTooltip id={ `${flowPrefix}-max-exponent-tooltip` }
                                    title={`${representationConfig.max_exponent}`}>
                                    {node}
                                </AntdTooltip>
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
            <Row id={ `${flowPrefix}-number-of-building-block-conditions` }
                className="mx-2 my-8">
                <Col id={`${flowPrefix}-number-of-building-block-conditions-label`}  md={5}>
                    # Building Block Conditions:
                </Col>
                <Col id={ `${flowPrefix}-number-of-building-block-conditions-slider` } md={4}>
                    <Slider     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Slider does not have an id property when compiling
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
                                <AntdTooltip id={ `${flowPrefix}-number-of-building-block-conditions-tooltip` }
                                    title={`${representationConfig.number_of_building_block_conditions}`}>
                                    {node}
                                </AntdTooltip>
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
            <Row id={ `${flowPrefix}-number-of-building-block-rules` }
                className="mx-2 my-8">
                <Col id={`${flowPrefix}-number-of-building-block-rules-label`} md={5}>
                    # Building Block Rules:
                </Col>
                <Col id={ `${flowPrefix}-number-of-building-block-rules-slider` } md={4}>
                    <Slider     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Slider does not have an id property when compiling
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
                                <AntdTooltip id={ `${flowPrefix}-number-of-building-block-rules-tooltip` }
                                    title={`${representationConfig.number_of_building_block_rules}`}>
                                    {node}
                                </AntdTooltip>
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

    const PrescriptorRepresentationPanel = <Card.Body id={ `${flowPrefix}-representation-panel` }>
        <div id={ `${flowPrefix}-representation-div` }
            className="flex justify-between mb-4 content-center">
            <label id={ `${flowPrefix}-representation-label` } >
                Representation: </label>
            <select 
                id={ `${flowPrefix}-representation-select` }
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
                        id={ `${flowPrefix}-representation-nn-weights` }
                        value="NNWeights">
                        Neural Network
                    </option>
                    <option 
                        id={ `${flowPrefix}-representation-rules` }
                        value="RuleBased">
                        Rules
                    </option>
            </select>    
        </div>
        <hr id={ `${flowPrefix}-config-separator` } />
        <div id={ `${flowPrefix}-nn-weights-config-div` } className="mb-4">
            {
                ParentPrescriptorState.LEAF.representation === "NNWeights" &&
                    <div id={ `${flowPrefix}-nn-weights-div` } className="overflow-y-auto h-40">
                        {NeuralNetworkConfiguration}
                        <button type="button" className="float-right"
                            id={ `${flowPrefix}-nn-weights-button` }
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
                            <BiPlusMedical id={ `${flowPrefix}-nn-weights-button-plus` } />
                        </button>
                    </div>
            }
            {
                ParentPrescriptorState.LEAF.representation === "RuleBased" &&
                    <div id={ `${flowPrefix}-rules-config-div` } >
                        {createRulesConfig(useRepresentationConfig)}
                    </div>
            }
        </div>

    </Card.Body>

    // Create the configuration Panel
    const EvolutionConfigurationPanel = <Card.Body id={ `${flowPrefix}-evolution-configuration-panel` } 
        className="overflow-y-auto h-40 text-xs">
        <div id={ `${flowPrefix}-evolution-configuration` } 
            className="flex flex-col mb-2">
            <div id={ `${flowPrefix}-num-generations` }
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-num-generations-label` } >
                    Num Generations
                </label>
                <input style={{width: "3rem"}}
                    id={ `${flowPrefix}-num-generations-input` }
                    type="number" 
                    step="1" 
                    min={ 1 }
                    max={ 1000 }
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
            <div id={ `${flowPrefix}-population-size` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-population-size-label` } >
                    Population Size
                </label>
                <input style={{width: "3rem"}}
                    id={ `${flowPrefix}-population-size-input` }
                    type="number" 
                    step="1" 
                    min={5}
                    max={1000}
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
            <div id={ `${flowPrefix}-num-elites` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-num-elites-label` } >
                    Num Elites
                </label>
                <input style={{width: "3rem"}}
                    id={ `${flowPrefix}-num-elites-input` }
                    type="number" 
                    step="1" 
                    min={0}
                    max={100}
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
            <div id={ `${flowPrefix}-parent-selection` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-parent-selection-label` } >
                    Parent Selection
                </label>
                <select defaultValue="tournament"
                    id={ `${flowPrefix}-parent-selection-select` }
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
                    <option id={ `${flowPrefix}-parent-selection-tournament` }
                        value="tournament">
                        Tournament
                    </option>
                </select>
            </div>
            <div id={ `${flowPrefix}-remove-population-percetange` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-remove-population-percentage-label` } >
                    Remove Population %
                </label>
                <input style={{width: "3rem"}}
                    id={ `${flowPrefix}-remove-population-percentage-input` }
                    type="number" 
                    step="0.01" 
                    min={0.0}
                    max={0.99}
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
            <div id={ `${flowPrefix}-mutation` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-mutation-label` } >
                    Mutation Type
                </label>
                <select defaultValue="gaussian_noise_percentage"
                    id={ `${flowPrefix}-mutation-select` }
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
                    <option id={ `${flowPrefix}-mutation-gaussian-noise-percentage` }
                        value="gaussian_noise_percentage">
                        Gaussian Noise Percentage
                    </option>
                    <option id={ `${flowPrefix}-mutation-gaussian-noise-fixed` }
                        value="gaussian_noise_fixed">
                        Gaussian Noise Fixed
                    </option>
                    <option id={ `${flowPrefix}-mutation-uniform-reset` }
                        value="uniform_reset">
                        Uniform Reset
                    </option>
                </select>
            </div>
            <div id={ `${flowPrefix}-mutation-probability` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-mutation-probability-label` } >
                    Mutation Probability
                </label>
                <input style={{width: "2rem"}}
                    id={ `${flowPrefix}-mutation-probability-input` }
                    type="number" 
                    step="0.1" 
                    min={0.0}
                    max={1.0}
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
            <div id={ `${flowPrefix}-mutation-factor` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-mutation-factor-label` } >
                    Mutation Factor
                </label>
                <input style={{width: "2rem"}}
                    id={ `${flowPrefix}-mutation-factor-input` }
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
            <div id={ `${flowPrefix}-initialization-distribution` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-initialization-distribution-label` } >
                    Initialization Distribution
                </label>
                <select defaultValue="orthogonal"
                    id={ `${flowPrefix}-initialization-distribution-select` }
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
                    <option id={ `${flowPrefix}-initialization-distribution-orthogonal` }
                        value="orthogonal">
                        Orthogonal
                    </option>
                    <option id={ `${flowPrefix}-initialization-distribution-uniform` }
                        value="uniform">
                        Uniform
                    </option>
                    <option id={ `${flowPrefix}-initialization-distribution-normal` }
                        value="normal">
                        Normal
                    </option>
                    <option id={ `${flowPrefix}-initialization-distribution-cauchy` }
                        value="cauchy">
                        Cauchy
                    </option>
                </select>
            </div>
            <div id={ `${flowPrefix}-initialization-range` } 
                className="grid grid-cols-2 gap-1 mb-2 justify-items-start">
                <label id={ `${flowPrefix}-initialization-range-label` } >
                    Initialization Range
                </label>
                <input style={{width: "2rem"}}
                    id={ `${flowPrefix}-initialization-range-input` }
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
    return <BlueprintCard id={ `${flowPrefix}` }
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }

    >
        <Card id={ `${flowPrefix}-card-1` }
            border="warning"
            style={{ height: "100%" }}
            onScroll={(event) => {event.stopPropagation()}}
            onWheel={(event) => {event.stopPropagation()}}
        >
            <Card.Body id={ `${flowPrefix}-card-2` }  
                className="flex justify-center content-center"
            >
                <Text id={ `${flowPrefix}-text` } className="mr-2">
                    { ParentPrescriptorState.selectedPredictor || "Prescriptor" }
                </Text>
                <div id={ `${flowPrefix}-settings-div` }
                     onMouseDown={(event) => {event.stopPropagation()}}
                >
                    <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Popover does not have an id property when compiling
                        content={ <>
                            <Tablist id={ `${flowPrefix}-settings-tablist` } 
                                marginBottom={16} flexBasis={240} marginRight={24}>
                                {tabs.map((tab, index) => (
                                    <Tab id={ `${flowPrefix}-settings-${tab}` } 
                                        key={tab}
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
                        <div id={ `${flowPrefix}-gr-settings-div` } className="flex">
                            <button type="button"
                                id={ `${flowPrefix}-gr-settings-button` }
                                className="mt-1"  style={{height: 0}}>
                                    <GrSettingsOption id={ `${flowPrefix}-gr-settings-option` } />
                            </button>
                        </div>
                    </Popover>
                    <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Popover does not have an id property when compiling
                        position={Position.LEFT}
                        content={
                            <Card.Body id={ `${flowPrefix}-context-card` } 
                                className="overflow-y-auto h-40 text-xs">
                                <Text id={ `${flowPrefix}-context-text` } className="mb-2">Context</Text>
                                {
                                    Object.keys(ParentPrescriptorState.caoState.context).map(element =>
                                    <div id={ `${flowPrefix}-context-div` } 
                                        key={element} className="grid grid-cols-2 gap-4 mb-2">
                                        <label id={ `${flowPrefix}-context-label-${element}` }  
                                            className="capitalize"> {element} </label>
                                        <input id={ `${flowPrefix}-context-input-${element}` }
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
                            id={ `${flowPrefix}-context-button` }
                            className="absolute top-5 -left-4"
                            style={{height: 0}}>C</button>
                    </Popover>
                    <Popover    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Popover does not have an id property when compiling
                        position={Position.RIGHT}
                        content={
                            <Card.Body id={ `${flowPrefix}-actions-card` } 
                                className="overflow-y-auto h-40 text-xs">
                                <Text id={ `${flowPrefix}-actions-text` } className="mb-2">Actions</Text>
                                {
                                    Object.keys(ParentPrescriptorState.caoState.action).map(element =>
                                        <div id={ `${flowPrefix}-actions-div-${element}` }  
                                            key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label id={ `${flowPrefix}-actions-label-${element}` } 
                                                className="capitalize"> {element} </label>
                                            <input id={ `${flowPrefix}-actions-input-${element}` }
                                                name={element}
                                                type="checkbox" 
                                                defaultChecked={true}
                                                checked={ParentPrescriptorState.caoState.action[element]}
                                                onChange={event => updateCAOState(event, "action")}/>
                                        </div>
                                    )
                                }
                            </Card.Body>
                        }
                        >
                        <button type="button"
                            id={ `${flowPrefix}-action-button` }
                            className="absolute top-5 -right-4"
                            style={{height: 0}}>A</button>
                    </Popover>
                </div>
            </Card.Body>
            <div id={ `${flowPrefix}-delete-div` } 
                className="px-1 my-1" style={{position: "absolute", bottom: "0px", right: "1px"}}>
                <button id={ `${flowPrefix}-delete-button` } 
                        type="button"
                        className="hover:text-red-700 text-xs"
                        onClick={() => {
                            DeleteNode(NodeID)
                            sendNotification(NotificationType.success, "Prescriptor node deleted")
                        }}
                >
                    <AiFillDelete id={ `${flowPrefix}-delete-button-fill` } size="10"/>
                </button>
            </div>
        </Card>

        <Handle id={ `${flowPrefix}-source-handle` } type="source" position={HandlePosition.Right} />
        <Handle id={ `${flowPrefix}-target-handle` } type="target" position={HandlePosition.Left} />
    </BlueprintCard>
}
