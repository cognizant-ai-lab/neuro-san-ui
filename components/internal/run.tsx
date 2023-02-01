import React, {useEffect, useState} from "react";
import {Artifact, Run, Runs} from "../../controller/run/types";
import {BrowserFetchRuns, FetchSingleRunArtifact} from "../../controller/run/fetch";
import {constructRunMetricsForRunPlot} from "../../controller/run/results";
import {empty} from "../../utils/objects";
import MetricsTable from "../metricstable";
import ESPRunPlot, {ParetoPlotTable} from "../esprunplot";
import NewBar from "../newbar";
import {Button} from "react-bootstrap";
import {MaximumBlue} from "../../const";
import ClipLoader from "react-spinners/ClipLoader";
import Link from "next/link";
import Flow from "./flow/flow";
import {ReactFlowProvider} from "react-flow-renderer";
import {NotificationType, sendNotification} from "../../controller/notification";
import {FlowQueries} from "./flow/flowqueries";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {docco} from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {useLocalStorage} from "../../utils/use_local_storage";
import decode from "../../utils/conversion";
import {useSession} from "next-auth/react";

interface RunProps {
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


export default function RunPage(props: RunProps): React.ReactElement {

    const { data: session } = useSession()
    const currentUser: string = session.user.name

    const [predictorPlotData, setPredictorPlotData] = useState(null)
    const [prescriptorPlotData, setPrescriptorPlotData] = useState(null)
    const [paretoPlotData, setParetoPlotData] = useState({})
    const [nodeToCIDMap, updateNodeToCIDMap] = useState({})
    const [run, setRun] = useState(null)
    const [rules, setRules] = useState(null)
    const [artifactObj, setArtifactObj] = useState(null)
    const [flow, setFlow] = useState(null)

    const [, setPrescriptors] = useLocalStorage("prescriptors", null);

    function cacheRun(run: Run) {
        /*
        Takes the fetched fields from this run page and updates
        the runs prop passed from the experiment page so they 
        won't have to be fetched again.
        */
        const runIndex = getRunIndexByID(run.id)
        const tempRuns = [...props.runs]
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
        const tempRuns = props.runs
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
        const runIndex = getRunIndexByID(runID)
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
                sendNotification(NotificationType.error, "Internal error",
                    "Failed to find nodeCID with prescriptor id.")
            }
        }
        else {
            sendNotification(NotificationType.error, "Internal error", "Error retrieving prescriptor node")
        }

        return rulesURL
    }

    async function retrieveRulesPrescriptor() {
        const rulesURL = generateArtifactURL(flow)
        if (rulesURL) {
            const artifactObj: Artifact[] = await FetchSingleRunArtifact(rulesURL)
            
            if (artifactObj) {
                setArtifactObj(artifactObj[0])
            }
            else {
                sendNotification(NotificationType.error, "Internal error", "Fetch for artifacts returned null")
            }
        }
        else {
            sendNotification(NotificationType.error, "Internal error", "Generation of s3 url returned null.")
        }
    }
    
    async function loadRun(runID: number) {
        if (runID) {
            const propertiesToRetrieve = ['output_artifacts', 'metrics', 'flow', 'id', 'experiment_id'];
            const runs: Runs = await BrowserFetchRuns(currentUser, null, runID, propertiesToRetrieve)
            if (runs.length == 1) {
                const run = runs[0]
                const flow = JSON.parse(run.flow)
                setFlow(flow)
                setRun(run)
                cacheRun(run)
            } else {
                sendNotification(NotificationType.error, "Internal error",
                    `Unexpected number of runs returned: ${runs.length} for run ${runID}` )
                return null
            }
        } else {
            sendNotification(NotificationType.error, "Internal error", "No run ID passed")
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
            void loadRun(props.RunID)
        }
    }, [props.RunID])

    // Fetch the rules
    useEffect(() => {
        // If nodeToCIDMap has been populated, we can load the rules
        if (run && nodeToCIDMap) {
            // If it contains a rule-based prescriptor, load the rules
            if (isRuleBased(flow)){
                void retrieveRulesPrescriptor()
            }
        }
    }, [nodeToCIDMap])

    // Decode the rules from the artifact obj
    useEffect(() => {
        if (artifactObj != null) {
            const decodedRules = decode(artifactObj.bytes)
            if (decodedRules) {
                const decodedRulesFormatted = decodedRules.trim()
                setRules(decodedRulesFormatted)
            }
            else {
                sendNotification(NotificationType.error, "Internal error", "Failed to decode rules")
            }
        }
    }, [artifactObj])

    useEffect(() => {
        if (run != null && flow != null) {
            constructMetrics(run.metrics)
        }
    }, [run])

    const constructMetrics = metrics => {
        setPrescriptors(null)
        if (metrics) {
            const [constructedPredictorResults, constructedPrescriptorResults, pareto] =
                constructRunMetricsForRunPlot(flow, JSON.parse(metrics))
            setPredictorPlotData(constructedPredictorResults)
            setPrescriptorPlotData(constructedPrescriptorResults)
            setParetoPlotData(pareto)

            // Retrieve objectives and prescriptor IDs from Pareto front and save them to local storage so that
            // DMS can retrieve them later
            const keys = Object.keys(pareto)
            if (keys && keys.length > 0) {
                const firstItem = pareto[keys[0]]

                // Extract x-y coords and CID (candidate ID) of each prescriptor
                // Sort by first objective as DMS requires
                const prescriptorInfo = firstItem.data[firstItem.data.length - 1].data
                    .sort((item1, item2) => {return item1.x - item2.x})

                setPrescriptors({
                    "objectives": firstItem.objectives,
                    "prescriptors": prescriptorInfo
                })
            }
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

    const PlotDiv = []
    if (predictorPlotData) {
        const predictors = FlowQueries.getPredictorNodes(flow)
        PlotDiv.push(<MetricsTable PredictorRunData={predictorPlotData} Predictors={predictors} />)
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

    // Decide whether DMS button should be enabled
    function shouldEnableDMS() {
        return !empty(nodeToCIDMap)
    }

    // Get verbiage for DMS button
    function getDMSButton() {
        // Can't use DMS if no prescriptors
        if (empty(nodeToCIDMap)) {
            return "(Decision Making System not available: no prescriptors found.)"
        }

        // Allow DMS access for currently chosen prescriptor
        const prescriptorID = Object.values(nodeToCIDMap)[0]
        const dataSourceId = flow[0].data.DataTag.data_source_id
        const projectId = props.ProjectId;
        const experimentId = run.experiment_id;
        const runId = run.id;
        const dmsLink = `/projects/${projectId}/experiments/${experimentId}/runs/${runId}/prescriptors/
${prescriptorID}/?data_source_id=${dataSourceId}`
        return <>
            <Link id="dms-link"
                href={dmsLink}
            >
                <a style={{
                    color: "white"
                }}>Go to Decision Making System with Prescriptor: {prescriptorID}</a>
            </Link>
        </>
    }

    if (!predictorPlotData && !prescriptorPlotData) {
        PlotDiv.push(
            <div className="container">
                <ClipLoader color={MaximumBlue} loading={true} size={50} />
            </div>
        )
    } else {
        // Link to decision UI, or disabled and explanatory text if rules-based which decision UI does not support.
        PlotDiv.push(
            <div
                style={{
                    cursor: shouldEnableDMS() ? "pointer" : "not-allowed"
                }}
            >
                <Button size="lg" className="mt-4 mb-4"
                        type="button"
                        style={{
                            background: MaximumBlue,
                            borderColor: MaximumBlue,
                            width: "100%"
                        }}
                        disabled={!shouldEnableDMS()}
                >
                    {getDMSButton()}
                </Button>
            </div>
        )
    }

    if (rules) {
        // Add rules. We use a syntax highlighter to pretty-print the rules and lie about the language
        // the rules are in to get a decent coloring scheme
        PlotDiv.push(
            <>
                <NewBar Title="Rules" DisplayNewLink={ false } />
                <div className="my-2 py-2"
                     style={{
                         whiteSpace: "pre",
                         backgroundColor: "whitesmoke"
                     }}
                >
                    <SyntaxHighlighter language="scala" style={docco} showLineNumbers={true}>
                        {rules}
                    </SyntaxHighlighter>
                </div>
            </>
        )
    }
    
    const flowDiv = []

    if (run && flow) {
        flowDiv.push(
            <div id="run-flow">
            <ReactFlowProvider>
                <Flow
                    ProjectID={props.ProjectId}
                    Flow={flow}
                    ElementsSelectable={false}
                />
            </ReactFlowProvider>
        </div>
        )
    }
    
    return <div className="mr-8 ml-8">
        {/* Create the title bar */}
        <h1 className="mt-4 mb-4" id="run-name">{props.RunName}</h1>

        {flowDiv}       

        {PlotDiv}
    </div>
}
