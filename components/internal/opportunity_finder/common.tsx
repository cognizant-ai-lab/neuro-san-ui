// Delimiter for separating logs from agents
export const LOGS_DELIMITER = ">>>"

/**
 * Errors thrown by Neuro-san agents
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
