/**
 * Various items relating to handling of Run artifacts such as models, notebooks, LLM chat logs etc.
 */

import {Experiment} from "../../../controller/experiments/types"
import {NotificationType, sendNotification} from "../../../controller/notification"
import {FetchSingleRunArtifact} from "../../../controller/run/fetch"
import {Artifact, Run} from "../../../controller/run/types"
import {fromBinary} from "../../../utils/conversion"
import {downloadFile, toSafeFilename} from "../../../utils/file"

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
    {value: "llm_log_file",     label: "LLM chat log",                  fileType: "txt"},
    {value: "notebook",         label: "Notebook",                      fileType: "ipynb"},
    {value: "predictors",       label: "Predictors (future)",           fileType: ""},
    {value: "prescriptors",     label: "Prescriptors (future)",         fileType: ""},
    {value: "modified_dataset", label: "Modified Dataset",              fileType: "csv"},
    {value: "all",              label: "All artifacts (zip, future)",   fileType: "zip"},
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
 * @param requestedArtifact Name of the artifact we're interested in, eg. "notebook"
 * @param availableArtifacts List of available artifacts, as returned by the server.
 * @return A boolean indicating whether we think the artifact requested is one of those the server listed.
 */
export function isArtifactAvailable(requestedArtifact: string, availableArtifacts: Record<string, string>) {
    const artifactNames = Object.keys(availableArtifacts)
    const artifactUrls = Object.values(availableArtifacts)

    if (!availableArtifacts || artifactNames.length === 0) {
        return false
    }

    if (requestedArtifact === "notebook") {
        return artifactNames.includes("experiment")
    } else if (requestedArtifact === "llm_log_file") {
        return artifactNames.includes("llm_log_file")
    } else if (requestedArtifact === "modified_dataset") {
        return artifactUrls.some(artifact => artifact.endsWith(".csv"))
    } else {
        return false
    }
}

// Allows user to download artifacts created by the run: models, Jupyter notebook etc.
export async function downloadArtifact(run: Run, artifactToDownload: string, artifactFriendlyName: string,
                                       projectName: string, projectId: number, experiment: Experiment) {
    // Find out what is available in the Run
    const availableArtifacts: Record<string, string> = JSON.parse(run.output_artifacts)

    // Pull out the download URL for the requested artifact.
    let downloadUrl
    switch (artifactToDownload) {
        case "llm_log_file":
            downloadUrl = availableArtifacts.llm_log_file
            break
        case "notebook":
            downloadUrl = availableArtifacts.experiment
            break
        case "predictors":
            // not yet supported
            return
        case "prescriptors":
            // not yet supported
            return
        case "modified_dataset":
            downloadUrl = Object.values(availableArtifacts).find(a => a.endsWith(".csv"))
            break
        case "all":
            // not yet supported
            return
        default:
            console.error(`Unexpected artifact download request: ${artifactToDownload}`)
            return
    }

    // Retrieve the artifact
    const artifacts: Artifact[] = await FetchSingleRunArtifact(downloadUrl)
    if (!artifacts || artifacts.length != 1) {
        sendNotification(NotificationType.error, "Internal error",
            `Unexpected number of artifacts returned for Run id ${run.id}: ${artifacts != null ? artifacts.length : 0}`)
    }

    // Convert to text and save to file
    // TODO: this doesn't handle binary files yet (like models) nor the zip archive case. For the future.
    const artifact = artifacts[0]
    const base64EncodedBytes: string = artifact.bytes
    const decodedString: Uint8Array = fromBinary(base64EncodedBytes)
    const fileName = `project_${projectName || projectId || "unknown project"}_${artifactToDownload}_` +
        `${experiment.name || experiment.id}_run_${run.name || run.id}`
    const fileType = DOWNLOADABLE_ARTIFACTS.find(a => a.value === artifactToDownload).fileType;
    const safeFilename = toSafeFilename(fileName);
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
    return Object.values(DOWNLOADABLE_ARTIFACTS)
        .find(v => v.value === (desiredArtifactName || DEFAULT_DOWNLOAD_ARTIFACT)).label
}

