/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined"
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import Stepper from "@mui/material/Stepper"
import {alpha, styled} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import startCase from "lodash-es/startCase"
import {FC, ChangeEvent as ReactChangeEvent, DragEvent as ReactDragEvent, useEffect, useRef, useState} from "react"

import {useSettingsStore} from "../../../state/Settings"
import {toDisplayName} from "../../../utils/AgentName"
import {splitFilename} from "../../../utils/File"
import {MUIDialog} from "../../Common/MUIDialog"
import {getFrontman} from "../AgentFlow/GraphStructure"
import {AgentNetworkDefinitionEntry, DisplayAs} from "../const"

//#region: Constants

export const IMPORT_MODAL_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const IMPORT_MODAL_ACCEPTED_EXTENSIONS = [".json"]
const ACCEPTED_MIME_TYPES = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(", ")
const STEPS = ["Select file", "Review", "Confirm"]

/** Trailing UUID on a filename stem. Separator is `[_-]` because filename sanitization
 * (`toSafeFilename`, neuro-san exports) flattens the UUID's hyphens to underscores.
 */
const FILENAME_TRAILING_UUID_PATTERN =
    /[_-][0-9a-fA-F]{8}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{12}$/u

//#endregion: Constants

//#region: Interfaces and Types

// Outcome of validating a selected file against the advertised constraints.
export type ImportFileValidation = "valid" | "unsupported_type" | "too_large"

export interface ImportNetworkModalProps {
    readonly existingNetworkNames?: readonly string[]
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly onImport?: (name: string, content: string) => void
}

// High-level counts shown on the review step so the user can sanity-check the import.
export interface NetworkSummary {
    readonly agents: number
    readonly codedTools: number
    readonly externalAgents: number
    readonly frontman: string
}

type ParseState = "loading" | "success" | "error"

// How to resolve an import whose name collides with an existing network.
type ConflictResolution = "keep-both" | "replace"

//#endregion: Interfaces and Types

//#region: Helpers

/**
 * Parse and validate a network definition file. Imports are JSON only.
 *
 * Returns the parsed value on success, or an error message on failure. The value is typed `unknown`,
 * so callers narrow it (see `jsonToNetworkDefinition`) or stringify it as needed.
 */
export const parseNetworkFileContent = (
    text: string
): {success: true; data: unknown} | {success: false; error: string} => {
    if (text.trim() === "") {
        return {success: false, error: "The file is empty."}
    }
    try {
        return {success: true, data: JSON.parse(text)}
    } catch (err) {
        return {success: false, error: err instanceof Error ? err.message : String(err)}
    }
}

/**
 * Converts a parsed network definition into an array of AgentNetworkDefinitionEntry objects
 * suitable for sendNetworkDesignerRequest.
 *
 * Expects the top-level array shape — each entry carrying `origin`, `tools`, `display_as`, etc.
 * Anything that isn't an array yields an empty result, and entries without a string `origin`
 * are dropped. The `instructions` and `description` fields are trimmed when present.
 */
export const jsonToNetworkDefinition = (parsed: unknown): AgentNetworkDefinitionEntry[] => {
    if (!Array.isArray(parsed)) return []
    return parsed
        .filter(
            (entry): entry is AgentNetworkDefinitionEntry =>
                typeof (entry as Record<string, unknown> | null)?.["origin"] === "string"
        )
        .map((entry) => ({
            ...entry,
            ...(entry.instructions !== undefined && {instructions: entry.instructions.trim()}),
            ...(entry.description !== undefined && {description: entry.description.trim()}),
        }))
}

// Summarises a parsed network definition (counts by `display_as`, plus the frontman).
export const summarizeNetworkDefinition = (networkDef: AgentNetworkDefinitionEntry[]): NetworkSummary => {
    const {agents, codedTools, externalAgents} = networkDef.reduce(
        (acc, entry) => {
            switch (entry.display_as) {
                case DisplayAs.LLM_AGENT:
                    acc.agents += 1
                    break
                case DisplayAs.CODED_TOOL:
                    acc.codedTools += 1
                    break
                case DisplayAs.EXTERNAL_AGENT:
                    acc.externalAgents += 1
                    break
                default:
                    break
            }
            return acc
        },
        {agents: 0, codedTools: 0, externalAgents: 0}
    )
    return {
        agents,
        codedTools,
        externalAgents,
        frontman: getFrontman(networkDef)?.origin ?? networkDef[0]?.origin ?? "",
    }
}

// Format byte count to a human-readable string (e.g. "4.2 KB").
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Validate a selected file against the advertised constraints before reading it.
 *
 * The `<input accept>` attribute only filters the file-picker dialog and is bypassed
 * entirely by drag/drop, so we re-check the extension here. We also enforce the
 * advertised size limit — purely a client-side guard so a pathological file can't be
 * fed into the synchronous parsing/regex pass and freeze the UI; the server imposes
 * no such limit.
 *
 * Returns a status the caller can branch on; rendering a message is left to the caller
 * (see `importFileValidationMessage`).
 */
export const validateImportFile = (file: File): ImportFileValidation => {
    const {ext} = splitFilename(file.name)
    const normalizedExt = `.${ext.toLowerCase()}`
    if (!IMPORT_MODAL_ACCEPTED_EXTENSIONS.includes(normalizedExt)) {
        return "unsupported_type"
    }
    if (file.size > IMPORT_MODAL_MAX_FILE_SIZE_BYTES) {
        return "too_large"
    }
    return "valid"
}

// Human-readable explanation for a non-VALID validation status, or null if the file is acceptable.
export const importFileValidationMessage = (validation: ImportFileValidation, file: File): string | null => {
    switch (validation) {
        case "unsupported_type": {
            const {ext} = splitFilename(file.name)
            const accepted = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(" and ")
            return `Unsupported file type${ext ? ` ".${ext}"` : ""}. Accepts ${accepted}.`
        }
        case "too_large": {
            const max = formatFileSize(IMPORT_MODAL_MAX_FILE_SIZE_BYTES)
            return `File is too large (${formatFileSize(file.size)}). Maximum size is ${max}.`
        }
        case "valid":
        default:
            return null
    }
}

/** Convert a filename stem to a display-friendly network name.
 *
 * Strips a trailing UUID that neuro-san appends to exported filenames (e.g.
 * `my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3.json` → `My Network`).
 */
export const filenameToNetworkName = (filename: string): string => {
    const {name: stem} = splitFilename(filename)
    return startCase(stem.replace(FILENAME_TRAILING_UUID_PATTERN, ""))
}

// Normalize a network name for conflict comparison: underscores, hyphens, parentheses and whitespace
// all collapse to single spaces, so the display form "My Network (2)" and its API form "My_Network_2"
// compare equal.
const normalizeForComparison = (rawName: string): string => {
    const spaced = rawName.replaceAll(/[\s_()-]+/gu, " ").toLowerCase()
    return spaced.trim()
}

/** Pick the first non-colliding name by appending an incrementing index (" 2", " 3", …).
 *
 * Starts at 2 and skips any index already in use, so importing "My Network" alongside an existing
 * "My Network" yields "My Network (2)" — or "My Network (3)" if "My Network (2)" is also taken.
 */
export const nextAvailableNetworkName = (baseName: string, existingNames: readonly string[]): string => {
    const taken = new Set(existingNames.map((existing) => normalizeForComparison(existing)))
    let index = 2
    while (taken.has(normalizeForComparison(`${baseName} (${index})`))) {
        index += 1
    }
    return `${baseName} (${index})`
}

//#endregion: Helpers

//#region: Styled Components

const DropZone = styled(Box, {
    shouldForwardProp: (prop) => prop !== "isDragOver",
})<{isDragOver: boolean}>(({theme, isDragOver}) => ({
    alignItems: "center",
    borderRadius: theme.shape.borderRadius,
    borderStyle: "dashed",
    borderWidth: "2px",
    borderColor: isDragOver ? theme.palette.primary.main : theme.palette.divider,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    justifyContent: "center",
    marginTop: theme.spacing(3),
    minHeight: "220px",
    padding: theme.spacing(4),
    transition: "border-color 0.2s ease",
}))

// Hidden file input, triggered programmatically via the DropZone. MUI's idiomatic
// visually-hidden pattern (https://mui.com/material-ui/react-button/#file-upload).
const VisuallyHiddenInput = styled("input")({
    bottom: 0,
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    whiteSpace: "nowrap",
    width: 1,
})

//#endregion: Styled Components

const EMPTY_NETWORK_NAMES: readonly string[] = []

export const ImportNetworkModal: FC<ImportNetworkModalProps> = ({
    existingNetworkNames = EMPTY_NETWORK_NAMES,
    isOpen,
    onClose,
    onImport,
}) => {
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)
    const [activeStep, setActiveStep] = useState<number>(0)
    // When the imported name conflicts, how the user wants to resolve it.
    const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("keep-both")
    const [file, setFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragOver, setIsDragOver] = useState<boolean>(false)
    const [networkName, setNetworkName] = useState<string>("")
    const [parseState, setParseState] = useState<ParseState | null>(null)
    const [parseError, setParseError] = useState<string | null>(null)
    const [parsedData, setParsedData] = useState<unknown>(null)

    // Reset all state whenever the modal is opened
    useEffect(() => {
        if (isOpen) {
            setActiveStep(0)
            setConflictResolution("keep-both")
            setIsDragOver(false)
            setFile(null)
            setNetworkName("")
            setParseState(null)
            setParseError(null)
            setParsedData(null)
        }
    }, [isOpen])

    // Read and parse the selected file. Driven by an effect so the read is owned by the component
    // lifecycle: the cleanup aborts an in-flight FileReader (discarding its load/error listeners) if
    // the modal closes or a new file is selected before this read finishes, preventing a stale read
    // from updating state out from under a newer one.
    useEffect(() => {
        if (!file) return undefined

        // Validate extension + size before reading. The <input accept> filter only
        // hints the picker and is bypassed by drag/drop, so unsupported or oversized
        // files would otherwise be fed straight into the parser.
        const validation = validateImportFile(file)
        if (validation !== "valid") {
            setParseState("error")
            setParseError(importFileValidationMessage(validation, file))
            return undefined
        }

        setParseState("loading")
        setParseError(null)

        const reader = new FileReader()
        reader.addEventListener("load", (event) => {
            const text = event.target?.result as string
            const result = parseNetworkFileContent(text)
            if ("error" in result) {
                setParseState("error")
                setParseError(`Parse error: ${result.error}`)
                return
            }
            setParsedData(result.data)
            setParseState("success")
            setNetworkName(filenameToNetworkName(file.name))
            setConflictResolution("keep-both")
        })
        reader.addEventListener("error", () => {
            setParseState("error")
            setParseError("Failed to read the file.")
        })
        // We use FileReader (rather than the blob's text() promise) so the read can be
        // aborted on cleanup and report failures via the "error" event above.
        // eslint-disable-next-line unicorn/prefer-blob-reading-methods
        reader.readAsText(file)

        return () => reader.abort()
    }, [file])

    // True if `candidate` collides with any existing network name (normalized for comparison).
    const nameConflictsWith = (candidate: string): boolean =>
        existingNetworkNames.some((existing) => normalizeForComparison(existing) === normalizeForComparison(candidate))

    // The name pulled from the filename — fixed for the selected file. Whether it collides with an
    // existing network is what drives the conflict-resolution UI (it stays visible while the user
    // types a replacement, so we can't key it off the editable name).
    const importedName = file ? filenameToNetworkName(file.name) : ""
    const importedNameHasConflict = nameConflictsWith(importedName)
    const trimmedName = networkName.trim()
    const newNameHasConflict = nameConflictsWith(trimmedName)

    // Advance to the review step and kick off reading/parsing the selected file.
    const processFile = (selectedFile: File) => {
        setActiveStep(1)
        setParsedData(null)
        setConflictResolution("keep-both")
        // Setting the file kicks off the read effect below, which owns reading/parsing and
        // cleans up its own FileReader.
        setFile(selectedFile)
    }

    const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragOver(false)
        const dropped = event.dataTransfer.files[0]
        if (dropped) processFile(dropped)
    }

    const handleBrowseClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event: ReactChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0]
        if (selected) processFile(selected)
        // Reset input so the same file can be re-selected if needed
        event.target.value = ""
    }

    const handleBack = () => setActiveStep((prev) => prev - 1)

    const handleContinue = () => {
        setConflictResolution("keep-both")
        // On a collision, "Keep both" defaults to the next free indexed name (e.g. "My Network (2)")
        // so the import is valid out of the box — the user can still edit it.
        if (importedNameHasConflict) {
            setNetworkName(nextAvailableNetworkName(importedName, existingNetworkNames))
        }
        setActiveStep(2)
    }

    const handleImport = () => {
        if (parseState !== "success") return
        // "Replace existing" overwrites the colliding network, so always send the original
        // imported name; "Keep both" sends whatever unique name the user typed.
        const nameToImport = importedNameHasConflict && conflictResolution === "replace" ? importedName : networkName
        // The API echoes back agent_network_name as-is, and the UI splits on underscores to
        // produce display names — so send underscores instead of spaces. Parentheses around an
        // auto-appended index ("My Network (2)") are dropped so the API name reads "My_Network_2".
        const apiName = nameToImport.trim().replaceAll(" ", "_").replaceAll(/[()]/gu, "")
        onImport?.(apiName, JSON.stringify(parsedData))
        onClose()
    }

    // Switching modes resets the editable name: "Keep both" pre-fills the next free indexed name
    // (e.g. "My Network (2)") so the user doesn't have to invent one, and "Replace existing" targets
    // the original colliding name.
    const handleConflictResolutionChange = (resolution: ConflictResolution) => {
        setConflictResolution(resolution)
        setNetworkName(
            resolution === "keep-both" ? nextAvailableNetworkName(importedName, existingNetworkNames) : importedName
        )
    }

    const {name: fileStem, ext: fileNameExt} = file ? splitFilename(file.name) : {name: "", ext: ""}
    const fileExt = fileNameExt.toUpperCase()

    // Summary shown on the review step. parsedData is the already-validated parsed value, so this never throws.
    const networkSummary =
        parseState === "success" ? summarizeNetworkDefinition(jsonToNetworkDefinition(parsedData)) : null

    // The confirm-step primary action adapts to how the conflict is being resolved.
    const isReplacing = importedNameHasConflict && conflictResolution === "replace"
    const importButtonLabel = isReplacing
        ? "Replace network"
        : importedNameHasConflict
          ? "Import as new"
          : "Import network"
    // Replacing overwrites the existing network, so the typed name is irrelevant; otherwise a name
    // is required and must not collide with an existing network.
    const importDisabled = !isReplacing && (!trimmedName || newNameHasConflict)

    // Footer actions, which vary by step (Cancel / Back+Continue / Back+Import).
    const renderFooter = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Button
                        id="import-network-modal-cancel-btn"
                        onClick={onClose}
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                )
            case 1:
                return (
                    <>
                        <Button
                            id="import-network-modal-back-btn"
                            onClick={handleBack}
                            variant="outlined"
                        >
                            Back
                        </Button>
                        {parseState === "success" && (
                            <Button
                                id="import-network-modal-continue-btn"
                                onClick={handleContinue}
                                sx={{"&:hover": {backgroundColor: "var(--bs-primary)"}}}
                                variant="contained"
                            >
                                Continue →
                            </Button>
                        )}
                    </>
                )
            case 2:
                return (
                    <>
                        <Button
                            id="import-network-modal-back-btn"
                            onClick={handleBack}
                            variant="outlined"
                        >
                            Back
                        </Button>
                        <Button
                            color={isReplacing ? "error" : "primary"}
                            disabled={importDisabled}
                            id="import-network-modal-import-btn"
                            onClick={handleImport}
                            variant="contained"
                        >
                            {importButtonLabel}
                        </Button>
                    </>
                )
            default:
                return null
        }
    }

    // The three-step progress header.
    const renderStepper = () => (
        <Stepper
            activeStep={activeStep}
            id="import-network-modal-stepper"
            sx={{marginTop: 1}}
        >
            {STEPS.map((label) => (
                <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                </Step>
            ))}
        </Stepper>
    )

    // Step 1: the drag-and-drop / browse file picker, plus the restriction callout beneath it.
    const renderSelectFileStep = () => (
        <>
            <DropZone
                isDragOver={isDragOver}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleBrowseClick()
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label="Drop zone for network definition file"
            >
                <Box
                    sx={{
                        alignItems: "center",
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                        borderRadius: 2,
                        color: "primary.main",
                        display: "flex",
                        height: 64,
                        justifyContent: "center",
                        marginBottom: 1,
                        width: 64,
                    }}
                >
                    <CloudUploadOutlinedIcon
                        id="import-network-modal-upload-icon"
                        sx={{fontSize: "2rem"}}
                    />
                </Box>
                <Typography
                    id="import-network-modal-drop-text"
                    variant="subtitle1"
                    sx={{color: "primary.main", fontWeight: "bold"}}
                >
                    Drag &amp; drop a network definition
                </Typography>
                <Typography variant="body2">
                    {"or "}
                    <Box
                        component="button"
                        id="import-network-modal-browse-link"
                        onClick={(event) => {
                            event.stopPropagation()
                            handleBrowseClick()
                        }}
                        sx={{
                            background: "none",
                            border: "none",
                            color: "var(--bs-secondary)",
                            cursor: "pointer",
                            font: "inherit",
                            padding: 0,
                            textDecoration: "underline",
                            "&:hover": {color: "var(--bs-primary)", textDecoration: "none"},
                        }}
                    >
                        browse your files
                    </Box>
                </Typography>
                <Box
                    id="import-network-modal-file-types"
                    sx={{
                        alignItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 999,
                        color: "text.secondary",
                        display: "inline-flex",
                        gap: 0.75,
                        marginTop: 1,
                        padding: "4px 12px",
                    }}
                >
                    <InsertDriveFileOutlinedIcon sx={{fontSize: "1rem"}} />
                    <Typography variant="caption">Accepts .json up to 5 MB</Typography>
                </Box>
                <VisuallyHiddenInput
                    accept={ACCEPTED_MIME_TYPES}
                    aria-hidden="true"
                    data-testid="import-network-file-input"
                    onChange={handleFileChange}
                    onClick={(event) => event.stopPropagation()}
                    ref={fileInputRef}
                    tabIndex={-1}
                    type="file"
                />
            </DropZone>
            <Box
                id="import-network-modal-file-restriction"
                sx={{
                    alignItems: "flex-start",
                    backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.04),
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    display: "flex",
                    gap: 1.5,
                    marginTop: 2,
                    padding: "14px 16px",
                }}
            >
                <InfoOutlinedIcon sx={{color: "text.secondary", fontSize: "1.25rem", flexShrink: 0, marginTop: 0.25}} />
                <Typography
                    variant="caption"
                    sx={{color: "text.secondary"}}
                >
                    Must be a JSON file previously exported from an <strong>Agent Network Designer</strong>–created
                    network. General Neuro SAN HOCON files are not currently supported.
                </Typography>
            </Box>
        </>
    )

    // Step 2: parsing/validation outcome — loading spinner, success summary, or error banner.
    const renderReviewParsing = () => (
        <>
            <CircularProgress
                id="import-network-modal-spinner"
                size={48}
            />
            <Typography
                id="import-network-modal-parsing-text"
                variant="subtitle1"
                sx={{fontWeight: "bold"}}
            >
                {`Parsing & validating ${fileExt}…`}
            </Typography>
            <Typography
                id="import-network-modal-parsing-filename"
                variant="body2"
                sx={{color: "text.secondary", fontFamily: "monospace"}}
            >
                {file?.name}
            </Typography>
        </>
    )

    const renderReviewSuccessBanner = () => (
        <Box
            id="import-network-modal-success-banner"
            sx={{
                alignItems: "center",
                backgroundColor: (theme) => alpha(theme.palette.success.main, 0.12),
                border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                borderRadius: 2,
                color: "var(--bs-green)",
                display: "flex",
                gap: 1.5,
                padding: "14px 16px",
            }}
        >
            <CheckCircleOutlineIcon />
            <Typography variant="body2">
                {`Valid ${fileExt} — `}
                <Box
                    component="span"
                    sx={{fontWeight: "bold"}}
                >
                    parsed successfully
                </Box>
            </Typography>
        </Box>
    )

    const renderReviewFileInfo = () => (
        <Box
            sx={{
                alignItems: "center",
                backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.04),
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                display: "flex",
                gap: 1.5,
                marginTop: 3,
                padding: "12px 16px",
            }}
        >
            <Box
                sx={{
                    alignItems: "center",
                    backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.06),
                    borderRadius: 1.5,
                    color: "text.secondary",
                    display: "flex",
                    flexShrink: 0,
                    height: 44,
                    justifyContent: "center",
                    width: 44,
                }}
            >
                <InsertDriveFileOutlinedIcon
                    id="import-network-modal-file-icon"
                    sx={{fontSize: "1.5rem"}}
                />
            </Box>
            {/* Keep the filename on one line: truncate the stem with an ellipsis
                but pin the extension so ".json" stays visible. The full name is
                available on hover via the tooltip. */}
            <Tooltip title={file?.name ?? ""}>
                <Box
                    id="import-network-modal-review-filename"
                    sx={{
                        display: "flex",
                        flex: 1,
                        fontFamily: "monospace",
                        fontSize: 15,
                        minWidth: 0,
                    }}
                >
                    <Box
                        component="span"
                        sx={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
                    >
                        {fileStem}
                    </Box>
                    {fileNameExt && (
                        <Box
                            component="span"
                            sx={{flexShrink: 0}}
                        >
                            {`.${fileNameExt}`}
                        </Box>
                    )}
                </Box>
            </Tooltip>
            <Typography
                id="import-network-modal-review-filesize"
                variant="body2"
                sx={{
                    color: "text.secondary",
                    flexShrink: 0,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                }}
            >
                {formatFileSize(file?.size ?? 0)}
            </Typography>
        </Box>
    )

    const renderReviewSummary = () => {
        if (!networkSummary) return null
        return (
            <Box
                id="import-network-modal-summary"
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    marginTop: 3,
                    overflow: "hidden",
                }}
            >
                {(
                    [
                        {label: "Agents", value: networkSummary.agents},
                        {label: "Coded tools", value: networkSummary.codedTools},
                        {label: "External agents", value: networkSummary.externalAgents},
                        {
                            label: "Frontman",
                            value: toDisplayName(networkSummary.frontman, useNativeNames),
                            isFrontman: true,
                        },
                    ] as const
                ).map((stat, index) => (
                    <Box
                        key={stat.label}
                        sx={{
                            borderColor: "divider",
                            borderLeft: index % 2 === 1 ? "1px solid" : undefined,
                            borderTop: index >= 2 ? "1px solid" : undefined,
                            padding: "14px 16px",
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.secondary",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }}
                        >
                            {stat.label}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: "isFrontman" in stat ? "monospace" : undefined,
                                fontSize: "isFrontman" in stat ? 15 : 18,
                                lineHeight: 1.4,
                                marginTop: 0.5,
                                wordBreak: "break-word",
                            }}
                        >
                            {stat.value}
                        </Typography>
                    </Box>
                ))}
            </Box>
        )
    }

    const renderReviewSuccess = () => (
        <Box sx={{width: "100%"}}>
            {renderReviewSuccessBanner()}
            {renderReviewFileInfo()}
            {renderReviewSummary()}
        </Box>
    )

    const renderReviewError = () => (
        <Box
            id="import-network-modal-error-banner"
            sx={{
                alignItems: "center",
                backgroundColor: "error.dark",
                borderRadius: 1,
                color: "error.contrastText",
                display: "flex",
                gap: 1,
                padding: "10px 14px",
                width: "100%",
            }}
        >
            <ErrorOutlineIcon fontSize="small" />
            <Typography variant="body2">{parseError}</Typography>
        </Box>
    )

    const renderReviewStep = () => (
        <Box
            id="import-network-modal-review"
            sx={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                marginTop: 4,
                minHeight: "220px",
            }}
        >
            {parseState === "loading" && renderReviewParsing()}
            {parseState === "success" && renderReviewSuccess()}
            {parseState === "error" && renderReviewError()}
        </Box>
    )

    // Step 3: name the network and resolve any collision with an existing one.
    const renderConflictKeepBothField = () => (
        <Box>
            <Typography
                id="import-network-modal-name-label"
                variant="caption"
                sx={{
                    color: "text.secondary",
                    fontWeight: "bold",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                }}
            >
                New network name
            </Typography>
            <TextField
                id="import-network-modal-name-input"
                fullWidth
                onChange={(event) => setNetworkName(event.target.value)}
                size="small"
                sx={{marginTop: 0.5}}
                value={networkName}
            />
            {newNameHasConflict ? (
                <Box
                    id="import-network-modal-name-taken"
                    sx={{alignItems: "center", display: "flex", gap: 0.5, marginTop: 0.75}}
                >
                    <WarningAmberIcon
                        fontSize="small"
                        sx={{color: "warning.main", flexShrink: 0}}
                    />
                    <Typography
                        variant="body2"
                        sx={{color: "warning.main", fontWeight: "bold"}}
                    >
                        That name is taken. Choose a new name to keep both networks.
                    </Typography>
                </Box>
            ) : (
                trimmedName !== "" && (
                    <Box
                        id="import-network-modal-name-available"
                        sx={{alignItems: "center", display: "flex", gap: 0.5, marginTop: 0.75}}
                    >
                        <CheckCircleOutlineIcon
                            fontSize="small"
                            sx={{color: "success.main", flexShrink: 0}}
                        />
                        <Typography
                            variant="body2"
                            sx={{color: "success.main", fontWeight: "bold"}}
                        >
                            Name is available.
                        </Typography>
                    </Box>
                )
            )}
        </Box>
    )

    const renderConflictReplaceWarning = () => (
        <Box
            id="import-network-modal-replace-warning"
            sx={{
                alignItems: "center",
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.12),
                borderRadius: 1,
                borderStyle: "solid",
                borderWidth: "1px",
                borderColor: "error.main",
                display: "flex",
                gap: 1,
                padding: "10px 14px",
            }}
        >
            <WarningAmberIcon
                fontSize="small"
                sx={{color: "error.main", flexShrink: 0}}
            />
            <Typography variant="body2">
                <strong>&quot;{importedName}&quot;</strong> will be <strong>permanently overwritten</strong>. This
                can&apos;t be undone.
            </Typography>
        </Box>
    )

    const renderConflictResolution = () => (
        <>
            {/* Name conflict prompt */}
            <Box id="import-network-modal-conflict-prompt">
                <Typography
                    variant="caption"
                    sx={{
                        color: "text.secondary",
                        fontWeight: "bold",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                    }}
                >
                    Name conflict
                </Typography>
                <Typography
                    variant="body2"
                    sx={{marginTop: 0.5}}
                >
                    A network named <strong>&quot;{importedName}&quot;</strong> already exists. How would you like to
                    handle it?
                </Typography>
            </Box>
            {/* Resolution toggle */}
            <ToggleButtonGroup
                id="import-network-modal-conflict-toggle"
                exclusive={true}
                fullWidth
                onChange={(_, value: ConflictResolution | null) => {
                    if (value !== null) handleConflictResolutionChange(value)
                }}
                value={conflictResolution}
                sx={{
                    "& .MuiToggleButton-root": {
                        textTransform: "none",
                    },
                    "& #import-network-modal-keep-both-btn.Mui-selected": {
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": {backgroundColor: "primary.dark"},
                    },
                    "& #import-network-modal-replace-existing-btn.Mui-selected": {
                        backgroundColor: "error.main",
                        color: "error.contrastText",
                        "&:hover": {backgroundColor: "error.dark"},
                    },
                }}
            >
                <ToggleButton
                    id="import-network-modal-keep-both-btn"
                    value="keep-both"
                >
                    Keep both
                </ToggleButton>
                <ToggleButton
                    id="import-network-modal-replace-existing-btn"
                    value="replace"
                >
                    Replace existing
                </ToggleButton>
            </ToggleButtonGroup>
            {conflictResolution === "keep-both" ? renderConflictKeepBothField() : renderConflictReplaceWarning()}
        </>
    )

    const renderNameField = () => (
        <Box>
            <Typography
                id="import-network-modal-name-label"
                variant="caption"
                sx={{
                    color: "text.secondary",
                    fontWeight: "bold",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                }}
            >
                Network name
            </Typography>
            <TextField
                id="import-network-modal-name-input"
                error={newNameHasConflict}
                fullWidth
                helperText={
                    newNameHasConflict
                        ? "That name is taken. Pick another to continue."
                        : "Pulled from the filename — edit if you like."
                }
                onChange={(event) => setNetworkName(event.target.value)}
                size="small"
                sx={{marginTop: 0.5}}
                value={networkName}
            />
        </Box>
    )

    const renderConfirmStep = () => (
        <Box
            id="import-network-modal-confirm"
            sx={{display: "flex", flexDirection: "column", gap: 2, marginTop: 3}}
        >
            {importedNameHasConflict ? renderConflictResolution() : renderNameField()}
        </Box>
    )

    return (
        <MUIDialog
            id="import-network-modal"
            isOpen={isOpen}
            onClose={onClose}
            title="Import network definition"
            paperProps={{minWidth: "560px"}}
            footer={renderFooter()}
        >
            {renderStepper()}
            {/* Step 1: Select file */}
            {activeStep === 0 && renderSelectFileStep()}
            {/* Step 2: Review */}
            {activeStep === 1 && renderReviewStep()}
            {/* Step 3: Confirm */}
            {activeStep === 2 && renderConfirmStep()}
        </MUIDialog>
    )
}
