import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardHeader from "@mui/material/CardHeader"
import Checkbox from "@mui/material/Checkbox"
import Container from "@mui/material/Container"
import FormControl from "@mui/material/FormControl"
import FormControlLabel from "@mui/material/FormControlLabel"
import Grid from "@mui/material/Grid2"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import Slider from "@mui/material/Slider"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import {FC, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"
import {GrSettingsOption} from "react-icons/gr"
import {Handle, Position as HandlePosition, NodeProps, Node as RFNode} from "reactflow"

import {DataTag, DataTagFieldCAOType} from "../../../../generated/metadata"
import {ConfirmationModal} from "../../../confirmationModal"
import NodePopper from "../../../nodepopper"
import {NotificationType, sendNotification} from "../../../notification"

// #region Constants
const ACTIVATION_FUNCTIONS = ["tanh", "relu", "linear", "sigmoid", "softmax", "elu", "selu"]
// #endregion

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

    // Unpack the props
    const {
        NodeID,
        ParentPrescriptorState,
        SetParentPrescriptorState,
        DeleteNode,
        GetElementIndex,
        readOnlyNode,
        taggedData = null,
    } = props.data

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
                key={metric.metric_name}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "1rem",
                    padding: "0.5rem",
                    marginBottom: "0.5rem",
                }}
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

    const neuralNetworkConfiguration = ParentPrescriptorState.network.hidden_layers.map((hiddenLayer, idx) => (
        <Grid
            id={`${flowPrefix}-hidden-layer-${idx}`}
            container={true}
            gap={1}
            key={`${NodeID}-hiddenlayer-${hiddenLayer.layer_name}`}
            style={{marginTop: "0.5rem"}}
        >
            <Grid
                id={`${flowPrefix}-hidden-layer-${idx}-outer`}
                style={{display: "flex", alignItems: "center"}}
            >
                <Typography
                    id={`${flowPrefix}-hidden-layer-${idx}-headline`}
                    style={{color: "var(--bs-secondary)", fontSize: "0.8rem"}}
                >
                    {`Hidden Layer ${idx + 1}`}
                </Typography>
                {!readOnlyNode && (
                    <DeleteIcon
                        id={`${flowPrefix}-hidden-layer-${idx}-delete`}
                        sx={{
                            marginLeft: "0.5rem",
                            cursor: "pointer",
                            "&:hover": {
                                color: "var(--bs-red)",
                            },
                            fontSize: "0.8rem",
                            color: "var(--bs-secondary)",
                        }}
                        onClick={(event) => {
                            event.stopPropagation()
                            if (ParentPrescriptorState.network.hidden_layers.length === 1) {
                                sendNotification(
                                    NotificationType.warning,
                                    "Last remaining hidden layer cannot be deleted"
                                )
                            } else {
                                const stateCopy = {...ParentPrescriptorState}
                                stateCopy.network.hidden_layers.splice(idx, 1)
                                SetParentPrescriptorState(stateCopy)
                            }
                        }}
                    />
                )}
            </Grid>
            <Grid
                id={`${flowPrefix}-hidden-layer-${idx}-neural-net-config`}
                container={true}
                size={12}
            >
                <Grid
                    id={`${flowPrefix}-hidden-layer-${idx}-units`}
                    size={4}
                >
                    <TextField
                        id={`${flowPrefix}-hidden-layer-${idx}-units-input`}
                        label="Units"
                        style={{
                            width: "6rem",
                        }}
                        type="number"
                        size="small"
                        value={hiddenLayer.layer_params.units}
                        disabled={readOnlyNode}
                        slotProps={{
                            htmlInput: {
                                min: 8,
                                max: 256,
                                step: 1,
                            },
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                        onChange={(event) => {
                            const modifiedHiddenLayerState = {...ParentPrescriptorState}
                            modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.units = parseInt(
                                event.target.value
                            )
                            SetParentPrescriptorState(modifiedHiddenLayerState)
                        }}
                    />
                </Grid>
                <Grid
                    id={`${flowPrefix}-hidden-layer-${idx}-activation`}
                    size={4}
                >
                    <FormControl
                        id={`${flowPrefix}-hidden-layer-${idx}-activation-input`}
                        sx={{width: "6rem"}}
                    >
                        <InputLabel
                            id={`${flowPrefix}-hidden-layer-${idx}-activation-label`}
                            shrink={true}
                        >
                            Activation
                        </InputLabel>
                        <Select
                            id={`${flowPrefix}-hidden-layer-${idx}-activation-select`}
                            defaultValue="tanh"
                            label="Activation"
                            size="small"
                            value={hiddenLayer.layer_params.activation}
                            disabled={readOnlyNode}
                            onChange={(event) => {
                                const modifiedHiddenLayerState = {...ParentPrescriptorState}
                                modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.activation =
                                    event.target.value
                                SetParentPrescriptorState(modifiedHiddenLayerState)
                            }}
                            sx={{minWidth: "6rem"}}
                        >
                            {ACTIVATION_FUNCTIONS.map((activationFn) => (
                                <MenuItem
                                    id={`${flowPrefix}-hidden-layer-${idx}-activation-${activationFn}`}
                                    key={`hidden-layer-activation-${activationFn}`}
                                    value={activationFn}
                                    disabled={readOnlyNode}
                                >
                                    {activationFn}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid
                    id={`${flowPrefix}-hidden-layer-${idx}-use-bias`}
                    size={4}
                >
                    <FormControlLabel
                        id={`${flowPrefix}-hidden-layer-${idx}-use-bias-label`}
                        control={
                            <Checkbox
                                id={`${flowPrefix}-hidden-layer-${idx}-use-bias-input`}
                                defaultChecked={true}
                                checked={hiddenLayer.layer_params.use_bias}
                                disabled={readOnlyNode}
                                size="small"
                                onChange={(event) => {
                                    const modifiedHiddenLayerState = {...ParentPrescriptorState}
                                    modifiedHiddenLayerState.network.hidden_layers[idx].layer_params.use_bias =
                                        event.target.checked
                                    SetParentPrescriptorState(modifiedHiddenLayerState)
                                }}
                            />
                        }
                        label="Use Bias"
                    />
                </Grid>
            </Grid>
        </Grid>
    ))

    const createRulesConfig = (representationConfig) => (
        <Container
            id={`${flowPrefix}-rules-config`}
            key={`${NodeID}-rules-config`}
        >
            <Grid
                id={`${flowPrefix}-max-exponent`}
                style={{margin: "2rem 0.5rem"}}
            >
                <Grid id={`${flowPrefix}-max-exponent-label`}>Max Exponent:</Grid>
                <Grid id={`${flowPrefix}-max-exponent-slider`}>
                    <Slider
                        id={`${flowPrefix}-max-exponent-slider-input`}
                        step={1}
                        min={0}
                        max={9}
                        value={Number(representationConfig.max_exponent)}
                        disabled={readOnlyNode}
                        marks={[
                            {value: 0, label: "0"},
                            {value: 9, label: "9"},
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_event, newValue) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.max_exponent = newValue
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                        size="small"
                        sx={{
                            "& .MuiSlider-rail": {
                                backgroundColor: "var(--bs-gray-medium)",
                            },
                            "& .MuiSlider-track": {
                                backgroundColor: "#abe2fb",
                            },
                        }}
                    />
                </Grid>
            </Grid>
            <Grid
                id={`${flowPrefix}-number-of-building-block-conditions`}
                style={{margin: "2rem 0.5rem"}}
            >
                <Grid id={`${flowPrefix}-number-of-building-block-conditions-label`}>Building Block Conditions:</Grid>
                <Grid id={`${flowPrefix}-number-of-building-block-conditions-slider`}>
                    <Slider
                        id={`${flowPrefix}-number-of-building-block-conditions-slider-input`}
                        step={1}
                        min={1}
                        max={9}
                        value={Number(representationConfig.number_of_building_block_conditions)}
                        disabled={readOnlyNode}
                        marks={[
                            {value: 1, label: "1"},
                            {value: 9, label: "9"},
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_event, newValue) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_conditions = newValue
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                        size="small"
                        sx={{
                            "& .MuiSlider-rail": {
                                backgroundColor: "var(--bs-gray-medium)",
                            },
                            "& .MuiSlider-track": {
                                backgroundColor: "#abe2fb",
                            },
                        }}
                    />
                </Grid>
            </Grid>
            <Grid
                id={`${flowPrefix}-number-of-building-block-rules`}
                style={{margin: "2rem 0.5rem"}}
            >
                <Grid id={`${flowPrefix}-number-of-building-block-rules-label`}>Building Block Rules:</Grid>
                <Grid id={`${flowPrefix}-number-of-building-block-rules-slider`}>
                    <Slider
                        id={`${flowPrefix}-number-of-building-block-rules-slider-input`}
                        step={1}
                        min={1}
                        max={99}
                        value={Number(representationConfig.number_of_building_block_rules)}
                        disabled={readOnlyNode}
                        marks={[
                            {value: 1, label: "1"},
                            {value: 99, label: "99"},
                        ]}
                        valueLabelDisplay="auto"
                        onChange={(_event, newValue) => {
                            const modifiedRulesState = {...ParentPrescriptorState}
                            modifiedRulesState.representation_config.number_of_building_block_rules = newValue
                            SetParentPrescriptorState(modifiedRulesState)
                        }}
                        size="small"
                        sx={{
                            "& .MuiSlider-rail": {
                                backgroundColor: "var(--bs-gray-medium)",
                            },
                            "& .MuiSlider-track": {
                                backgroundColor: "#abe2fb",
                            },
                        }}
                    />
                </Grid>
            </Grid>
        </Container>
    )

    let useRepresentationConfig = defaultRepresentationConfig
    if ("representation_config" in ParentPrescriptorState) {
        useRepresentationConfig = ParentPrescriptorState.representation_config
    }

    const prescriptorRepresentationPanel = (
        <CardContent
            id={`${flowPrefix}-representation-panel`}
            style={{
                paddingLeft: "1.25rem",
                paddingRight: "1.25rem",
            }}
        >
            <div
                id={`${flowPrefix}-representation-div`}
                style={{
                    alignContent: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                }}
            >
                <FormControl
                    id={`${flowPrefix}-representation-form-control`}
                    sx={{width: "10rem"}}
                >
                    <InputLabel id={`${flowPrefix}-representation-label`}>Representation</InputLabel>
                    <Select
                        labelId={`${flowPrefix}-representation-label`}
                        label="Representation"
                        id={`${flowPrefix}-representation-select`}
                        name={`${NodeID}-representation`}
                        value={ParentPrescriptorState.LEAF.representation}
                        onChange={(event) =>
                            SetParentPrescriptorState({
                                ...ParentPrescriptorState,
                                LEAF: {
                                    ...ParentPrescriptorState.LEAF,
                                    representation: event.target.value,
                                },
                            })
                        }
                        disabled={readOnlyNode}
                    >
                        <MenuItem
                            id={`${flowPrefix}-representation-nn-weights`}
                            value="NNWeights"
                        >
                            Neural Network
                        </MenuItem>
                        <MenuItem
                            id={`${flowPrefix}-representation-rules`}
                            value="RuleBased"
                        >
                            Rules
                        </MenuItem>
                    </Select>
                </FormControl>
            </div>
            <hr id={`${flowPrefix}-config-separator`} />
            <div id={`${flowPrefix}-nn-weights-config-div`}>
                {ParentPrescriptorState.LEAF.representation === "NNWeights" && (
                    <div
                        id={`${flowPrefix}-nn-weights-div`}
                        style={{height: "10rem", overflowY: "auto"}}
                    >
                        {neuralNetworkConfiguration}
                        {!readOnlyNode && (
                            <Button
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
                                sx={{float: "right"}}
                            >
                                <AddIcon id={`${flowPrefix}-nn-weights-button-plus`} />
                            </Button>
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
            sx={{
                height: "10rem",
                overflowY: "auto",
                paddingLeft: "1.25rem",
                paddingRight: "1.25rem",
            }}
        >
            <div
                id={`${flowPrefix}-evolution-configuration`}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "0.5rem",
                }}
            >
                <div
                    id={`${flowPrefix}-num-generations`}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-num-generations-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-population-size-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-num-elites-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-parent-selection-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-remove-population-percentage-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-mutation-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-mutation-probability-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-mutation-factor-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-initialization-distribution-label`}
                        style={{width: "50%"}}
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
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        justifyItems: "start",
                        gap: "0.25rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <label
                        id={`${flowPrefix}-initialization-range-label`}
                        style={{width: "50%"}}
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

    function getConfigPopup() {
        return (
            <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                buttonProps={{
                    btnContent: (
                        <GrSettingsOption
                            id={`${flowPrefix}-gr-settings-option`}
                            size={21}
                        />
                    ),
                    btnSxProps: {height: 0, marginTop: "0.25rem"},
                    id: `${flowPrefix}-gr-settings-button`,
                }}
                popperProps={{
                    id: `${flowPrefix}-gr-settings-popper`,
                    style: {
                        border: "4px solid var(--bs-border-color)",
                        borderRadius: "0.5rem",
                        backgroundColor: "var(--bs-white)",
                        // TODO: Update this box shadow
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        margin: 0,
                        overflowY: "scroll",
                        paddingBottom: "12px",
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
        )
    }

    function getFieldsPopup(caoType: DataTagFieldCAOType, position: {left: string} | {right: string}) {
        const fields =
            caoType === DataTagFieldCAOType.CONTEXT
                ? ParentPrescriptorState.caoState.context
                : ParentPrescriptorState.caoState.action
        return (
            <NodePopper // eslint-disable-line enforce-ids-in-jsx/missing-ids
                buttonProps={{
                    btnContent: caoType === DataTagFieldCAOType.CONTEXT ? "C" : "A",
                    btnSxProps: {height: 0, position: "absolute", ...position, bottom: "1.7rem"},
                    id: `${flowPrefix}-context-button`,
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
                        title={caoType === DataTagFieldCAOType.CONTEXT ? "Context" : "Actions"}
                        sx={{paddingBottom: 0, margin: 0}}
                        titleTypographyProps={{fontSize: "0.8rem", fontWeight: "bold"}}
                    />
                    <CardContent id={`${flowPrefix}-context-card-content`}>
                        {Object.keys(fields).map((element) => (
                            <FormControlLabel
                                id={`${flowPrefix}-context-input-${element}-label`}
                                key={element}
                                control={
                                    <Checkbox
                                        id={`${flowPrefix}-context-input-${element}`}
                                        name={element}
                                        disabled={readOnlyNode}
                                        checked={fields[element]}
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
        )
    }

    function getDeleteIcon() {
        return (
            <div
                id={`${flowPrefix}-delete-div`}
                style={{
                    bottom: "0.25rem",
                    position: "absolute",
                    right: "-1rem",
                }}
            >
                <Button
                    id={`${flowPrefix}-delete-button`}
                    type="button"
                    onClick={(event) => {
                        if (!showDeleteModal) {
                            handleDelete(event)
                        }
                    }}
                >
                    <DeleteIcon
                        id={`${flowPrefix}-delete-button-fill`}
                        sx={{
                            "&:hover": {
                                color: "var(--bs-red)",
                            },
                            fontSize: "0.9rem",
                        }}
                    />
                </Button>
            </div>
        )
    }

    function getDeleteConfirmation() {
        return (
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
        )
    }

    function getCardContent() {
        return (
            <CardContent
                id={`${flowPrefix}-card-2`}
                sx={{
                    alignContent: "center",
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: "1rem",
                }}
            >
                <span
                    id={`${flowPrefix}-text`}
                    style={{
                        color: "var(--bs-primary)",
                        fontSize: "0.75rem",
                    }}
                >
                    Prescriptor
                </span>
                <div
                    id={`${flowPrefix}-settings-div`}
                    onMouseDown={(event) => {
                        event.stopPropagation()
                    }}
                >
                    {getConfigPopup()}
                    {getFieldsPopup(DataTagFieldCAOType.CONTEXT, {left: "-2.2rem"})}
                    {getFieldsPopup(DataTagFieldCAOType.ACTION, {right: "-2.2rem"})}
                </div>
            </CardContent>
        )
    }

    // Return the prescriptor node card
    return (
        <>
            <Card
                id={flowPrefix}
                sx={{padding: 0, width: "10rem", height: "4rem"}}
                onScroll={(event) => {
                    event.stopPropagation()
                }}
                onWheel={(event) => {
                    event.stopPropagation()
                }}
            >
                {getCardContent()}
                {!readOnlyNode ? getDeleteIcon() : null}
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
            {showDeleteModal && getDeleteConfirmation()}
        </>
    )
}

export default PrescriptorNodeComponent
