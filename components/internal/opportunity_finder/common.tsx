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
