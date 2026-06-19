/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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
import HourglassTopIcon from "@mui/icons-material/HourglassTop"
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
import Typography from "@mui/material/Typography"
import startCase from "lodash-es/startCase.js"
import {FC, ChangeEvent as ReactChangeEvent, DragEvent as ReactDragEvent, useEffect, useRef, useState} from "react"

import {splitFilename} from "../../../utils/File"
import {removeTrailingUuid} from "../../AgentChat/Common/Utils"
import {MUIDialog} from "../../Common/MUIDialog"
import {AgentNetworkDefinitionEntry} from "../const"

// #region: Constants

export const IMPORT_MODAL_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const IMPORT_MODAL_ACCEPTED_EXTENSIONS = [".json"]
const ACCEPTED_MIME_TYPES = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(", ")
const STEPS = ["Select file", "Review", "Confirm"]
const TEMPORARY_FOLDER_DISPLAY = "Temporary"

// #endregion: Constants

// #region: Helpers

/**
 * Parse and validate a network definition file. Imports are JSON only.
 *
 * Returns the normalised JSON string on success, or an error message on failure.
 */
export const parseNetworkFileContent = (
    text: string
): {success: true; json: string} | {success: false; error: string} => {
    if (text.trim() === "") {
        return {success: false, error: "The file is empty."}
    }
    try {
        const parsed = JSON.parse(text) as unknown
        return {success: true, json: JSON.stringify(parsed, null, 2)}
    } catch (err) {
        return {success: false, error: err instanceof Error ? err.message : String(err)}
    }
}

/**
 * Converts an imported network JSON file into an array of AgentNetworkDefinitionEntry objects
 * suitable for sendNetworkDesignerUpsert.
 *
 * Imports are the top-level array shape exported for a Temporary network — each entry already
 * carries `origin`, `tools`, `display_as`, etc. Entries without a string `origin` are dropped;
 * anything that isn't an array yields an empty result.
 */
export const jsonToNetworkDefinition = (jsonString: string): AgentNetworkDefinitionEntry[] => {
    const parsed = JSON.parse(jsonString) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
        (entry): entry is AgentNetworkDefinitionEntry =>
            typeof (entry as Record<string, unknown> | null)?.["origin"] === "string"
    )
}

/** Format byte count to a human-readable string (e.g. "4.2 KB"). */
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
 * Returns a human-readable error message on rejection, or null if the file is acceptable.
 */
export const validateImportFile = (file: File): string | null => {
    const {ext} = splitFilename(file.name)
    const normalizedExt = `.${ext.toLowerCase()}`
    if (!IMPORT_MODAL_ACCEPTED_EXTENSIONS.includes(normalizedExt)) {
        const accepted = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(" and ")
        return `Unsupported file type${ext ? ` ".${ext}"` : ""}. Accepts ${accepted}.`
    }
    if (file.size > IMPORT_MODAL_MAX_FILE_SIZE_BYTES) {
        const max = formatFileSize(IMPORT_MODAL_MAX_FILE_SIZE_BYTES)
        return `File is too large (${formatFileSize(file.size)}). Maximum size is ${max}.`
    }
    return null
}

/** Convert a filename stem to a display-friendly network name.
 *
 * Strips a trailing UUID in the form `_xxxxxxxx_xxxx_xxxx_xxxx_xxxxxxxxxxxx`
 * that neuro-san appends to exported filenames (e.g.
 * `my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3.json` → `my network`).
 */
export const filenameToNetworkName = (filename: string): string => {
    const {name: stem} = splitFilename(filename)
    return startCase(removeTrailingUuid(stem))
}

/** Normalize a name for conflict comparison (underscores → spaces, lowercase, trimmed). */
const normalizeForComparison = (rawName: string): string => {
    const spaced = rawName.replaceAll(/[_-]+/gu, " ").toLowerCase()
    return spaced.trim()
}

/** Find the next non-conflicting name by appending " (2)", " (3)", etc. */
export const findNonConflictingName = (base: string, existingNames: readonly string[]): string => {
    const existing = existingNames.map((n) => normalizeForComparison(n))
    if (!existing.includes(normalizeForComparison(base))) return base
    let counter = 2
    while (existing.includes(normalizeForComparison(`${base} (${counter})`))) {
        counter += 1
    }
    return `${base} (${counter})`
}

// #endregion: Helpers

// #region: Styled Components

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

// #endregion: Styled Components

// #region: Types

type ParseState = "loading" | "success" | "error"

export interface ImportNetworkModalProps {
    readonly existingNetworkNames?: readonly string[]
    readonly isOpen: boolean
    readonly onClose: () => void
    readonly onImport?: (name: string, content: string) => void
}

// #endregion: Types

const EMPTY_NETWORK_NAMES: readonly string[] = []

export const ImportNetworkModal: FC<ImportNetworkModalProps> = ({
    existingNetworkNames = EMPTY_NETWORK_NAMES,
    isOpen,
    onClose,
    onImport,
}) => {
    const [activeStep, setActiveStep] = useState(0)
    const [isDragOver, setIsDragOver] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [parseState, setParseState] = useState<ParseState | null>(null)
    const [parseError, setParseError] = useState<string | null>(null)
    const [parsedJson, setParsedJson] = useState<string | null>(null)
    const [networkName, setNetworkName] = useState("")
    // Track which (normalised) name the user consciously chose to replace
    const [conflictAcknowledgedFor, setConflictAcknowledgedFor] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reset all state whenever the modal is opened
    useEffect(() => {
        if (isOpen) {
            setActiveStep(0)
            setIsDragOver(false)
            setFile(null)
            setParseState(null)
            setParseError(null)
            setParsedJson(null)
            setNetworkName("")
            setConflictAcknowledgedFor(null)
        }
    }, [isOpen])

    // #region: Conflict detection

    const normalizedName = normalizeForComparison(networkName)
    const nameHasConflict = existingNetworkNames.some((existing) => normalizeForComparison(existing) === normalizedName)
    const showConflict = nameHasConflict && conflictAcknowledgedFor !== normalizedName

    // #endregion: Conflict detection

    // #region: File processing

    const processFile = (selectedFile: File) => {
        setFile(selectedFile)
        setActiveStep(1)
        setParsedJson(null)

        // Validate extension + size before reading. The <input accept> filter only
        // hints the picker and is bypassed by drag/drop, so unsupported or oversized
        // files would otherwise be fed straight into the parser.
        const validationError = validateImportFile(selectedFile)
        if (validationError) {
            setParseState("error")
            setParseError(validationError)
            return
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
            setParsedJson(result.json)
            setParseState("success")
            setNetworkName(filenameToNetworkName(selectedFile.name))
            setConflictAcknowledgedFor(null)
        })
        reader.addEventListener("error", () => {
            setParseState("error")
            setParseError("Failed to read the file.")
        })
        // eslint-disable-next-line unicorn/prefer-blob-reading-methods
        reader.readAsText(selectedFile)
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

    // #endregion: File processing

    // #region: Navigation

    const handleBack = () => setActiveStep((prev) => prev - 1)

    const handleContinue = () => {
        setConflictAcknowledgedFor(null)
        setActiveStep(2)
    }

    const handleImport = () => {
        if (!parsedJson) return
        // The API echoes back agent_network_name as-is, and the UI splits on underscores to
        // produce display names — so send underscores instead of spaces.
        const apiName = networkName.trim().replaceAll(" ", "_")
        onImport?.(apiName, parsedJson)
        onClose()
    }

    // #endregion: Navigation

    // #region: Conflict resolution

    const handleReplace = () => {
        setConflictAcknowledgedFor(normalizedName)
    }

    const handleRename = () => {
        const renamed = findNonConflictingName(networkName.trim(), existingNetworkNames)
        setNetworkName(renamed)
        setConflictAcknowledgedFor(null)
    }

    // #endregion: Conflict resolution

    const fileExt = file ? splitFilename(file.name).ext.toUpperCase() : ""

    const footer = (
        <>
            {activeStep === 0 && (
                <Button
                    id="import-network-modal-cancel-btn"
                    onClick={onClose}
                    variant="outlined"
                >
                    Cancel
                </Button>
            )}
            {activeStep === 1 && (
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
            )}
            {activeStep === 2 && (
                <>
                    <Button
                        id="import-network-modal-back-btn"
                        onClick={handleBack}
                        variant="outlined"
                    >
                        Back
                    </Button>
                    <Button
                        disabled={!networkName.trim()}
                        id="import-network-modal-import-btn"
                        onClick={handleImport}
                        sx={{"&:hover": {backgroundColor: "var(--bs-primary)"}}}
                        variant="contained"
                    >
                        Import network
                    </Button>
                </>
            )}
        </>
    )

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
                    role="button"
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
                                <Typography
                                    id="import-network-modal-review-filename"
                                    variant="body1"
                                    sx={{
                                        flex: 1,
                                        fontFamily: "monospace",
                                        fontSize: 16,
                                        minWidth: 0,
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {file?.name}
                                </Typography>
                                <Typography
                                    id="import-network-modal-review-filesize"
                                    variant="body2"
                                    sx={{
                                        color: "text.secondary",
                                        flexShrink: 0,
                                        fontSize: 14,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {formatFileSize(file?.size ?? 0)}
                                </Typography>
                            </Box>
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
                    {/* Network name field */}
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
                            fullWidth
                            helperText="Pulled from the filename — edit if you like."
                            onChange={(event) => {
                                setNetworkName(event.target.value)
                                setConflictAcknowledgedFor(null)
                            }}
                            size="small"
                            sx={{marginTop: 0.5}}
                            value={networkName}
                        />
                    </Box>
                    {/* Conflict warning */}
                    {showConflict && (
                        <Box
                            id="import-network-modal-conflict-warning"
                            sx={{
                                alignItems: "flex-start",
                                borderRadius: 1,
                                borderStyle: "solid",
                                borderWidth: "1px",
                                borderColor: "warning.main",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                padding: "10px 14px",
                            }}
                        >
                            <Box sx={{alignItems: "center", display: "flex", gap: 1}}>
                                <WarningAmberIcon
                                    fontSize="small"
                                    sx={{color: "warning.main", flexShrink: 0}}
                                />
                                <Typography variant="body2">
                                    {`A network named "${networkName.trim()}" already exists in `}
                                    <strong>{TEMPORARY_FOLDER_DISPLAY}</strong>.
                                </Typography>
                            </Box>
                            <Box sx={{display: "flex", gap: 1, marginTop: 0.5}}>
                                <Button
                                    id="import-network-modal-replace-btn"
                                    onClick={handleReplace}
                                    size="small"
                                    variant="outlined"
                                >
                                    Replace
                                </Button>
                                <Button
                                    id="import-network-modal-rename-btn"
                                    onClick={handleRename}
                                    size="small"
                                    sx={{"&:hover": {backgroundColor: "var(--bs-primary)"}}}
                                    variant="contained"
                                >
                                    Rename
                                </Button>
                            </Box>
                        </Box>
                    )}
                    {/* Added to Temporary info */}
                    <Box
                        id="import-network-modal-temporary-info"
                        sx={{
                            alignItems: "flex-start",
                            borderRadius: 1,
                            borderStyle: "solid",
                            borderWidth: "1px",
                            borderColor: "divider",
                            display: "flex",
                            gap: 1.5,
                            padding: "10px 14px",
                        }}
                    >
                        <HourglassTopIcon
                            fontSize="small"
                            sx={{color: "text.secondary", flexShrink: 0, marginTop: "2px"}}
                        />
                        <Box>
                            <Typography
                                variant="body2"
                                sx={{fontWeight: "bold"}}
                            >
                                Added to {TEMPORARY_FOLDER_DISPLAY}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{color: "text.secondary"}}
                            >
                                Imported networks always land in the {TEMPORARY_FOLDER_DISPLAY} category.
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
        </MUIDialog>
    )
}
