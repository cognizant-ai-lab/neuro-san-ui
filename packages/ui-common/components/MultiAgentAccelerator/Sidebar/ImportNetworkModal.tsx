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
import CloseIcon from "@mui/icons-material/Close"
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined"
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Link from "@mui/material/Link"
import Step from "@mui/material/Step"
import StepLabel from "@mui/material/StepLabel"
import Stepper from "@mui/material/Stepper"
import {styled} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import {jsonrepair} from "jsonrepair"
import {FC, ChangeEvent as ReactChangeEvent, DragEvent as ReactDragEvent, useEffect, useRef, useState} from "react"

import {splitFilename} from "../../../utils/File"

// #region: Constants

export const IMPORT_MODAL_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const IMPORT_MODAL_ACCEPTED_EXTENSIONS = [".hocon", ".conf", ".json"]
const ACCEPTED_MIME_TYPES = IMPORT_MODAL_ACCEPTED_EXTENSIONS.join(",")
const STEPS = ["Select file", "Review", "Confirm"]
const TEMPORARY_FOLDER_DISPLAY = "Temporary"

// #endregion: Constants

// #region: Helpers

/**
 * Pre-processes HOCON content into a form jsonrepair can handle.
 *
 * Handles:
 * - `include "file"` statements (stripped; external files aren't available in the browser)
 * - `"""triple-quoted"""` strings (converted to standard JSON strings)
 * - `${substitution}` variables (resolved from same-file triple-quoted definitions;
 *   variables from included files are expanded to empty string)
 * - HOCON string concatenation (`"part1" "part2"` on the same line → `"part1part2"`)
 */
const preprocessHoconContent = (text: string): string => {
    let s = text

    // Step 1: Strip # comment lines (jsonrepair does not handle # as a comment
    // delimiter; it tries to parse e.g. `# note here:` as a key–value pair and
    // fails on the colon).
    s = s.replaceAll(/^\s*#[^\n]*$/gmu, "")

    // Step 2: Strip include statements (external files are not available in the browser).
    // The trailing comma is optional — HOCON files that embed include inside an object
    // often end the line with a comma (e.g. `include "llm_config.hocon",`).
    s = s.replaceAll(/^\s*include\s+(?:required\s*)?"[^"]*"\s*,?\s*$/gmu, "")

    // Step 3: Collect same-file variable definitions from triple-quoted strings.
    // We read the raw content before converting so substitutions inside these
    // strings get the original (unescaped) value.
    const subs = new Map<string, string>()
    const tripleVarPat = /"?(?<varName>\w+)"?\s*[:=]\s*"{3}(?<content>[\S\s]*?)"{3}/gu
    let m: RegExpExecArray | null
    while ((m = tripleVarPat.exec(s)) !== null) {
        subs.set(m[1], m[2])
    }

    // Step 4: Convert triple-quoted strings to standard JSON strings,
    // expanding any ${var} found inside them first.
    s = s.replaceAll(/"{3}(?<content>[\S\s]*?)"{3}/gu, (_match, content: string) => {
        const expanded = content.replaceAll(
            /\$\{(?<varName>[\w.]+)\}/gu,
            (_m2, varName: string) => subs.get(varName.trim()) ?? ""
        )
        return JSON.stringify(expanded)
    })

    // Step 5: Substitute remaining standalone ${var} references (outside any string).
    // Use JSON.stringify so the raw content is properly escaped.
    s = s.replaceAll(/\$\{(?<varName>[\w.]+)\}/gu, (_match, varName: string) => {
        const val = subs.get(varName.trim())
        return val !== undefined ? JSON.stringify(val) : '""'
    })

    // Step 6: Merge adjacent JSON strings that arise from HOCON string concatenation
    // (e.g. ${instructions_prefix} """more""").  Only merge when no actual newline
    // character separates the two strings (i.e. they were on the same source line).
    let prev: string
    do {
        prev = s
        s = s.replaceAll(/"(?<p1>(?:[^"\\]|\\.)*)"+\s*"(?<p2>(?:[^"\\]|\\.)*)"/gu, (full, p1: string, p2: string) => {
            const gap = full.slice(2 + p1.length, full.length - 2 - p2.length)
            return gap.includes("\n") ? full : `"${p1}${p2}"`
        })
    } while (s !== prev)

    return s
}

/**
 * Parse and validate a network definition file (HOCON, CONF, or JSON).
 * Returns the normalised JSON string on success, or an error message on failure.
 */
export const parseNetworkFileContent = (
    text: string
): {success: true; json: string} | {success: false; error: string} => {
    try {
        // Pre-process HOCON constructs (includes, triple-quoted strings, substitutions)
        // then let jsonrepair handle residual issues (comments, trailing commas, etc.).
        const preprocessed = preprocessHoconContent(text)
        const repaired = jsonrepair(preprocessed)
        const parsed = JSON.parse(repaired) as unknown
        return {success: true, json: JSON.stringify(parsed, null, 2)}
    } catch (err) {
        return {success: false, error: err instanceof Error ? err.message : String(err)}
    }
}

/** Format byte count to a human-readable string (e.g. "4.2 KB"). */
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Convert a filename stem to a display-friendly network name. */
export const filenameToNetworkName = (filename: string): string => {
    const {name: stem} = splitFilename(filename)
    const spaced = stem.replaceAll(/[_-]+/gu, " ").toLowerCase()
    return spaced.trim()
}

/** Normalise a name for conflict comparison (underscores → spaces, lowercase, trimmed). */
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
        setParseState("loading")
        setParseError(null)
        setParsedJson(null)

        const reader = new FileReader()
        reader.addEventListener("load", (event) => {
            const text = event.target?.result as string
            const result = parseNetworkFileContent(text)
            if ("error" in result) {
                setParseState("error")
                setParseError(result.error)
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
        onImport?.(networkName.trim(), parsedJson)
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

    return (
        <Dialog
            id="import-network-modal"
            data-testid="import-network-modal"
            open={isOpen}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {minWidth: "560px"},
                },
            }}
        >
            <DialogTitle
                id="import-network-modal-title"
                sx={{
                    alignItems: "center",
                    display: "flex",
                    gap: 1.5,
                    paddingBottom: 1,
                }}
            >
                <Box
                    aria-hidden="true"
                    sx={{
                        alignItems: "center",
                        backgroundColor: "primary.main",
                        borderRadius: 1,
                        color: "primary.contrastText",
                        display: "flex",
                        padding: "6px",
                    }}
                >
                    <FileUploadOutlinedIcon fontSize="small" />
                </Box>
                Import network definition
                <IconButton
                    aria-label="close"
                    id="import-network-modal-close-btn"
                    onClick={onClose}
                    size="small"
                    sx={{marginLeft: "auto"}}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
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
                            sx={{color: "text.secondary", fontSize: "3rem"}}
                        />
                        <Typography
                            id="import-network-modal-drop-text"
                            variant="subtitle1"
                            sx={{fontWeight: "bold"}}
                        >
                            Drag &amp; drop a network definition
                        </Typography>
                        <Typography variant="body2">
                            {"or "}
                            <Link
                                component="button"
                                id="import-network-modal-browse-link"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    handleBrowseClick()
                                }}
                                underline="hover"
                                variant="body2"
                            >
                                browse your files
                            </Link>
                        </Typography>
                        <Typography
                            id="import-network-modal-file-types"
                            variant="caption"
                            sx={{color: "text.secondary"}}
                        >
                            Accepts .hocon &middot; .conf &middot; .json &middot; up to 5 MB
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
                                        backgroundColor: "success.dark",
                                        borderRadius: 1,
                                        color: "success.contrastText",
                                        display: "flex",
                                        gap: 1,
                                        padding: "10px 14px",
                                    }}
                                >
                                    <CheckCircleOutlineIcon fontSize="small" />
                                    <Typography variant="body2">{`Valid ${fileExt} — parsed successfully`}</Typography>
                                </Box>
                                {/* File info row */}
                                <Box
                                    sx={{
                                        alignItems: "center",
                                        display: "flex",
                                        gap: 1,
                                        marginTop: 2,
                                    }}
                                >
                                    <InsertDriveFileOutlinedIcon
                                        id="import-network-modal-file-icon"
                                        sx={{color: "text.secondary"}}
                                    />
                                    <Typography
                                        id="import-network-modal-review-filename"
                                        variant="body2"
                                        sx={{fontFamily: "monospace"}}
                                    >
                                        {file?.name}
                                    </Typography>
                                    <Typography
                                        id="import-network-modal-review-filesize"
                                        variant="body2"
                                        sx={{color: "text.secondary"}}
                                    >
                                        {`· ${formatFileSize(file?.size ?? 0)}`}
                                    </Typography>
                                </Box>
                                {/* Info note */}
                                <Box
                                    id="import-network-modal-hocon-note"
                                    sx={{
                                        alignItems: "flex-start",
                                        borderRadius: 1,
                                        borderStyle: "solid",
                                        borderWidth: "1px",
                                        borderColor: "divider",
                                        display: "flex",
                                        gap: 1.5,
                                        marginTop: 2,
                                        padding: "10px 14px",
                                    }}
                                >
                                    <InfoOutlinedIcon
                                        fontSize="small"
                                        sx={{color: "text.secondary", flexShrink: 0, marginTop: "2px"}}
                                    />
                                    <Typography variant="body2">
                                        Definitions are stored as JSON, so{" "}
                                        <strong>comments in your HOCON will be removed</strong> on import. Keep the
                                        original file if you need them.
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
                                <Typography variant="body2">{`Parse error: ${parseError}`}</Typography>
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
            </DialogContent>
            <DialogActions sx={{paddingTop: 0}}>
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
                            variant="contained"
                        >
                            Import network
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    )
}
