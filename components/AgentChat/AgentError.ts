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
