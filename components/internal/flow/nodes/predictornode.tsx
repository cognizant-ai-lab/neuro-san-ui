// Import React components
import {
    useState,
    useEffect, SetStateAction, Dispatch
} from 'react'

import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

// Import 3rd party components
import { 
    Card
} from "react-bootstrap"
import { 
    Popover, 
    Text, 
    Position, 
    Tablist, 
    Tab, 
    Tooltip, 
    InfoSignIcon, 
} from "evergreen-ui"
import { GrSettingsOption } from "react-icons/gr"

// Import React Flow
import {
    Handle,
    Position as HandlePosition
} from 'react-flow-renderer'

import { 
    Card as BleuprintCard, 
    Elevation 
} from "@blueprintjs/core";

// Import Controller
import { 
    FetchPredictors,
    FetchMetrics,
    FetchParams
} from '../../../../controller/predictor'
import {
    DataTag,
    CAOType
} from "../../../../controller/datatag/types"
import {loadDataTag} from "../../../../controller/fetchdatataglist";
import {StringBool} from "../../../../controller/base_types";
import {PredictorParams} from "../../../../predictorinfo";


// Interface for Predictor CAO
export interface CAOChecked {
    context: StringBool,
    action: StringBool,
    outcome: StringBool
}


// State of the predictor
export interface PredictorState {
    selectedPredictorType: "regressor" | "classifier",
    selectedPredictor: string,
    selectedMetric: string,
    predictorParams: PredictorParams,
    caoState: CAOChecked,
    trainSliderValue: number,
    testSliderValue: number,
    rngSeedValue: number
}

// Define an interface for the structure
// of the nodes
export interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataSourceId: number

    readonly ParentPredictorState: PredictorState,
    readonly SetParentPredictorState: Dispatch<SetStateAction<PredictorState>>
}



const SliderComponent = Slider.createSliderWithTooltip(Slider);

export default function PredictorNode(props): React.ReactElement {
    /*
    This function is responsible to render the Predictor Node
    */

    const data: PredictorNodeData = props.data

    // Unpack the data
    const { NodeID, ParentPredictorState, SetParentPredictorState } = data

    // Fetch the available metrics and predictors and these are not state dependant
    const metrics = FetchMetrics()
    const predictors = {
        regressor: FetchPredictors("regressor"),
        classifiers: FetchPredictors("classifier")
    }

    // Since predictors change
    const [taggedData, setTaggedData] = useState(null)

    // Fetch the Data Tag
    useEffect(() => {
        (async () => setTaggedData(await loadDataTag(data.SelectedDataSourceId)))()
    }, [data.SelectedDataSourceId])

    // We need to take an intersection of what is in the state (for eg: Predictor Node Creation)
    // and what we can fetch for missing values and update the initial state - but do this only
    // once the data tags are loaded
    useEffect(() => {

            const SelectedPredictor = ParentPredictorState.selectedPredictor || predictors[ParentPredictorState.selectedPredictorType][0]
            const SelectedMetric = ParentPredictorState.selectedMetric || metrics[0]

            // Initialize the parameters to be from the state
            let predictorParams = ParentPredictorState.predictorParams

            // If the parameters do not exist in the state update them
            if (!predictorParams || Object.keys(predictorParams).length === 0) {
                predictorParams = FetchParams(ParentPredictorState.selectedPredictorType, SelectedPredictor)
                // We add a key called value to adjust for user input
                Object.keys(predictorParams).forEach(key => {
                    if (typeof(predictorParams[key].default_value) === "object") {
                        // If the type has to be a choice, select the first choice
                        predictorParams[key].value = predictorParams[key].default_value[0]
                    } else {
                        // If the type is a number, string or a bool
                        // use the default value as the user selected value
                        predictorParams[key].value = predictorParams[key].default_value
                    }
                })
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
                rngSeedValue: ParentPredictorState.rngSeedValue || 0
            })

    },
    [taggedData])

    // const initialize = () => {
    //     /*
    //     This controller invocation is used for the fetching of the predictors and the
    //     metrics of a certain kind of predictor. This only needs to be used once
    //     when the content is being rendered
    //     */
    //
    //     // Fetch the params of the first predictor
    //     const params = FetchParams(
    //         ParentPredictorState.selectedPredictorType,
    //         predictors.regressors[0]
    //     )
    //
    //     // We add a key called value to adjust for user input
    //     Object.keys(params).forEach(key => {
    //         if (typeof(params[key].default_value) === "object") {
    //             // If the type has to be a choice, select the first choice
    //             params[key].value = params[key].default_value[0]
    //         } else {
    //             // If the type is a number, string or a bool
    //             // use the default value as the user selected value
    //             params[key].value = params[key].default_value
    //         }
    //     })
    //
    //     // Construct the CAO Map
    //     let CAOMapping = {
    //         context: [],
    //         action: [],
    //         outcome: []
    //     }
    //
    //     Object.keys(taggedData.fields).forEach(fieldName => {
    //         const field = taggedData.fields[fieldName]
    //         switch (field.esp_type.toString()) {
    //             case "CONTEXT":
    //                 CAOMapping.context.push(fieldName)
    //                 break
    //             case "ACTION":
    //                 CAOMapping.action.push(fieldName)
    //                 break
    //             case "OUTCOME":
    //                 CAOMapping.outcome.push(fieldName)
    //                 break
    //         }
    //     })
    //     // Create the initial state for the CAO Map
    //     let CAOState = {
    //         "context": {},
    //         "action": {},
    //         "outcome": {}
    //     }
    //
    //     CAOMapping.context.forEach(
    //         c => CAOState.context[c] = ParentPredictorState.caoState.context[c] ?? true
    //     )
    //     CAOMapping.action.forEach(
    //         a => CAOState.action[a] = ParentPredictorState.caoState.action[a] ?? true
    //     )
    //     CAOMapping.outcome.forEach(
    //         o => CAOState.outcome[o] = ParentPredictorState.caoState.outcome[o] ?? false
    //     )
    //
    //     SetParentPredictorState({
    //         ...ParentPredictorState,
    //         selectedPredictor: ParentPredictorState.selectedPredictor || predictorsFetched[0],
    //         selectedMetric: ParentPredictorState.selectedMetric || metrics[0],
    //         predictorParams: ParentPredictorState.predictorParams || params,
    //         caoState: CAOState,
    //         trainSliderValue: ParentPredictorState.trainSliderValue || '80',
    //         testSliderValue: ParentPredictorState.testSliderValue || '20',
    //         rngSeedValue: ParentPredictorState.rngSeedValue || ''
    //     })
    // }

    const onPredictorTypeChange = (predictorType: string) => {
        /*
        This controller invokation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor. This only needs to be used once
        when the content is being rendered
        */

        const NewPred = predictors[predictorType][0]
        onPredictorChange(NewPred)

    }

    const onPredictorChange = (selectedPredictor: string) => {
        /*
        This function serves to fetch the parameters of the predictor,
        do some parameter state formatting and update the selected predictor state.
        */

        // Invoke the controller
        const params = FetchParams(ParentPredictorState.selectedPredictorType,
            selectedPredictor)

        // We add a key called value to adjust for user input
        Object.keys(params).forEach(key => {
            if (typeof(params[key].default_value) === "object") {
                params[key].value = params[key].default_value[0]
            } else {
                params[key].value = params[key].default_value
            }
        })
        
        // Write the state.
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: params,
            selectedPredictor: selectedPredictor
        })

    }

    const onParamChange = (event, paramName) => {
        /* 
        This function is used to update the state of the predictor
        parameters.
        */
        const { value } = event.target
        let paramsCopy = {...ParentPredictorState.predictorParams}
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
        let paramsCopy = {...ParentPredictorState.predictorParams}
        paramsCopy[paramName].value = checked
        SetParentPredictorState({
            ...ParentPredictorState,
            predictorParams: paramsCopy
        })
    }

    const onTrainSliderChange = newValue => {
        let newTestSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue
        });
    };

    const onTestSliderChange = newValue => {
        let newTrainSliderValue = 100 - newValue
        SetParentPredictorState({
            ...ParentPredictorState,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue
        });
    };

    const onUpdateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        let caoStateCopy = { ...ParentPredictorState.caoState }

        caoStateCopy[espType][name] = checked
        
        SetParentPredictorState({
            ...ParentPredictorState,
            caoState: caoStateCopy
        })
    }

    // We use the use Effect hook here to ensure that we can provide
    // no dependancies for prop update. In this specific case it acts
    // as DidComponentUpdate function for class Components or similar to
    // getInitialProps/getServerSideProps for a NextJS Component.
    // Here useEffect also provides no clean up function
    // useEffect(() => {
    //     // Do not initialize if state has been initialized before
    //     // We check this using the context variable, the parent should
    //     // in an uninitialized state pass it as an empty dict.
    //     if (ParentPredictorState.caoState.context && Object.keys(ParentPredictorState.caoState.context).length == 0) {
    //         initialize()
    //     }
    // }, [])

    // Here we initialize again, if the data source changes
    // useEffect(() => {
    //     initialize()
    // }, [data.SelectedDataTag])

    // We want to have a tabbed predictor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Predictor', 'Configuration', 'Data Split'])

    // Create the selection Panel
    const PredictorSelectionPanel = <Card.Body>
                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0 mr-2">Type: </label>
                                            <select 
                                                name={ `${NodeID}-predictorType` } 
                                                onChange={ event => onPredictorTypeChange(event.target.value)}
                                                className="w-32" >
                                                    <option value="regressor">Regressor</option>
                                                    <option disabled value="classifier">Classfier (Coming Soon)</option>
                                                    <option disabled value="evolution">Evolution (Coming Soon)</option>
                                            </select>    
                                        </div>
                                        
                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0">Predictor: </label>
                                            <select 
                                                name={ `${NodeID}-predictor` } 
                                                value={ ParentPredictorState.selectedPredictor }
                                                onChange={ event => onPredictorChange(event.target.value) }
                                                className="w-32">
                                                    { ParentPredictorState.selectedPredictorType &&
                                                        predictors[ParentPredictorState.selectedPredictorType].map(
                                                                (predictor, _) => 
                                                                    <option key={ predictor } value={ predictor }>
                                                                        { predictor }
                                                                    </option>
                                                            ) 
                                                    }
                                            </select>
                                        </div>

                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0">Metric: </label>
                                            <select 
                                                name={ `${NodeID}-metric` } 
                                                value={ ParentPredictorState.selectedMetric }
                                                onChange={ event => { SetParentPredictorState({...ParentPredictorState, selectedMetric: event.target.value}) } }
                                                className="w-32">
                                                     { metrics.map(
                                                                (metric, _) => 
                                                                    <option key={metric} value={ metric }>
                                                                        { metric }
                                                                    </option>
                                                            ) 
                                                    }
                                            </select>
                                        </div>
                                    </Card.Body>

    // Create the configuration Panel
    const PredictorConfigurationPanel = <Card.Body className="overflow-y-auto h-40 text-xs" id={ `${NodeID}-predictorconfig` }>
                                        {   ParentPredictorState.predictorParams &&
                                            Object.keys(ParentPredictorState.predictorParams).map((param, _) =>
                                                <div className="grid grid-cols-3 gap-4 mb-2" key={param} >
                                                    <label className="capitalize">{ param }: </label>
                                                    { 
                                                        ParentPredictorState.predictorParams[param].type === "int" &&
                                                        <input
                                                        type="number" 
                                                        step="1" 
                                                        defaultValue={ ParentPredictorState.predictorParams[param].default_value.toString() }
                                                        value={ ParentPredictorState.predictorParams[param].value.toString() }
                                                        onChange={event => onParamChange(event, param)}
                                                        /> 
                                                    }
                                                    { 
                                                        ParentPredictorState.predictorParams[param].type === "float" &&
                                                        <input
                                                        type="number" 
                                                        step="0.1"
                                                        defaultValue={ ParentPredictorState.predictorParams[param].default_value.toString() }
                                                        value={ ParentPredictorState.predictorParams[param].value.toString() }
                                                        onChange={event => onParamChange(event, param)}
                                                        /> 
                                                    }
                                                    { 
                                                        ParentPredictorState.predictorParams[param].type === "bool" && (
                                                        <input 
                                                            type="checkbox"
                                                            defaultChecked={ Boolean(ParentPredictorState.predictorParams[param].default_value) }
                                                            checked={ Boolean(ParentPredictorState.predictorParams[param].value) }
                                                            onChange={event => onPredictorParamCheckBoxChange(event, param)}
                                                        />
                                                        )
                                                    }
                                                    { 
                                                        typeof(ParentPredictorState.predictorParams[param].type) === "object" &&
                                                        <select
                                                            value={ ParentPredictorState.predictorParams[param].value.toString() }
                                                            onChange={event => onParamChange(event, param)}
                                                            className="w-32">
                                                            {
                                                                // This requirement to wrap the type in an Array arises
                                                                // from a limitation of typescript where it lets ypu define a union
                                                                // over several datatype but can't determine if you call any function on it
                                                                Array(ParentPredictorState.predictorParams[param].type).map(
                                                                (value: string, _) => <option key={value} value={ value }>{ value }</option>)
                                                            }
                                                        </select>
                                                    }
                                                    <Tooltip content={ ParentPredictorState.predictorParams[param].description } >
                                                        <InfoSignIcon />
                                                    </Tooltip>
                                                </div>
                                            )
                                        }
                                            
                                        </Card.Body>

    // Create the data split card
    const DataSplitConfigurationPanel = <Card.Body>
        <div className="flex justify-between mb-4 content-center"
             onMouseDown={ (event) => { event.stopPropagation() } }
        >
            <label className="m-0 mr-2">Train: </label>
            <label>0%</label>

            <SliderComponent
                onChange={ event => onTrainSliderChange(event) }
                min={0}
                max={100}
                value={ParentPredictorState.trainSliderValue}
                defaultValue={80}
            >
            </SliderComponent>
            <label>100%</label>
        </div>
        <div className="flex justify-between mb-4 content-center"
             onMouseDown={ (event) => { event.stopPropagation() } }
        >
            <label className="m-0 mr-2">Test: </label>
            <label>0%</label>

            <SliderComponent
                onChange={ event => onTestSliderChange(event) }
                min={0}
                max={100}
                value={ParentPredictorState.testSliderValue}
                defaultValue={20}
            >
            </SliderComponent>
            <label>100%</label>
        </div>
        <div>
            <label>
                Data split RNG seed:
                <input id="split_rng"
                       type={"number"}
                       value={ParentPredictorState.rngSeedValue}
                       onChange={ event => { SetParentPredictorState({...ParentPredictorState, rngSeedValue: parseInt(event.target.value)}) } }
                       className="input-field"
                        />
            </label>
        </div>
    </Card.Body>

    // Create the Component structure
    return <BleuprintCard 
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }>
                
            <Card border="warning" style={{ height: "100%" }}>
                    <Card.Body className="flex justify-center content-center">
                        <Text className="mr-2">{ ParentPredictorState.selectedPredictor || "Predictor" }</Text>
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
                                { selectedIndex === 0  && PredictorSelectionPanel }
                                { selectedIndex === 1  && PredictorConfigurationPanel }
                                { selectedIndex === 2  && DataSplitConfigurationPanel }
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
                                        Object.keys(ParentPredictorState.caoState.context).map(element =>
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={true}
                                            checked={ParentPredictorState.caoState.context[element]}
                                            onChange={event => onUpdateCAOState(event, "context")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button" className="absolute top-2 -left-4" style={{height: 0}}>C</button>
                        </Popover>
                        <Popover
                            position={Position.LEFT}
                            content={
                                <Card.Body 
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Actions</Text>
                                    {
                                        Object.keys(ParentPredictorState.caoState.action).map(element =>
                                        <div 
                                        key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
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
                            <button type="button" className="absolute bottom-6 -left-4" style={{height: 0}}>A</button>
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
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={false}
                                            checked={ParentPredictorState.caoState.outcome[element]}
                                            onChange={event => onUpdateCAOState(event, "outcome")}/>
                                        </div>)
                                    }
                                </Card.Body>
                            }
                            >
                            <button type="button" className="absolute top-5 -right-4" style={{height: 0}}>O</button>
                        </Popover>
                    </Card.Body>
                </Card>

                <Handle type="source" position={HandlePosition.Right} />
                <Handle type="target" position={HandlePosition.Left} />
        </BleuprintCard>
}
