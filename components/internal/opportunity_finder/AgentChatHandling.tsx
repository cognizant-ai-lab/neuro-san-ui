import {Collapse} from "antd"
import {jsonrepair} from "jsonrepair"
import {capitalize} from "lodash"
import {CSSProperties, Dispatch, MutableRefObject, ReactNode, SetStateAction} from "react"
import SyntaxHighlighter from "react-syntax-highlighter"

import {experimentGeneratedMessage} from "./common"
import {ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

const {Panel} = Collapse

// Delimiter for separating logs from agents
const LOGS_DELIMITER = ">>>"

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

export function handleStreamingReceived(
    chunk: string,
    projectUrl: MutableRefObject<URL>,
    updateOutput: (node: ReactNode) => void,
    highlighterTheme: {[p: string]: CSSProperties},
    setIsAwaitingLlm: Dispatch<SetStateAction<boolean>>
): void {
    console.debug(`Received chunk: ${chunk}`)
    let chatResponse: ChatResponse
    try {
        chatResponse = JSON.parse(chunk).result
    } catch (e) {
        console.error(`Error parsing log line: ${e}`)
        return
    }
    const chatMessage: ChatMessage = chatResponse.response

    const messageType: ChatMessageChatMessageType = chatMessage?.type

    // We only know how to handle AI messages
    if (messageType !== ChatMessageChatMessageType.AI && messageType !== ChatMessageChatMessageType.LEGACY_LOGS) {
        console.debug(`Received message of type ${messageType}, ignoring`)
        return
    }

    // Check for termination
    let chatMessageJson = null
    try {
        // LLM sometimes wraps the JSON in markdown code blocks, so we need to remove them before parsing
        const chatMessageCleaned = chatMessage.text.replace(/```json/gu, "").replace(/```/gu, "")

        chatMessageJson = JSON.parse(chatMessageCleaned)
        if (chatMessageJson.project_id && chatMessageJson.experiment_id) {
            console.debug("Received experiment generation complete message")

            const baseUrl = window.location.origin

            // Set the URL for displaying to the user
            projectUrl.current = new URL(
                // want to keep it on a single line for readability
                // eslint-disable-next-line max-len
                `/projects/${chatMessageJson.project_id}/experiments/${chatMessageJson.experiment_id}/?generated=true`,
                baseUrl
            )

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
                            <p id="experiment-generation-complete-details">
                                {experimentGeneratedMessage(projectUrl.current)}
                            </p>
                        </Panel>
                    </Collapse>
                    <br id="experiment-generation-complete-br" />
                </>
            )
            setIsAwaitingLlm(false)
            return
        }
    } catch {
        // Not a JSON object, so we'll just continue on
        console.debug("Received message is not experiment generation complete message: ", chatMessage.text)
    }

    if (chatMessage?.text) {
        const newOutputItem = processLogLine(chatMessage.text, highlighterTheme)
        updateOutput(newOutputItem)
    }
}
