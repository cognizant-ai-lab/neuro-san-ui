import CircularProgress from "@mui/material/CircularProgress"
import Tooltip from "@mui/material/Tooltip"
import {Drawer} from "antd"
import {cloneDeep} from "lodash"
import {useEffect, useRef, useState} from "react"
import {MdOutlineSaveAlt} from "react-icons/md"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"

import {MAX_ALLOWED_CATEGORIES} from "../../../const"
import {sendLlmRequest} from "../../../controller/llm/llm_chat"
import {DataTag, DataTagFieldValued} from "../../../generated/metadata"
import {toSafeFilename} from "../../../utils/file"
import {omitDeep} from "../../../utils/objects"
import {FlowQueries} from "../flow/flowqueries"
import {DataSourceNode} from "../flow/nodes/datasourcenode"
import {NodeType} from "../flow/nodes/types"

// Main function for the Experiment Analyzer component.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export function ExperimentAnalyzer(props: {
    show: boolean
    onClose: () => void
    flow: NodeType[]
    projectDescription: string
    projectName: string
}) {
    // Results of the experiment analysis
    const [experimentAnalysis, setExperimentAnalysis] = useState<string>("")

    // Ref for tracking if we're autoscrolling. We stop autoscrolling if the user scrolls manually
    const autoScrollEnabled = useRef<boolean>(true)

    // Internal flag to let us know when we generated a scroll event programmatically
    const isProgrammaticScroll = useRef<boolean>(false)

    // Ref for output text area, so we can auto scroll it
    const experimentAnalysisOutputRef = useRef<HTMLDivElement>(null)

    function tokenReceivedHandler(token: string) {
        if (experimentAnalysisOutputRef.current && autoScrollEnabled.current) {
            isProgrammaticScroll.current = true
            experimentAnalysisOutputRef.current.scrollIntoView({behavior: "smooth", block: "center"})
        }

        setExperimentAnalysis((prev) => prev + token)
    }

    /**
     * Clean up the flow object to remove unnecessary fields that would just confuse the LLM and bloat the payload.
     * Also prunes the number of categories in fields to avoid huge payloads.
     * @param flowTmp The flow object to clean up.
     * @returns The cleaned up flow object.
     */
    function cleanFlow(flowTmp: NodeType[]): NodeType[] {
        // Make a copy of the flow. Can't use structuredClone because it doesn't handle functions.
        const flowClone: NodeType[] = cloneDeep(flowTmp)

        // Remove excess categories from fields. Some older experiments have fields that were defined as
        // continuous but all possible values were stored as if they were categories. This makes for HUGE payloads
        // that causes requests to fail.
        const dataNode: DataSourceNode = FlowQueries.getDataNodes(flowClone)[0]
        const dataTag: DataTag = DataTag.fromJSON(dataNode.data.DataTag)
        dataTag.fields = Object.fromEntries(
            Object.entries(dataTag.fields).map(([key, value]) => [
                key,
                {
                    ...value,
                    // For continuous fields, drop the categories entirely so as not to confuse the LLM
                    // For categorical fields, limit the number of categories to MAX_ALLOWED_CATEGORIES
                    discreteCategoricalValues:
                        value.valued === DataTagFieldValued.CATEGORICAL
                            ? value.discreteCategoricalValues.slice(0, MAX_ALLOWED_CATEGORIES)
                            : undefined,
                },
            ])
        )

        dataNode.data.DataTag = dataTag
        return omitDeep(flowClone, [
            "ParameterSet",
            "ParentPredictorState",
            "ParentUncertaintyNodeState",
            "EvaluatorOverrideCode",
        ])
    }

    useEffect(() => {
        if (props.show && experimentAnalysis === "") {
            void analyzeExperiment()
        }
    }, [props.show])

    /**
     * Analyze the experiment using the LLM.
     */
    async function analyzeExperiment() {
        setExperimentAnalysis(
            "ⓘ **Note: this feature is in beta testing and results may not be accurate. " +
                "Verify all suggestions before making any changes.**\n\n"
        )
        // Enable autoscrolling by default
        autoScrollEnabled.current = true

        const cleanedFlow = cleanFlow(props.flow)

        await sendLlmRequest(
            tokenReceivedHandler,
            null,
            "/api/gpt/experimentAnalyzer",
            {
                flow: cleanedFlow,
                projectName: props.projectName,
                projectDescription: props.projectDescription,
            },
            "",
            []
        )
    }

    return (
        <Drawer // eslint-disable-line enforce-ids-in-jsx/missing-ids
            open={props.show}
            placement="right"
            destroyOnClose={true}
            closable={true}
            onClose={props.onClose}
            width="60%"
            title="Experiment analyzer"
        >
            {experimentAnalysis ? (
                <>
                    <div
                        id="download-analysis-div"
                        style={{position: "sticky", display: "flex", top: 0, right: 100}}
                    >
                        <Tooltip
                            id="analysis-save-tooltip"
                            title="Save analysis to file"
                        >
                            <MdOutlineSaveAlt
                                id="analysis-save-button"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    cursor: "pointer",
                                }}
                                size={40}
                                onClick={async () => {
                                    // Save current experiment analysis to a file
                                    const blob = new Blob([experimentAnalysis], {type: "text/plain"})
                                    const url = URL.createObjectURL(blob)
                                    const anchor = document.createElement("a")
                                    anchor.href = url
                                    anchor.download = `${toSafeFilename(props.projectName)}_experiment_analysis.txt`
                                    anchor.click()
                                    URL.revokeObjectURL(url)
                                }}
                            />
                        </Tooltip>
                    </div>
                    <div
                        id="experiment-analysis-output"
                        ref={experimentAnalysisOutputRef}
                        style={{
                            padding: "10px",
                        }}
                        onScroll={() => {
                            // Disable autoscroll if user scrolls manually
                            if (isProgrammaticScroll.current) {
                                isProgrammaticScroll.current = false
                                return
                            }

                            // Must be user initiated scroll, so disable autoscroll
                            autoScrollEnabled.current = false
                        }}
                    >
                        <ReactMarkdown // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            rehypePlugins={[rehypeRaw, rehypeSlug]}
                            className="prose max-w-none"
                        >
                            {experimentAnalysis ?? "Analyzing experiment..."}
                        </ReactMarkdown>
                    </div>
                </>
            ) : (
                <CircularProgress
                    id="experiment-analysis-spinner"
                    sx={{
                        color: "var(--bs-primary)",
                    }}
                    size={50}
                />
            )}
        </Drawer>
    )
}
