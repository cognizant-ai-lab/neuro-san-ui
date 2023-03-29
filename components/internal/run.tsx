import React, {useEffect, useState} from "react";
import {Artifact, Run, Runs} from "../../controller/run/types";
import {BrowserFetchRuns, FetchSingleRunArtifact} from "../../controller/run/fetch";
import {constructRunMetricsForRunPlot} from "../../controller/run/results";
import {empty} from "../../utils/objects";
import MetricsTable from "../metricstable";
import ESPRunPlot from "../esprunplot";
import NewBar from "../newbar";
import {Col, Container, Row} from "react-bootstrap"
import {Button} from "react-bootstrap";
import {MaximumBlue} from "../../const";
import ClipLoader from "react-spinners/ClipLoader";
import Link from "next/link";
import Flow from "./flow/flow";
import {ReactFlowProvider} from "reactflow";
import {NotificationType, sendNotification} from "../../controller/notification";
import {FlowQueries} from "./flow/flowqueries";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {docco} from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import {useLocalStorage} from "../../utils/use_local_storage";
import decode from "../../utils/conversion";
import {useSession} from "next-auth/react";
import {MultiPareto} from "../pareto/multi_pareto";
import {NodeType} from "./flow/nodes/types";
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'
import {Radio} from "antd"
import {Space} from "antd"
import {RadioChangeEvent} from "antd"
import ReactMarkdown from "react-markdown";
import {addResponseMessage, Widget } from 'react-chat-widget';
import {dropMessages} from "react-chat-widget"
import {toggleMsgLoader} from "react-chat-widget"
import {Collapse} from "antd"
import {renderCustomComponent} from "react-chat-widget"
import {InfoSignIcon} from "evergreen-ui"

interface RunProps {
    /* 
    id: string element handle for testing
    ProjectId: Rendered in run page
    RunID: Used to fetch run using backend
    RunName: Rendered in run page
    setRuns: Function used to send back fetched information to the
    experiment page.
    runs: Used to query and update runs after runs have been
    fetched.
    */
    id: string,
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

    const [selectedRulesFormat, setSelectedRulesFormat] = useState("raw")
    const [interpretedRules, setInterpretedRules] = useState(null)
    const [gptLoading, setGptLoading] = useState(false)

    const projectID = props.ProjectId

    function getProjectTitle() {
        if (projectID === 233) {
            return "CO NOX"
        } else if (projectID === 229) {
            return "Diabetes"
        } else {
            return "Generic Project"
        }
    }

    function getProjectDescription() {
        if (projectID === 233) {
            return `The goal of this ESP project is to minimize CO and NOx emissions from gas turbines, while maximizing the turbines' energy yield. The data set comes from the UCI Machine Learning Repository: Gas Turbine CO and NOx Emission Data Set
            The parameters of this problem are described in the following table, with a header and a row for each field:
            Variable (Abbr.) Unit Min Max Mean
            Ambient temperature (AT) C 6.23 37.10 17.71
            Ambient pressure (AP) mbar 985.85 1036.56 1013.07
            Ambient humidity (AH) (%) 24.08 100.20 77.87
            Air filter difference pressure (AFDP) mbar 2.09 7.61 3.93
            Gas turbine exhaust pressure (GTEP) mbar 17.70 40.72 25.56
            Turbine inlet temperature (TIT) C 1000.85 1100.89 1081.43
            Turbine after temperature (TAT) C 511.04 550.61 546.16
            Compressor discharge pressure (CDP) mbar 9.85 15.16 12.06
            Turbine energy yield (TEY) MWH 100.02 179.50 133.51
            Carbon monoxide (CO) mg/m3 0.00 44.10 2.37
            Nitrogen oxides (NOx) mg/m3 25.90 119.91 65.29
            `
        } else if (projectID === 229) {
            return `What can a doctors prescribe to avoid having diabetes patients that are discharged being readmitted within a certain period of time?
            
            A description of the problem follows 
            
            Patients with IDDM are insulin deficient. This can either be due to a)
low or absent production of insulin by the beta islet cells of the
pancreas subsequent to an auto-immune attack or b) insulin-resistance,
typically associated with older age and obesity, which leads to a
relative insulin-deficiency even though the insulin levels might be
normal.

Regardless of cause, the lack of adequate insulin effect has multiple
metabolic effects. However, once a patient is diagnosed and is
receiving regularly scheduled exogenous (externally administered)
insulin, the principal metabolic effect of concern is the potential
for hyperglycemia (high blood glucose). Chronic hyperglycemia over a
period of several years puts a patient at risk for several kinds of
micro and macrovascular problems (e.g. retinopathy). Consequently, the
goal of therapy for IDDM is to bring the average blood glucose as close
to the normal range as possible. As explained below, current therapy
makes this goal a very challenging (and often frustrating) one for
most patients. One important consideration is that due to the
inevitable variation of blood glucose (BG) around the mean, a lower mean
will result in a higher frequency of unpleasant and sometimes
dangerous low BG levels.


Outpatient management.

Outpatient management of IDDM relies principally on three
interventions: diet, excercise and exogenous insulin. Proper treatment
requires careful consideration of all three interventions. 

INSULIN

One of insulin's principal effects is to increase the uptake of
glucose in many of the tissues (e.g. in adipose/fat tissue) and
thereby reduce the concentration glucose in blood.  Patients
with IDDM administer insulin to themselves by subcutaneous injection.
Insulin doses are given one or more times a day, typically before
meals and sometimes also at bedtime. Many insulin regimens are devised
to have the peak insulin action coincide with the peak rise in BG
during meals. In order to achieve this, a combination of several
preparations of insulin may be administered. Each insulin formulation
has its own characteristic time of onset of effect (O), time of peak
action (P) and effective duration (D). These times can be significantly
affected by many factors such as the site of injection (e.g. much more
rapid absorption in the abdomen than in the thigh) or whether the
insulin is a human insulin or an animal extract. The times I have
listed below are rough approximations and I am sure that I could find
an endocrinologist with different estimates.

Regular Insulin: O 15-45 minutes P 1-3 hours D 4-6 hours
NPH Insulin: O 1-3 hours P 4-6 hours D: 10-14 hours
Ultralente: O: 2-5 hours. P (not much of a peak) D 24-30 hours.

EXERCISE

Exercise appears to have multiple effects on BG control. Two important
effects are: increased caloric expenditure and a possibly independent
increase in the sensitivity of tissues to insulin action.  BG can fall
during exercise but also quite a few hours afterwards. For instance,
strenuous exercise in the mid-afternoon can be associated with low BG
after dinner. Also, too strenuous exercise with associated mild
dehydration can lead to a transient increase in BG.

DIET

Another vast subject but (suffice it to say for the purposes of users
of the data set) in brief: a larger meal will lead to a longer and
possibly higher elevation of blood glucose. The actual effect depends on
a host of variables, notably the kind of food ingested. For instance,
fat causes delayed emptying of the stomach and therefore a slower rise in BG
than a starchy meal without fat. Missing a meal or eating a meal of smaller
than usual size will put the patient at risk for low BG in the hours that follow
the meal.


GLUCOSE CONCENTRATIONS

BG concentration will vary even in individuals with normal pancreatic
hormonal function.  A normal pre-meal BG ranges approximately 80-120 mg/dl. 
A normal post-meal BG ranges 80-140 mg/dl. The target range for an individual 
with diabetes mellitus is very controversial. I will cut the Gordian knot on 
this issue by noting that it would be very desirable to keep 90% of all BG 
measurements < 200 mg/dl and that the average BG should be 150 mg/dl or less. 
Note that it  takes a lot of work, attention and (painful) BG checks to reach 
this target range. Conversely, an average BG > 200 (over several years) is 
associated with a poor long-term outcome. That is, the risk of vascular 
complications of the high BG is signicantly elevated.

Hypoglycemic (low BG) symptoms fall into two classes. Between 40-80 mg/dl,
the patient feels the effect off the adrenal hormone epinephrine as the BG
regulation systems attempt to reverse the low BG.  These so-called 
adrenergic symptoms (headache, abdominal pain, sweating) are useful, if
unpleasant, cues to the patient that their BG is falling dangerously. Below
40 mg/dl, the patient's brain is inadequately supplied with glucose and
the symptoms become those of poor brain function (neuroglycopenic
symptoms). These include: lethargy, weakness, disorientation, seizures and
passing out.  

The features of the problem are described in this table with a header row and one row per feature:
Feature name\tType\tDescription and values\t% missing
Encounter ID\tNumeric\tUnique identifier of an encounter\t0%
Patient number\tNumeric\tUnique identifier of a patient\t0%
Race\tNominal\tValues: Caucasian, Asian, African American, Hispanic, and other\t2%
Gender\tNominal\tValues: male, female, and unknown/invalid\t0%
Age\tNominal\tGrouped in 10-year intervals: 0, 10), 10, 20), …, 90, 100)\t0%
Weight\tNumeric\tWeight in pounds.\t97%
Admission type\tNominal\tInteger identifier corresponding to 9 distinct values, for example, emergency, urgent, elective, newborn, and not available\t0%
Discharge disposition\tNominal\tInteger identifier corresponding to 29 distinct values, for example, discharged to home, expired, and not available\t0%
Admission source\tNominal\tInteger identifier corresponding to 21 distinct values, for example, physician referral, emergency room, and transfer from a hospital\t0%
Time in hospital\tNumeric\tInteger number of days between admission and discharge\t0%
Payer code\tNominal\tInteger identifier corresponding to 23 distinct values, for example, Blue Cross/Blue Shield, Medicare, and self-pay\t52%
Medical specialty\tNominal\tInteger identifier of a specialty of the admitting physician, corresponding to 84 distinct values, for example, cardiology, internal medicine, family/general practice, and surgeon\t53%
Number of lab procedures\tNumeric\tNumber of lab tests performed during the encounter\t0%
Number of procedures\tNumeric\tNumber of procedures (other than lab tests) performed during the encounter\t0%
Number of medications\tNumeric\tNumber of distinct generic names administered during the encounter\t0%
Number of outpatient visits\tNumeric\tNumber of outpatient visits of the patient in the year preceding the encounter\t0%
Number of emergency visits\tNumeric\tNumber of emergency visits of the patient in the year preceding the encounter\t0%
Number of inpatient visits\tNumeric\tNumber of inpatient visits of the patient in the year preceding the encounter\t0%
Diagnosis 1\tNominal\tThe primary diagnosis (coded as first three digits of ICD9); 848 distinct values\t0%
Diagnosis 2\tNominal\tSecondary diagnosis (coded as first three digits of ICD9); 923 distinct values\t0%
Diagnosis 3\tNominal\tAdditional secondary diagnosis (coded as first three digits of ICD9); 954 distinct values\t1%
Number of diagnoses\tNumeric\tNumber of diagnoses entered to the system\t0%
Glucose serum test result\tNominal\tIndicates the range of the result or if the test was not taken. Values: “>200,” “>300,” “normal,” and “none” if not measured\t0%
A1c test result\tNominal\tIndicates the range of the result or if the test was not taken. Values: “>8” if the result was greater than 8%, “>7” if the result was greater than 7% but less than 8%, “normal” if the result was less than 7%, and “none” if not measured.\t0%
Change of medications\tNominal\tIndicates if there was a change in diabetic medications (either dosage or generic name). Values: “change” and “no change”\t0%
Diabetes medications\tNominal\tIndicates if there was any diabetic medication prescribed. Values: “yes” and “no”\t0%
24 features for medications\tNominal\tFor the generic names: metformin, repaglinide, nateglinide, chlorpropamide, glimepiride, acetohexamide, glipizide, glyburide, tolbutamide, pioglitazone, rosiglitazone, acarbose, miglitol, troglitazone, tolazamide, examide, sitagliptin, insulin, glyburide-metformin, glipizide-metformin, glimepiride-pioglitazone, metformin-rosiglitazone, and metformin-pioglitazone, the feature indicates whether the drug was prescribed or there was a change in the dosage. Values: “up” if the dosage was increased during the encounter, “down” if the dosage was decreased, “steady” if the dosage did not change, and “no” if the drug was not prescribed\t0%
Readmitted\tNominal\tDays to inpatient readmission. Values: “<30” if the patient was readmitted in less than 30 days, “>30” if the patient was readmitted in more than 30 days, and “No” for no record of readmission.            
            
            
            
            `
        } else {
            return "Generic Project Description"
        }    
    }

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
            if (runID === iterated_run.id) {
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
        const prescriptorNode = FlowQueries.getPrescriptorNodes(FlowQueries.getAllNodes(flow) as NodeType[])[0]
        const representation = prescriptorNode.data.ParentPrescriptorState.LEAF.representation
        return representation === "RuleBased"
    }

    function generateArtifactURL(flow: JSON) {
        const prescriptorNode = FlowQueries.getPrescriptorNodes(FlowQueries.getAllNodes(flow) as NodeType[])[0]
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
            if (runs.length === 1) {
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

    useEffect(() => {
        dropMessages()
        addResponseMessage("Hi! I'm your UniLEAF assistant. Please type your question below.")
    }, [])
    
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
                    .sort((item1, item2) => {return item1.objective0 - item2.objective0})

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

    useEffect(() => 
    {
        async function fetchData() {
            const prescriptorNode = FlowQueries.getPrescriptorNodes(flow)[0]
            const caoState = prescriptorNode.data.ParentPrescriptorState.caoState
            const contextFields = Object.entries(caoState.context).filter(item => item[1] === true).map(item => item[0])
            const actionFields  = Object.entries(caoState.action).filter(item => item[1] === true).map(item => item[0])
            
            const outcomeFields = Object.assign({}, ...prescriptorNode.data.ParentPrescriptorState.evolution.fitness.map(item => ({[item.metric_name]: item.maximize ? "maximize" : "minimize"})))
            
            try {
                setGptLoading(true)
                const response = await fetch('/api/gpt/rules', {
                    method: "POST",
                    headers: {
                    'Accept': 'application/json',
                        'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectTitle: getProjectTitle(),
                    projectDescription: getProjectDescription(),
                    rawRules: rules,
                    contextFields: contextFields,
                    actionFields: actionFields,
                    outcomeFields: outcomeFields
                })})
                if (!response.ok) {
                    console.debug("error json", await response.json())
                    throw new Error(response.statusText)
                }
                const data = await response.json()
                setInterpretedRules(data.interpretedRules)
            } catch (error) {
                console.debug("error", error)
            } finally {
                setGptLoading(false)
            }
        }

        if (rules && flow) {
            console.log("flow", flow)
            void fetchData()
        }
    }, [rules])
    
    const plotDiv = []
    if (predictorPlotData) {
        const predictors = FlowQueries.getPredictorNodes(flow)
        plotDiv.push(<MetricsTable id="metrics-table"
                        PredictorRunData={predictorPlotData}
                        Predictors={predictors} />)
    }

    if (prescriptorPlotData) {
        plotDiv.push(<ESPRunPlot id="esp-run-plot"
                        PrescriptorRunData={prescriptorPlotData} />)
    }

    // Figure out how many objectives we have. Sum over all prescriptors.
    const prescriptorNodes = flow && FlowQueries.getPrescriptorNodes(flow)
    const objectivesCount = prescriptorNodes?.reduce(
        (accumulator, node) => accumulator +  Object.keys(node.data.ParentPrescriptorState.evolution.fitness).length,
        0
    );
    
    if (objectivesCount && Object.keys(paretoPlotData).length > 0) {
        plotDiv.push(
            <MultiPareto 
                id="pareto-plot-table"
                Pareto={paretoPlotData}
                NodeToCIDMap={nodeToCIDMap}
                PrescriptorNodeToCIDMapUpdater={updateNodeToCIDMap}
                ObjectivesCount={objectivesCount}
            />
        )
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
                <a id="dms-link-anchor" 
                    style={{
                        color: "white"
                    }}
                   target="_blank"
                >
                    Go to Decision Making System with Prescriptor: {prescriptorID}
                </a>
            </Link>
        </>
    }

    if (!predictorPlotData && !prescriptorPlotData) {
        plotDiv.push(
            <div id="clip-loader-div" className="container">
                { /* 2/6/23 DEF - ClipLoader does not have an id property when compiling */ }
                <ClipLoader     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    color={MaximumBlue} loading={true} size={50} />
            </div>
        )
    } else {
        // Link to decision UI, or disabled and explanatory text if rules-based which decision UI does not support.
        plotDiv.push(
            <div id="dms-button-div"
                style={{
                    cursor: shouldEnableDMS() ? "pointer" : "not-allowed"
                }}
            >
                <Button id="dms-button" size="lg" className="mt-4 mb-4"
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

    type CustomComponentProps = {
        message: string;
    };

    
    const CustomComponent: React.FC<CustomComponentProps> = ({ message }) => {
        return (
            <div style={{fontSize: "smaller"}}>
                <InfoSignIcon  id="plot-info-bubble-icon" color="blue" size={10}/>
                <Collapse>
                    <Collapse.Panel header="Show sources" key={1} >{message}</Collapse.Panel>
                </Collapse>
            </div>
        );
    };
    
    const handleNewUserMessage = async (newMessage) => {
        toggleMsgLoader()

        try {
            const response = await fetch('/api/gpt/userguide', {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: newMessage
                })
            })
            if (!response.ok) {
                console.debug("error json", await response.json())
                throw new Error(response.statusText)
            }
            const data = await response.json()
            const min = 1000;
            const max = 2500;
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            if (data.answer) {
                setTimeout(function () {
                    try {
                        addResponseMessage(data.answer)
                        const sources = data.sources
                        if (sources) {
                            const message = sources.map(source => `Source: ${source.source.replace(/\n/g, "")} from this snippet: "${source.snippet.replace(/\n/g, "")}" page: ${source.page ?? "n/a"}`).join("\n")
                            renderCustomComponent(CustomComponent, {message: message}, false)
                        }
                    } finally {
                        toggleMsgLoader()
                    }
                }, delay);
            }
        } catch (error) {
            console.debug("error", error)
        }
    }
    
    if (rules) {
        // Add rules. We use a syntax highlighter to pretty-print the rules and lie about the language
        // the rules are in to get a decent coloring scheme
        plotDiv.push(
            <div style={{marginBottom: "600px"}}>
            <NewBar id="rules-bar" InstanceId="rules"
                    Title="Rules" DisplayNewLink={ false } />
            <Tabs
                defaultActiveKey="decoded"
                id="rules-tabs"
                className="my-10"
                justify
            >
                <Tab eventKey="decoded" title="Details" >
                    <Container>
                        <Row style={{marginTop: 10}}>
                            <Col md={10} >
                                {selectedRulesFormat === "raw" 
                                    ? <div id="rules-div" className="my-2 py-2"
                                           style={{
                                               whiteSpace: "pre",
                                               backgroundColor: "whitesmoke",
                                               overflowY: "scroll",
                                               display: "block",
                                               borderColor: "red"
                                           }}
                                    >
                                            <SyntaxHighlighter id="syntax-highlighter"
                                                               language="scala" style={docco} showLineNumbers={true}>
                                                {rules}
                                            </SyntaxHighlighter>
                                    </div>
                                    :
                                    gptLoading 
                                        ?   <>
                                            <ClipLoader     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                            color={MaximumBlue} loading={true} size={50} />
                                                Accessing GPT...
                                            </>
                                    :<div>
                                        <ReactMarkdown>
                                            {interpretedRules}
                                        </ReactMarkdown>
                                        <br />
                                        <br />
                                        <br />
                                        <h5>Powered by OpenAI™ GPT-4™ technology</h5>
                                    </div>
                                }
                            </Col>
                            <Col md={2}>
                                <Radio.Group value={selectedRulesFormat}
                                             onChange={(e: RadioChangeEvent) => {
                                                 setSelectedRulesFormat(e.target.value)
                                             }}
                                >
                                    <Space direction="vertical" size="middle">
                                        <Radio value="raw">Raw</Radio>
                                        <Radio value="interpreted">Interpreted (Beta)</Radio>
                                    </Space>
                                </Radio.Group>
                            </Col>
                        </Row>
                    </Container>
                </Tab>
                <Tab eventKey="insights" title="Insights" >
                    <div id="rules-div" className="my-2 py-2"
                         style={{
                             whiteSpace: "pre",
                             backgroundColor: "whitesmoke",
                         }}
                    >
                       Some insights about the rules from GPT-4 here
                    </div>
                </Tab>
            </Tabs>
            </div> 
        )
    }
    
    const flowDiv = []

    if (run && flow) {
        flowDiv.push(
            <div id="run-flow">
                { /* 2/6/23 DEF - ReactFlowProvider does not have an id property when compiling */ }
                <ReactFlowProvider      // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    >
                    <Flow id="flow"
                        ProjectID={props.ProjectId}
                        Flow={flow}
                        ElementsSelectable={false}
                    />
                </ReactFlowProvider>
            </div>
        )
    }
    
    const propsId = `${props.id}`
    return <div id={ `${propsId}` } className="mr-8 ml-8">
        {/* Create the title bar */}
        <h1 className="mt-4 mb-4" id="run-name">{props.RunName}</h1>

        {flowDiv}       

        {plotDiv}

        <Widget
            handleNewUserMessage={handleNewUserMessage}
            title="UniLEAF help"
            subtitle="Get help on anything related to UniLEAF!"
            senderPlaceHolder='What is UniLEAF?'
            profileAvatar="/leaffavicon.png"
            profileClientAvatar={session.user.image ?? null}
            showCloseButton={true}
        />
    </div>
}
