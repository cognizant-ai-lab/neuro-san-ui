// Delimiter for separating logs from agents
export const LOGS_DELIMITER = ">>>"

/**
 * Models the error we receive from neuro-san agents.
 */
export interface AgentErrorProps {
    error: string
    traceback?: string
    tool?: string
}

/**
 * Errors thrown by callback when the agent fails.
 */
export class AgentError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AgentError"
    }
}

/**
 * Generate the message to display to the user when the experiment has been generated.
 */
export const experimentGeneratedMessage = (projectUrl: URL) => (
    <>
        Your new experiment has been generated. Click{" "}
        <a
            id="new-project-link"
            target="_blank"
            href={projectUrl.toString()}
            rel="noreferrer"
        >
            here
        </a>{" "}
        to view it.
    </>
)
