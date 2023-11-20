import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {Tooltip as AntdTooltip} from "antd"
import {Text as EvergreenText, InfoSignIcon, Popover, Position, Tab, Tablist, Tooltip} from "evergreen-ui"
import {NextRouter, useRouter} from "next/router"
import {useSession} from "next-auth/react"
import Slider from "rc-slider"
import {Dispatch, FC, SetStateAction, useEffect, useState} from "react"
import {Card, Col, Container, Row} from "react-bootstrap"
import {AiFillDelete} from "react-icons/ai"
import {GrSettingsOption} from "react-icons/gr"
import "rc-slider/assets/index.css"
import {getOutgoers, Handle, Position as HandlePosition, NodeProps, Node as RFNode, useEdges, useNodes} from "reactflow"

import {NodeData, NodeType} from "./types"
import {StringBool} from "../../../../controller/base_types"
import {DataTag} from "../../../../controller/datatag/types"
import {loadDataTag} from "../../../../controller/fetchdatataglist"
import {NotificationType, sendNotification} from "../../../../controller/notification"
import {FetchMetrics, FetchParams, FetchPredictors} from "../../../../controller/predictor"
import ConfigNumeric from "../confignumeric"
import {EdgeType} from "../edges/types"
import {FlowQueries} from "../flowqueries"
import {PredictorParams} from "../predictorinfo"

// Interface for Predictor CAO
export interface CAOChecked {
    context: StringBool
    action: StringBool
    outcome: StringBool
}

// State of the predictor
export interface PredictorState {
    selectedPredictorType: string
    selectedPredictor: string
    selectedMetric: string
    predictorParams: PredictorParams
    caoState: CAOChecked
    trainSliderValue: number
    testSliderValue: number
    rngSeedValue: number
}

// Define an interface for the structure of the Predictor node
export interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly ParentPredictorState: PredictorState
    readonly SetParentPredictorState: Dispatch<SetStateAction<PredictorState>>

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number

    // Origin of unique Id
    idExtension?: string
}

export type PredictorNode = RFNode<PredictorNodeData>

const PredictorNodeComponent: FC<NodeProps<PredictorNodeData>> = (props) => {
    /*
    This function is responsible to render the Predictor Node
    */

    // Get the router hook
    const router: NextRouter = useRouter()

    // Check if demo user as requested by URL param
    const isDemoUser = "demo" in router.query

    const data: PredictorNodeData = props.data
    const {idExtension = ""} = data

    // Get the current user
    const {data: session} = useSession()
    const currentUser: string = session.user.name

    // Unpack the data
    const {NodeID, ParentPredictorState, SetParentPredictorState, DeleteNode, GetElementIndex} = data

    const nodes = useNodes<NodeData>() as NodeType[]
    const edges = useEdges() as EdgeType[]

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `predictor-${flowIndex}`

    // Fetch the available metrics and predictors and these are not state dependant
    const metrics = {
        regressor: FetchMetrics("regressor"),
        classifier: FetchMetrics("classifier"),
    }

    // These predictors will only be shown in demo mode. As of writing (June 2023) they aren't implement and are
    // only in the list for demo purposes.
    const demoOnlyPredictors = ["Transformer", "LLM"]

    const predictors = {
        regressor: isDemoUser
            ? FetchPredictors("regressor")
            : FetchPredictors("regressor").filter((predictor) => {
                  return !demoOnlyPredictors.includes(predictor)
              }),
        classifier: FetchPredictors("classifier"),
    }

    // Since predictors change
    const [taggedData, setTaggedData] = useState<DataTag>(null)

    //Set the dropdown defaults here since the dropdown is created here
    const DEFAULT_CLASSIFIER_METRIC = Array.from(metrics.classifier.keys())[0]
    const DEFAULT_REGRESSOR_METRIC = Array.from(metrics.regressor.keys())[0]

    // Fetch the Data Tag
    useEffect(() => {
        //TODO: If the data node has the data source and tag available we should not fetch it but use that.
        //TODO: Reason: Data Tags can change, and we don't version them explicitly --
        // this will be an easy way of doing that.
        // If they were to change and we had to re-run a run it might fail
        function callSetTaggedData() {
            return async () => {
                setTaggedData(await loadDataTag(currentUser, data.SelectedDataSourceId))
            }
        }

        callSetTaggedData()
    }, [data.SelectedDataSourceId])

    // We need to take an intersection of what is in the state (for eg: Predictor Node Creation)
    // and what we can fetch for missing values and update the initial state - but do this only
    // once the data tags are loaded
    useEffect(() => {
        const selectedPredictor =
            ParentPredictorState.selectedPredictor || predictors[ParentPredictorState.selectedPredictorType][0]

        const selectedMetric =
            ParentPredictorState.selectedPredictorType === "classifier"
                ? ParentPredictorState.selectedMetric || DEFAULT_CLASSIFIER_METRIC
                : ParentPredictorState.selectedMetric || DEFAULT_REGRESSOR_METRIC

        // Initialize the parameters to be from the state
        let predictorParams = ParentPredictorState.predictorParams

        // If the parameters do not exist in the state update them
        if (!predictorParams || Object.keys(predictorParams).length === 0) {
            predictorParams = FetchParams(ParentPredictorState.selectedPredictorType, selectedPredictor)
            // We add a key called value to adjust for user input
            predictorParams &&
                Object.keys(predictorParams).forEach((key) => {
                    if (typeof predictorParams[key].default_value === "object") {
                        // If the type has to be a choice, select the first choice
                        predictorParams[key].value = predictorParams[key].default_value[0]
                    } else {
                        // If the type is a number, string or a bool
                        // use the default value as the user selected value
                        predictorParams[key].value = predictorParams[key].default_value
                    }
                })
        } else {
            const keys = Object.keys(FetchParams(ParentPredictorState.selectedPredictorType, selectedPredictor))

            // Make sure predictor config items are presented to the user in consistent order
            // We sort them in the same order as the keys in the definition in SUPPORTED_REGRESSION_MODELS
            predictorParams = Object.fromEntries(
                Object.entries(predictorParams).sort(
                    (field1, field2) => keys.indexOf(field1[0]) - keys.indexOf(field2[0])
                )
            )
        }

        // Build the CAO State for the data tag from the given data source id
        const CAOState: CAOChecked = ParentPredictorState.caoState

        if (taggedData) {
            // For predictors with only one outcome, we want to check it by default
            const hasOnlyOneOutcome: boolean =
                Object.values(taggedData.fields).filter((f) => f.esp_type === "OUTCOME").length === 1
            Object.keys(taggedData.fields).forEach((fieldName) => {
                const field = taggedData.fields[fieldName]
                const espType = field.esp_type.toString()
                switch (espType) {
                    case "CONTEXT":
                        CAOState.context[fieldName] = CAOState.context[fieldName] ?? true
                        break
                    case "ACTION":
                        CAOState.action[fieldName] = CAOState.action[fieldName] ?? true
                        break
                    case "OUTCOME":
                        CAOState.outcome[fieldName] = CAOState.outcome[fieldName] ?? hasOnlyOneOutcome
                        break
                    default:
                        console.warn(`Unknown ESP type encountered: ${espType}`)
                        break
                }
            })
        }

        SetParentPredictorState({
            ...ParentPredictorState,
            selectedPredictor: selectedPredictor,
            selectedMetric: selectedMetric,
            predictorParams: predictorParams,
            caoState: CAOState,
            trainSliderValue: ParentPredictorState.trainSliderValue || 80,
            testSliderValue: ParentPredictorState.testSliderValue || 20,
            rngSeedValue: ParentPredictorState.rngSeedValue || null,
        })
    }, [taggedData])

    const onPredictorTypeChange = (predictorType: string) => {
        /*
        This controller invocation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor.
        */

        // Don't allow changing to Classifier type if there's an uncertainty node attached, since we do not support
        // that
        if (predictorType === "classifier") {
            const thisPredictorNode = FlowQueries.getNodeByID(nodes, NodeID) as PredictorNode
            const hasUncertaintyNode = getOutgoers<NodeData, PredictorNodeData>(thisPredictorNode, nodes, edges).some(
                (node) => node.type === "uncertaintymodelnode"
            )

            if (hasUncertaintyNode) {
                sendNotification(
                    NotificationType.warning,
                    "This predictor node has an attached uncertainty model node, so the type cannot " +
                        'be changed to "classifier".',
                    "Remove the associated uncertainty model node if you wish to change this predictor type."
                )
                return
            }
        }

        const newPred = predictors[predictorType][0]
        onPredictorChange(predictorType, newPred)
    }

    const onPredictorChange = (predictorType: string, selectedPredictor: string) => {
        /*
        This function serves to fetch the parameters of the predictor,
        do some parameter state formatting and update the selected predictor state.
        */

        // Invoke the controller
        const params = FetchParams(predictorType, selectedPredictor)

        // We add a key called value to adjust for user input
        params &&
            Object.keys(params).forEach((key) => {
                if (typeof params[key].default_value === "object") {
                    params[key].value = params[key].default_value[0]
                } else {
                    params[key].value = params[key].default_value
                }
            })

        // Get default metric for new predictor type
        const selectedMetric = Array.from(FetchMetrics(predictorType).keys())[0]

        // Write the state.
        SetParentPredictorState({
            ...ParentPredictorState,
            selectedPredictorType: predictorType,
            predictorParams: params,
            selectedPredictor: selectedPredictor,
            selectedMetric: selectedMetric,
        })
    }

    const onParamChange = (event, paramName: string) => {
        /*
        This function is used to update the state of the predictor
        parameters.
        */
        const {value} = event.target
        const paramsCopy = {...ParentPredictorState.predictorParams}
        paramsCopy[paramName].value = value
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: paramsCopy,
        })
    }

    const onPredictorParamCheckBoxChange = (event, paramName) => {
        /*
        This function is used to update the state of the predictor
        parameter checkboxes.
        */
        const {checked} = event.target
        const paramsCopy = {...ParentPredictorState.predictorParams}
        paramsCopy[paramName].value = checked
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: paramsCopy,
        })
    }

    const onTrainSliderChange = (newValue) => {
        const newTestSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue,
        })
    }

    const onTestSliderChange = (newValue) => {
        const newTrainSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue,
        })
    }

    const onUpdateCAOState = (event, espType: string) => {
        // eslint-disable-next-line no-shadow
        const {name, checked} = event.target
        const caoStateCopy = {...ParentPredictorState.caoState}

        caoStateCopy[espType][name] = checked

        SetParentPredictorState({
            ...ParentPredictorState,
            caoState: caoStateCopy,
        })
    }

    // We want to have a tabbed predictor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)

    const tabs = ["Predictor", "Configuration", "Data Split"]

    // Create the selection Panel
    const predictorSelectionPanel = (
        <Card.Body id={`${flowPrefix}-predictor-selection-panel${idExtension}`}>
            <Container
                id={`${flowPrefix}-config-container${idExtension}`}
                style={{fontSize: "smaller"}}
            >
                <Row id={`${flowPrefix}-predictor-type-row${idExtension}`}>
                    <Col
                        id={`${flowPrefix}-predictor-type-label${idExtension}`}
                        md={4}
                    >
                        <label id={`${flowPrefix}-type-label${idExtension}`}>Type: </label>
                    </Col>
                    <Col
                        id={`${flowPrefix}-predictor-type-value${idExtension}`}
                        md={8}
                    >
                        <select
                            id={`${flowPrefix}-type-select${idExtension}`}
                            name={`${NodeID}-predictorType`}
                            onChange={(event) => onPredictorTypeChange(event.target.value)}
                            value={ParentPredictorState.selectedPredictorType}
                            style={{fontSize: "smaller", width: "100%"}}
                        >
                            <option
                                id={`${flowPrefix}-regressor${idExtension}`}
                                value="regressor"
                            >
                                Regressor
                            </option>
                            <option
                                id={`${flowPrefix}-classifier${idExtension}`}
                                value="classifier"
                            >
                                Classifier
                            </option>
                            <option
                                disabled
                                id={`${flowPrefix}-byo${idExtension}`}
                                value="byop"
                            >
                                Bring your own (Coming Soon)
                            </option>
                            <option
                                disabled
                                id={`${flowPrefix}-evolution${idExtension}`}
                                value="evolution"
                            >
                                Evolution (Coming Soon)
                            </option>
                        </select>
                    </Col>
                </Row>
                <Row
                    id={`${flowPrefix}-predictor-sel-row${idExtension}`}
                    style={{marginTop: "12px"}}
                >
                    <Col
                        id={`${flowPrefix}-predictor-name-label${idExtension}`}
                        md={4}
                    >
                        <label id={`${flowPrefix}-predictor-label${idExtension}`}>Predictor: </label>
                    </Col>
                    <Col
                        id={`${flowPrefix}-predictor-name-value${idExtension}`}
                        md={8}
                    >
                        <select
                            id={`${flowPrefix}-predictor-select${idExtension}`}
                            name={`${NodeID}-predictor${idExtension}`}
                            value={ParentPredictorState.selectedPredictor}
                            onChange={(event) =>
                                onPredictorChange(ParentPredictorState.selectedPredictorType, event.target.value)
                            }
                            style={{fontSize: "smaller", width: "100%"}}
                        >
                            {ParentPredictorState.selectedPredictorType &&
                                predictors[ParentPredictorState.selectedPredictorType].map((predictor) => (
                                    <option
                                        id={`${flowPrefix}-option-${predictor}${idExtension}`}
                                        key={predictor}
                                        value={predictor}
                                    >
                                        {predictor}
                                    </option>
                                ))}
                        </select>
                    </Col>
                </Row>
                <Row
                    id={`${flowPrefix}-metric-row${idExtension}`}
                    style={{marginTop: "12px"}}
                >
                    <Col
                        id={`${flowPrefix}-metric-col${idExtension}`}
                        md={4}
                    >
                        <label id={`${flowPrefix}-metric-label${idExtension}`}>Metric: </label>
                    </Col>
                    <Col
                        id={`${flowPrefix}-metric-col${idExtension}`}
                        md={8}
                    >
                        <select
                            id={`${flowPrefix}-metric-select${idExtension}`}
                            name={`${NodeID}-metric`}
                            value={ParentPredictorState.selectedMetric}
                            onChange={(event) => {
                                SetParentPredictorState({...ParentPredictorState, selectedMetric: event.target.value})
                            }}
                            style={{fontSize: "smaller", width: "100%"}}
                        >
                            {Array.from<string>(metrics[ParentPredictorState.selectedPredictorType].keys()).map(
                                (metric) => (
                                    <option
                                        id={`${flowPrefix}-metric-${metric}${idExtension}`}
                                        key={metric}
                                        value={metric}
                                    >
                                        {metric}
                                    </option>
                                )
                            )}
                        </select>
                    </Col>
                </Row>
            </Container>
        </Card.Body>
    )

    // Determine the SelectedPredictor and defaultParams each time the configuration panel is
    // made so that we can be in sync with which kind of predictor type we are looking at.
    const selectedPredictor =
        ParentPredictorState.selectedPredictor || predictors[ParentPredictorState.selectedPredictorType][0]
    const defaultParams = FetchParams(ParentPredictorState.selectedPredictorType, selectedPredictor)

    // Create the configuration Panel
    const predictorConfigurationPanel = (
        <Card.Body
            className="overflow-y-auto h-40 text-xs pl-4 pr-4"
            id={`${flowPrefix}-config${idExtension}`}
        >
            {ParentPredictorState.predictorParams &&
                Object.keys(defaultParams).map((param) => (
                    <div
                        id={`${flowPrefix}-${param}-input-component${idExtension}`}
                        className="grid grid-cols-8 gap-12 mb-3"
                        key={param}
                    >
                        <div
                            id={`${flowPrefix}-${param}-input-component-div${idExtension}`}
                            className="item1 col-span-3"
                        >
                            <label
                                id={`${flowPrefix}-${param}-label${idExtension}`}
                                className="capitalize"
                            >
                                {param}:
                            </label>
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-data-type-div${idExtension}`}
                            className="item2 col-span-4"
                        >
                            {(defaultParams[param].type === "int" || defaultParams[param].type === "float") && (
                                <ConfigNumeric
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    paramName={param}
                                    defaultParam={defaultParams[param]}
                                    value={
                                        ParentPredictorState.predictorParams[param] != null &&
                                        ParentPredictorState.predictorParams[param].value != null &&
                                        ParentPredictorState.predictorParams[param].value
                                    }
                                    onParamChange={(event) => onParamChange(event, param)}
                                />
                            )}
                            {defaultParams[param].type === "bool" && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    type="checkbox"
                                    checked={
                                        ParentPredictorState.predictorParams[param] != null &&
                                        ParentPredictorState.predictorParams[param].value != null
                                            ? Boolean(ParentPredictorState.predictorParams[param].value)
                                            : defaultParams[param].default_value == null
                                            ? undefined
                                            : Boolean(defaultParams[param].default_value)
                                    }
                                    onChange={(event) => onPredictorParamCheckBoxChange(event, param)}
                                />
                            )}
                            {typeof defaultParams[param].type === "object" && (
                                <select
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    value={
                                        ParentPredictorState.predictorParams[param] != null &&
                                        ParentPredictorState.predictorParams[param].value != null
                                            ? ParentPredictorState.predictorParams[param].value.toString()
                                            : defaultParams[param].default_value == null
                                            ? undefined
                                            : defaultParams[param].default_value.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                    className="w-32 p-0"
                                >
                                    {(defaultParams[param].type as string[]).map((value) => (
                                        <option
                                            id={`${flowPrefix}-${param}-${value}${idExtension}`}
                                            key={value}
                                            value={value}
                                        >
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {defaultParams[param].type === "string" && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    className="w-full"
                                    type="text"
                                    defaultValue={defaultParams[param].default_value.toString()}
                                    value={
                                        ParentPredictorState.predictorParams[param] != null &&
                                        ParentPredictorState.predictorParams[param].value != null &&
                                        ParentPredictorState.predictorParams[param].value.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                />
                            )}
                            {defaultParams[param].type === "password" && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    className="w-full"
                                    type="password"
                                    defaultValue={defaultParams[param].default_value.toString()}
                                    value={
                                        ParentPredictorState.predictorParams[param] != null &&
                                        ParentPredictorState.predictorParams[param].value != null &&
                                        ParentPredictorState.predictorParams[param].value.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                />
                            )}
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-tooltip-div${idExtension}`}
                            className="item3 col-span-1"
                        >
                            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                                content={defaultParams[param].description}
                            >
                                <InfoSignIcon id={`${flowPrefix}-${param}-tooltip-info-sign-icon${idExtension}`} />
                            </Tooltip>
                        </div>
                    </div>
                ))}
        </Card.Body>
    )

    const marks = {
        0: {label: "0%"},
        100: {label: "100%", style: {color: "#53565A"}}, // To prevent end mark from being "grayed out"
    }

    // Create the data split card
    const dataSplitConfigurationPanel = (
        <Card.Body id={`${flowPrefix}-data-split-configuration-panel${idExtension}`}>
            <Container id={`${flowPrefix}-data-split-config${idExtension}`}>
                <Row
                    id={`${flowPrefix}-train${idExtension}`}
                    className="mx-2 my-8"
                >
                    <Col
                        id={`${flowPrefix}-train-label${idExtension}`}
                        md={2}
                        className="mr-4"
                    >
                        Train:
                    </Col>
                    <Col
                        id={`${flowPrefix}-train-slider${idExtension}`}
                        md={9}
                    >
                        <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Slider does not have an id property when compiling
                            onChange={(event) => onTrainSliderChange(event)}
                            min={0}
                            max={100}
                            value={ParentPredictorState.trainSliderValue}
                            marks={marks}
                            handleRender={(node) => {
                                return (
                                    <AntdTooltip
                                        id={`${flowPrefix}-train-slider-tooltip${idExtension}`}
                                        title={`${ParentPredictorState.trainSliderValue}%`}
                                    >
                                        {node}
                                    </AntdTooltip>
                                )
                            }}
                        />
                    </Col>
                </Row>
                <Row
                    id={`${flowPrefix}-test${idExtension}`}
                    className="mx-2 my-8"
                >
                    <Col
                        id={`${flowPrefix}-test-label${idExtension}`}
                        md={2}
                        className="mr-4"
                    >
                        Test:
                    </Col>
                    <Col
                        id={`${flowPrefix}-test-slider${idExtension}`}
                        md={9}
                    >
                        <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Slider does not have an id property when compiling
                            onChange={(event) => onTestSliderChange(event)}
                            min={0}
                            max={100}
                            value={ParentPredictorState.testSliderValue}
                            marks={marks}
                            handleRender={(node) => {
                                return (
                                    <AntdTooltip
                                        id={`${flowPrefix}-test-slider-tooltip${idExtension}`}
                                        title={`${ParentPredictorState.testSliderValue}%`}
                                    >
                                        {node}
                                    </AntdTooltip>
                                )
                            }}
                        />
                    </Col>
                </Row>
                <Row
                    id={`${flowPrefix}-split-rng-seed${idExtension}`}
                    className="mx-2 my-8"
                >
                    <Col
                        id={`${flowPrefix}-split-rng-seed-label${idExtension}`}
                        md="auto"
                    >
                        RNG seed:
                    </Col>
                    <Col id={`${flowPrefix}-split-rng-seed-column${idExtension}`}>
                        <input
                            id={`${flowPrefix}-split-rng-seed-input${idExtension}`}
                            type="number"
                            min={0}
                            value={ParentPredictorState.rngSeedValue}
                            onChange={(event) => {
                                SetParentPredictorState({
                                    ...ParentPredictorState,
                                    rngSeedValue: parseInt(event.target.value),
                                })
                            }}
                            className="input-field w-50"
                        />
                    </Col>
                </Row>
            </Container>
        </Card.Body>
    )

    // Create the Component structure
    return (
        <BlueprintCard
            id={`${flowPrefix}${idExtension}`}
            interactive={true}
            elevation={Elevation.TWO}
            style={{padding: 0, width: "10rem", height: "4rem"}}
        >
            <Card
                id={`${flowPrefix}-card-1${idExtension}`}
                border="warning"
            >
                <Card.Body
                    id={`${flowPrefix}-card-2${idExtension}`}
                    className="flex justify-center content-center"
                >
                    <EvergreenText
                        id={`${flowPrefix}-text${idExtension}`}
                        className="mr-2"
                    >
                        {ParentPredictorState.selectedPredictor || "Predictor"}
                    </EvergreenText>
                    <div
                        id={`${flowPrefix}-settings-div${idExtension}`}
                        onMouseDown={(event) => {
                            event.stopPropagation()
                        }}
                    >
                        <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            minHeight="200px"
                            content={
                                <>
                                    <Tablist
                                        id={`${flowPrefix}-settings-tablist${idExtension}`}
                                        marginBottom={16}
                                        flexBasis={240}
                                        marginRight={24}
                                    >
                                        {tabs.map((tab, index) => (
                                            <Tab
                                                id={`${flowPrefix}-settings-${tab}${idExtension}`}
                                                key={tab}
                                                onSelect={() => setSelectedIndex(index)}
                                                isSelected={index === selectedIndex}
                                                aria-controls={`panel-${tab}`}
                                            >
                                                {tab}
                                            </Tab>
                                        ))}
                                    </Tablist>
                                    {selectedIndex === 0 && predictorSelectionPanel}
                                    {selectedIndex === 1 && predictorConfigurationPanel}
                                    {selectedIndex === 2 && dataSplitConfigurationPanel}
                                </>
                            }
                            statelessProps={{
                                backgroundColor: "ghostwhite",
                            }}
                        >
                            <div
                                id={`${flowPrefix}-gr-settings-div${idExtension}`}
                                className="flex"
                            >
                                <button
                                    type="button"
                                    id={`${flowPrefix}-gr-settings-button${idExtension}`}
                                    className="mt-1"
                                    style={{height: 0}}
                                >
                                    <GrSettingsOption id={`${flowPrefix}-gr-settings-option${idExtension}`} />
                                </button>
                            </div>
                        </Popover>
                        <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            position={Position.LEFT}
                            content={
                                <Card.Body
                                    id={`${flowPrefix}-context-card${idExtension}`}
                                    className="overflow-y-auto h-40 text-xs"
                                >
                                    <EvergreenText
                                        id={`${flowPrefix}-context-text${idExtension}`}
                                        className="mb-2"
                                    >
                                        Context
                                    </EvergreenText>
                                    {Object.keys(ParentPredictorState.caoState.context).map((element) => (
                                        <div
                                            id={`${flowPrefix}-context-div${idExtension}`}
                                            key={element}
                                            className="grid grid-cols-2 gap-4 mb-2"
                                        >
                                            <label
                                                id={`${flowPrefix}-context-label-${element}${idExtension}`}
                                                className="capitalize"
                                            >
                                                {" "}
                                                {element}{" "}
                                            </label>
                                            <input
                                                name={element}
                                                id={`${flowPrefix}-context-input-${element}${idExtension}`}
                                                type="checkbox"
                                                defaultChecked={true}
                                                checked={ParentPredictorState.caoState.context[element]}
                                                onChange={(event) => onUpdateCAOState(event, "context")}
                                            />
                                        </div>
                                    ))}
                                </Card.Body>
                            }
                        >
                            <button
                                type="button"
                                id={`${flowPrefix}-context-button${idExtension}`}
                                className="absolute top-2 -left-4"
                                style={{height: 0}}
                            >
                                C
                            </button>
                        </Popover>
                        <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            position={Position.LEFT}
                            content={
                                <Card.Body
                                    id={`${flowPrefix}-actions-card${idExtension}`}
                                    className="overflow-y-auto h-40 text-xs"
                                    style={{zIndex: 1000}}
                                >
                                    <EvergreenText
                                        id={`${flowPrefix}-actions-text${idExtension}`}
                                        className="mb-2"
                                    >
                                        Actions
                                    </EvergreenText>
                                    {Object.keys(ParentPredictorState.caoState.action).map((element) => (
                                        <div
                                            id={`${flowPrefix}-actions-div-${element}${idExtension}`}
                                            key={element}
                                            className="grid grid-cols-2 gap-4 mb-2"
                                        >
                                            <label
                                                id={`${flowPrefix}-actions-label-${element}${idExtension}`}
                                                className="capitalize"
                                            >
                                                {" "}
                                                {element}{" "}
                                            </label>
                                            <input
                                                id={`${flowPrefix}-actions-input-${element}${idExtension}`}
                                                name={element}
                                                type="checkbox"
                                                defaultChecked={true}
                                                checked={ParentPredictorState.caoState.action[element]}
                                                onChange={(event) => onUpdateCAOState(event, "action")}
                                            />
                                        </div>
                                    ))}
                                </Card.Body>
                            }
                        >
                            <button
                                type="button"
                                id={`${flowPrefix}-actions-button${idExtension}`}
                                className="absolute bottom-6 -left-4"
                                style={{height: 0}}
                            >
                                A
                            </button>
                        </Popover>
                        <Popover // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            position={Position.RIGHT}
                            content={
                                <Card.Body
                                    id={`${flowPrefix}-outcomes-card${idExtension}`}
                                    className="overflow-y-auto h-40 text-xs"
                                >
                                    <EvergreenText
                                        id={`${flowPrefix}-outcomes-text${idExtension}`}
                                        className="mb-2"
                                    >
                                        Outcomes
                                    </EvergreenText>
                                    {Object.keys(ParentPredictorState.caoState.outcome).map((element) => (
                                        <div
                                            id={`${flowPrefix}-outcomes-div-${element}${idExtension}`}
                                            key={element}
                                            className="grid grid-cols-2 gap-4 mb-2"
                                        >
                                            <label
                                                id={`${flowPrefix}-outcomes-label-${element}${idExtension}`}
                                                className="capitalize"
                                            >
                                                {" "}
                                                {element}{" "}
                                            </label>
                                            <input
                                                name={element}
                                                id={`${flowPrefix}-outcomes-input-${element}${idExtension}`}
                                                type="checkbox"
                                                defaultChecked={false}
                                                checked={ParentPredictorState.caoState.outcome[element]}
                                                onChange={(event) => onUpdateCAOState(event, "outcome")}
                                            />
                                        </div>
                                    ))}
                                </Card.Body>
                            }
                        >
                            <button
                                id={`${flowPrefix}-outcomes-button${idExtension}`}
                                type="button"
                                className="absolute top-5 -right-4"
                                style={{height: 0}}
                            >
                                O
                            </button>
                        </Popover>
                    </div>
                </Card.Body>
                <div
                    id={`${flowPrefix}-delete-div${idExtension}`}
                    className="px-1 my-1"
                    style={{position: "absolute", bottom: "0px", right: "1px"}}
                >
                    <button
                        id={`${flowPrefix}-delete-button${idExtension}`}
                        type="button"
                        className="hover:text-red-700 text-xs"
                        onClick={() => {
                            DeleteNode(NodeID)
                            sendNotification(NotificationType.success, "Predictor node deleted")
                        }}
                    >
                        <AiFillDelete
                            id={`${flowPrefix}-delete-button-fill${idExtension}`}
                            size="10"
                        />
                    </button>
                </div>
            </Card>

            <Handle
                id={`${flowPrefix}-source-handle${idExtension}`}
                type="source"
                position={HandlePosition.Right}
            />
            <Handle
                id={`${flowPrefix}-target-handle${idExtension}`}
                type="target"
                position={HandlePosition.Left}
            />
        </BlueprintCard>
    )
}

export default PredictorNodeComponent
