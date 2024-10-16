import {Alert, Collapse} from "antd"
import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, ReactNode} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {experimentGeneratedMessage} from "./common"
import {INLINE_ALERT_PROPERTIES} from "./const"
import {getLogs} from "../../../controller/agent/agent"
import {AgentStatus, LogsResponse} from "../../../generated/agent"

const {Panel} = Collapse

// How many times to retry the entire orchestration process
const MAX_ORCHESTRATION_ATTEMPTS = 3

// Regex to extract project and experiment IDs from agent response
const AGENT_RESULT_REGEX = /assistant: \{'project_id': '(?<projectId>\d+)', 'experiment_id': '(?<experimentId>\d+)'\}/u

// Regex to extract error and traceback from agent response
const AGENT_ERROR_REGEX = /assistant:\s*\{\s*"error": "(?<error>[^"]+)",\s*"traceback":\s*"(?<traceback>[^"]+)"\}/u

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

interface Orchestrationhandling {
    orchestrationAttemptNumber: number
    initiateOrchestration
    endOrchestration
}

interface LlmInteraction {
    isAwaitingLlm: boolean
    setIsAwaitingLlm: (newVal: boolean) => void
    signal: AbortSignal
}

/**
 * Retry the orchestration process. If we haven't exceeded the maximum number of retries, we'll try again.
 * Issue an appropriate warning or error to the user depending on whether we're retrying or giving up.
 * @param retryMessage The message to display to the user when retrying
 * @param failureMessage The message to display to the user when giving up
 * @param orchestrationHandling Items related to the orchestration process
 * @param updateOutput Function to update the output window
 * @returns Nothing, but updates the output window and ends the orchestration process if we've exceeded the maximum
 */
export const retry = async (
    retryMessage: string,
    failureMessage: string,
    orchestrationHandling: Orchestrationhandling,
    updateOutput: (newOutput: ReactNode) => void
): Promise<void> => {
    if (orchestrationHandling.orchestrationAttemptNumber < MAX_ORCHESTRATION_ATTEMPTS) {
        updateOutput(
            <>
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Alert
                    {...INLINE_ALERT_PROPERTIES}
                    type="warning"
                    description={retryMessage}
                />
            </>
        )

        // try again
        orchestrationHandling.endOrchestration()
        await orchestrationHandling.initiateOrchestration(true)
    } else {
        updateOutput(
            <>
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Alert
                    {...INLINE_ALERT_PROPERTIES}
                    type="error"
                    description={failureMessage}
                />
            </>
        )
        orchestrationHandling.endOrchestration()
    }
}

export async function checkAgentTimeout(lastLogTime, orchestrationHandling, updateOutput) {
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

async function processChatResponse(
    response,
    orchestrationHandling,
    setProjectUrl: (url: string) => void,
    updateOutput
) {
    // Check for error
    const errorMatches = AGENT_ERROR_REGEX.exec(response.chatResponse)
    if (errorMatches) {
        const baseMessage = `Error occurred: ${errorMatches.groups.error}. Traceback: ${errorMatches.groups.traceback}`
        await retry(
            `${baseMessage} Retrying...`,
            `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
            orchestrationHandling,
            updateOutput
        )

        return
    }

    // Check for completion of orchestration by checking if response contains project info
    const matches = AGENT_RESULT_REGEX.exec(response.chatResponse)

    if (matches) {
        // Build the URl and set it in state so the notification will be displayed
        const projectId = matches.groups.projectId
        const experimentId = matches.groups.experimentId

        const projectUrl = `/projects/${projectId}/experiments/${experimentId}/?generated=true`
        setProjectUrl(projectUrl)

        // We found the agent completion message
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
        orchestrationHandling.endOrchestration()
    }
}

export const processNewLogs = (
    response: LogsResponse,
    logHandling: LogHandling,
    updateOutput,
    highlighterTheme: {[p: string]: CSSProperties}
) => {
    // Get new logs
    const newLogs = response.logs.slice(logHandling.lastLogIndex + 1)

    // Update last log time
    logHandling.setLastLogTime(Date.now())

    // Update last log index
    logHandling.setLastLogIndex(response.logs.length - 1)

    // Process new logs and display summaries to user
    for (const logLine of newLogs) {
        // extract the part of the line only up to LOGS_DELIMITER
        const logLineElements = logLine.split(LOGS_DELIMITER)

        const logLineSummary = logLineElements[0]
        const summarySentenceCase = logLineSummary.replace(/\w+/gu, capitalize)

        const logLineDetails = logLineElements[1]

        let repairedJson: string | object = null

        try {
            // Attempt to parse as JSON

            // First, repair it
            repairedJson = jsonrepair(logLineDetails)

            // Now try to parse it
            repairedJson = JSON.parse(repairedJson)
        } catch (e) {
            // Not valid JSON
            repairedJson = null
        }

        updateOutput(
            <>
                {/*eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <Collapse>
                    <Panel
                        id={`${summarySentenceCase}-panel`}
                        header={summarySentenceCase}
                        key={summarySentenceCase}
                        style={{fontSize: "large"}}
                    >
                        <p id={`${summarySentenceCase}-details`}>
                            {/*If we managed to parse it as JSON, pretty print it*/}
                            {repairedJson ? (
                                <SyntaxHighlighter
                                    id="syntax-highlighter"
                                    language="json"
                                    style={highlighterTheme}
                                    showLineNumbers={false}
                                    wrapLines={true}
                                >
                                    {JSON.stringify(repairedJson, null, 2)}
                                </SyntaxHighlighter>
                            ) : (
                                logLineDetails || "No further details"
                            )}
                        </p>
                    </Panel>
                </Collapse>
                <br id={`${summarySentenceCase}-br`} />
            </>
        )
    }
}

export async function pollForLogs(
    currentUser: string,
    sessionId: string,
    logHandling: LogHandling,
    orchestrationHandling: Orchestrationhandling,
    llmInteraction: LlmInteraction,
    setProjectUrl: (url: string) => void,
    updateOutput: (newOutput: React.ReactNode) => void,
    highlighterTheme: {[p: string]: React.CSSProperties}
) {
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
            processNewLogs(response, logHandling, updateOutput, highlighterTheme)
        } else {
            const timedOut = await checkAgentTimeout(logHandling.lastLogTime, orchestrationHandling, updateOutput)
            if (timedOut) {
                return
            }
        }

        if (response.chatResponse) {
            await processChatResponse(response, orchestrationHandling, setProjectUrl, updateOutput)
        }
    } finally {
        llmInteraction.setIsAwaitingLlm(false)
    }
}
