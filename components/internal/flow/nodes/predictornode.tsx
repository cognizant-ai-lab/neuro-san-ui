import {Tooltip as AntdTooltip} from "antd"
import {InfoSignIcon, Tooltip} from "evergreen-ui"
import {useSession} from "next-auth/react"
import Slider from "rc-slider"
import {FC, useEffect, useState} from "react"
import {Card, Col, Container, Row} from "react-bootstrap"
import "rc-slider/assets/index.css"
import {getOutgoers, NodeProps, useEdges, useNodes} from "reactflow"

import ConfigurableNodeComponent, {ConfigurableNode, ConfigurableNodeData} from "./generic/configurableNode"
import {BaseParameterType} from "./generic/types"
import {NodeData, NodeType} from "./types"
import {loadDataTag} from "../../../../controller/datatag/fetchdatataglist"
import {DataTag} from "../../../../controller/datatag/types"
import useFeaturesStore from "../../../../state/features"
import {NotificationType, sendNotification} from "../../../notification"
import ConfigNumeric from "../confignumeric"
import {EdgeType} from "../edges/types"
import {FlowQueries} from "../flowqueries"
import {fetchMetrics, fetchParams, fetchPredictors} from "../predictorinfo"

const PredictorNodeComponent: FC<NodeProps<ConfigurableNodeData>> = (props) => {
    /*
    This function is responsible to render the Predictor Node
    */

    // Retrieve the demo user flag from the store
    const {isDemoUser} = useFeaturesStore()

    const data: ConfigurableNodeData = props.data
    const {idExtension = ""} = data

    // Get the current user
    const {data: session} = useSession()
    const currentUser: string = session?.user?.name || ""

    // Unpack the data
    const {NodeID, ParentNodeState, SetParentNodeState, GetElementIndex} = data

    const nodes = useNodes<NodeData>() as NodeType[]
    const edges = useEdges() as EdgeType[]

    const flowIndex = GetElementIndex(NodeID) + 1
    const flowPrefix = `predictor-${flowIndex}`

    // Fetch the available metrics and predictors and these are not state dependant
    const metrics = {
        regressor: fetchMetrics("regressor"),
        classifier: fetchMetrics("classifier"),
    }

    // These predictors will only be shown in demo mode. As of writing (June 2023) they aren't implement and are
    // only in the list for demo purposes.
    const demoOnlyPredictors = ["Transformer", "LLM"]

    const predictors = {
        regressor: isDemoUser
            ? fetchPredictors("regressor")
            : fetchPredictors("regressor").filter((predictor) => {
                  return !demoOnlyPredictors.includes(predictor)
              }),
        classifier: fetchPredictors("classifier"),
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
        async function callSetTaggedData() {
            if (data.SelectedDataSourceId) {
                return setTaggedData(await loadDataTag(currentUser, data.SelectedDataSourceId))
            }
            return null
        }

        callSetTaggedData()
    }, [data.SelectedDataSourceId])

    // We need to take an intersection of what is in the state (for eg: Predictor Node Creation)
    // and what we can fetch for missing values and update the initial state - but do this only
    // once the data tags are loaded
    useEffect(() => {
        const selectedPredictor =
            ParentNodeState.selectedPredictor || predictors[ParentNodeState.selectedPredictorType || ""][0]

        const selectedMetric =
            ParentNodeState.selectedPredictorType === "classifier"
                ? ParentNodeState.selectedMetric || DEFAULT_CLASSIFIER_METRIC
                : ParentNodeState.selectedMetric || DEFAULT_REGRESSOR_METRIC

        // Initialize the parameters to be from the state
        let predictorParams
        predictorParams = ParentNodeState.params

        // If the parameters do not exist in the state update them
        if (!predictorParams || Object.keys(predictorParams).length === 0) {
            predictorParams = fetchParams(ParentNodeState.selectedPredictorType || "", selectedPredictor)
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
            const keys = Object.keys(fetchParams(ParentNodeState.selectedPredictorType || "", selectedPredictor))

            // Make sure predictor config items are presented to the user in consistent order
            // We sort them in the same order as the keys in the definition in SUPPORTED_REGRESSION_MODELS
            predictorParams = Object.fromEntries(
                Object.entries(predictorParams).sort(
                    (field1, field2) => keys.indexOf(field1[0]) - keys.indexOf(field2[0])
                )
            )
        }

        // Build the CAO State for the data tag from the given data source id
        const CAOState = ParentNodeState.caoState

        if (taggedData) {
            // For predictors with only one outcome, we want to check it by default
            const hasOnlyOneOutcome: boolean =
                Object.values(taggedData.fields).filter((f) => f.esp_type === "OUTCOME").length === 1
            Object.keys(taggedData.fields).forEach((fieldName) => {
                const field = taggedData.fields[fieldName]
                const espType = field.esp_type.toString()
                switch (espType) {
                    case "CONTEXT":
                        CAOState.context[fieldName] = CAOState?.context?.[fieldName] ?? true
                        break
                    case "ACTION":
                        CAOState.action[fieldName] = CAOState?.action?.[fieldName] ?? true
                        break
                    case "OUTCOME":
                        CAOState.outcome[fieldName] = CAOState?.outcome?.[fieldName] ?? hasOnlyOneOutcome
                        break
                    default:
                        console.warn(`Unknown ESP type encountered: ${espType}`)
                        break
                }
            })
        }

        SetParentNodeState({
            ...ParentNodeState,
            selectedPredictor: selectedPredictor,
            selectedMetric: selectedMetric,
            caoState: CAOState,
            trainSliderValue: ParentNodeState.trainSliderValue || 80,
            testSliderValue: ParentNodeState.testSliderValue || 20,
            rngSeedValue: ParentNodeState.rngSeedValue || null,
            params: {
                ...ParentNodeState.params,
                ...predictorParams,
            },
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
            const thisPredictorNode = FlowQueries.getNodeByID(nodes, NodeID) as ConfigurableNode
            const hasUncertaintyNode = getOutgoers<NodeData, ConfigurableNodeData>(
                thisPredictorNode,
                nodes,
                edges
            ).some((node) => node.type === "uncertaintymodelnode")

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const predictorParams: any = fetchParams(predictorType, selectedPredictor)

        // We add a key called value to adjust for user input
        predictorParams &&
            Object.keys(predictorParams).forEach((key) => {
                if (typeof predictorParams[key].default_value === "object") {
                    predictorParams[key].value = predictorParams[key].default_value[0]
                } else {
                    predictorParams[key].value = predictorParams[key].default_value
                }
            })

        // Get default metric for new predictor type
        const selectedMetric = Array.from(fetchMetrics(predictorType).keys())[0]

        // Write the state.
        SetParentNodeState({
            ...ParentNodeState,
            selectedPredictorType: predictorType,
            selectedPredictor: selectedPredictor,
            selectedMetric: selectedMetric,
            params: {
                ...ParentNodeState.params,
                ...predictorParams,
            },
        })
    }

    const onParamChange = (event, paramName: string) => {
        /*
        This function is used to update the state of the predictor
        parameters.
        */
        const {value} = event.target
        const paramsCopy = {...ParentNodeState.params}
        paramsCopy[paramName].value = value
        SetParentNodeState({
            ...ParentNodeState,
            params: {
                ...ParentNodeState.params,
                ...paramsCopy,
            },
        })
    }

    const onPredictorParamCheckBoxChange = (event, paramName) => {
        /*
        This function is used to update the state of the predictor
        parameter checkboxes.
        */
        const {checked} = event.target
        const paramsCopy = {...ParentNodeState.params}
        paramsCopy[paramName].value = checked
        SetParentNodeState({
            ...ParentNodeState,
            params: {
                ...ParentNodeState.params,
                ...paramsCopy,
            },
        })
    }

    const onTrainSliderChange = (newValue) => {
        const newTestSliderValue = 100 - newValue
        SetParentNodeState({
            ...ParentNodeState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue,
        })
    }

    const onTestSliderChange = (newValue) => {
        const newTrainSliderValue = 100 - newValue
        SetParentNodeState({
            ...ParentNodeState,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue,
        })
    }

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
                            value={ParentNodeState.selectedPredictorType}
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
                            value={ParentNodeState.selectedPredictor}
                            onChange={(event) =>
                                onPredictorChange(ParentNodeState.selectedPredictorType || "", event.target.value)
                            }
                            style={{fontSize: "smaller", width: "100%"}}
                        >
                            {ParentNodeState.selectedPredictorType &&
                                predictors[ParentNodeState.selectedPredictorType].map((predictor) => (
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
                            value={ParentNodeState.selectedMetric}
                            onChange={(event) => {
                                SetParentNodeState({...ParentNodeState, selectedMetric: event.target.value})
                            }}
                            style={{fontSize: "smaller", width: "100%"}}
                        >
                            {Array.from<string>(metrics[ParentNodeState.selectedPredictorType || ""].keys()).map(
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
        ParentNodeState.selectedPredictor || predictors[ParentNodeState.selectedPredictorType || ""][0]
    const defaultParams = fetchParams(ParentNodeState.selectedPredictorType || "", selectedPredictor)

    // Create the configuration Panel
    const predictorConfigurationPanel = (
        <Card.Body
            className="overflow-y-scroll h-40 text-xs pl-4 pr-4"
            id={`${flowPrefix}-config${idExtension}`}
        >
            {ParentNodeState.params &&
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
                            {defaultParams[param].type === BaseParameterType.INT ||
                                (defaultParams[param].type === BaseParameterType.FLOAT && (
                                    <ConfigNumeric
                                        id={`${flowPrefix}-${param}-value${idExtension}`}
                                        paramName={param}
                                        defaultParam={defaultParams[param]}
                                        value={
                                            ParentNodeState.params[param]?.value != null &&
                                            ParentNodeState.params[param].value
                                        }
                                        onParamChange={(event) => onParamChange(event, param)}
                                    />
                                ))}
                            {defaultParams[param].type === BaseParameterType.BOOLEAN && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    type="checkbox"
                                    checked={
                                        ParentNodeState.params[param]?.value == null
                                            ? defaultParams[param].default_value == null
                                                ? undefined
                                                : Boolean(defaultParams[param].default_value)
                                            : Boolean(ParentNodeState.params[param].value)
                                    }
                                    onChange={(event) => onPredictorParamCheckBoxChange(event, param)}
                                />
                            )}
                            {defaultParams[param].type === BaseParameterType.ARRAY && (
                                <select
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    value={
                                        ParentNodeState.params[param]?.value == null
                                            ? defaultParams[param].default_value == null
                                                ? undefined
                                                : defaultParams[param].default_value?.toString()
                                            : ParentNodeState.params[param].value?.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                    className="w-32 p-0"
                                >
                                    {(defaultParams[param].typeArray as string[]).map((value) => (
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
                            {defaultParams[param].type === BaseParameterType.STRING && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    className="w-full"
                                    type="text"
                                    defaultValue={defaultParams[param].default_value?.toString()}
                                    value={ParentNodeState.params[param]?.value?.toString()}
                                    onChange={(event) => onParamChange(event, param)}
                                />
                            )}
                            {defaultParams[param].type === BaseParameterType.PASSWORD && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    className="w-full"
                                    type="password"
                                    defaultValue={defaultParams[param].default_value?.toString()}
                                    value={ParentNodeState.params[param]?.value?.toString()}
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
                                content={<>{defaultParams?.[param].description}</>}
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
                            value={ParentNodeState.trainSliderValue}
                            marks={marks}
                            handleRender={(node) => {
                                return (
                                    <AntdTooltip
                                        id={`${flowPrefix}-train-slider-tooltip${idExtension}`}
                                        title={`${ParentNodeState.trainSliderValue}%`}
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
                            value={ParentNodeState.testSliderValue}
                            marks={marks}
                            handleRender={(node) => {
                                return (
                                    <AntdTooltip
                                        id={`${flowPrefix}-test-slider-tooltip${idExtension}`}
                                        title={`${ParentNodeState.testSliderValue}%`}
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
                            value={ParentNodeState.rngSeedValue}
                            onChange={(event) => {
                                SetParentNodeState({
                                    ...ParentNodeState,
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

    const tabs = [
        {title: "Predictor", component: predictorSelectionPanel},
        {title: "Configuration", component: predictorConfigurationPanel},
        {title: "Data Split", component: dataSplitConfigurationPanel},
    ]
    // Create the Component structure
    return (
        <ConfigurableNodeComponent
            id={`${flowPrefix}${idExtension}`}
            data={{
                ...props.data,
                tabs,
                NodeTitle: ParentNodeState.selectedPredictor,
                enableCAOActions: true,
            }}
            type="predictor"
            selected={false}
            zIndex={0}
            isConnectable={false}
            xPos={0}
            yPos={0}
            dragging={false}
        />
    )
}

export default PredictorNodeComponent
