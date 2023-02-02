// React components
import {Dispatch, ReactElement, SetStateAction, useEffect, useState} from 'react'

// 3rd party components
import {Row, Col, Card, Container} from "react-bootstrap"
import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {
    InfoSignIcon,
    Popover,
    Position,
    Tab,
    Tablist,
    Text,
    Tooltip,
} from "evergreen-ui"
import {BsPlusSquare} from "react-icons/bs"
import { GrSettingsOption } from "react-icons/gr"
import Slider from "rc-slider"
import 'rc-slider/assets/index.css'
import {useSession} from "next-auth/react"
import {Tooltip as AntdTooltip} from "antd"

// React Flow
import {
    getOutgoers,
    Handle,
    Position as HandlePosition
} from 'react-flow-renderer'

import {AiFillDelete} from "react-icons/ai";
import {StringBool} from "../../../../controller/base_types"
import {NotificationType, sendNotification} from "../../../../controller/notification";

// Controllers
import {
    FetchMetrics,
    FetchParams,
    FetchPredictors
} from '../../../../controller/predictor'
import {loadDataTag} from "../../../../controller/fetchdatataglist"
import {FlowQueries} from "../flowqueries";
import {PredictorParams} from "../predictorinfo"


// Interface for Predictor CAO
export interface CAOChecked {
    context: StringBool,
    action: StringBool,
    outcome: StringBool
}


// State of the predictor
export interface PredictorState {
    selectedPredictorType: string,
    selectedPredictor: string,
    selectedMetric: string,
    predictorParams: PredictorParams,
    caoState: CAOChecked,
    trainSliderValue: number,
    testSliderValue: number,
    rngSeedValue: number
}

// Define an interface for the structure of the Predictor node
interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly ParentPredictorState: PredictorState,
    readonly SetParentPredictorState: Dispatch<SetStateAction<PredictorState>>,

    // Mutator method to delete this node from the parent flow
    readonly DeleteNode: (nodeID: string) => void,

    // Mutator method for adding an uncertainty model node to the parent Flow
    readonly AddUncertaintyModelNode: (nodeID: string) => void

    // Entire flow (of which this node is a part). We will use it when we need to know if we have an associated
    // uncertainty model node.

    // Note: our flow is very weakly typed. Nodes are just bags of properties. This will change when we upgrade
    // react-flow to v10 and v11, where nodes are strongly typed.
    // For now, disabled eslint and use any[] so at least we have _some_ kind of type hint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly GetFlow: () => any[]

    // Gets a simpler index for testing ids (at least)
    readonly GetElementIndex: (nodeID: string) => number
}

export default function PredictorNode(props): ReactElement {
    /*
    This function is responsible to render the Predictor Node
    */

    const data: PredictorNodeData = props.data

    // Get the current user
    const { data: session } = useSession()
    const currentUser: string = session.user.name

    // Unpack the data
    const {
        NodeID,
        ParentPredictorState,
        SetParentPredictorState,
        DeleteNode,
        AddUncertaintyModelNode,
        GetFlow,
        GetElementIndex
    } = data

    const flowIndex = GetElementIndex(NodeID) + 1

    // Fetch the available metrics and predictors and these are not state dependant
    const metrics = {
        regressor: FetchMetrics("regressor"),
        classifier: FetchMetrics("classifier")
    }
    const predictors = {
        regressor: FetchPredictors("regressor"),
        classifier: FetchPredictors("classifier")
    }

    // Since predictors change
    const [taggedData, setTaggedData] = useState(null)

    //Set the dropdown defaults here since the dropdown is created here
    const DEFAULT_CLASSIFIER_METRIC = metrics["classifier"][0]
    const DEFAULT_REGRESSOR_METRIC = metrics["regressor"][0]
    
    // Fetch the Data Tag
    useEffect(() => {
        //TODO: If the data node has the data source and tag available we should not fetch it but use that.
        //TODO: Reason: Data Tags can change and we don't version them explicitly - this will be an easy way of doing that. If they were to change and we had to re-run a run it might fail
        (async () => setTaggedData(await loadDataTag(currentUser, data.SelectedDataSourceId)))()
    }, [data.SelectedDataSourceId])

    // We need to take an intersection of what is in the state (for eg: Predictor Node Creation)
    // and what we can fetch for missing values and update the initial state - but do this only
    // once the data tags are loaded
    useEffect(() => {

            const SelectedPredictor =
                ParentPredictorState.selectedPredictor || predictors[ParentPredictorState.selectedPredictorType][0]
 
            const SelectedMetric = ParentPredictorState.selectedPredictorType == "classifier" ?
                                   ParentPredictorState.selectedMetric || DEFAULT_CLASSIFIER_METRIC : 
                                   ParentPredictorState.selectedMetric || DEFAULT_REGRESSOR_METRIC

            // Initialize the parameters to be from the state
            let predictorParams = ParentPredictorState.predictorParams

            // If the parameters do not exist in the state update them
            if (!predictorParams || Object.keys(predictorParams).length === 0) {
                predictorParams = FetchParams(ParentPredictorState.selectedPredictorType, SelectedPredictor)
                // We add a key called value to adjust for user input
                predictorParams && Object.keys(predictorParams).forEach(key => {
                    if (typeof(predictorParams[key].default_value) === "object") {
                        // If the type has to be a choice, select the first choice
                        predictorParams[key].value = predictorParams[key].default_value[0]
                    } else {
                        // If the type is a number, string or a bool
                        // use the default value as the user selected value
                        predictorParams[key].value = predictorParams[key].default_value
                    }
                })
            } else {
                const keys = Object.keys(
                    FetchParams(ParentPredictorState.selectedPredictorType, SelectedPredictor)
                )

                // Make sure predictor config items are presented to the user in consistent order
                // We sort them in the same order as the keys in the definition in SUPPORTED_REGRESSION_MODELS
                predictorParams = Object.fromEntries(
                    Object.entries(predictorParams)
                        .sort((field1, field2) => keys.indexOf(field1[0]) - keys.indexOf(field2[0]))
                )
            }

            // Build the CAO State for the data tag from the given data source id
            const CAOState: CAOChecked = ParentPredictorState.caoState

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
                        case "OUTCOME":
                            CAOState.outcome[fieldName] = CAOState.outcome[fieldName] ?? false
                            break
                    }
                })
            }


            SetParentPredictorState({
                ...ParentPredictorState,
                selectedPredictor: SelectedPredictor,
                selectedMetric: SelectedMetric,
                predictorParams: predictorParams,
                caoState: CAOState,
                trainSliderValue: ParentPredictorState.trainSliderValue || 80,
                testSliderValue: ParentPredictorState.testSliderValue || 20,
                rngSeedValue: ParentPredictorState.rngSeedValue || null
            })

    },
    [taggedData])

    const onPredictorTypeChange = (predictorType: string) => {
        /*
        This controller invocation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor.
        */

        // Don't allow changing to Classifier type if there's an uncertainty node attached, since we do not support
        // that
        if (predictorType === "classifier") {
            const flow = GetFlow()
            const thisPredictorNode = FlowQueries.getNodeByID(flow, NodeID);
            const hasUncertaintyNode = getOutgoers(thisPredictorNode, flow)
                .some(node => node.type === "uncertaintymodelnode")

            if (hasUncertaintyNode) {
                sendNotification(NotificationType.warning,
                    "This predictor node has an attached uncertainty model node, so the type cannot " +
                    "be changed to \"classifier\".",
                    "Remove the associated uncertainty model node if you wish to change this predictor type.")
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
        params && Object.keys(params).forEach(key => {
            if (typeof(params[key].default_value) === "object") {
                params[key].value = params[key].default_value[0]
            } else {
                params[key].value = params[key].default_value
            }
        })

        // Get default metric for new predictor type
        const selectedMetric = FetchMetrics(predictorType)[0]

        // Write the state.
        SetParentPredictorState({
            ...ParentPredictorState,
            selectedPredictorType: predictorType,
            predictorParams: params,
            selectedPredictor: selectedPredictor,
            selectedMetric: selectedMetric
        })

    }

    const onParamChange = (event, paramName) => {
        /*
        This function is used to update the state of the predictor
        parameters.
        */
        const { value } = event.target
        const paramsCopy = {...ParentPredictorState.predictorParams}
        paramsCopy[paramName].value = value
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: paramsCopy
        })
    }

    const onPredictorParamCheckBoxChange = (event, paramName) => {
        /* 
        This function is used to update the state of the predictor
        parameter checkboxes.
        */
        const { checked } = event.target
        const paramsCopy = {...ParentPredictorState.predictorParams}
        paramsCopy[paramName].value = checked
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: paramsCopy
        })
    }

    const onTrainSliderChange = newValue => {
        const newTestSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue
        });
    };

    const onTestSliderChange = newValue => {
        const newTrainSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue
        });
    };

    const onUpdateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        const caoStateCopy = { ...ParentPredictorState.caoState }

        caoStateCopy[espType][name] = checked
        
        SetParentPredictorState({
            ...ParentPredictorState,
            caoState: caoStateCopy
        })
    }

    // We want to have a tabbed predictor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Predictor', 'Configuration', 'Data Split'])

    // Create the selection Panel
    const PredictorSelectionPanel = <Card.Body>
                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0 mr-2">Type: </label>
                                            <select id={ `predictor-${flowIndex}-type-select` }
                                                name={ `${NodeID}-predictorType` } 
                                                onChange={ event => onPredictorTypeChange(event.target.value)}
                                                value={ ParentPredictorState.selectedPredictorType }
                                                className="w-32" 
                                                >
                                                    <option id={ `predictor-${flowIndex}-regressor` } value="regressor">
                                                        Regressor
                                                    </option>
                                                    <option id={ `predictor-${flowIndex}-classifier` } value="classifier">
                                                        Classifier
                                                    </option>
                                                    <option disabled id={ `predictor-${flowIndex}-byo` }
                                                        value="byop">
                                                            Bring your own (Coming Soon)
                                                    </option>
                                                    <option disabled id={ `predictor-${flowIndex}-evolution` }
                                                        value="evolution">
                                                            Evolution (Coming Soon)
                                                    </option>
                                            </select>    
                                        </div>
                                        
                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0">Predictor: </label>
                                            <select id={ `predictor-${flowIndex}-select` }
                                                name={ `${NodeID}-predictor` } 
                                                value={ ParentPredictorState.selectedPredictor }
                                                onChange={ event => onPredictorChange(ParentPredictorState.selectedPredictorType, event.target.value) }
                                                className="w-32"
                                                >
                                                    { ParentPredictorState.selectedPredictorType &&
                                                        predictors[ParentPredictorState.selectedPredictorType].map(
                                                                predictor =>
                                                                    <option id={ `predictor-${flowIndex}-option-${predictor}` }
                                                                        key={ predictor } value={ predictor }>
                                                                            { predictor }
                                                                    </option>
                                                            )
                                                    }
                                            </select>
                                        </div>

                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0">Metric: </label>
                                            <select id={ `predictor-${flowIndex}-metric-select` }
                                                name={ `${NodeID}-metric` } 
                                                value={ ParentPredictorState.selectedMetric }
                                                onChange={ event => { SetParentPredictorState({...ParentPredictorState, selectedMetric: event.target.value}) } }
                                                className="w-32"
                                                >
                                                     { metrics[ParentPredictorState.selectedPredictorType].map(
                                                                metric =>
                                                                    <option id={ `predictor-${flowIndex}-metric-${metric}` }
                                                                        key={metric} value={ metric }>
                                                                            { metric }
                                                                    </option>
                                                            )
                                                    }
                                            </select>
                                        </div>
                                    </Card.Body>

    // Create the configuration Panel
    const PredictorConfigurationPanel = <Card.Body className="overflow-y-auto h-40 text-xs" id={ `predictor-${flowIndex}-config` }>
                                        {   ParentPredictorState.predictorParams &&
                                            Object.keys(ParentPredictorState.predictorParams).map(param =>
                                                <div className="grid grid-cols-12 gap-4 mb-2" key={param} >
                                                    <div className="item1 col-span-3">
                                                        <label className="capitalize" id={`${param}-label`}>
                                                            {param}:
                                                        </label>
                                                    </div>
                                                    <div className="item2 col-span-8">
                                                        {
                                                            ParentPredictorState.predictorParams[param].type === "int" &&
                                                                <input id={`${param}-value`}
                                                                    type="number"
                                                                    step="1"
                                                                    defaultValue={ParentPredictorState.predictorParams[param].default_value.toString()}
                                                                    value={ParentPredictorState.predictorParams[param].value.toString()}
                                                                    onChange={event => onParamChange(event, param)}
                                                                />
                                                        }
                                                        {
                                                            ParentPredictorState.predictorParams[param].type === "float" &&
                                                                <input id={`${param}-value`}
                                                                    type="number"
                                                                    step="0.1"
                                                                    defaultValue={ParentPredictorState.predictorParams[param].default_value.toString()}
                                                                    value={ParentPredictorState.predictorParams[param].value.toString()}
                                                                    onChange={event => onParamChange(event, param)}
                                                                />
                                                        }
                                                        {
                                                            ParentPredictorState.predictorParams[param].type === "bool" && (
                                                                <input id={`${param}-value`}
                                                                    type="checkbox"
                                                                    defaultChecked={Boolean(ParentPredictorState.predictorParams[param].default_value)}
                                                                    checked={Boolean(ParentPredictorState.predictorParams[param].value)}
                                                                    onChange={event => onPredictorParamCheckBoxChange(event, param)}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            typeof(ParentPredictorState.predictorParams[param].type) === "object" &&
                                                            <select id={`${param}-value`}
                                                                value={ ParentPredictorState.predictorParams[param].value.toString() }
                                                                onChange={event => onParamChange(event, param)}
                                                                className="w-32"
                                                                >
                                                                {
                                                                    (ParentPredictorState.predictorParams[param].type as Array<string>).map(
                                                                        value => <option id={`${param}-${value}`}
                                                                                    key={value} value={ value }>
                                                                                        { value }
                                                                                  </option>)
                                                                }
                                                            </select>
                                                        }
                                                        {
                                                            ParentPredictorState.predictorParams[param].type === "string" && (
                                                                <input id={`${param}-value`}
                                                                    className="w-full"
                                                                    type="text"
                                                                    defaultValue={ParentPredictorState.predictorParams[param].default_value.toString()}
                                                                    value={ParentPredictorState.predictorParams[param].value.toString()}
                                                                    onChange={event => onParamChange(event, param)}
                                                                />
                                                            )
                                                        }
                                                        {
                                                            ParentPredictorState.predictorParams[param].type === "password" && (
                                                                <input id={`${param}-value`}

                                                                    className="w-full"
                                                                    type="password"
                                                                    defaultValue={ParentPredictorState.predictorParams[param].default_value.toString()}
                                                                    value={ParentPredictorState.predictorParams[param].value.toString()}
                                                                    onChange={event => onParamChange(event, param)}
                                                                />
                                                            )
                                                        }
                                                    </div>
                                                    <div className="item3 col-span-1">
                                                        <Tooltip content={ParentPredictorState.predictorParams[param].description} >
                                                            <InfoSignIcon />
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            )
                                        }
                                            
                                        </Card.Body>

    // Create the data split card

    const isRegressor: boolean = ParentPredictorState.selectedPredictorType === "regressor"
    const marks = {
        0: {label: "0%"},
        100: {label: "100%", style: {color: "#666"}}  // To prevent end mark from being "grayed out"
    }

    const DataSplitConfigurationPanel = <Card.Body>
        <Container>
            <Row className="mx-2 my-8">
                <Col md={2} className="mr-4" id="train_label">
                    Train:
                </Col>
                <Col md={9}>
                    <Slider
                        onChange={event => onTrainSliderChange(event)}
                        min={0}
                        max={100}
                        value={ParentPredictorState.trainSliderValue}
                        marks={marks}
                        handleRender={(node) => {
                            return (
                                   <AntdTooltip title={`${ParentPredictorState.trainSliderValue}%`}>{node}</AntdTooltip>
                            )
                        }}
                    />
                </Col>
            </Row>
            <Row className="mx-2 my-8">
                <Col md={2} className="mr-4" id="test_label">
                   Test:
                </Col>
                <Col md={9}>
                    <Slider
                        onChange={ event => onTestSliderChange(event) }
                        min={0}
                        max={100}
                        value={ParentPredictorState.testSliderValue}
                        marks={marks}
                        handleRender={(node) => {
                            return (
                                <AntdTooltip title={`${ParentPredictorState.testSliderValue}%`}>{node}</AntdTooltip>
                            )
                        }}
                    />
                </Col>
            </Row>
            <Row className="mx-2 my-8">
                <Col md="auto" id="split_rng_label">
                    RNG seed:
                </Col>
                <Col>
                    <input id="split_rng_value"
                           type={"number"}
                           min={0}
                           value={ParentPredictorState.rngSeedValue}
                           onChange={event => {
                               SetParentPredictorState({...ParentPredictorState, rngSeedValue: parseInt(event.target.value)})
                           }}
                           className="input-field w-50"
                    />
                </Col>
            </Row>
        </Container>
    </Card.Body>

    // Create the Component structure
    return <BlueprintCard
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={{ padding: 0, width: "10rem", height: "4rem" }}>
            <Card border="warning" style={{ height: "100%" }}>
                <Card.Body className="flex justify-center content-center">
                    <Text className="mr-2">{ ParentPredictorState.selectedPredictor || "Predictor" }</Text>
                    <div onMouseDown={(event) => {event.stopPropagation()}}>
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
                                { selectedIndex === 0  && PredictorSelectionPanel }
                                { selectedIndex === 1  && PredictorConfigurationPanel }
                                { selectedIndex === 2  && DataSplitConfigurationPanel }
                            </>
                        }
                             statelessProps={{
                                 backgroundColor: "ghostwhite"
                             }}
                        >
                            <div className="flex">
                                <button type="button"
                                            id={ `predictor-${flowIndex}-gr-settings-option-button` }
                                        className="mt-1"
                                        style={{height: 0}}>
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
                                        Object.keys(ParentPredictorState.caoState.context).map(element =>
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                                <input name={element}
                                                    id={ `predictor-${flowIndex}-context-input` }
                                            type="checkbox"
                                            defaultChecked={true}
                                            checked={ParentPredictorState.caoState.context[element]}
                                            onChange={event => onUpdateCAOState(event, "context")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                                <button type="button"
                                    id={ `predictor-${flowIndex}-context-button` }
                                    className="absolute top-2 -left-4"
                                    style={{height: 0}}>C</button>
                        </Popover>
                        <Popover
                            position={Position.LEFT}
                            content={
                                <Card.Body
                                className="overflow-y-auto h-40 text-xs"
                                style={{zIndex: 1000}}
                                >
                                    <Text className="mb-2">Actions</Text>
                                    {
                                        Object.keys(ParentPredictorState.caoState.action).map(element =>
                                            <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                                <input id={ `predictor-${flowIndex}-actions-input` }
                                            name={element}
                                            type="checkbox"
                                            defaultChecked={true}
                                            checked={ParentPredictorState.caoState.action[element]}
                                            onChange={event => onUpdateCAOState(event, "action")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button"
                                        id={ `predictor-${flowIndex}-actions-button` }
                                    className="absolute bottom-6 -left-4"
                                    style={{height: 0}}>A</button>
                        </Popover>
                        <Popover
                            position={Position.RIGHT}
                            content={
                                <Card.Body
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Outcomes</Text>
                                    {
                                        Object.keys(ParentPredictorState.caoState.outcome).map(element =>
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                                <input name={element}
                                                    id={ `predictor-${flowIndex}-outcomes-input` }
                                            type="checkbox"
                                            defaultChecked={false}
                                            checked={ParentPredictorState.caoState.outcome[element]}
                                            onChange={event => onUpdateCAOState(event, "outcome")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button"
                                        id={ `predictor-${flowIndex}-outcomes-button` }
                                    className="absolute top-5 -right-4"
                                    style={{height: 0}}>O
                            </button>
                        </Popover>
                        <Tooltip
                            showDelay={1}
                            content={
                                isRegressor
                                    ? "Add uncertainty model node"
                                    : "Uncertainty models are not currently supported for this type of predictor"
                            }
                        >
                            <div className="px-1 my-1"
                                 style={{
                                     position: "absolute",
                                     right: "1px",
                                 }}
                            >
                                <button type="button"
                                        id="add-uncertainty-node-button"
                                        disabled={!isRegressor}
                                        style={{
                                            height: 15,
                                            cursor: isRegressor ? "pointer" : "not-allowed",
                                            opacity: isRegressor ? "100%" : "50%"
                                        }}
                                        onClick={() => AddUncertaintyModelNode(NodeID)}
                                >
                                    <BsPlusSquare size="0.6em" />
                                </button>
                            </div>
                        </Tooltip>
                    </div>
                </Card.Body>
                    <div className="px-1 my-1" style={{position: "absolute", bottom: "0px", right: "1px"}}>
                        <button type="button"
                                id="delete-me"
                                className="hover:text-red-700 text-xs"
                                onClick={() => {
                                    DeleteNode(NodeID)
                                    sendNotification(NotificationType.success, "Predictor node deleted")
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
