import React, {useEffect, useState} from "react";
import {Artifact, Run, Runs} from "../../controller/run/types";
import {BrowserFetchRunArtifacts, BrowserFetchRuns} from "../../controller/run/fetch";
import {constructRunMetricsForRunPlot} from "../../controller/run/results";
import MetricsTable from "../metricstable";
import ESPRunPlot, {ParetoPlotTable} from "../esprunplot";
import NewBar from "../newbar";
import {Button} from "react-bootstrap";
import {MaximumBlue} from "../../const";
import ClipLoader from "react-spinners/ClipLoader";
import Link from "next/link";
import Flow from "./flow/flow";
import {ReactFlowProvider} from "react-flow-renderer";
import decode from "../../utils/decode";
import Notification, {NotificationProps} from "../../controller/notification";
import {FlowQueries} from "./flow/flowqueries";

export interface RunProps {
    /* 
    ProjectId: Rendered in run page
    RunID: Used to fetch run using backend
    RunName: Rendered in run page
    setRuns: Function used to send back fetched information to the
    experiment page.
    runs: Used to query and update runs after runs have been
    fetched.
    */
    ProjectId: number,
    RunID: number,
    RunName: string,
    setRuns: (arg: Runs) => void,
    runs: Runs
}

var debug = require('debug')('run')


export default function RunPage(props: RunProps): React.ReactElement {

    const [predictorPlotData, setPredictorPlotData] = useState(null)
    const [prescriptorPlotData, setPrescriptorPlotData] = useState(null)
    const [paretoPlotData, setParetoPlotData] = useState({})
    const [flowInstance, setFlowInstance] = useState(null)
    const [nodeToCIDMap, updateNodeToCIDMap] = useState({})
    const [run, setRun] = useState(null)
    const [rules, setRules] = useState(null)
    const [artifactObj, setArtifactObj] = useState(null)
    const [flow, setFlow] = useState(null)

    function cacheRun(run: Run) {
        /*
        Takes the fetched fields from this run page and updates
        the runs prop passed from the experiment page so they 
        won't have to be fetched again.
        */
        let tempRuns = [...props.runs]
        let runIndex = getRunIndexByID(run.id)
        tempRuns[runIndex].output_artifacts = run.output_artifacts
        tempRuns[runIndex].metrics = run.metrics
        tempRuns[runIndex].flow = run.flow
        props.setRuns(tempRuns)
    }

    function getRunIndexByID(runID: number): number {
        /*
        Finds a run by runID from the props and returns the 
        corresponding index so the run can be accessed
        */
        let tempRuns = props.runs
        let selectedIndex = null
        tempRuns.forEach(((iterated_run, idx) => {
            if (runID == iterated_run.id) {
                selectedIndex = idx
            }
        }))
        return selectedIndex
    }

    function getRunFromCache(runID: number) {
        /*
            Retrieves a run from the cache. If not found in the cache (cache miss), returns null.
        */
        let runIndex = getRunIndexByID(runID)
        if (runIndex == null) {
            return null
        }
        const tempRun = props.runs[runIndex]
        /* Queries the run props and checks if it has information that a cached run would have. We only consider it
        a cache hit if the run has all these properties.
         */
        if (tempRun != null
            && tempRun.flow != null
            && tempRun.output_artifacts != null
            && tempRun.metrics != null
            && tempRun.experiment_id != null) {
            return tempRun
        } else {
            // cache miss
            return null
        }
    }

    function isRuleBased(flow: JSON) {
        const prescriptorNode = FlowQueries.getPrescriptorNodes(flow)[0]
        const representation = prescriptorNode.data.ParentPrescriptorState.LEAF.representation
        return representation === "RuleBased"
    }

    function generateArtifactURL(flow: JSON) {
        const prescriptorNode = FlowQueries.getPrescriptorNodes(flow)[0]
        let rulesURL = null
        if (prescriptorNode) {
            const nodeCID = nodeToCIDMap[prescriptorNode.id]
            if (nodeCID) {
                const index = `prescriptor-text-${prescriptorNode.id}-${nodeCID}`
                rulesURL = JSON.parse(run.output_artifacts)[index]   
            }
            else {
                const notificationProps: NotificationProps = {
                    Type: "error",
                    Message: "Internal error",
                    Description: "Failed to find nodeCID with prescriptor id."
                }
                Notification(notificationProps)
            }
        }
        else {
            const notificationProps: NotificationProps = {
                Type: "error",
                Message: "Internal error",
                Description: "Retrieval of prescriptor node returned false"
            }
            Notification(notificationProps)
        } 

        return rulesURL
    }

    async function loadArtifactObj() {
        const rulesURL = generateArtifactURL(flow)
        if (rulesURL) {
            const artifactObj: Artifact[] = await BrowserFetchRunArtifacts(null, rulesURL)
            
            if (artifactObj) {
                setArtifactObj(artifactObj[0])
            }
            else {
                const notificationProps: NotificationProps = {
                    Type: "error",
                    Message: "Internal error",
                    Description: "Fetch for artifacts returned null"
                }
                Notification(notificationProps)
            }
        }
        else {
            const notificationProps: NotificationProps = {
                Type: "error",
                Message: "Internal error",
                Description: "Generation of s3 url returned null."
            }
            Notification(notificationProps)
        }
    }
    
    async function loadRun(runID: number) {
        if (runID) {
            const propertiesToRetrieve = ['output_artifacts', 'metrics', 'flow', 'id', 'experiment_id'];
            const runs: Runs = await BrowserFetchRuns(null, runID, propertiesToRetrieve)
            if (runs.length == 1) {
                const run = runs[0]
                const flow = JSON.parse(run.flow)
                setFlow(flow)
                setRun(run)
                cacheRun(run)
            } else {
                const notificationProps: NotificationProps = {
                    Type: "error",
                    Message: "Internal error",
                    Description: `Unexpected number of runs returned: ${runs.length} for run ${runID}`
                }
                Notification(notificationProps)
                return null
            }
        } else {
            const notificationProps: NotificationProps = {
                Type: "error",
                Message: "Internal error",
                Description: "No run ID passed"
            }
            Notification(notificationProps)
            return null
        }
    }

    // Fetch the experiment and the runs
    useEffect(() => {
        // Attempt to get the run from the cache
        const run = getRunFromCache(props.RunID)
        if (run) {
            setRun(props.runs[getRunIndexByID(props.RunID)])
            setFlow(run.flow)
        }
        else {
            // Cache miss -- have to load from backend
            loadRun(props.RunID)
        }
    }, [props.RunID])

    // Fetch the rules
    useEffect(() => {
        // If nodeToCIDMap has been populated, we can load the rules
        if (run && nodeToCIDMap) {
            // If it contains a rule-based prescriptor, load the rules
            if (isRuleBased(flow)){
                loadArtifactObj()
            }
        }
    }, [nodeToCIDMap])

    // Decode the rules from the artifact obj
    useEffect(() => {
        if (artifactObj != null) {
            const decodedRules = decode(artifactObj.bytes)
            if (decodedRules) {
                setRules(decodedRules)
            }
            else {
                const notificationProps: NotificationProps = {
                    Type: "error",
                    Message: "Internal error",
                    Description: "Failed to decode rules"
                }
                Notification(notificationProps)
            }
        }
    }, [artifactObj])

    useEffect(() => {
        if (run != null && flow != null) {
            constructMetrics(run.metrics)
        }
    }, [run])

    const constructMetrics = metrics => {
        if (metrics) {
            let [constructedPredictorResults, constructedPrescriptorResults, pareto] = constructRunMetricsForRunPlot(flow, JSON.parse(metrics))
            setPredictorPlotData(constructedPredictorResults)
            setPrescriptorPlotData(constructedPrescriptorResults)
            setParetoPlotData(pareto)
        }
    }

    useEffect(() => {
        if (paretoPlotData && run) {

            const nodeToCIDMap = {}

            // This is the 1D case - if the Pareto does not exist
            if(Object.keys(paretoPlotData).length === 0) {
                // Get all the artifacts that start with the keyword prescriptor
                const prescriptorArtifactNames = Object.keys(JSON.parse(run.output_artifacts)).filter(
                    name => name.startsWith("prescriptor")
                )

                prescriptorArtifactNames.forEach(artifact => {
                    // Split the name of the prescriptor to extract the node id and the cid
                    const splitName = artifact.split("-")
                    const nodeId = splitName.slice(1, splitName.length - 1).join("-")
                    nodeToCIDMap[nodeId] = splitName[splitName.length - 1]
                })

            } else {

                // Loop over the nodes
                Object.keys(paretoPlotData).forEach(nodeId => {
                    const nodeInfo = paretoPlotData[nodeId].data
                    const numGen = nodeInfo.length
                    nodeToCIDMap[nodeId] = nodeInfo[numGen - 1].data[0].cid
                })

            }
            updateNodeToCIDMap(nodeToCIDMap)
        }
    }, [paretoPlotData])

    // Fit flow when displaying Run
    useEffect(() => {
        if (flowInstance) {
            flowInstance.fitView()
        }
    }, [flowInstance])

    let PlotDiv = []
    if (predictorPlotData) {
        PlotDiv.push(<MetricsTable PredictorRunData={predictorPlotData} />)
    }

    if (prescriptorPlotData) {
        PlotDiv.push(<ESPRunPlot PrescriptorRunData={prescriptorPlotData} />)
    }

    if (Object.keys(paretoPlotData).length > 0) {
        PlotDiv.push(<ParetoPlotTable
            Pareto={paretoPlotData}
            NodeToCIDMap={nodeToCIDMap}
            PrescriptorNodeToCIDMapUpdater={updateNodeToCIDMap} />)
    }

    if (!predictorPlotData && !prescriptorPlotData) {
        PlotDiv.push(
            <div className="container">
                <ClipLoader color={MaximumBlue} loading={true} size={50} />
            </div>
        )
    } else {
        PlotDiv.push(
            <Button size="lg" className="mt-4 mb-4"
                    type="button"
                    style={{
                        background: MaximumBlue, 
                        borderColor: MaximumBlue, 
                        width: "100%",
                        cursor: rules == null ? "pointer" : "not-allowed"
                    }}
                    disabled={rules != null}
            >
                <Link
                    href={`/projects/${props.ProjectId}/experiments/${run.experiment_id}/runs/${run.id}/
prescriptors/${Object.values(nodeToCIDMap)[0]}/?dataprofile_id=${flow[0].data.DataTag.id}`}
                >
                    <a style={{
                        color: "white"
                    }}>Go to Decision Making System with Prescriptor: {Object.values(nodeToCIDMap)[0]}</a>
                </Link>

            </Button>
        )
    }

    if (rules) {
        // Add rules
        PlotDiv.push(
            <div >
                <NewBar Title="Rules" DisplayNewLink={ false } />
                <p>{rules}</p>
            </div>
        )
    }
    
    const flowDiv = []

    if (run && flow) {
        flowDiv.push(
            <div>
            <ReactFlowProvider>
                <Flow
                    ProjectID={props.ProjectId}
                    Flow={flow}
                    ElementsSelectable={false}
                    onLoad={reactFlowInstance => {setFlowInstance(reactFlowInstance)}}
                />
            </ReactFlowProvider>
        </div>
        )
    }
    
    return <div className="mr-8 ml-8">
        {/* Create the title bar */}
        <h1 className="mt-4 mb-4">{props.RunName}</h1>

        {flowDiv}       

        {PlotDiv}
    </div>


}
