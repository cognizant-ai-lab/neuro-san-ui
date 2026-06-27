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

import {splitFilename} from "../../../utils/File"
import {MUIDialog} from "../../Common/MUIDialog"
import {getFrontman} from "../AgentFlow/GraphStructure"
import {AgentNetworkDefinitionEntry, DisplayAs} from "../const"

//#region: Constants

export const IMPORT_MODAL_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const IMPORT_MODAL_ACCEPTED_EXTENSIONS = [".json"]
const ACCEPTED_MIME_TYPES = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(", ")
const STEPS = ["Select file", "Review", "Confirm"]

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

//#endregion: Types

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
    const countOf = (displayAs: DisplayAs): number =>
        networkDef.filter((entry) => entry.display_as === displayAs).length
    return {
        agents: countOf(DisplayAs.LLM_AGENT),
        codedTools: countOf(DisplayAs.CODED_TOOL),
        externalAgents: countOf(DisplayAs.EXTERNAL_AGENT),
        frontman: getFrontman(networkDef)?.origin ?? networkDef[0]?.origin ?? "—",
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

/** Trailing UUID on a filename stem. Separator is `[_-]` because filename sanitization
 * (`toSafeFilename`, neuro-san exports) flattens the UUID's hyphens to underscores.
 */
const FILENAME_TRAILING_UUID_PATTERN =
    /[_-][0-9a-fA-F]{8}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{4}[_-][0-9a-fA-F]{12}$/u

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

//#endregion: Styled Components

const EMPTY_NETWORK_NAMES: readonly string[] = []

export const ImportNetworkModal: FC<ImportNetworkModalProps> = ({
    existingNetworkNames = EMPTY_NETWORK_NAMES,
    isOpen,
    onClose,
    onImport,
}) => {
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

    //#region: Conflict detection

    const nameConflictsWith = (candidate: string): boolean =>
        existingNetworkNames.some((existing) => normalizeForComparison(existing) === normalizeForComparison(candidate))

    // The name pulled from the filename — fixed for the selected file. Whether it collides with an
    // existing network is what drives the conflict-resolution UI (it stays visible while the user
    // types a replacement, so we can't key it off the editable name).
    const importedName = file ? filenameToNetworkName(file.name) : ""
    const importedNameHasConflict = nameConflictsWith(importedName)
    const trimmedName = networkName.trim()
    const newNameHasConflict = nameConflictsWith(trimmedName)

    //#endregion: Conflict detection

    //#region: File processing

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

    //#endregion: File processing

    //#region: Navigation

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

    //#endregion: Navigation

    //#region: Conflict resolution

    // Switching modes resets the editable name: "Keep both" pre-fills the next free indexed name
    // (e.g. "My Network (2)") so the user doesn't have to invent one, and "Replace existing" targets
    // the original colliding name.
    const handleConflictResolutionChange = (resolution: ConflictResolution) => {
        setConflictResolution(resolution)
        setNetworkName(
            resolution === "keep-both" ? nextAvailableNetworkName(importedName, existingNetworkNames) : importedName
        )
    }

    //#endregion: Conflict resolution

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

    const footer = renderFooter()

    return (
        <MUIDialog
            id="import-network-modal"
            isOpen={isOpen}
            onClose={onClose}
            title="Import network definition"
            paperProps={{minWidth: "560px"}}
            footer={footer}
        >
            <Stepper
                activeStep={activeStep}
                id="import-network-modal-stepper"
                sx={(theme) => ({
                    marginTop: 1,
                    // MUI v9 rejects the CSS named color "gray" it uses by default for
                    // inactive steps/connectors — override with valid token values.
                    "& .MuiStepIcon-root:not(.Mui-active):not(.Mui-completed)": {
                        color: "var(--bs-gray-medium)",
                    },
                    "& .MuiStepConnector-line": {
                        borderColor: "var(--bs-gray-light)",
                    },
                    "& .MuiStepLabel-label:not(.Mui-active):not(.Mui-completed)": {
                        color: "var(--bs-gray-medium)",
                    },
                    // In dark mode the completed-step icon defaults to a muted/gray fill;
                    // make it white so completed steps read clearly against the dark backdrop.
                    ...(theme.palette.mode === "dark" && {
                        "& .MuiStepIcon-root.Mui-completed": {
                            color: theme.palette.common.white,
                        },
                    }),
                })}
            >
                {STEPS.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Step 1: Select file */}
            {activeStep === 0 && (
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
                    <CloudUploadOutlinedIcon
                        id="import-network-modal-upload-icon"
                        sx={{color: "var(--bs-gray-medium)", fontSize: "4rem"}}
                    />
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
                    <Typography
                        id="import-network-modal-file-types"
                        variant="caption"
                        sx={{color: "text.secondary"}}
                    >
                        Accepts .json up to 5 MB.
                    </Typography>
                    <input
                        accept={ACCEPTED_MIME_TYPES}
                        aria-hidden="true"
                        data-testid="import-network-file-input"
                        onChange={handleFileChange}
                        onClick={(event) => event.stopPropagation()}
                        ref={fileInputRef}
                        style={{display: "none"}}
                        tabIndex={-1}
                        type="file"
                    />
                </DropZone>
            )}

            {/* Step 2: Review */}
            {activeStep === 1 && (
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
                    {parseState === "loading" && (
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
                    )}
                    {parseState === "success" && (
                        <Box sx={{width: "100%"}}>
                            {/* Success banner */}
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
                            {/* File info row */}
                            <Box
                                sx={{
                                    alignItems: "flex-start",
                                    display: "flex",
                                    gap: 1.5,
                                    marginTop: 3,
                                }}
                            >
                                <InsertDriveFileOutlinedIcon
                                    id="import-network-modal-file-icon"
                                    sx={{color: "text.secondary", fontSize: "2rem"}}
                                />
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
                            {/* Network summary */}
                            {networkSummary && (
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
                                            {label: "Front man", value: networkSummary.frontman, isFrontman: true},
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
                            )}
                        </Box>
                    )}
                    {parseState === "error" && (
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
                    )}
                </Box>
            )}

            {/* Step 3: Confirm */}
            {activeStep === 2 && (
                <Box
                    id="import-network-modal-confirm"
                    sx={{display: "flex", flexDirection: "column", gap: 2, marginTop: 3}}
                >
                    {importedNameHasConflict ? (
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
                                    A network named <strong>&quot;{importedName}&quot;</strong> already exists. How
                                    would you like to handle it?
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
                            {conflictResolution === "keep-both" ? (
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
                            ) : (
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
                                        <strong>&quot;{importedName}&quot;</strong> will be{" "}
                                        <strong>permanently overwritten</strong>. This can&apos;t be undone.
                                    </Typography>
                                </Box>
                            )}
                        </>
                    ) : (
                        /* Network name field (no conflict) */
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
                    )}
                </Box>
            )}
        </MUIDialog>
    )
}
