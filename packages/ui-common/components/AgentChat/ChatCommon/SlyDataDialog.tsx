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

import DataObjectIcon from "@mui/icons-material/DataObject"
import DeleteOutlined from "@mui/icons-material/DeleteOutlined"
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined"
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {ChangeEvent, FC, Fragment, useMemo, useRef, useState} from "react"

import {useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {downloadFile, toSafeFilename} from "../../../utils/File"
import {findImageValues, formatSlyData, parseSlyData} from "../../../utils/SlyData"
import {StyledButton} from "../../Common/ConfirmationModal"
import {MUIDialog} from "../../Common/MUIDialog"
import InfoTip from "../../Settings/InfoTip"

//#region: Types
export interface SlyDataDialogProps {
    /**
     * Names of the sly_data keys that the UI itself merges into each request (API keys, agent network definition,
     * login...). Shown to the user as names only -- never values, since some of them are secrets.
     */
    readonly extraSlyDataKeys?: readonly string[]

    /** HTML id to use for the outer component */
    readonly id: string

    readonly isOpen: boolean

    /** The network whose sly_data is being edited. Sly data is stored per network. */
    readonly networkId: string

    /** Human-readable name of the network, for display only */
    readonly networkDisplayName: string

    readonly onClose: () => void
}
//#endregion: Types

//#region: Constants

// Avoids a new array literal as a default prop value on every render
const NO_EXTRA_KEYS: readonly string[] = []

// Height of the JSON editor, in rows. Big enough to see a realistic payload without dominating the screen.
const EDITOR_ROWS = 14

// Edge length of the image previews, in pixels
const IMAGE_PREVIEW_SIZE = 96

// Tooltip explaining what sly data is, in end-user terms: it exists to carry values (credentials included) that
// belong with the request but must stay out of the LLM conversation.
const SLY_DATA_EXPLAINER =
    "Data is sent to the agent network in a private channel with each request but kept out of the LLM."

//#endregion: Constants

/**
 * Dialog for viewing and editing the sly_data of the selected agent network.
 * <br>
 * sly_data is the side-channel payload that rides along with every request: the server echoes it back as the
 * conversation progresses, and the UI bounces it to the server on the next request. Until now it was invisible.
 * This dialog exposes it as editable JSON, so a user can inspect what the agents are passing around and seed values
 * of their own before the first turn.
 * <br>
 * Edits are written straight into the per-network chat history store, which is the same place the streaming code
 * writes server-echoed sly_data and the same place the send path reads from. There is therefore no separate plumbing
 * to the server: whatever is saved here goes out with the next request.
 */
export const SlyDataDialog: FC<SlyDataDialogProps> = ({
    extraSlyDataKeys = NO_EXTRA_KEYS,
    id,
    isOpen,
    networkId,
    networkDisplayName,
    onClose,
}) => {
    const storedSlyData = useAgentChatHistoryStore((state) =>
        networkId ? state.history[networkId]?.slyData : undefined
    )
    const setSlyData = useAgentChatHistoryStore((state) => state.setSlyData)

    const storedText = useMemo(() => formatSlyData(storedSlyData), [storedSlyData])

    // The user's unsaved edit, or null while they have none. While null, the editor simply renders the store,
    // so server-echoed updates show up without any syncing code. Once the user edits, their draft is what
    // renders, and we offer a reload instead of overwriting it (see below).
    const [draft, setDraft] = useState<string | null>(null)

    // What the store held when the user started editing, so we can tell "the server changed sly_data" apart
    // from "the user changed sly_data"
    const [draftBaseline, setDraftBaseline] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Derived rather than stored: dirtiness is simply "a draft exists"
    const isDirty = draft !== null

    const text = draft ?? storedText

    const parseResult = useMemo(() => parseSlyData(text), [text])

    const images = useMemo(() => findImageValues(parseResult.value), [parseResult])

    // The server echoed new sly_data while the user had unsaved edits. Saying so beats silently discarding
    // either side's version.
    const wasUpdatedByServer = isDirty && storedText !== draftBaseline

    /** Records a user edit, snapshotting what the store held when editing began. */
    const startOrUpdateDraft = (newText: string) => {
        if (draft === null) {
            setDraftBaseline(storedText)
        }
        setDraft(newText)
    }

    const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        startOrUpdateDraft(event.target.value)
    }

    const handleReload = () => {
        setDraft(null)
        setDraftBaseline(null)
    }

    const handleClear = () => {
        startOrUpdateDraft("{}")
    }

    const handleExport = () => {
        if (parseResult.error) {
            return
        }
        const filename = `${toSafeFilename(`${networkId}-sly-data`)}.json`
        downloadFile(formatSlyData(parseResult.value), filename, "application/json")
    }

    const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]

        // Reset the input so that picking the same file again still fires a change event
        event.target.value = ""

        if (!file) {
            return
        }

        // Whatever the file contains goes into the editor as-is. If it isn't usable sly_data, the same validation
        // that guards typing will explain why.
        startOrUpdateDraft(await file.text())
    }

    const handleSave = () => {
        if (parseResult.error) {
            return
        }
        setSlyData(networkId, parseResult.value)
        onClose()
    }

    const getTitle = () => (
        <Box sx={{alignItems: "center", display: "flex", gap: 0.75}}>
            <DataObjectIcon
                fontSize="small"
                id={`${id}-title-icon`}
            />
            <span>Sly data for {networkDisplayName}</span>
            <InfoTip title={SLY_DATA_EXPLAINER} />
        </Box>
    )

    const getToolbar = () => (
        <Box sx={{display: "flex", gap: 0.5, justifyContent: "flex-end"}}>
            <Tooltip title="Import from a JSON file">
                <span>
                    <IconButton
                        aria-label="Import sly data"
                        id={`${id}-import-button`}
                        onClick={() => fileInputRef.current?.click()}
                        size="small"
                    >
                        <FileUploadOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Export to a JSON file">
                <span>
                    <IconButton
                        aria-label="Export sly data"
                        disabled={Boolean(parseResult.error)}
                        id={`${id}-export-button`}
                        onClick={handleExport}
                        size="small"
                    >
                        <FileDownloadOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Clear all sly data (takes effect when you save)">
                <span>
                    <IconButton
                        aria-label="Clear sly data"
                        id={`${id}-clear-button`}
                        onClick={handleClear}
                        size="small"
                        sx={{"&:hover": {color: "error.main"}}}
                    >
                        <DeleteOutlined fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <input
                accept="application/json, .json"
                aria-label="Sly data file"
                data-testid={`${id}-file-input`}
                id={`${id}-file-input`}
                onChange={handleFileSelected}
                ref={fileInputRef}
                style={{display: "none"}}
                type="file"
            />
        </Box>
    )

    const getServerUpdateAlert = () =>
        wasUpdatedByServer && (
            <Alert
                action={
                    <StyledButton
                        id={`${id}-reload-button`}
                        onClick={handleReload}
                        variant="outlined"
                    >
                        Reload
                    </StyledButton>
                }
                id={`${id}-server-update-alert`}
                severity="info"
                sx={{my: 1}}
            >
                The agents updated sly data while you were editing. Reloading discards your changes.
            </Alert>
        )

    /**
     * Preview strip for any values that look like images. Read-only: the underlying value stays editable as text.
     * Agent networks do not have a settled convention for passing images over sly_data yet, so this displays what
     * it can recognize rather than assuming a shape.
     */
    const getImagePreviews = () =>
        images.length > 0 && (
            <Box id={`${id}-images`}>
                <Typography
                    sx={{fontSize: "0.75rem", mt: 1}}
                    variant="caption"
                >
                    Images in sly data
                </Typography>
                <Box sx={{display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5}}>
                    {images.map((image) => (
                        <Box
                            key={image.path}
                            sx={{maxWidth: IMAGE_PREVIEW_SIZE, textAlign: "center"}}
                        >
                            <img
                                alt={image.path}
                                src={image.src}
                                style={{
                                    height: IMAGE_PREVIEW_SIZE,
                                    objectFit: "contain",
                                    width: IMAGE_PREVIEW_SIZE,
                                }}
                            />
                            <Typography
                                sx={{display: "block", fontSize: "0.7rem", overflowWrap: "anywhere"}}
                                variant="caption"
                            >
                                {image.path}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        )

    /**
     * Explains the keys that this dialog deliberately does not show, so that their absence doesn't look like a bug.
     */
    const getMergedKeysNote = () =>
        extraSlyDataKeys.length > 0 && (
            <Alert
                id={`${id}-merged-keys`}
                severity="info"
                sx={{mt: 0.5, py: 0, "& .MuiAlert-message": {fontSize: "0.75rem"}}}
            >
                Sent automatically with every request:{" "}
                {[...extraSlyDataKeys].sort().map((key, index) => (
                    <Fragment key={key}>
                        {index > 0 && ", "}
                        <Box
                            component="code"
                            sx={{
                                backgroundColor: "action.hover",
                                borderRadius: 0.5,
                                fontFamily: "monospace",
                                px: 0.5,
                            }}
                        >
                            {key}
                        </Box>
                    </Fragment>
                ))}
                . Supplied by the app, not from this editor.
            </Alert>
        )

    const getFooter = () => (
        <>
            <StyledButton
                id={`${id}-cancel-button`}
                onClick={onClose}
                variant="outlined"
            >
                Cancel
            </StyledButton>
            <StyledButton
                disabled={Boolean(parseResult.error)}
                id={`${id}-save-button`}
                onClick={handleSave}
                variant="contained"
            >
                Save
            </StyledButton>
        </>
    )

    return (
        <MUIDialog
            contentSx={{minWidth: "550px", paddingTop: "0"}}
            footer={getFooter()}
            id={id}
            isOpen={isOpen}
            onClose={onClose}
            paperProps={{maxWidth: "800px", width: "80vw"}}
            title={getTitle()}
        >
            {getToolbar()}
            {getServerUpdateAlert()}
            <TextField
                error={Boolean(parseResult.error)}
                fullWidth
                helperText={parseResult.error ?? " "}
                id={`${id}-editor`}
                maxRows={EDITOR_ROWS}
                minRows={EDITOR_ROWS}
                multiline
                onChange={handleTextChange}
                slotProps={{
                    htmlInput: {
                        "aria-label": "Sly data",
                        spellCheck: false,
                        style: {fontFamily: "monospace", fontSize: "0.8rem"},
                    },
                }}
                value={text}
            />
            {getImagePreviews()}
            {getMergedKeysNote()}
        </MUIDialog>
    )
}
