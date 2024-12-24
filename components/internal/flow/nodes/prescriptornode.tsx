import {Card, CardContent, CardHeader, FormControlLabel, Tab, Tabs, Typography} from "@mui/material"
import Checkbox from "@mui/material/Checkbox"
import Tooltip from "@mui/material/Tooltip"
import Slider from "rc-slider"
import {FC, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"
import {Col, Container, Row} from "react-bootstrap"
import {AiFillDelete} from "react-icons/ai"
import {BiPlusMedical} from "react-icons/bi"
import {GrSettingsOption} from "react-icons/gr"
import {MdDelete} from "react-icons/md"
import {Handle, Position as HandlePosition, NodeProps, Node as RFNode} from "reactflow"

import {DataTag} from "../../../../generated/metadata"
import {ConfirmationModal} from "../../../confirmationModal"
import NodePopper from "../../../nodepopper"
import {NotificationType, sendNotification} from "../../../notification"

// Define an interface for the structure
// of the nodes
export interface PrescriptorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly ParentPrescriptorState
    readonly SetParentPrescriptorState

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number

    // Disables deleting of flow node.
    readonly readOnlyNode: boolean

    // Data tag information
    taggedData?: DataTag
}

// For RuleBased
const defaultRepresentationConfig = {
    max_exponent: 3,
    number_of_building_block_conditions: 1,
    number_of_building_block_rules: 3,
}

export type PrescriptorNode = RFNode<PrescriptorNodeData>

const PrescriptorNodeComponent: FC<NodeProps<PrescriptorNodeData>> = (props) => {
    /*
    This function is responsible for rendering the prescriptor node.
    */
    const data = props.data

    // unpack taggedData from props
    const {taggedData = null} = data

    // Unpack the mapping
    const {NodeID, ParentPrescriptorState, SetParentPrescriptorState, DeleteNode, GetElementIndex, readOnlyNode} = data

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `prescriptor-${flowIndex}`

    const updateCAOState = (event, espType: string) => {
        // eslint-disable-next-line no-shadow
        const {name, checked} = event.target
        const caoStateCopy = {...ParentPrescriptorState.caoState}

        caoStateCopy[espType][name] = checked

        SetParentPrescriptorState({
            ...ParentPrescriptorState,
            caoState: caoStateCopy,
        })
    }

    // Allows the trash icon to change color when hovered over
    const [trashHover, setTrashHover] = useState<boolean>(false)
    const trashColor = trashHover ? "var(--bs-red)" : null

    // For delete node modal
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

    // Called when a user clicks the trash can to delete the node
    const handleDelete = (event: ReactMouseEvent<HTMLElement>) => {
        event.preventDefault()
        setShowDeleteModal(true)
    }

    useEffect(() => {
        if (taggedData) {
            // Build the CAO State for the data tag from the given data source id
            const CAOState = ParentPrescriptorState.caoState

            if (taggedData) {
                Object.keys(taggedData.fields).forEach((fieldName) => {
                    const field = taggedData.fields[fieldName]
                    switch (field.espType.toString()) {
                        case "CONTEXT":
                            CAOState.context[fieldName] = CAOState.context[fieldName] ?? true
                            break
                        case "ACTION":
                            CAOState.action[fieldName] = CAOState.action[fieldName] ?? true
                            break
                        default:
                            // Not interested in other CAO types here
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
                caoState: CAOState,
            })
        }
    }, [])

    // We want to have a tabbed prescriptor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)

    const tabs = ["Representation", "Evolution Parameters", "Objective Configuration"]

    // Create a min/max selector for each desired outcome
    const objectiveConfigurationPanel = ParentPrescriptorState.evolution.fitness.map((metric) => {
        const metricPrefix = `${flowPrefix}-metric-${metric.metric_name}`
        return (
            <div
                id={metricPrefix}
                className="p-2 grid grid-cols-2 gap-4 mb-2"
                key={metric.metric_name}
            >
                <label id={`${metricPrefix}-metric-name`}>{metric.metric_name}: </label>
                <select
                    id={`${metricPrefix}-objective-select`}
                    key="objective-select"
                    value={metric.maximize}
                    onChange={(event) => {
                        // Update maximize/minimize status for selected outcome
                        const fitness = ParentPrescriptorState.evolution.fitness.map((f) => {
                            if (f.metric_name === metric.metric_name) {
                                return {
                                    metric_name: f.metric_name,
                                    maximize: event.target.value === "true",
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
                                fitness: fitness,
                            },
                        })
                    }}
                >
                    <option
                        id={`${metricPrefix}-objective-maximize`}
                        value="true"
                        disabled={readOnlyNode}
                    >
                        Maximize
                    </option>
                    <option
                        id={`${metricPrefix}-objective-minimize`}
                        value="false"
                        disabled={readOnlyNode}
                    >
                        Minimize
                    </option>
                </select>
            </div>
        )
    })

    // We need to maintain state for selected Representation
    // Possible options are:
    // 1. neural-network
    // 2. rules

    // Create the Neural Network Hidden layer utility
    const activationFunctions = ["tanh", "relu", "linear", "sigmoid", "softmax", "elu", "selu"]
    const createNeuralNetworkLayer = (hiddenLayer, idx) => (
        <div
            id={`${flowPrefix}-hidden-layer-${idx}`}
            key={`${NodeID}-hiddenlayer-${idx}`}
        >
            <h6
                id={`${flowPrefix}-hidden-layer-${idx}-headline`}
                style={{display: "inline"}}
            >
                Hidden Layer {idx + 1}{" "}
            </h6>
            {!readOnlyNode && (
                <button
                    id={`${flowPrefix}-hidden-layer-${idx}-button`}
                    style={{width: "1rem"}}
                    className="mb-2"
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation()
                        if (ParentPrescriptorState.network.hidden_layers.length === 1) {
                            sendNotification(NotificationType.warning, "Last remaining hidden layer cannot be deleted")
                        } else {
                            const stateCopy = {...ParentPrescriptorState}
                            stateCopy.network.hidden_layers.splice(idx, 1)
                            SetParentPrescriptorState(stateCopy)
                        }
                    }}
                >
                    <MdDelete id={`${flowPrefix}-hidden-layer-${idx}-delete`} />
                </button>
            )}
            <div
                id={`${flowPrefix}-hidden-layer-${idx}-neural-net-config`}
                className="grid grid-cols-3 gap-1 mb-2 justify-items-center"
            >
                <div id={`${flowPrefix}-hidden-layer-${idx}-units`}>
                    <label
                        id={`${flowPrefix}-hidden-layer-${idx}-units-label`}
                        className="mr-2"
                    >
                        Units:{" "}
                    </label>
                    <input
                        style={{
                            width: "2.25rem",
                            height: "2.25rem",
                            border: "1px solid #97999b",
                            borderRadius: "0.375rem",
                            textAlign: "center",
                        }}
                        id={`${flowPrefix}-hidden-layer-${idx}-units-input`}
                        type="number"
                        step="1"
                        min={8}
                        max={256}
                        value={hiddenLayer.layer_params.units}
                        disabled={readOnlyNode}
                        onChange={(event) => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(
                                event.target.value
                            )
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    />
                </div>
                <div id={`${flowPrefix}-hidden-layer-${idx}-activation`}>
                    <label
                        id={`${flowPrefix}-hidden-layer-${idx}-activation-label`}
                        className="mr-2"
                    >
                        Activation:{" "}
                    </label>
                    <select
                        id={`${flowPrefix}-hidden-layer-${idx}-activation-select`}
                        defaultValue="tanh"
                        value={hiddenLayer.layer_params.activation}
                        disabled={readOnlyNode}
                        onChange={(event) => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation =
                                event.target.value
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    >
                        {activationFunctions.map((activationFn) => (
                            <option
                                id={`${flowPrefix}-hidden-layer-${idx}-activation-${activationFn}`}
                                key={`hidden-layer-activation-${activationFn}`}
                                value={activationFn}
                                disabled={readOnlyNode}
                            >
                                {activationFn}
                            </option>
                        ))}
                    </select>
                </div>

                <div id={`${flowPrefix}-hidden-layer-${idx}-use-bias`}>
                    <label
                        id={`${flowPrefix}-hidden-layer-${idx}-use-bias-label`}
                        className="mr-2"
                    >
                        Use Bias:{" "}
                    </label>
                    <input
                        id={`${flowPrefix}-hidden-layer-${idx}-use-bias-input`}
                        type="checkbox"
                        defaultChecked={true}
                        checked={hiddenLayer.layer_params.use_bias}
                        disabled={readOnlyNode}
                        onChange={(event) => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.use_bias =
                                event.target.checked
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    />
                </div>
            </div>
        </div>
    )
    const neuralNetworkConfiguration = ParentPrescriptorState.network.hidden_layers.map((hiddenLayer, idx) =>
        createNeuralNetworkLayer(hiddenLayer, idx)
    )

    const createRulesConfig = (representationConfig) => (
        <Container
            id={`${flowPrefix}-rules-config`}
            key={`${NodeID}-rules-config`}
        >
            <Row
                id={`${flowPrefix}-max-exponent`}
                className="mx-2 my-8"
            >
                <Col
                    id={`${flowPrefix}-max-exponent-label`}
                    md={5}
                >
                    Max Exponent:
                </Col>
                <Col
                    id={`${flowPrefix}-max-exponent-slider`}
                    md={4}
                >
                    <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Slider does not have an id property when compiling
                        step={1}
                        min={0}
                        max={9}
                        value={Number(representationConfig.max_exponent)}
                        disabled={readOnlyNode}
                        marks={{
                            0: {label: "0"},
                            9: {label: "9", style: {color: "#53565A"}}, // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <Tooltip
                                    id={`${flowPrefix}-max-exponent-tooltip`}
                                    title={`${representationConfig.max_exponent}`}
                                >
                                    {node}
                                </Tooltip>
                            )
                        }}
                        onChange={(event) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.max_exponent = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
            <Row
                id={`${flowPrefix}-number-of-building-block-conditions`}
                className="mx-2 my-8"
            >
                <Col
                    id={`${flowPrefix}-number-of-building-block-conditions-label`}
                    md={5}
                >
                    # Building Block Conditions:
                </Col>
                <Col
                    id={`${flowPrefix}-number-of-building-block-conditions-slider`}
                    md={4}
                >
                    <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Slider does not have an id property when compiling
                        step={1}
                        min={1}
                        max={9}
                        value={Number(representationConfig.number_of_building_block_conditions)}
                        disabled={readOnlyNode}
                        marks={{
                            1: {label: "1"},
                            9: {label: "9", style: {color: "#53565A"}}, // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <Tooltip
                                    id={`${flowPrefix}-number-of-building-block-conditions-tooltip`}
                                    title={`${representationConfig.number_of_building_block_conditions}`}
                                >
                                    {node}
                                </Tooltip>
                            )
                        }}
                        onChange={(event) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_conditions = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
            <Row
                id={`${flowPrefix}-number-of-building-block-rules`}
                className="mx-2 my-8"
            >
                <Col
                    id={`${flowPrefix}-number-of-building-block-rules-label`}
                    md={5}
                >
                    # Building Block Rules:
                </Col>
                <Col
                    id={`${flowPrefix}-number-of-building-block-rules-slider`}
                    md={4}
                >
                    <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Slider does not have an id property when compiling
                        step={1}
                        min={1}
                        max={99}
                        value={Number(representationConfig.number_of_building_block_rules)}
                        disabled={readOnlyNode}
                        marks={{
                            1: {label: "1"},
                            99: {label: "99", style: {color: "#53565A"}}, // To prevent end mark from being "grayed out"
                        }}
                        handleRender={(node) => {
                            return (
                                <Tooltip
                                    id={`${flowPrefix}-number-of-building-block-rules-tooltip`}
                                    title={`${representationConfig.number_of_building_block_rules}`}
                                >
                                    {node}
                                </Tooltip>
                            )
                        }}
                        onChange={(event) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_rules = event
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                    />
                </Col>
            </Row>
        </Container>
    )

    let useRepresentationConfig = defaultRepresentationConfig
    if ("representation_config" in ParentPrescriptorState) {
        useRepresentationConfig = ParentPrescriptorState.representation_config
    }

    const prescriptorRepresentationPanel = (
        <CardContent
            className="pl-5 pr-5"
            id={`${flowPrefix}-representation-panel`}
        >
            <div
                id={`${flowPrefix}-representation-div`}
                className="flex justify-between mb-4 content-center"
            >
                <label id={`${flowPrefix}-representation-label`}>Representation: </label>
                <select
                    id={`${flowPrefix}-representation-select`}
                    name={`${NodeID}-representation`}
                    onChange={(event) =>
                        SetParentPrescriptorState({
                            ...ParentPrescriptorState,
                            LEAF: {
                                ...ParentPrescriptorState.LEAF,
                                representation: event.target.value,
                            },
                        })
                    }
                    value={ParentPrescriptorState.LEAF.representation}
                >
                    <option
                        id={`${flowPrefix}-representation-nn-weights`}
                        value="NNWeights"
                        disabled={readOnlyNode}
                    >
                        Neural Network
                    </option>
                    <option
                        id={`${flowPrefix}-representation-rules`}
                        value="RuleBased"
                        disabled={readOnlyNode}
                    >
                        Rules
                    </option>
                </select>
            </div>
            <hr id={`${flowPrefix}-config-separator`} />
            <div
                id={`${flowPrefix}-nn-weights-config-div`}
                className="mb-4"
            >
                {ParentPrescriptorState.LEAF.representation === "NNWeights" && (
                    <div
                        id={`${flowPrefix}-nn-weights-div`}
                        className="overflow-y-auto h-40"
                    >
                        {neuralNetworkConfiguration}
                        {!readOnlyNode && (
                            <button
                                type="button"
                                className="float-right"
                                id={`${flowPrefix}-nn-weights-button`}
                                onClick={() => {
                                    const stateCopy = {...ParentPrescriptorState}
                                    stateCopy.network.hidden_layers.push({
                                        layer_name: `hidden-${ParentPrescriptorState.network.hidden_layers.length}`,
                                        layer_type: "dense",
                                        layer_params: {
                                            units: 2 * Object.keys(ParentPrescriptorState.caoState.context).length,
                                            activation: "tanh",
                                            use_bias: true,
                                        },
                                    })
                                    SetParentPrescriptorState(stateCopy)
                                }}
                            >
                                <BiPlusMedical id={`${flowPrefix}-nn-weights-button-plus`} />
                            </button>
                        )}
                    </div>
                )}
                {ParentPrescriptorState.LEAF.representation === "RuleBased" && (
                    <div id={`${flowPrefix}-rules-config-div`}>{createRulesConfig(useRepresentationConfig)}</div>
                )}
            </div>
        </CardContent>
    )

    const inputFieldWidth = {width: "32ch"}

    // Create the configuration Panel
    const evolutionConfigurationPanel = (
        <CardContent
            id={`${flowPrefix}-evolution-configuration-panel`}
            className="overflow-y-auto h-40 pl-5 pr-5"
        >
            <div
                id={`${flowPrefix}-evolution-configuration`}
                className="flex flex-col mb-2"
            >
                <div
                    id={`${flowPrefix}-num-generations`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-num-generations-label`}
                        className="w-50"
                    >
                        Num Generations
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-num-generations-input`}
                        type="number"
                        step="1"
                        min={1}
                        max={1000}
                        defaultValue={10}
                        disabled={readOnlyNode}
                        value={ParentPrescriptorState.evolution.nb_generations}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    nb_generations: parseInt(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-population-size`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-population-size-label`}
                        className="w-50"
                    >
                        Population Size
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-population-size-input`}
                        type="number"
                        step="1"
                        min={5}
                        max={1000}
                        defaultValue={10}
                        disabled={readOnlyNode}
                        value={ParentPrescriptorState.evolution.population_size}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    population_size: parseInt(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-num-elites`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-num-elites-label`}
                        className="w-50"
                    >
                        Num Elites
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-num-elites-input`}
                        type="number"
                        step="1"
                        min={0}
                        max={100}
                        defaultValue={2}
                        disabled={readOnlyNode}
                        value={ParentPrescriptorState.evolution.nb_elites}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    nb_elites: parseInt(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-parent-selection`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-parent-selection-label`}
                        className="w-50"
                    >
                        Parent Selection
                    </label>
                    <select
                        defaultValue="tournament"
                        style={inputFieldWidth}
                        id={`${flowPrefix}-parent-selection-select`}
                        value={ParentPrescriptorState.evolution.parent_selection}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    parent_selection: event.target.value,
                                },
                            })
                        }
                    >
                        <option
                            id={`${flowPrefix}-parent-selection-tournament`}
                            value="tournament"
                            disabled={readOnlyNode}
                        >
                            Tournament
                        </option>
                    </select>
                </div>
                <div
                    id={`${flowPrefix}-remove-population-percetange`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-remove-population-percentage-label`}
                        className="w-50"
                    >
                        Remove Population %
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-remove-population-percentage-input`}
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={0.99}
                        defaultValue={0.8}
                        value={ParentPrescriptorState.evolution.remove_population_pct}
                        disabled={readOnlyNode}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    remove_population_pct: parseFloat(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-mutation`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-mutation-label`}
                        className="w-50"
                    >
                        Mutation Type
                    </label>
                    <select
                        defaultValue="gaussian_noise_percentage"
                        style={inputFieldWidth}
                        id={`${flowPrefix}-mutation-select`}
                        value={ParentPrescriptorState.evolution.mutation_type}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    mutation_type: event.target.value,
                                },
                            })
                        }
                    >
                        <option
                            id={`${flowPrefix}-mutation-gaussian-noise-percentage`}
                            value="gaussian_noise_percentage"
                            disabled={readOnlyNode}
                        >
                            Gaussian Noise Percentage
                        </option>
                        <option
                            id={`${flowPrefix}-mutation-gaussian-noise-fixed`}
                            value="gaussian_noise_fixed"
                            disabled={readOnlyNode}
                        >
                            Gaussian Noise Fixed
                        </option>
                        <option
                            id={`${flowPrefix}-mutation-uniform-reset`}
                            value="uniform_reset"
                            disabled={readOnlyNode}
                        >
                            Uniform Reset
                        </option>
                    </select>
                </div>
                <div
                    id={`${flowPrefix}-mutation-probability`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-mutation-probability-label`}
                        className="w-50"
                    >
                        Mutation Probability
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-mutation-probability-input`}
                        type="number"
                        step="0.1"
                        min={0.0}
                        max={1.0}
                        defaultValue={0.1}
                        disabled={readOnlyNode}
                        value={ParentPrescriptorState.evolution.mutation_probability}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    mutation_probability: parseFloat(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-mutation-factor`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-mutation-factor-label`}
                        className="w-50"
                    >
                        Mutation Factor
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-mutation-factor-input`}
                        type="number"
                        step="0.01"
                        defaultValue={0.1}
                        value={ParentPrescriptorState.evolution.mutation_factor}
                        disabled={readOnlyNode}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    mutation_factor: parseFloat(event.target.value),
                                },
                            })
                        }
                    />
                </div>
                <div
                    id={`${flowPrefix}-initialization-distribution`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-initialization-distribution-label`}
                        className="w-50"
                    >
                        Initialization Distribution
                    </label>
                    <select
                        defaultValue="orthogonal"
                        style={inputFieldWidth}
                        id={`${flowPrefix}-initialization-distribution-select`}
                        value={ParentPrescriptorState.evolution.initialization_distribution}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    initialization_distribution: event.target.value,
                                },
                            })
                        }
                    >
                        <option
                            id={`${flowPrefix}-initialization-distribution-orthogonal`}
                            value="orthogonal"
                            disabled={readOnlyNode}
                        >
                            Orthogonal
                        </option>
                        <option
                            id={`${flowPrefix}-initialization-distribution-uniform`}
                            value="uniform"
                            disabled={readOnlyNode}
                        >
                            Uniform
                        </option>
                        <option
                            id={`${flowPrefix}-initialization-distribution-normal`}
                            value="normal"
                            disabled={readOnlyNode}
                        >
                            Normal
                        </option>
                        <option
                            id={`${flowPrefix}-initialization-distribution-cauchy`}
                            value="cauchy"
                            disabled={readOnlyNode}
                        >
                            Cauchy
                        </option>
                    </select>
                </div>
                <div
                    id={`${flowPrefix}-initialization-range`}
                    className="grid grid-cols-2 gap-1 mb-2 justify-items-start d-flex"
                >
                    <label
                        id={`${flowPrefix}-initialization-range-label`}
                        className="w-50"
                    >
                        Initialization Range
                    </label>
                    <input
                        style={inputFieldWidth}
                        id={`${flowPrefix}-initialization-range-input`}
                        type="number"
                        step="0.01"
                        defaultValue={1}
                        value={ParentPrescriptorState.evolution.initialization_range}
                        disabled={readOnlyNode}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                evolution: {
                                    ...ParentPrescriptorState.evolution,
                                    initialization_range: parseFloat(event.target.value),
                                },
                            })
                        }
                    />
                </div>
            </div>
        </CardContent>
    )

    // Create the Component structure
    return (
        <>
            <Card
                id={flowPrefix}
                style={{padding: 0, width: "10rem", height: "4rem"}}
                onScroll={(event) => {
                    event.stopPropagation()
                }}
                onWheel={(event) => {
                    event.stopPropagation()
                }}
            >
                <CardContent
                    id={`${flowPrefix}-card-2`}
                    className="flex justify-center content-center"
                >
                    <span
                        id={`${flowPrefix}-text`}
                        className="mr-2 text-xs"
                    >
                        {ParentPrescriptorState.selectedPredictor || "Prescriptor"}
                    </span>
                    <div
                        id={`${flowPrefix}-settings-div`}
                        onMouseDown={(event) => {
                            event.stopPropagation()
                        }}
                    >
                        <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            buttonProps={{
                                id: `${flowPrefix}-gr-settings-button`,
                                className: "mt-1",
                                style: {height: 0},
                                btnContent: <GrSettingsOption id={`${flowPrefix}-gr-settings-option`} />,
                            }}
                            popperProps={{
                                id: `${flowPrefix}-gr-settings-popper`,
                                className: "rounded-sm shadow-2xl",
                                style: {
                                    paddingBottom: "12px",
                                    overflowY: "scroll",
                                    margin: 0,
                                    border: "4px solid var(--bs-border-color)",
                                    borderRadius: "0.5rem",
                                },
                            }}
                        >
                            <>
                                <Tabs
                                    id={`${flowPrefix}-settings-tablist`}
                                    value={selectedIndex}
                                    onChange={(_, val) => setSelectedIndex(val)}
                                    sx={{
                                        marginBottom: "16px",
                                        flexBasis: "240px",
                                        marginRight: "24px",
                                    }}
                                >
                                    {tabs.map((tab) => (
                                        <Tab
                                            id={`${flowPrefix}-settings-${tab}`}
                                            key={tab}
                                            label={tab}
                                            aria-controls={`panel-${tab}`}
                                        />
                                    ))}
                                </Tabs>
                                {selectedIndex === 0 && prescriptorRepresentationPanel}
                                {selectedIndex === 1 && evolutionConfigurationPanel}
                                {selectedIndex === 2 && objectiveConfigurationPanel}
                            </>
                        </NodePopper>
                        <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            buttonProps={{
                                btnContent: "C",
                                id: `${flowPrefix}-context-button`,
                                style: {height: 0, position: "absolute", top: "1.25rem", left: "-1rem"},
                            }}
                            popperProps={{
                                id: `${flowPrefix}-context-popper`,
                            }}
                        >
                            <Card
                                id={`${flowPrefix}-context-card`}
                                sx={{
                                    overflowY: "auto",
                                    height: "10rem",
                                    paddingBottom: "12px",
                                    margin: 0,
                                    border: "4px solid var(--bs-border-color)",
                                    borderRadius: "0.5rem",
                                }}
                            >
                                <CardHeader
                                    id="context-card-header"
                                    title="Context"
                                    sx={{paddingBottom: 0, margin: 0}}
                                    titleTypographyProps={{fontSize: "0.8rem", fontWeight: "bold"}}
                                />
                                <CardContent id={`${flowPrefix}-context-card-content`}>
                                    {Object.keys(ParentPrescriptorState.caoState.context).map((element) => (
                                        <FormControlLabel
                                            id={`${flowPrefix}-context-input-${element}-label`}
                                            key={element}
                                            control={
                                                <Checkbox
                                                    id={`${flowPrefix}-context-input-${element}`}
                                                    name={element}
                                                    disabled={readOnlyNode}
                                                    checked={ParentPrescriptorState.caoState.context[element]}
                                                    onChange={(event) => updateCAOState(event, "context")}
                                                    size="small"
                                                    sx={{padding: "2px"}}
                                                />
                                            }
                                            label={
                                                <Typography
                                                    id={`${flowPrefix}-context-input-${element}-text`}
                                                    sx={{
                                                        textTransform: "capitalize",
                                                        fontSize: "0.7rem",
                                                        marginTop: "0px",
                                                        marginBottom: "0px",
                                                    }}
                                                >
                                                    {element}
                                                </Typography>
                                            }
                                            sx={{
                                                display: "flex",
                                                flexDirection: "row",
                                            }}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </NodePopper>
                        <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            buttonProps={{
                                id: `${flowPrefix}-action-button`,
                                className: "absolute top-5 -right-4",
                                style: {height: 0},
                                btnContent: "A",
                            }}
                            popperProps={{
                                id: `${flowPrefix}-action-popper`,
                                placement: "right",
                                className: "rounded-sm shadow-2xl",
                            }}
                        >
                            <Card
                                id={`${flowPrefix}-actions-card`}
                                className="overflow-y-auto h-40 text-xs"
                            >
                                <span
                                    id={`${flowPrefix}-actions-text`}
                                    className="mb-2"
                                >
                                    Actions
                                </span>
                                {Object.keys(ParentPrescriptorState.caoState.action).map((element) => (
                                    <div
                                        id={`${flowPrefix}-actions-div-${element}`}
                                        key={element}
                                        className="grid grid-cols-2 gap-4 mb-2"
                                    >
                                        <label
                                            id={`${flowPrefix}-actions-label-${element}`}
                                            className="capitalize"
                                        >
                                            {" "}
                                            {element}{" "}
                                        </label>
                                        <input
                                            id={`${flowPrefix}-actions-input-${element}`}
                                            name={element}
                                            type="checkbox"
                                            defaultChecked={true}
                                            disabled={readOnlyNode}
                                            checked={ParentPrescriptorState.caoState.action[element]}
                                            onChange={(event) => updateCAOState(event, "action")}
                                        />
                                    </div>
                                ))}
                            </Card>
                        </NodePopper>
                    </div>
                </CardContent>
                {!readOnlyNode ? (
                    <div
                        id={`${flowPrefix}-delete-div`}
                        className="px-1 my-1"
                        style={{position: "absolute", bottom: "0px", right: "1px"}}
                    >
                        <button
                            id={`${flowPrefix}-delete-button`}
                            type="button"
                            onClick={(event) => {
                                if (!showDeleteModal) {
                                    handleDelete(event)
                                }
                            }}
                        >
                            <AiFillDelete
                                id={`${flowPrefix}-delete-button-fill`}
                                size="15"
                                color={trashColor}
                                onMouseEnter={() => setTrashHover(true)}
                                onMouseLeave={() => setTrashHover(false)}
                            />
                        </button>
                    </div>
                ) : null}
            </Card>

            <Handle
                id={`${flowPrefix}-source-handle`}
                type="source"
                position={HandlePosition.Right}
            />
            <Handle
                id={`${flowPrefix}-target-handle`}
                type="target"
                position={HandlePosition.Left}
            />
            {showDeleteModal && (
                <ConfirmationModal
                    cancelBtnLabel="Keep"
                    content={
                        <span id={`delete-confirm-${flowPrefix}-message`}>
                            The node will be removed permanently{" "}
                            <b id={`bold-tag-${flowPrefix}`}>along with any associated downstream nodes.</b>
                            This cannot be undone.
                        </span>
                    }
                    handleCancel={() => {
                        setShowDeleteModal(false)
                    }}
                    handleOk={async () => {
                        DeleteNode(NodeID)
                        setShowDeleteModal(false)
                    }}
                    id={`terminate-confirm-${flowPrefix}-dialog`}
                    okBtnLabel="Delete"
                    title={<span id={`delete-confirm-${flowPrefix}-title`}>Delete this Prescriptor node?</span>}
                />
            )}
        </>
    )
}

export default PrescriptorNodeComponent
