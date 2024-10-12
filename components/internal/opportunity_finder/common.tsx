/**
 * Generate the message to display to the user when the experiment has been generated.
 */
export const experimentGeneratedMessage = (projectUrl: string) => (
    <>
        Your new experiment has been generated. Click{" "}
        <a
            id="new-project-link"
            target="_blank"
            href={projectUrl}
            rel="noreferrer"
        >
            here
        </a>{" "}
        to view it.
    </>
)
