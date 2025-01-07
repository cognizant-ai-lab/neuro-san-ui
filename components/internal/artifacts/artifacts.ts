/**
 * Various items relating to handling of Run artifacts such as models, notebooks, LLM chat logs etc.
 */

import {Experiment} from "../../../controller/experiments/types"
import {fetchRunArtifact} from "../../../controller/run/fetch"
import {Artifact, Run} from "../../../controller/run/types"
import {fromBinary} from "../../../utils/conversion"
import {downloadFile, toSafeFilename} from "../../../utils/file"
import {NotificationType, sendNotification} from "../../notification"

// Default to downloading this unless the user selects something else
export const DEFAULT_DOWNLOAD_ARTIFACT = "notebook"

/**
 * Defines the properties of a single downloadable artifact
 */
interface ArtifactInfo {
    // Machine-readable name for the artifact type eg. for use in select lists
    readonly value: string

    // Human-readable name for the artifact type
    readonly label: string

    // Filetype for saving the artifact locally when downloading
    readonly fileType: string
}

// Artifacts that can be downloaded.
const DOWNLOADABLE_ARTIFACTS: ArtifactInfo[] = [
    {value: "llm_log_file", label: "LLM chat log", fileType: "txt"},
    {value: "original_dataset", label: "Original Dataset", fileType: "csv"},
    {value: "modified_dataset", label: "Modified Dataset", fileType: "csv"},
    {value: "modified_profile", label: "Modified Data Profile", fileType: "json"},
    {value: "notebook", label: "Notebook", fileType: "ipynb"},
    {value: "llm_dataops", label: "LLM Data Operations Notebook", fileType: "ipynb"},
    {value: "requirements", label: "Notebook Python Dependencies", fileType: "txt"},
    {value: "private_dependencies", label: "Archive file containing private library wheel files", fileType: "zip"},
    {value: "all", label: "All artifacts (zip, future)", fileType: "zip"},
]

/**
 * Simple accessor to get list of downloadable artifacts
 *
 * @return List of downloadable artifacts. See {@link ArtifactInfo}.
 * In general not all will be available for a particular Run.
 */
export function getDownloadableArtifacts(): ArtifactInfo[] {
    return DOWNLOADABLE_ARTIFACTS
}

/**
 * Inspects the available artifacts to determine if a particular one is in the list from the server.
 * This logic is required due to naming inconsistencies between the UI and backend. For example, the key
 * named "experiment" gives us the artifact for the "notebook". Some day we may reconcile these and this
 * "mapping" logic would become trivial or unnecessary.
 *
 * An artifact is defined to be available if we can figure out the URL for the requested artifact from the list
 * of output_artifacts in the Run.
 *
 * @param requestedArtifact Name of the artifact we're interested in, eg. "notebook"
 * @param outputArtifacts The list of output artifacts from the Run, as name-value pairs
 * @returns A boolean indicating whether we think the artifact requested is one of those the server listed.
 */
export function isArtifactAvailable(requestedArtifact: string, outputArtifacts: Record<string, string>) {
    return getUrlForArtifact(requestedArtifact, outputArtifacts) != null
}

// Allows user to download artifacts created by the run: models, Jupyter notebook etc.
function getUrlForArtifact(artifactToDownload: string, availableArtifacts: Record<string, string>) {
    // Find out what is available in the Run
    switch (artifactToDownload) {
        case "llm_log_file":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/llm_log_file.txt"
            return availableArtifacts.llm_log_file
        case "llm_dataops":
            //For example "s3://leaf-unileaf-dev-artifacts/run_data/4872/artifacts/llm_dataops.ipynb"
            return availableArtifacts.llm_dataops
        case "original_dataset": {
            // Original datasets have URLs like this, where 525 is the data source ID.
            // "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/525.csv"
            const regex = /\/\d+.csv/u
            return Object.values(availableArtifacts).find((artifactUrl) => regex.test(artifactUrl))
        }
        case "modified_dataset": {
            // Modified datasets have URLs like this, with a timestamp:
            // "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/525_20240207-0031.csv"
            const regex = /\/\d+_\d+-\d+.csv/u
            return Object.values(availableArtifacts).find((artifactUrl) => regex.test(artifactUrl))
        }
        case "modified_profile": {
            // Modified profiles have URLs like this, with a timestamp:
            // "s3://leaf-unileaf-staging-artifacts/run_data/11840/artifacts/6741_profile.json"
            const regex = /\/\d+_profile.json/u
            return Object.values(availableArtifacts).find((artifactUrl) => regex.test(artifactUrl))
        }
        case "notebook":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/experiment.ipynb"
            return availableArtifacts.experiment
        case "requirements":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/requirements.txt"
            return availableArtifacts.requirements
        case "private_dependencies":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/private_dependencies.zip"
            return availableArtifacts.private_dependencies
        case "all":
            // not yet supported
            return null
        default:
            console.error(`Unexpected artifact download request: ${artifactToDownload}`)
            return null
    }
}

/**
 * Retrieve the artifact(s) from the server, and returns them as an array of Artifact objects in memory
 * @param artifactToDownload See {@link downloadArtifact}
 * @param artifactFriendlyName See {@link downloadArtifact}
 * @param availableArtifacts See {@link downloadArtifact}
 * @param runId The ID of the Run from which to retrieve the artifact
 *
 * @returns An array of Artifact objects, or null if there was an error
 */
export async function retrieveArtifact(
    artifactToDownload: string,
    artifactFriendlyName: string,
    availableArtifacts: Record<string, string>,
    runId: number
): Promise<Artifact[] | null> {
    // Pull out the download URL for the requested artifact.
    const downloadUrl: string = getUrlForArtifact(artifactToDownload, availableArtifacts)

    if (!downloadUrl) {
        // If we got this far, it means we think the artifact _should_ be available, so something has gone wrong.
        sendNotification(
            NotificationType.error,
            "Internal error",
            `No download URL found for "${artifactFriendlyName}" in run id ${runId}`
        )
        return null
    }

    // Retrieve the artifact
    try {
        const artifacts: Artifact[] = await fetchRunArtifact(downloadUrl)
        if (!artifacts || artifacts.length !== 1) {
            sendNotification(
                NotificationType.error,
                "Internal error",
                `Unexpected number of ${artifactFriendlyName} artifacts returned for Run id ${runId}: ` +
                    `${artifacts == null ? 0 : artifacts.length}`
            )
            return null
        }

        return artifacts
    } catch (e) {
        sendNotification(
            NotificationType.error,
            "Internal error",
            `Error fetching ${artifactFriendlyName} artifact : ${e}`
        )
        return null
    }
}

/**
 * Allows user to download artifacts created by the run: models, Jupyter notebook etc.
 *
 * @param run The Run object from which to download the artifact
 * @param artifactToDownload The machine-readable name of the artifact to download, for example "llm_dataops"
 * @param artifactFriendlyName The human-readable name of the artifact to download, for example
 * "LLM Data Operations Notebook"
 * @param availableArtifacts The list of available artifacts from the Run
 * @param projectName The name of the project to which the Run belongs. Used for generating a download filename.
 * @param projectId The ID of the project to which the Run belongs. Used for generating a download filename.
 * @param experiment The Experiment object to which the Run belongs. Used for generating a download filename.
 *
 * @returns Nothing, but saves the file to the user's local machine as a side effect.
 */
export async function downloadArtifact(
    run: Run,
    artifactToDownload: string,
    artifactFriendlyName: string,
    availableArtifacts: Record<string, string>,
    projectName: string,
    projectId: number,
    experiment: Experiment
) {
    // Retrieve the artifact(s)
    const artifacts: Artifact[] = await retrieveArtifact(
        artifactToDownload,
        artifactFriendlyName,
        availableArtifacts,
        run.id
    )

    if (!artifacts) {
        return
    }

    if (artifacts.length !== 1) {
        sendNotification(
            NotificationType.error,
            "Internal error",
            `Unexpected number of artifacts returned for Run id ${run.id} artifact type ` +
                `${artifactFriendlyName}: ${artifacts.length}`
        )
        return
    }

    // Download the artifact
    const artifact = artifacts[0]

    // We receive the payload as base64 encoded bytes, so we need to decode it either to text or binary, depending
    // which type of artifact we're dealing with. Binary covers both cases.
    // Example text artifact: Notebook
    // Example binary artifact: private Python dependencies zip
    const base64EncodedBytes: string = artifact.bytes
    const decodedString: Uint8Array = fromBinary(base64EncodedBytes)

    // Construct a filename for the downloaded artifact
    const fileName =
        `project_${projectName || projectId || "unknown project"}_` +
        `experiment_${experiment.name || experiment.id}_` +
        `run_${run.name || run.id}_${artifactToDownload}`
    // Determine the filetype
    const fileType = DOWNLOADABLE_ARTIFACTS.find((a) => a.value === artifactToDownload).fileType

    // Sanitize the filename to avoid any issues with special characters
    const safeFilename = toSafeFilename(fileName)
    const downloadFileName = `${safeFilename}.${fileType}`

    // Download
    downloadFile(decodedString, downloadFileName)

    // Show notification at top center as in Firefox "downloads popup" hides it on the right
    sendNotification(NotificationType.success, `${artifactFriendlyName} downloaded as ${downloadFileName}`, "", {
        vertical: "top",
        horizontal: "center",
    })
}

/**
 * Get friendly name for chosen artifact from the map.
 *
 * @param desiredArtifactName Short name for the requested artifact eg. "notebook"
 *
 * @return Human-readable friendly name
 */
export function getArtifactFriendlyName(desiredArtifactName: string): string {
    return Object.values(DOWNLOADABLE_ARTIFACTS).find(
        (v) => v.value === (desiredArtifactName || DEFAULT_DOWNLOAD_ARTIFACT)
    ).label
}
