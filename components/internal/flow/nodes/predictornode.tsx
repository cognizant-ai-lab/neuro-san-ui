// Import React components
import { 
    useState, 
    useEffect 
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

// Define an interface for the structure
// of the nodes
export interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly SelectedDataTag: DataTag

    readonly state: any,
    readonly setState: any
}

const SliderComponent = Slider.createSliderWithTooltip(Slider);

export default function PredictorNode(props): React.ReactElement {
    /*
    This function is responsible to render the Predictor Node
    NOTE: THIS RENDERS FORMS ELEMENT BUT NOT THE FORM ITSELF
    THE FORM MUST BE RENDERED AS A PARENT CONTAINER OF THIS.
    */

    const data: PredictorNodeData = props.data

    // Unpack the data
    const { NodeID, state, setState } = data

    const initialize = () => {
        /*
        This controller invocation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor. This only needs to be used once
        when the content is being rendered
        */

        // Invoke the controllers
        const predictorsFetched = FetchPredictors("regressor")
        const metricsFetched = FetchMetrics()

        // Run Fetch Parameters
        const params = FetchParams(state.selectedPredictorType, predictorsFetched[0])

        // We add a key called value to adjust for user input
        Object.keys(params).forEach(key => {
            if (typeof(params[key].default_value) === "object") {
                params[key].value = params[key].default_value[0]
            } else {
                params[key].value = params[key].default_value
            }
        })

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
            "context": {},
            "action": {},
            "outcome": {}
        }

        CAOMapping.context.forEach(
            c => CAOState.context[c] = state.caoState.context[c] ?? true
        )
        CAOMapping.action.forEach(
            a => CAOState.action[a] = state.caoState.action[a] ?? true
        )
        CAOMapping.outcome.forEach(
            o => CAOState.outcome[o] = state.caoState.outcome[o] ?? false
        )

        setState({
            ...state, 
            predictors: predictorsFetched,
            selectedPredictor: state.selectedPredictor || predictorsFetched[0],
            metrics: metricsFetched,
            selectedMetric: state.selectedMetric || metricsFetched[0],
            predictorParams: state.predictorParams || params,
            caoState: CAOState,
            trainSliderValue: state.trainSliderValue || '80',
            testSliderValue: state.testSliderValue || '20',
            rngSeedValue: state.rngSeedValue || ''
        })
    }

    const onPredictorTypeChange = (predictorType: string) => {
        /*
        This controller invokation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor. This only needs to be used once
        when the content is being rendered
        */

        // Invoke the controllers
        const predictorsFetched = FetchPredictors(predictorType)
        const metricsFetched = FetchMetrics()

        // Run Fetch Parameters
        onPredictorChange(predictorsFetched[0])

        setState({
            ...state,
            predictors: predictorsFetched,
            selectedPredictor: predictorsFetched[0],
            metrics: metricsFetched,
            selectedMetric: metricsFetched[0]
        })

    }

    const onPredictorChange = (selectedPredictor: string) => {
        /*
        This function serves to fetch the parameters of the predictor,
        do some parameter state formatting and update the selected predictor state.
        */

        // Invoke the controller
        const params = FetchParams(state.selectedPredictorType, 
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
        setState({
            ...state, 
            predictorParams: params,
            selectedPredictor: selectedPredictor
        })

    }

    const onParamChange = event => {
        /* 
        This function is used to update the state of the predictor
        parameters.
        */
        const { name, value } = event.target
        let paramsCopy = {...state.predictorParams}
        paramsCopy[name].value = value
        setState({
            ...state, 
            predictorParams: paramsCopy
        })
    }

    const onPredictorParamCheckBoxChange = event => {
        /* 
        This function is used to update the state of the predictor
        parameter checkboxes.
        */
        const { name, checked } = event.target
        let paramsCopy = {...state.predictorParams}
        paramsCopy[name].value = checked
        setState({
            ...state, 
            predictorParams: paramsCopy
        })
    }

    const onTrainSliderChange = newValue => {
        let newTestSliderValue = 100 - newValue
        setState({
            ...state,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue
        });
    };

    const onTestSliderChange = newValue => {
        let newTrainSliderValue = 100 - newValue
        setState({
            ...state,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue
        });
    };

    const updateCAOState = ( event, espType: string ) => {
        const { name, checked } = event.target
        let caoStateCopy = { ...state.caoState }

        caoStateCopy[espType][name] = checked
        
        setState({
            ...state, 
            caoState: caoStateCopy
        })
    }

    // We use the use Effect hook here to ensure that we can provide
    // no dependancies for prop update. In this specific case it acts
    // as DidComponentUpdate function for class Components or similar to
    // getInitialProps/getServerSideProps for a NextJS Component.
    // Here useEffect also provides no clean up function
    useEffect(() => {
        // Do not initialize if state has been initialized before
        // We check this using the context variable, the parent should
        // in an uninitialized state pass it as an empty dict.
        if (state.caoState.context && Object.keys(state.caoState.context).length == 0) {
            initialize()
        }
    }, [])

    // Here we initialize again, if the data source changes
    useEffect(() => {
        initialize()
    }, [data.SelectedDataTag])

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
                                                value={ state.selectedPredictor } 
                                                onChange={ event => onPredictorChange(event.target.value) }
                                                className="w-32">
                                                    { state.predictors && 
                                                        state.predictors.map(
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
                                                value={ state.selectedMetric } 
                                                onChange={ event => { setState({...state, selectedMetric: event.target.value}) } }
                                                className="w-32">
                                                     { state.metrics && 
                                                        state.metrics.map(
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
                                        {   state.predictorParams &&
                                            Object.keys(state.predictorParams).map((param, _) => 
                                                <div className="grid grid-cols-3 gap-4 mb-2" key={param} >
                                                    <label className="capitalize">{ param }: </label>
                                                    { 
                                                        state.predictorParams[param].type === "int" && 
                                                        <input 
                                                        name={param} 
                                                        type="number" 
                                                        step="1" 
                                                        defaultValue={ state.predictorParams[param].default_value }
                                                        value={ state.predictorParams[param].value }
                                                        onChange={onParamChange}
                                                        /> 
                                                    }
                                                    { 
                                                        state.predictorParams[param].type === "float" && 
                                                        <input 
                                                        name={param} 
                                                        type="number" 
                                                        step="0.1"
                                                        defaultValue={ state.predictorParams[param].default_value }
                                                        value={ state.predictorParams[param].value }
                                                        onChange={onParamChange}
                                                        /> 
                                                    }
                                                    { 
                                                        state.predictorParams[param].type === "bool" && (
                                                        <input 
                                                            type="checkbox" 
                                                            name={param} 
                                                            defaultChecked={ state.predictorParams[param].default_value }
                                                            checked={ state.predictorParams[param].value }
                                                            onChange={onPredictorParamCheckBoxChange}
                                                        />
                                                        )
                                                    }
                                                    { 
                                                        typeof(state.predictorParams[param].type) === "object" && 
                                                        <select 
                                                            name={param}
                                                            value={ state.predictorParams[param].value } 
                                                            onChange={onParamChange}
                                                            className="w-32">
                                                            { state.predictorParams[param].type.map(
                                                                (value, _) => <option key={value} value={ value }>{ value }</option>)
                                                            }
                                                        </select>
                                                    }
                                                    <Tooltip content={ state.predictorParams[param].description } >
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
                value={state.trainSliderValue}
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
                value={state.testSliderValue}
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
                       value={state.rngSeedValue}
                       onChange={ event => { setState({...state, rngSeedValue: event.target.value}) } }
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
                        <Text className="mr-2">{ state.selectedPredictor || "Predictor" }</Text>
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
                            <button type="button" className="absolute top-2 -left-4" style={{height: 0}}>C</button>
                        </Popover>
                        <Popover
                            position={Position.LEFT}
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
                            <button type="button" className="absolute bottom-6 -left-4" style={{height: 0}}>A</button>
                        </Popover>
                        <Popover
                            position={Position.RIGHT}
                            content={
                                <Card.Body 
                                className="overflow-y-auto h-40 text-xs">
                                    <Text className="mb-2">Outcomes</Text>
                                    {
                                        Object.keys(state.caoState.outcome).map(element => 
                                        <div key={element} className="grid grid-cols-2 gap-4 mb-2">
                                            <label className="capitalize"> {element} </label>
                                            <input 
                                            name={element}
                                            type="checkbox" 
                                            defaultChecked={false}
                                            checked={state.caoState.outcome[element]}
                                            onChange={event => updateCAOState(event, "outcome")}/>
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
