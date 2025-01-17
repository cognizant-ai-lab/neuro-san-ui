import {ReactNode} from "react"

import {MAX_ORCHESTRATION_ATTEMPTS} from "./const"
import {MUIAlert} from "../../MUIAlert"

/**
 * Items related to the orchestration process.
 */
export interface OrchestrationHandling {
    orchestrationAttemptNumber: number
    initiateOrchestration: (isRetry: boolean) => Promise<void>
    endOrchestration: () => void
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
/**
 * Retry the orchestration process. If we haven't exceeded the maximum number of retries, we'll try again.
 * Issue an appropriate warning or error to the user depending on whether we're retrying or giving up.
 *
 * @param retryMessage The message to display to the user when retrying
 * @param failureMessage The message to display to the user when giving up
 * @param orchestrationHandling Items related to the orchestration process
 * @param updateOutput Function to update the output window
 * @returns Nothing, but updates the output window and ends the orchestration process if we've exceeded the maximum
 */
export const retry = async (
    retryMessage: string,
    failureMessage: string,
    orchestrationHandling: OrchestrationHandling,
    updateOutput: (newOutput: ReactNode) => void
): Promise<void> => {
    if (orchestrationHandling.orchestrationAttemptNumber < MAX_ORCHESTRATION_ATTEMPTS) {
        updateOutput(
            <MUIAlert
                id="retry-message-alert"
                severity="warning"
            >
                {retryMessage}
            </MUIAlert>
        )

        // try again
        orchestrationHandling.endOrchestration()
        await orchestrationHandling.initiateOrchestration(true)
    } else {
        updateOutput(
            <MUIAlert
                id="failure-message-alert"
                severity="error"
            >
                {failureMessage}
            </MUIAlert>
        )
        orchestrationHandling.endOrchestration()
    }
}
