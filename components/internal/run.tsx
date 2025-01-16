import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import Grid from "@mui/material/Grid2"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import {Radio, RadioChangeEvent, Space} from "antd"
import Link from "next/link"
import {NextRouter, useRouter} from "next/router"
import {ReactElement, ReactNode, SyntheticEvent, useEffect, useState} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter from "react-syntax-highlighter"
import {docco} from "react-syntax-highlighter/dist/cjs/styles/hljs"
import {ReactFlowProvider} from "reactflow"
import remarkGfm from "remark-gfm"

import NeuroAIChatbot from "./chatbot/neuro_ai_chatbot"
import Flow from "./flow/flow"
import {FlowQueries} from "./flow/flowqueries"
import {PrescriptorNode} from "./flow/nodes/prescriptornode"
import {NodeType} from "./flow/nodes/types"
import {FlowElementsType} from "./flow/types"
import {InferenceButton} from "./InferenceButton"
import {fetchProjects} from "../../controller/projects/fetch"
import {Project, Projects} from "../../controller/projects/types"
import {fetchLlmRules} from "../../controller/rules/rules"
import {fetchRunArtifact, fetchRuns} from "../../controller/run/fetch"
import {constructRunMetricsForRunPlot} from "../../controller/run/results"
import {Artifact, Run, Runs} from "../../controller/run/types"
import {useAuthentication} from "../../utils/authentication"
import {AuthorizationInfo} from "../../utils/authorization"
import decode from "../../utils/conversion"
import {empty} from "../../utils/objects"
import {consolidateFlow} from "../../utils/transformation"
import {useLocalStorage} from "../../utils/use_local_storage"
import ESPRunPlot from "../esprunplot"
import {InfoTip} from "../infotip"
import MetricsTable from "../metricstable"
import NewBar from "../newbar"
import {NotificationType, sendNotification} from "../notification"
import {PageLoader} from "../pageLoader"
import {MultiPareto} from "../pareto/multi_pareto"

interface TabPanelProps {
    id: string
    children?: ReactNode
    index: number
    value: number
}

function CustomTabPanel(myProps: TabPanelProps) {
    const {children, value, index, id} = myProps
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={id}
        >
            {value === index && <Box id={`tab-panel-box-${id}-${index}`}>{children}</Box>}
        </div>
    )
}

interface RunProps {
    /* 
    id: string element handle for testing
    ProjectId: Rendered in run page
    RunID: Used to fetch run using backend
    setRuns: Function used to send back fetched information to the
    experiment page.
    runs: Used to query and update runs after runs have been
    fetched.
    */
    id: string
    ProjectId: number
    RunID: number
    setRuns: (arg: Runs) => void
    runs: Runs
    idExtension?: string
    projectPermissions?: AuthorizationInfo
}

/**
 * RunPage is the page for a single training run of your experiment. The page shows the original flow and metrics.
 * @param props See RunProps
 */
// CustomPanel is the other component in this file and it's only used by this module for now
// eslint-disable-next-line react/no-multi-comp
export default function RunPage(props: RunProps): ReactElement {
    // Get the router hook
    const router: NextRouter = useRouter()

    const {data: session} = useAuthentication()
    const currentUser: string = session.user.name

    const [predictorPlotData, setPredictorPlotData] = useState({})
    const [prescriptorPlotData, setPrescriptorPlotData] = useState({})
    const [paretoPlotData, setParetoPlotData] = useState({})
    const [isLoadingPlotData, setIsLoadingPlotData] = useState(false)
    const [nodeToCIDMap, setNodeToCIDMap] = useState<Record<string, string>>({})
    const [run, setRun] = useState(null)
    const [rules, setRules] = useState(null)
    const [artifactObj, setArtifactObj] = useState(null)
    const [flow, setFlow] = useState<FlowElementsType>(null)

    const [, setPrescriptors] = useLocalStorage("prescriptors", null)

    const [selectedRulesFormat, setSelectedRulesFormat] = useState("raw")
    const [interpretedRules, setInterpretedRules] = useState(null)
    const [insights, setInsights] = useState(null)
    const [rulesInterpretationLoading, setRulesInterpretationLoading] = useState(false)
    const [insightsLoading, setInsightsLoading] = useState(false)
    const [project, setProject] = useState<Project>(null)
    const [selectedTab, setSelectedTab] = useState<number>(0)

    const [runLoading, setRunLoading] = useState<boolean>(false)

    function getProjectTitle() {
        return project != null ? project.name : ""
    }

    function getProjectDescription() {
        return project != null ? project.description : ""
    }

    function cacheRun(runTmp: Run) {
        /*
        Takes the fetched fields from this run page and updates
        the runs prop passed from the experiment page so they 
        won't have to be fetched again.
        */
        const runIndex = getRunIndexByID(runTmp.id)
        const tempRuns = [...props.runs]
        tempRuns[runIndex].output_artifacts = runTmp.output_artifacts
        tempRuns[runIndex].metrics = runTmp.metrics
        tempRuns[runIndex].flow = runTmp.flow
        props.setRuns(tempRuns)
    }

    function getRunIndexByID(runID: number): number {
        /*
        Finds a run by runID from the props and returns the 
        corresponding index so the run can be accessed
        */
        const tempRuns = props.runs
        let selectedIndex = null
        tempRuns.forEach((tmpRun, idx) => {
            if (runID === tmpRun.id) {
                selectedIndex = idx
            }
        })
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
        if (
            tempRun?.flow != null &&
            tempRun.output_artifacts != null &&
            tempRun.metrics != null &&
            tempRun.experiment_id != null
        ) {
            return tempRun
        } else {
            // cache miss
            return null
        }
    }

    function generateArtifactURL(flowTmp: FlowElementsType) {
        const prescriptorNode = FlowQueries.getPrescriptorNodes(FlowQueries.getAllNodes(flowTmp) as NodeType[])[0]
        let rulesURL = null
        if (prescriptorNode) {
            const nodeCID = nodeToCIDMap[prescriptorNode.id]
            if (nodeCID) {
                const index = `prescriptor-text-${prescriptorNode.id}-${nodeCID}`
                rulesURL = JSON.parse(run.output_artifacts)[index]
            } else {
                sendNotification(
                    NotificationType.error,
                    "Internal error",
                    "Failed to find nodeCID with prescriptor id."
                )
            }
        } else {
            sendNotification(NotificationType.error, "Internal error", "Error retrieving prescriptor node")
        }

        return rulesURL
    }

    async function retrieveRulesPrescriptor() {
        const rulesURL = generateArtifactURL(flow)
        if (rulesURL) {
            const artifactTmp: Artifact[] = await fetchRunArtifact(rulesURL)

            if (artifactTmp) {
                setArtifactObj(artifactTmp[0])
            } else {
                sendNotification(NotificationType.error, "Internal error", "Fetch for artifacts returned null")
            }
        } else {
            sendNotification(NotificationType.error, "Internal error", "Generation of s3 url returned null.")
        }
    }

    async function loadRun(runID: number) {
        try {
            let runTmp
            let flowTmp

            runTmp = getRunFromCache(runID)
            // If Attempt to get the run from the cache
            if (runTmp) {
                // Cache hit -- use the cached run
                setRun(props.runs[getRunIndexByID(runID)])

                // Use temporary variable to avoid shadowing outer "flow" variable
                flowTmp = JSON.parse(runTmp.flow)
                const consolidatedFlow = consolidateFlow(flowTmp)
                setFlow(consolidatedFlow)
                if (consolidatedFlow !== null) {
                    constructMetrics(runTmp.metrics, consolidatedFlow)
                }

                return
            }

            setRunLoading(true)
            // Cache miss -- have to load from backend
            if (runID) {
                const propertiesToRetrieve = ["output_artifacts", "metrics", "flow", "id", "experiment_id"]
                const runs: Runs = await fetchRuns(currentUser, null, runID, propertiesToRetrieve)
                if (runs.length === 1) {
                    runTmp = runs[0]

                    // Use temporary variable to avoid shadowing outer "flow" variable
                    flowTmp = JSON.parse(runTmp.flow)
                    const consolidatedFlow = consolidateFlow(flowTmp)
                    setFlow(consolidatedFlow)
                    setRun(runTmp)
                    if (consolidatedFlow !== null) {
                        constructMetrics(runTmp.metrics, consolidatedFlow)
                    }
                    cacheRun(runTmp)
                } else {
                    sendNotification(
                        NotificationType.error,
                        "Internal error",
                        `Unexpected number of runs returned: ${runs.length} for run ${runID}`
                    )
                }
            } else {
                sendNotification(NotificationType.error, "Internal error", "No run ID passed")
            }
        } finally {
            setRunLoading(false)
        }
    }

    async function loadProject(projectID: number) {
        if (!projectID) {
            return
        }

        const projects: Projects = await fetchProjects(currentUser, projectID, ["name", "description"])
        if (projects && projects.length === 1) {
            setProject(projects[0])
        }
    }

    // Fetch the experiment and the runs
    useEffect(() => {
        async function getRuns() {
            await loadRun(props.RunID)
        }

        getRuns()
    }, [props.RunID])

    // Fetch the rules
    useEffect(() => {
        // If nodeToCIDMap has been populated, we can load the rules
        if (run && nodeToCIDMap) {
            // If it contains a rule-based prescriptor, load the rules
            if (FlowQueries.isRuleBased(flow)) {
                void retrieveRulesPrescriptor()
            }
        }
    }, [nodeToCIDMap])

    // Fetch the project
    useEffect(() => {
        if (props.ProjectId) {
            void loadProject(props.ProjectId)
        }
    }, [props.ProjectId])

    // Decode the rules from the artifact obj
    useEffect(() => {
        if (artifactObj != null) {
            const decodedRules = decode(artifactObj.bytes)
            if (decodedRules) {
                const decodedRulesFormatted = decodedRules.trim()
                setRules(decodedRulesFormatted)
            } else {
                sendNotification(NotificationType.error, "Internal error", "Failed to decode rules")
            }
        }
    }, [artifactObj])

    const constructMetrics = (metrics, currentFlow) => {
        setPrescriptors(null)
        setIsLoadingPlotData(true)
        if (metrics) {
            const [constructedPredictorResults, constructedPrescriptorResults, pareto] = constructRunMetricsForRunPlot(
                currentFlow,
                JSON.parse(metrics)
            )
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
                const prescriptorInfo = firstItem.data[firstItem.data.length - 1].data.sort((item1, item2) => {
                    return item1.objective0 - item2.objective0
                })

                setPrescriptors({
                    objectives: firstItem.objectives,
                    prescriptors: prescriptorInfo,
                })
            }
        }
        setIsLoadingPlotData(false)
    }

    useEffect(() => {
        if (paretoPlotData && run) {
            const nodeToCIDMapTmp = {}

            // This is the 1D case - if the Pareto does not exist
            if (Object.keys(paretoPlotData).length === 0) {
                // Get all the artifacts that start with the keyword prescriptor
                const prescriptorArtifactNames = Object.keys(JSON.parse(run.output_artifacts)).filter((artifactName) =>
                    artifactName.startsWith("prescriptor")
                )

                prescriptorArtifactNames.forEach((artifact) => {
                    // Split the name of the prescriptor to extract the node id and the cid
                    const splitName = artifact.split("-")
                    const nodeId = splitName.slice(1, splitName.length - 1).join("-")
                    nodeToCIDMapTmp[nodeId] = splitName[splitName.length - 1]
                })
            } else {
                // Loop over the nodes
                Object.keys(paretoPlotData).forEach((nodeId) => {
                    const nodeInfo = paretoPlotData[nodeId].data
                    const numGen = nodeInfo.length
                    nodeToCIDMapTmp[nodeId] = nodeInfo[numGen - 1].data[0].cid
                })
            }
            setNodeToCIDMap(nodeToCIDMapTmp)
        }
    }, [paretoPlotData])

    function getCAOInfo(prescriptorNode: PrescriptorNode) {
        const caoState = prescriptorNode.data.ParentPrescriptorState.caoState

        const contextFields = Object.entries(caoState.context)
            .filter((item) => item[1] === true)
            .map((item) => item[0])

        const actionFields = Object.entries(caoState.action)
            .filter((item) => item[1] === true)
            .map((item) => item[0])

        const outcomeFields = Object.assign(
            {},
            ...prescriptorNode.data.ParentPrescriptorState.evolution.fitness.map((item) => ({
                [item.metric_name]: item.maximize ? "maximize" : "minimize",
            }))
        )
        return {contextFields, actionFields, outcomeFields}
    }

    useEffect(() => {
        // Fetch rules interpretation in the background
        async function fetchRulesInterpretations() {
            const prescriptorNode = FlowQueries.getPrescriptorNodes(flow)[0]
            if (!prescriptorNode) {
                return
            }

            const {contextFields, actionFields, outcomeFields} = getCAOInfo(prescriptorNode)

            try {
                setRulesInterpretationLoading(true)
                const response = await fetchLlmRules(
                    "rulesInterpretation",
                    getProjectTitle(),
                    getProjectDescription(),
                    rules,
                    contextFields,
                    actionFields,
                    outcomeFields
                )
                if (!response.ok) {
                    console.error("error json", await response.json())
                    return
                }
                const data = await response.json()
                setInterpretedRules(data.response)
            } catch (error) {
                console.error("error", error)
            } finally {
                setRulesInterpretationLoading(false)
            }
        }

        if (rules && flow) {
            void fetchRulesInterpretations()
        }
    }, [rules])

    useEffect(() => {
        // Fetch rules insights in the background
        async function fetchRulesInsights() {
            const prescriptorNode = FlowQueries.getPrescriptorNodes(flow)[0]
            if (!prescriptorNode) {
                return
            }

            const {contextFields, actionFields, outcomeFields} = getCAOInfo(prescriptorNode)

            try {
                setInsightsLoading(true)
                const response = await fetchLlmRules(
                    "rulesInsights",
                    getProjectTitle(),
                    getProjectDescription(),
                    rules,
                    contextFields,
                    actionFields,
                    outcomeFields
                )
                if (!response.ok) {
                    console.error("error json", await response.json())
                    return
                }
                const data = await response.json()

                // Remove spurious newline characters
                const insightsWithBreaks = data.response.replace("\\n", "\n")
                setInsights(insightsWithBreaks)
            } catch (error) {
                console.error("Error retrieving rules insights", error, error instanceof Error && error.stack)
                setInsights(
                    "&nbsp;\n&nbsp;\n" +
                        `### **Unable to retrieve rules insights: '${error instanceof Error ? error.message : error}**'`
                )
            } finally {
                setInsightsLoading(false)
            }
        }

        if (rules && flow) {
            void fetchRulesInsights()
        }
    }, [rules])

    const plotDiv = []
    if (predictorPlotData && !isLoadingPlotData) {
        const predictors = FlowQueries.getPredictorNodes(flow)
        plotDiv.push(
            <MetricsTable // eslint-disable-line enforce-ids-in-jsx/missing-ids
                // MetricsTable doesn't have (or need) an id property. The items it generates
                // each have their own referenceable id.
                key="metrics-table"
                PredictorRunData={predictorPlotData}
                Predictors={predictors}
            />
        )
    }

    if (prescriptorPlotData && !isLoadingPlotData) {
        plotDiv.push(
            <ESPRunPlot
                id="esp-run-plot"
                PrescriptorRunData={prescriptorPlotData}
            />
        )
    }

    // Figure out how many objectives we have. Sum over all prescriptors.
    const prescriptorNodes = flow && FlowQueries.getPrescriptorNodes(flow)
    const objectivesCount = prescriptorNodes?.reduce(
        (accumulator, node) => accumulator + Object.keys(node.data.ParentPrescriptorState.evolution.fitness).length,
        0
    )

    if (paretoPlotData && !isLoadingPlotData) {
        plotDiv.push(
            <MultiPareto
                id="pareto-plot-table"
                key="pareto-plot-table"
                Pareto={paretoPlotData}
                NodeToCIDMap={nodeToCIDMap}
                PrescriptorNodeToCIDMapUpdater={setNodeToCIDMap}
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
        // Can"t use DMS if no prescriptors
        if (empty(nodeToCIDMap)) {
            return "(Decision Making System not available: no prescriptors found.)"
        }

        // Allow DMS access for currently chosen prescriptor
        const prescriptorID = Object.values(nodeToCIDMap)[0]

        const dataSourceNodes = FlowQueries.getDataNodes(flow)
        if (!dataSourceNodes || dataSourceNodes.length !== 1) {
            // Can't find a unique data source node -- unable to continue
            return "(Decision Making System not available: internal error.)"
        }

        const dataSourceId = dataSourceNodes[0].data.DataTag.DataSourceId
        const projectId = props.ProjectId
        const experimentId = run.experiment_id
        const runId = run.id
        const dmsLink = `/projects/${projectId}/experiments/${experimentId}/runs/${runId}/prescriptors/${prescriptorID}`
        return (
            <Link
                id="dms-link"
                href={{
                    pathname: dmsLink,

                    // Pass along query params
                    query: {...router.query, DataSourceId: dataSourceId},
                }}
                style={{
                    color: "var(--bs-white)",
                }}
                target="_blank"
            >
                Go to Decision Making System with Prescriptor: {prescriptorID}
            </Link>
        )
    }

    if (isLoadingPlotData) {
        plotDiv.push(
            <div
                id="clip-loader-div"
                className="container"
                key="plot-data-div"
            >
                <CircularProgress
                    id="plot-data-clip-loader"
                    key="plot-data-clip-loader"
                    sx={{color: "var(--bs-primary)"}}
                    size={50}
                />
            </div>
        )
    } else {
        // Link to decision UI, or disabled and explanatory text if rules-based which decision UI does not support.
        plotDiv.push(
            <div
                id="dms-button-div"
                key="dms-button-div"
                style={{
                    cursor: shouldEnableDMS() ? "pointer" : "not-allowed",
                }}
            >
                <InferenceButton
                    id="dms-button"
                    disabled={!shouldEnableDMS()}
                >
                    {getDMSButton()}
                </InferenceButton>
            </div>
        )
    }

    function getRawRulesSection() {
        return (
            <div
                id="rules-div"
                className="my-2 py-2"
                key="rules-div"
                style={{
                    whiteSpace: "pre",
                    backgroundColor: "whitesmoke",
                    overflowY: "scroll",
                    display: "block",
                }}
            >
                <SyntaxHighlighter
                    id="syntax-highlighter"
                    language="scala"
                    style={docco}
                    showLineNumbers={true}
                >
                    {rules}
                </SyntaxHighlighter>
            </div>
        )
    }

    function getInsightsPanel() {
        return (
            <CustomTabPanel
                id="insights-panel"
                value={selectedTab}
                index={1}
            >
                <div
                    id="insights-div"
                    style={{whiteSpace: "pre-wrap"}}
                >
                    {insightsLoading ? (
                        <>
                            <CircularProgress
                                id="insights-loader"
                                sx={{color: "var(--bs-primary)"}}
                                size={50}
                            />
                            Accessing LLM...
                        </>
                    ) : (
                        <div id="insights-inner-div">
                            <h1 id="insights-h1">Insights</h1>
                            <h2 id="project-name">{project.name}</h2>
                            {project.description}
                            <ReactMarkdown // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // ReactMarkdown doesn't have (or need) an id property.
                                remarkPlugins={[remarkGfm]}
                            >
                                {insights}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </CustomTabPanel>
        )
    }

    function getDetailsPanel() {
        return (
            <CustomTabPanel
                id="details-panel"
                value={selectedTab}
                index={0}
            >
                <Grid
                    id="rules-decoded-Grid"
                    style={{marginTop: 10}}
                    container={true}
                >
                    <Grid
                        id="rules-decoded-column"
                        size={10}
                    >
                        {selectedRulesFormat === "raw" ? (
                            getRawRulesSection()
                        ) : rulesInterpretationLoading ? (
                            <>
                                <CircularProgress
                                    id="rules-interpreted-loader"
                                    sx={{color: "var(--bs-primary)"}}
                                    size={50}
                                />
                                Accessing LLM...
                            </>
                        ) : (
                            <div id="markdown-div">
                                <ReactMarkdown // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // ReactMarkdown doesn"t have (or need) an id property.
                                // The items it generates each have their own referenceable id.
                                >
                                    {interpretedRules}
                                </ReactMarkdown>
                            </div>
                        )}
                    </Grid>
                    <Grid
                        id="radio-column"
                        size={1}
                        sx={{
                            marginLeft: "1rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <Radio.Group
                            id="radio-group"
                            value={selectedRulesFormat}
                            onChange={(e: RadioChangeEvent) => {
                                setSelectedRulesFormat(e.target.value)
                            }}
                        >
                            <Space
                                id="radio-space"
                                direction="vertical"
                                size="middle"
                            >
                                <div
                                    id="radio-raw-help"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Radio
                                        id="radio-raw"
                                        value="raw"
                                    >
                                        Raw
                                    </Radio>
                                    <InfoTip
                                        id="raw-tooltip"
                                        info={
                                            "View rules exactly as they were generated during the " +
                                            "evolutionary search."
                                        }
                                    />
                                </div>
                                <div
                                    id="radio-raw-help"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Radio
                                        id="radio-interpreted"
                                        value="interpreted"
                                    >
                                        Interpreted
                                    </Radio>
                                    <InfoTip
                                        id="interpreted-tooltip"
                                        info={
                                            "View rules as interpreted by an LLM. (large language model) " +
                                            "to express them in a more human-readable format."
                                        }
                                    />
                                </div>
                            </Space>
                        </Radio.Group>
                    </Grid>
                </Grid>
            </CustomTabPanel>
        )
    }

    function handleTabChange(_event: SyntheticEvent, newTabIndex: number) {
        setSelectedTab(newTabIndex)
    }

    function getRulesSection() {
        return (
            <Box
                id="rules-section"
                sx={{width: "100%"}}
            >
                <Tabs
                    id="rules-tabs"
                    value={selectedTab}
                    onChange={handleTabChange}
                    sx={{
                        "& .MuiTabs-flexContainer": {
                            justifyContent: "space-around",
                            border: "1px solid lightgray",
                            borderRadius: "4px 4px 0 0",
                        },
                        "& .MuiTab-root": {
                            flex: 1,
                            textAlign: "center",
                            marginRight: "2px",
                        },
                        "& .Mui-selected": {
                            borderBottom: "none",
                        },
                    }}
                >
                    <Tab
                        id="rules-decoded-tab"
                        label="Details"
                    />
                    <Tab
                        id="insights-tab"
                        label="Insights"
                    />
                </Tabs>
                {getDetailsPanel()}
                {getInsightsPanel()}
            </Box>
        )
    }

    if (rules) {
        // Add rules. We use a syntax highlighter to pretty-print the rules and lie about the language
        // the rules are in to get a decent coloring scheme
        plotDiv.push(
            <Box
                id="rules-div"
                style={{marginBottom: "600px"}}
            >
                <NewBar
                    id="rules-bar"
                    InstanceId="rules"
                    Title="Rules"
                    DisplayNewLink={false}
                />
                {getRulesSection()}
            </Box>
        )
    }

    const flowDiv = []

    if (run && flow) {
        flowDiv.push(
            <div
                id="run-flow"
                key="run-flow-div"
            >
                {/* 2/6/23 DEF - ReactFlowProvider does not have an id property when compiling */}
                <ReactFlowProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                >
                    <Flow
                        id="flow"
                        ProjectID={props.ProjectId}
                        Flow={flow}
                        SetParentState={setFlow}
                        ElementsSelectable={false}
                        idExtension={props.idExtension}
                        projectPermissions={props.projectPermissions}
                    />
                </ReactFlowProvider>
            </div>
        )
    }

    const propsId = props.id
    return runLoading ? (
        <PageLoader id="run" />
    ) : (
        <div
            id={propsId}
            className="mr-8 ml-8"
        >
            {flowDiv}

            {plotDiv}

            <NeuroAIChatbot
                id="chatbot"
                userAvatar={undefined}
                pageContext={RunPage.pageContext}
            />
        </div>
    )
}

RunPage.pageContext =
    "This is the page for a single training run of your experiment. The page shows the original flow " +
    "used in the training run (even if the flow has been subsequently modified), the metrics for each of the " +
    "predictors defined for your experiment, and the progress in metrics (fitness) for the prescriptors trained " +
    "during your run. On this page you can also view various plots of the pareto front of your experiment (for multi-" +
    "objective experiments) and view the evolution of the Pareto front over subsequent generations. If you chose a " +
    "rules-based representation for your run, you can also view the evolved ruleset on this page, along with " +
    "insights and rules intepretations provided by an LLM. Finally, you can select a prescriptor from the final " +
    "generation and launch the decision making system (DMS) to expore the behavior of that prescriptor."
