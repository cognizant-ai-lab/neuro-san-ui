import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, ReactNode} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {experimentGeneratedMessage, OrchestrationHandling, retry} from "./common"
import {MAX_ORCHESTRATION_ATTEMPTS} from "./const"
import {getLogs} from "../../../controller/agent/agent"
import {AgentStatus, LogsResponse} from "../../../generated/neuro_san/api/grpc/agent"
import useEnvironmentStore from "../../../state/environment"
import {MUIAccordion} from "../../MUIAccordion"

// Regex to extract project and experiment IDs from agent response
const AGENT_RESULT_REGEX = /assistant: \{'project_id': '(?<projectId>\d+)', 'experiment_id': '(?<experimentId>\d+)'\}/u

// Regex to extract error in agent response
const AGENT_ERROR_REGEX = /```json(?<errorBlock>[\s\S]*?)```/u

// Delimiter for separating logs from agents
const LOGS_DELIMITER = ">>>"

// Maximum inactivity time since last agent response before we give up
const MAX_AGENT_INACTIVITY_SECS = 2 * 60

interface LogHandling {
    lastLogIndex: number
    setLastLogIndex: (newIndex: number) => void
    lastLogTime: number
    setLastLogTime: (newTime: number) => void
}

interface LlmInteraction {
    isAwaitingLlm: boolean
    setIsAwaitingLlm: (newVal: boolean) => void
    signal: AbortSignal
}

async function checkAgentTimeout(
    lastLogTime: number,
    orchestrationHandling: OrchestrationHandling,
    updateOutput: (node: ReactNode) => void
) {
    // No new logs, check if it's been too long since last log
    const timeSinceLastLog = Date.now() - lastLogTime
    const isTimeout = lastLogTime && timeSinceLastLog > MAX_AGENT_INACTIVITY_SECS * 1000
    if (isTimeout) {
        const baseMessage = "Error occurred: exceeded wait time for agent response."
        await retry(
            `${baseMessage} Retrying...`,
            `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
            orchestrationHandling,
            updateOutput
        )
    }

    return isTimeout
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
                <MUIAccordion
                    id="experiment-generation-complete-panel"
                    items={[
                        {
                            title: "Experiment generation complete",
                            content: (
                                <p id="experiment-generation-complete-details">
                                    {experimentGeneratedMessage(projectUrl)}
                                </p>
                            ),
                        },
                    ]}
                    sx={{fontSize: "large"}}
                />
                <br id="experiment-generation-complete-br" />
            </>
        )
        orchestrationHandling.endOrchestration()
    }
}

/**
 * Split a log line into its summary and details parts, using `LOGS_DELIMITER` as the separator.
 * @param logLine The log line to split
 * @returns An object containing the summary and details parts of the log line
 */
function splitLogLine(logLine: string) {
    const logLineElements = logLine.split(LOGS_DELIMITER)

    const logLineSummary = logLineElements[0]
    const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

    const logLineDetails = logLineElements[1]
    return {summarySentenceCase, logLineDetails}
}

/**
 * Process a log line from the agent and format it nicely using the syntax highlighter and Accordion components.
 * @param logLine The log line to process
 * @param highlighterTheme The theme to use for the syntax highlighter
 * @returns A React component representing the log line (agent message)
 */
function processLogLine(logLine: string, highlighterTheme: {[p: string]: CSSProperties}) {
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
        <MUIAccordion
            id={`${summarySentenceCase}-panel`}
            items={[
                {
                    title: summarySentenceCase,
                    content: (
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
            sx={{
                fontSize: "large",
                marginBottom: "1rem",
            }}
        />
    )
}

/**
 * Process new logs from the agent and format them nicely using the syntax highlighter and Accordion components.
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

export const pollForLogs = async (
    currentUser: string,
    sessionId: string,
    logHandling: LogHandling,
    orchestrationHandling: OrchestrationHandling,
    llmInteraction: LlmInteraction,
    setProjectUrl: (url: URL) => void,
    updateOutput: (node: ReactNode) => void,
    highlighterTheme: {[p: string]: CSSProperties}
) => {
    if (llmInteraction.isAwaitingLlm) {
        // Already a request in progress
        return
    }

    // Poll the agent for logs
    try {
        // Set "busy" flag
        llmInteraction.setIsAwaitingLlm(true)

        const response: LogsResponse = await getLogs(sessionId, llmInteraction.signal, currentUser)

        // Check status from agents
        // Any status other than "FOUND" means something went wrong
        if (response.status !== AgentStatus.FOUND) {
            const baseMessage = "Error occurred: session not found."
            await retry(
                `${baseMessage} Retrying...`,
                `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
                orchestrationHandling,
                updateOutput
            )

            return
        }

        // Check for new logs
        const hasNewLogs = response?.logs?.length > 0 && response.logs.length > logHandling.lastLogIndex + 1
        if (hasNewLogs) {
            const newOutputItems = processNewLogs(response, logHandling, highlighterTheme)
            updateOutput(newOutputItems)
        } else {
            const timedOut = await checkAgentTimeout(logHandling.lastLogTime, orchestrationHandling, updateOutput)
            if (timedOut) {
                return
            }
        }

        if (response.chatResponse) {
            await processChatResponse(response.chatResponse, orchestrationHandling, setProjectUrl, updateOutput)
        }
    } finally {
        llmInteraction.setIsAwaitingLlm(false)
    }
}
