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
    {value: "notebook", label: "Notebook", fileType: "ipynb"},
    {value: "llm_dataops", label: "LLM Data Operations Notebook", fileType: "ipynb"},
    {value: "predictors", label: "Predictors (future)", fileType: ""},
    {value: "prescriptors", label: "Prescriptors (future)", fileType: ""},
    {value: "requirements", label: "Notebook Python Dependencies", fileType: "txt"},
    {value: "private_dependencies", label: "Tar file containing private library wheel files", fileType: ".zip"},
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
 * @return A boolean indicating whether we think the artifact requested is one of those the server listed.
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
        case "notebook":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/experiment.ipynb"
            return availableArtifacts.experiment
        case "requirements":
            // For example "s3://leaf-unileaf-dev-artifacts/run_data/4435/artifacts/requirements.txt"
            return availableArtifacts.requirements
        case "predictors":
        case "prescriptors":
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

// Allows user to download artifacts created by the run: models, Jupyter notebook etc.
export async function downloadArtifact(
    run: Run,
    artifactToDownload: string,
    artifactFriendlyName: string,
    availableArtifacts: Record<string, string>,
    projectName: string,
    projectId: number,
    experiment: Experiment
) {
    // Pull out the download URL for the requested artifact.
    const downloadUrl: string = getUrlForArtifact(artifactToDownload, availableArtifacts)

    if (!downloadUrl) {
        // If we got this far, it means we think the artifact _should_ be available, so something has gone wrong.
        sendNotification(
            NotificationType.error,
            "Internal error",
            `No download URL found for "${artifactFriendlyName}" in run id ${run.id}`
        )
        return
    }

    // Retrieve the artifact
    const artifacts: Artifact[] = await fetchRunArtifact(downloadUrl)
    if (!artifacts || artifacts.length !== 1) {
        sendNotification(
            NotificationType.error,
            "Internal error",
            `Unexpected number of artifacts returned for Run id ${run.id}: ${artifacts == null ? 0 : artifacts.length}`
        )
    }

    // Convert to text and save to file
    // TODO: this doesn't handle binary files yet (like models) nor the zip archive case. For the future.
    const artifact = artifacts[0]
    const base64EncodedBytes: string = artifact.bytes
    const decodedString: Uint8Array = fromBinary(base64EncodedBytes)
    const fileName =
        `project_${projectName || projectId || "unknown project"}_${artifactToDownload}_` +
        `${experiment.name || experiment.id}_run_${run.name || run.id}`
    const fileType = DOWNLOADABLE_ARTIFACTS.find((a) => a.value === artifactToDownload).fileType
    const safeFilename = toSafeFilename(fileName)
    const downloadFileName = `${safeFilename}.${fileType}`
    downloadFile(decodedString, downloadFileName)

    // Show notification at top center as in Firefox "downloads popup" hides it on the right
    sendNotification(NotificationType.success, `${artifactFriendlyName} downloaded as ${downloadFileName}`, "", "top")
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
