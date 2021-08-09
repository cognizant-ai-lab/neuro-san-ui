// Import React components
import { 
    useState, 
    useEffect 
} from 'react'

// Import 3rd pary components
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
} from '../../../controller/predictor'

// Define an interface for the structure
// of the nodes
export interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    // This map describes the field names
    readonly CAOMapping: any

    readonly NodeDefs: any,
    readonly UpdateNodeDefFn: any
}

export default function PredictorNode(props): React.ReactElement {
    /*
    This function is responsible to render the Predictor Node
    NOTE: THIS RENDERS FORMS ELEMENT BUT NOT THE FORM ITSELF
    THE FORM MUST BE RENDERED AS A PARENT CONTAINER OF THIS.
    */

    const data: PredictorNodeData = props.data

    // Unpack the mapping
    const { NodeID } = data

    // Use state to keep track of the availaible predictor options
    let [state, setState] = useState({
        selectedPredictorType: "regressor",
        predictors: [],
        selectedPredictor: "",
        metrics: [],
        selectedMetric: "",
        predictorParams: {},
        caoState: {
            "context": {},
            "action": {},
            "outcome": {}
        }
    })

    const invokePredictorSelectorController = async (predictorType: string) => {
        /*
        This controller invokation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor. This only needs to be used once
        when the content is being rendered
        */

        // Invoke the controllers
        const predictorsFetched = await FetchPredictors(predictorType)
        const metricsFetched = await FetchMetrics(predictorType)

        // Run Fetch Parameters
        await onPredictorChange(predictorsFetched[predictorType][0])

        setState({
            ...state, 
            predictors: predictorsFetched[predictorType],
            selectedPredictor: predictorsFetched[predictorType][0],
            metrics: metricsFetched[predictorType],
            selectedMetric: metricsFetched[predictorType][0]
        })

    }

    const initialize = async() => {
        /*
        This controller invokation is used for the fetching of the predictors and the
        metrics of a certain kind of predictor. This only needs to be used once
        when the content is being rendered
        */

        // Invoke the controllers
        const predictorsFetched = await FetchPredictors("regressor")
        const metricsFetched = await FetchMetrics("regressor")

        // Run Fetch Parameters
        const params = await FetchParams(state.selectedPredictorType, 
            predictorsFetched["regressor"][0])
        
    
        // We add a key called value to adjust for user input
        Object.keys(params).forEach(key => {
            if (typeof(params[key].default_value) === "object") {
                params[key].value = params[key].default_value[0]
            } else {
                params[key].value = params[key].default_value
            }
        })

        // Create the initial state for the CAO Map
        let CAOState = {
            "context": {},
            "action": {},
            "outcome": {}
        }

        data.CAOMapping.context.forEach(
            context => CAOState.context[context] = true
        )
        data.CAOMapping.action.forEach(
            action => CAOState.action[action] = true
        )
        data.CAOMapping.outcome.forEach(
            outcome => CAOState.outcome[outcome] = false
        )

        setState({
            ...state, 
            predictors: predictorsFetched["regressor"],
            selectedPredictor: predictorsFetched["regressor"][0],
            metrics: metricsFetched["regressor"],
            selectedMetric: metricsFetched["regressor"][0], 
            predictorParams: params,
            caoState: CAOState
        })

    }

    const onPredictorChange = async (selectedPredictor) => {
        /*
        This function serves to fetch the parameters of the predictor,
        do some parameter state formatting and update the selected predictor state.
        */

        // Invoke the controller
        const params = await FetchParams(state.selectedPredictorType, 
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
        initialize()
    }, [])

    // We use another useEffect hook to update the state of the parent component
    // whenever the internal state of the predictor changes
    useEffect(() => {

        let newNodeState = {...data.NodeDefs}
        newNodeState[NodeID] = {...state}

        data.UpdateNodeDefFn(newNodeState)
    }, [state])


    // We want to have a tabbed predictor configuration
    // and thus we build the following component
    // Declare state to keep track of the Tabs
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [tabs] = useState(['Predictor', 'Configuration'])

    // Create the selection Panel
    const PredictorSelectionPanel = <Card.Body>
                                        <div className="flex justify-between mb-4 content-center">
                                            <label className="m-0 mr-2">Type: </label>
                                            <select 
                                                name={ `${NodeID}-predictorType` } 
                                                onChange={ event => invokePredictorSelectorController(event.target.value)} 
                                                className="w-32" >
                                                    <option value="regressor">Regressor</option>
                                                    <option value="classifier">Classfier</option>
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
                                                                    <option value={ metric }>
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
                                                                (value, _) => <option value={ value }>{ value }</option>) 
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
