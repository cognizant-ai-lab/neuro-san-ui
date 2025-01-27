import {Collapse} from "antd"
import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, ReactNode} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {experimentGeneratedMessage, OrchestrationHandling, retry} from "./common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "./const"
import {LogsResponse} from "../../../generated/neuro_san/api/grpc/agent"
import useEnvironmentStore from "../../../state/environment"

const {Panel} = Collapse

// Regex to extract project and experiment IDs from agent response
const AGENT_RESULT_REGEX = /assistant: \{'project_id': '(?<projectId>\d+)', 'experiment_id': '(?<experimentId>\d+)'\}/u

// Regex to extract error in agent response
const AGENT_ERROR_REGEX = /```json(?<errorBlock>[\s\S]*?)```/u

// Delimiter for separating logs from agents
const LOGS_DELIMITER = ">>>"

interface LogHandling {
    lastLogIndex: number
    setLastLogIndex: (newIndex: number) => void
    lastLogTime: number
    setLastLogTime: (newTime: number) => void
}

export const processChatResponse = async (
    chatResponse: string,
    orchestrationHandling: OrchestrationHandling,
    setProjectUrl: (url: URL) => void,
    updateOutput: (node: ReactNode) => void
) => {
    // Check for error
    const errorMatches = AGENT_ERROR_REGEX.exec(chatResponse)
    if (errorMatches) {
        try {
            // We got an error. Parse the error block and display it to the user
            const errorBlock = JSON.parse(errorMatches.groups.errorBlock)

            const baseMessage =
                `Error occurred. Error: "${errorBlock.error}", ` +
                `traceback: "${errorBlock.traceback}", ` +
                `tool: "${errorBlock.tool}".`
            await retry(
                `${baseMessage} Retrying...`,
                `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
                orchestrationHandling,
                updateOutput
            )

            return
        } catch (e) {
            // We couldn't parse the error block. Could be a false positive -- occurrence of ```json but it's not an
            // error, so log a warning and continue.
            console.warn(
                "Error occurred and was unable to parse error block. " +
                    `Error block: "${errorMatches.groups.errorBlock}, parsing error: ${e}".`
            )
        }
    }

    // Check for completion of orchestration by checking if response contains project info
    const matches = AGENT_RESULT_REGEX.exec(chatResponse)

    if (matches) {
        // We found the agent completion message

        // Build the URl and set it in state so the notification will be displayed
        const projectId = matches.groups.projectId
        const experimentId = matches.groups.experimentId

        // Get backend API URL from environment store
        const baseUrl = useEnvironmentStore.getState().backendApiUrl

        // Construct the URL for the new project
        const projectUrl: URL = new URL(`/projects/${projectId}/experiments/${experimentId}/?generated=true`, baseUrl)

        // Set the URL in state
        setProjectUrl(projectUrl)

        // Generate the "experiment complete" item in the agent dialog
        updateOutput(
            <>
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Collapse>
                    <Panel
                        id="experiment-generation-complete-panel"
                        header="Experiment generation complete"
                        key="Experiment generation complete"
                        style={{fontSize: "large"}}
                    >
                        <p id="experiment-generation-complete-details">{experimentGeneratedMessage(projectUrl)}</p>
                    </Panel>
                </Collapse>
                <br id="experiment-generation-complete-br" />
            </>
        )
    }
}

/**
 * Split a log line into its summary and details parts, using `LOGS_DELIMITER` as the separator. If the delimiter is not
 * found, the entire log line is treated as the details part. This can happen when it's a "follow-on" message from
 * an agent we've already heard from.
 * @param logLine The log line to split
 * @returns An object containing the summary and details parts of the log line
 */
function splitLogLine(logLine: string) {
    if (logLine.includes(LOGS_DELIMITER)) {
        const logLineElements = logLine.split(LOGS_DELIMITER)

        const logLineSummary = logLineElements[0]
        const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

        const logLineDetails = logLineElements[1]
        return {summarySentenceCase, logLineDetails}
    } else {
        return {summarySentenceCase: "Agent", logLineDetails: logLine}
    }
}

/**
 * Process a log line from the agent and format it nicely using the syntax highlighter and antd Collapse component.
 * @param logLine The log line to process
 * @param highlighterTheme The theme to use for the syntax highlighter
 * @returns A React component representing the log line (agent message)
 */
export function processLogLine(logLine: string, highlighterTheme: {[p: string]: CSSProperties}) {
    // extract the parts of the line
    const {summarySentenceCase, logLineDetails} = splitLogLine(logLine)

    let repairedJson: string = null

    try {
        // Attempt to parse as JSON

        // First, repair it
        repairedJson = jsonrepair(logLineDetails)

        // Now try to parse it. We don't care about the result, only if it throws on parsing.
        JSON.parse(repairedJson)
    } catch (e) {
        // Not valid JSON
        repairedJson = null
    }

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <Collapse
            style={{marginBottom: "1rem"}}
            items={[
                {
                    id: `${summarySentenceCase}-panel`,
                    label: summarySentenceCase,
                    key: summarySentenceCase,
                    style: {fontSize: "large"},
                    children: (
                        <div id={`${summarySentenceCase}-details`}>
                            {/* If we managed to parse it as JSON, pretty print it */}
                            {repairedJson ? (
                                <SyntaxHighlighter
                                    id="syntax-highlighter"
                                    language="json"
                                    style={highlighterTheme}
                                    showLineNumbers={false}
                                    wrapLines={true}
                                >
                                    {repairedJson}
                                </SyntaxHighlighter>
                            ) : (
                                logLineDetails || "No further details"
                            )}
                        </div>
                    ),
                },
            ]}
        />
    )
}

/**
 * Process new logs from the agent and format them nicely using the syntax highlighter and antd Collapse component.
 * @param response The response from the agent network containing potentially new-to-us logs
 * @param logHandling Items related to the log handling process
 * @param highlighterTheme The theme to use for the syntax highlighter
 * @returns An array of React components representing the new logs (agent messages)
 */
export const processNewLogs = (
    response: LogsResponse,
    logHandling: LogHandling,
    highlighterTheme: {[p: string]: CSSProperties}
) => {
    // Get new logs
    const newLogs = response.logs.slice(logHandling.lastLogIndex + 1)

    // Update last log time
    logHandling.setLastLogTime(Date.now())

    // Update last log index
    logHandling.setLastLogIndex(response.logs.length - 1)

    const newOutputItems = []

    // Process new logs and display summaries to user
    for (const logLine of newLogs) {
        const outputItem = processLogLine(logLine, highlighterTheme)
        newOutputItems.push(outputItem)
    }

    return newOutputItems
}
