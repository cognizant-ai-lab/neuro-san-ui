import {Alert, Collapse} from "antd"
import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {ReactNode} from "react"
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

/**
 * Retry the orchestration process. If we haven't exceeded the maximum number of retries, we'll try again.
 * Issue an appropriate warning or error to the user depending on whether we're retrying or giving up.
 * @param retryMessage The message to display to the user when retrying
 * @param failureMessage The message to display to the user when giving up
 * @param orchestrationAttemptNumber The current orchestration attempt number, 1-based.
 * @param updateOutput
 * @param endOrchestration
 * @param initiateOrchestration
 * @returns Nothing, but updates the output window and ends the orchestration process if we've exceeded the maximum
 */
const retry = async (
    retryMessage: string,
    failureMessage: string,
    orchestrationAttemptNumber: number,
    updateOutput: (newOutput: ReactNode) => void,
    endOrchestration: () => void,
    initiateOrchestration: (isRetry: boolean) => Promise<void>
): Promise<void> => {
    if (orchestrationAttemptNumber < MAX_ORCHESTRATION_ATTEMPTS) {
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
        endOrchestration()
        await initiateOrchestration(true)
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
        endOrchestration()
    }
}

export async function checkAgentTimeout(
    lastLogTime,
    orchestrationAttemptNumber,
    updateOutput,
    endOrchestration,
    initiateOrchestration
) {
    // No new logs, check if it's been too long since last log
    const timeSinceLastLog = Date.now() - lastLogTime
    const isTimeout = lastLogTime && timeSinceLastLog > MAX_AGENT_INACTIVITY_SECS * 1000
    if (isTimeout) {
        const baseMessage = "Error occurred: exceeded wait time for agent response."
        await retry(
            `${baseMessage} Retrying...`,
            `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
            orchestrationAttemptNumber,
            updateOutput,
            endOrchestration,
            initiateOrchestration
        )
    }

    return isTimeout
}

async function processChatResponse(
    response,
    orchestrationAttemptNumber,
    updateOutput,
    setProjectUrl: (url: string) => void,
    endOrchestration,
    initiateOrchestration
) {
    // Check for error
    const errorMatches = AGENT_ERROR_REGEX.exec(response.chatResponse)
    if (errorMatches) {
        const baseMessage = `Error occurred: ${errorMatches.groups.error}. Traceback: ${errorMatches.groups.traceback}`
        await retry(
            `${baseMessage} Retrying...`,
            `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
            orchestrationAttemptNumber,
            updateOutput,
            endOrchestration,
            initiateOrchestration
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
        endOrchestration()
    }
}

function processNewLogs(
    response: LogsResponse,
    lastLogIndex,
    setLastLogIndex,
    setLastLogTime,
    updateOutput,
    highlighterTheme
) {
    // Get new logs
    const newLogs = response.logs.slice(lastLogIndex + 1)

    // Update last log time
    setLastLogTime(Date.now())

    // Update last log index
    setLastLogIndex(response.logs.length - 1)

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
    sessionId: string,
    currentUser: string,
    isAwaitingLlm: boolean,
    setIsAwaitingLlm: (newVal: boolean) => void,
    signal: AbortSignal,
    orchestrationAttemptNumber: number,
    updateOutput: (newOutput: ReactNode) => void,
    lastLogIndex: number,
    setLastLogIndex: (newIndex: number) => void,
    lastLogTime: number,
    setProjectUrl: (url: string) => void,
    setLastLogTime: (newTime: number) => void,
    endOrchestration,
    initiateOrchestration
) {
    if (isAwaitingLlm) {
        // Already a request in progress
        return
    }

    // Poll the agent for logs
    try {
        // Set "busy" flag
        setIsAwaitingLlm(true)

        const response: LogsResponse = await getLogs(sessionId, signal, currentUser)

        // Check status from agents
        // Any status other than "FOUND" means something went wrong
        if (response.status !== AgentStatus.FOUND) {
            const baseMessage = "Error occurred: session not found."
            await retry(
                `${baseMessage} Retrying...`,
                `${baseMessage} Gave up after ${MAX_ORCHESTRATION_ATTEMPTS} attempts.`,
                orchestrationAttemptNumber,
                updateOutput,
                endOrchestration,
                initiateOrchestration
            )

            return
        }

        // Check for new logs
        const hasNewLogs = response?.logs?.length > 0 && response.logs.length > lastLogIndex + 1
        if (hasNewLogs) {
            processNewLogs(response, lastLogIndex, setLastLogIndex, setLastLogTime, updateOutput, "github")
        } else {
            const timedOut = await checkAgentTimeout(
                lastLogTime,
                orchestrationAttemptNumber,
                updateOutput,
                endOrchestration,
                initiateOrchestration
            )
            if (timedOut) {
                return
            }
        }

        if (response.chatResponse) {
            await processChatResponse(
                response,
                orchestrationAttemptNumber,
                updateOutput,
                setProjectUrl,
                endOrchestration,
                initiateOrchestration
            )
        }
    } finally {
        setIsAwaitingLlm(false)
    }
}
