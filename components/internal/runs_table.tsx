/**
 * Runs table module
 */

import {DeleteOutline} from "@mui/icons-material"
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline"
import {Box, styled, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import Grid from "@mui/material/Grid2"
import {
    ReactElement,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    useEffect,
    useState,
} from "react"
import {AiFillEdit} from "react-icons/ai"
import {FiDownload} from "react-icons/fi"

import {
    DEFAULT_DOWNLOAD_ARTIFACT,
    downloadArtifact,
    getArtifactFriendlyName,
    getDownloadableArtifacts,
    isArtifactAvailable,
} from "./artifacts/artifacts"
import {Experiment} from "../../controller/experiments/types"
import {fetchRuns} from "../../controller/run/fetch"
import {Run, Runs} from "../../controller/run/types"
import updateRun, {sendAbortRequest} from "../../controller/run/update"
import {AuthorizationInfo} from "../../utils/authorization"
import {toFriendlyDateTime} from "../../utils/dateTime"
import {downloadFile} from "../../utils/file"
import {useExtendedState} from "../../utils/state"
import {removeItemOnce} from "../../utils/transformation"
import {ConfirmationModal} from "../confirmationModal"
import {InfoTip} from "../infotip"
import {NotificationType, sendNotification} from "../notification"

interface RunTableProps {
    readonly currentUser: string
    readonly editingLoading: {editing: boolean; loading: boolean}[]
    readonly experimentId: number
    readonly projectId: number
    readonly projectName: string
    readonly projectPermissions: AuthorizationInfo
    readonly experiment: Experiment
    readonly runDrawer: boolean
    readonly runs: Runs
    readonly setEditingLoading: (editingLoading: {editing: boolean; loading: boolean}[]) => void
    readonly setRunDrawer: (isOpen: boolean) => void
    readonly setSelectedRunID: (runId: number) => void
    readonly setSelectedRunName: (runName: string) => void
    readonly setRuns: (runs: Runs) => void
}

// #region: Styled Components

// HACK: MUI table cells with text don't default to the same height as those with buttons/icons. This is a hack to
// ensure that all cells are the same height. This is the "observed organic height" of text cells. There must be a
// better way to do this.
const MUI_TABLE_ROW_HEIGHT = "73.85px"

// Create a styled component for TableCell
const RunsTableCell = styled(TableCell)({
    borderBottom: "var(--bs-border-width) var(--bs-border-style) var(--bs-gray-light)",
    fontSize: "15px",
    textAlign: "center",
})

// Create a styled component for TableHead
const CustomTableHead = styled(TableHead)(() => ({
    "& .MuiTableCell-root": {
        fontWeight: "bold",
        backgroundColor: "var(--bs-secondary)",
        borderBottom: "3px solid black",
        color: "var(--bs-white)",

        "&:first-of-type": {
            borderTopLeftRadius: "0.5rem",
        },
        "&:last-of-type": {
            borderTopRightRadius: "0.5rem",
        },
    },
}))

// #endregion: Styled Components

export default function RunsTable(props: RunTableProps): ReactElement {
    // State for runs that are being deleted.
    const [runsBeingDeleted, setRunsBeingDeleted, getRunsBeingDeleted] = useExtendedState<number[]>([])

    // Delete run modal
    const [deleteRunModalOpen, setDeleteRunModalOpen] = useState<boolean>(false)
    const [selectedDeleteIdx, setSelectedDeleteIdx] = useState<number | null>(null)
    const [selectedDeleteRun, setSelectedDeleteRun] = useState<Run | null>(null)
    const [selectedDeleteRunName, setSelectedDeleteRunName] = useState<string | number>("")

    // Terminate run modal
    const [selectedTerminateIdx, setSelectedTerminateIdx] = useState<number | null>(null)
    const [selectedTerminateRun, setSelectedTerminateRun] = useState<Run | null>(null)
    const [selectedTerminateRunName, setSelectedTerminateRunName] = useState<string | number>("")
    const [terminateRunModalOpen, setTerminateRunModalOpen] = useState<boolean>(false)

    // Keeps track of which artifact user wants to download for each Run. Map of runId: artifact_name.
    // Can't initialize this to anything useful here because we don't yet know how many Runs there will be.
    const [selectedArtifacts, setSelectedArtifacts] = useState<object>({})

    // List of all artifacts we know about
    const downloadableArtifacts = getDownloadableArtifacts()

    function handleTerminateRun(event: ReactMouseEvent<HTMLElement>, run: Run, idx: number) {
        const runName = run.name ?? run.id
        event.preventDefault()
        setSelectedTerminateIdx(idx)
        setSelectedTerminateRun(run)
        setSelectedTerminateRunName(runName)
        setTerminateRunModalOpen(true)
    }

    function handleDelete(event: ReactMouseEvent<HTMLElement>, idx: number, run: Run) {
        event.preventDefault()
        const runName = run.name ?? run.id
        setSelectedDeleteIdx(idx)
        setSelectedDeleteRun(run)
        setSelectedDeleteRunName(runName)
        setDeleteRunModalOpen(true)
    }

    function closeAndResetTerminateRunModal() {
        setTerminateRunModalOpen(false)
        setSelectedDeleteIdx(null)
        setSelectedDeleteRun(null)
        setSelectedDeleteRunName(null)
    }

    function closeAndResetDeleteRunModal() {
        setDeleteRunModalOpen(false)
        setSelectedDeleteIdx(null)
        setSelectedDeleteRun(null)
        setSelectedDeleteRunName(null)
    }

    function resetEditingLoading(idx: number) {
        // Reset the Editing Field
        const editingLoadingCopy = [...props.editingLoading]
        editingLoadingCopy[idx] = {
            ...editingLoadingCopy[idx],
            editing: false,
        }
        props.setEditingLoading(editingLoadingCopy)
    }

    // Set a timer to update the status of any runs
    useEffect(() => {
        // If any incomplete runs, set a timer to poll status
        if (props.runs?.some((run: Run) => !run.completed)) {
            const tempIntervalID = setInterval(updateRunStatuses, 5000, props.experimentId)

            return function cleanup() {
                clearInterval(tempIntervalID)
            }
        }

        return undefined
    }, [props.runs])

    async function updateRunStatuses(experimentIdTmp: number) {
        if (props.runDrawer) {
            // No need to update if Run drawer is open since user can't see runs list
            return
        }

        /*
        Fetches status and completion status for all runs and updates our local copy of Runs with these updated
        status description and completed flag
        */
        if (experimentIdTmp && props.runs) {
            const updatedRunStatuses: Runs = await fetchRuns(props.currentUser, experimentIdTmp, null, [
                "id",
                "status",
                "completed",
                "eval_error",
                "output_artifacts",
            ])

            if (updatedRunStatuses) {
                // For each status returned, match it up to a corresponding Run object (if we have one) and update
                // that Run object's status and "completed" fields
                const runsCopy = [...props.runs]
                for (const run of updatedRunStatuses) {
                    const runToUpdate = runsCopy.find((r) => r.id === run.id)
                    if (runToUpdate) {
                        runToUpdate.status = run.status
                        runToUpdate.completed = run.completed
                        runToUpdate.eval_error = run.eval_error
                        runToUpdate.output_artifacts = run.output_artifacts
                    }
                }

                props.setRuns(runsCopy)
            }
        }
    }

    // Allows use to edit the name of a run
    async function updateRunName(newRunName: string, run: Run, idx: number) {
        if (newRunName && newRunName !== run.name) {
            const updatedRun: Run = {
                ...run,
                flow: null,
                created_at: null,
                updated_at: null,
                name: newRunName,
                request_user: props.currentUser,
            }

            const responseRun = await updateRun(updatedRun)
            if (responseRun) {
                // backend doesn't return these so populate from existing
                responseRun.name = newRunName
                responseRun.completed = run.completed
                responseRun.output_artifacts = run.output_artifacts

                // Update state and re-render
                const newRunsList = [...props.runs]
                newRunsList[idx] = responseRun
                props.setRuns(newRunsList)
            }
        }

        resetEditingLoading(idx)
    }

    const toPercentage = (val: number) => (val * 100).toFixed(0)

    function getStatus(run: Run) {
        const parsedStatus = JSON.parse(run?.status || '"unknown"')
        let phase = parsedStatus?.phase

        // First check some special cases -- completed, aborted, errored out.

        // If Run is completed, that's all we need to say
        if (run.completed && !run.eval_error && !(phase === "Run Aborted")) {
            return "Completed"
        }

        // If we don't have valid status fields from backend, tell user all
        // that we know -- that we tried to submit the run.
        if (run.status == null || run.completed == null) {
            return "Submitted"
        }

        // Aborted?
        if (phase === "Run Aborted") {
            return (
                <div id="run-status-phase">
                    <span // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        id={`run-status-aborted-${run.id}`}
                        style={{display: "inline-block"}}
                    >
                        Aborted
                    </span>
                    <span // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        style={{display: "inline-block"}}
                        id={`run-status-tip-${run.id}`}
                    >
                        <InfoTip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            info="Run aborted by user request"
                            id={props.experimentId.toString()}
                        />
                    </span>
                </div>
            )
        }

        // Eval error? (something went wrong in GoRunner)
        if (run.eval_error) {
            phase = "Error"

            // Run errored out. Add link for downloading error logs.
            // TODO: someday allow user to download logs even if successful?
            return (
                <div
                    id="run-status"
                    style={{
                        display: "flex",
                    }}
                >
                    {phase}
                    <button
                        id="download-file"
                        style={{
                            color: "var(--bs-primary)",
                            textDecoration: "underline",
                            marginLeft: "3px",
                        }}
                        onClick={() => {
                            downloadFile(run.eval_error, "logs.txt")
                        }}
                    >
                        (Logs)
                    </button>
                </div>
            )
        }

        // Run is in progress and we have valid status. Format it for display.
        let detailedProgress = "No detailed status available"
        if (parsedStatus.subcontexts && parsedStatus.subcontexts.length > 0) {
            const statusItem = parsedStatus.subcontexts[0]

            phase = `${statusItem.phase} : ${isNaN(statusItem.progress) ? "?" : toPercentage(statusItem.progress)}%`
            detailedProgress = run.status
        }

        return (
            <div
                id="run-status-phase"
                style={{display: "flex"}}
            >
                {phase}
                <InfoTip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    info={detailedProgress}
                    id={props.experimentId.toString()}
                />
            </div>
        )
    }

    async function abortRun(idx: number, run: Run) {
        try {
            // Treat it same as deleting -- no renaming etc. while in progress
            setRunsBeingDeleted([...(await getRunsBeingDeleted()), idx])

            const success = await sendAbortRequest(run.id, props.currentUser)

            // TerminateRun displays error messages so we notify on success here
            if (success) {
                sendNotification(NotificationType.success, "Run abort request sent")
            }
        } finally {
            const tmp = [...(await getRunsBeingDeleted())]
            setRunsBeingDeleted(removeItemOnce(tmp, idx))
        }
    }

    async function deleteRun(idx: number, run: Run) {
        try {
            setRunsBeingDeleted([...(await getRunsBeingDeleted()), idx])
            const hiddenRun: Run = {
                ...run,
                updated_at: null,
                created_at: null,
                hidden: true,
                flow: null,
                request_user: props.currentUser,
            }
            const returnedRun = await updateRun(hiddenRun)
            if (returnedRun) {
                sendNotification(NotificationType.success, "Run deleted")
            }
            const newRunsList = [...props.runs]
            newRunsList.splice(idx, 1)
            props.setRuns(newRunsList)
        } finally {
            const tmp = [...(await getRunsBeingDeleted())]
            setRunsBeingDeleted(removeItemOnce(tmp, idx))
        }
    }

    function getRunButton(run: Run, idx) {
        const runId = run.id
        const runTitle = String(run.name || runId)
        return (
            <Box
                id={`run-buttons-${idx}`}
                style={{
                    cursor: run.completed ? "pointer" : "not-allowed",
                }}
            >
                <Grid
                    id={`run-buttons-${idx}`}
                    style={{
                        alignItems: "center",
                        display: "flex",
                        flexWrap: "nowrap",
                    }}
                >
                    <Grid
                        id={`run-button-col-${idx}`}
                        container
                        sx={{
                            width: runTitle?.length > 25 ? "25ch" : "100%",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <Tooltip
                            id={`run-name-tooltip-${idx}`}
                            title={runTitle}
                        >
                            <span id="run_button_span">
                                <button
                                    id={`run-button-${runId}`}
                                    style={{
                                        color: run.completed ? "var(--bs-primary)" : "gray",
                                        pointerEvents: run.completed ? "auto" : "none",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        width: "100%",
                                        padding: 0,
                                    }}
                                    disabled={!run.completed}
                                    onClick={() => {
                                        props.setSelectedRunID(run.id)
                                        props.setSelectedRunName(runTitle)
                                        props.setRunDrawer(true)
                                    }}
                                >
                                    {runTitle}
                                </button>
                            </span>
                        </Tooltip>
                    </Grid>

                    {props.projectPermissions?.update ? (
                        <AiFillEdit
                            id={`edit-loading-copy-${runId}-fill-edit`}
                            onClick={() => {
                                const editingLoadingCopy = [...props.editingLoading]
                                editingLoadingCopy[idx] = {
                                    ...editingLoadingCopy[idx],
                                    editing: true,
                                }
                                props.setEditingLoading(editingLoadingCopy)
                            }}
                        />
                    ) : null}
                </Grid>
            </Box>
        )
    }

    function getRunNameRowEditing(run: Run, idx: number) {
        const runId = run.id
        return (
            <RunsTableCell id={`update-run-name-${runId}`}>
                <input
                    type="text"
                    id={`update-run-name-${runId}-input`}
                    autoFocus={true}
                    disabled={false}
                    defaultValue={run.name || run.id}
                    onBlur={async (event) => updateRunName(event.target.value, run, idx)}
                    onKeyUp={async (event: ReactKeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                            await updateRunName((event.target as HTMLInputElement).value, run, idx)
                        } else if (event.key === "Escape") {
                            resetEditingLoading(idx)
                        }
                    }}
                />
            </RunsTableCell>
        )
    }

    function getDownloadsSelector(
        runId: string,
        anyArtifactsAvailable: boolean,
        run: Run,
        availableArtifacts: Record<string, string>
    ) {
        return (
            <div
                id={`download-artifacts-div-${runId}`}
                style={{display: "flex"}}
            >
                <select
                    id={`download-artifact-select-${runId}`}
                    disabled={!anyArtifactsAvailable}
                    style={{
                        fontSize: 15,
                        opacity: anyArtifactsAvailable ? "100%" : "50%",
                        width: "180px",
                    }}
                    value={run.id in selectedArtifacts ? selectedArtifacts[run.id] : DEFAULT_DOWNLOAD_ARTIFACT}
                    onChange={(event) => {
                        setSelectedArtifacts({
                            ...selectedArtifacts,
                            [run.id]: event.target.value,
                        })
                    }}
                >
                    {downloadableArtifacts.map((option) => {
                        const id = `download-option-${option.value}-${runId}`
                        const available: boolean = isArtifactAvailable(option.value, availableArtifacts)
                        return (
                            <option
                                id={id}
                                key={option.value}
                                value={option.value}
                                disabled={!available}
                            >
                                {option.label}
                            </option>
                        )
                    })}
                </select>

                <FiDownload
                    id={`download-artifacts-${runId}-download`}
                    size={25}
                    style={{marginLeft: "12px", marginTop: "4px", cursor: "pointer"}}
                    onClick={async () =>
                        downloadArtifact(
                            run,
                            selectedArtifacts[run.id] || DEFAULT_DOWNLOAD_ARTIFACT,
                            getArtifactFriendlyName(selectedArtifacts[run.id]),
                            availableArtifacts,
                            props.projectName,
                            props.projectId,
                            props.experiment
                        )
                    }
                />
            </div>
        )
    }

    function getRunRow(run, runNameRow, idx) {
        const runId = run.id
        // Get list of available artifacts as returned by server
        const availableArtifacts = run?.output_artifacts && JSON.parse(run.output_artifacts)

        // To handle pathological cases where an experiment failed and no artifacts were generated
        const anyArtifactsAvailable = availableArtifacts && Object.keys(availableArtifacts).length !== 0

        // Return a table row for this particular Run in the Runs table
        return (
            <TableRow
                id={`run-row-${idx}`}
                key={run.id}
                sx={{
                    // Highlight alternate rows for legibility
                    backgroundColor: idx % 2 === 0 ? "var(--bs-white)" : "var(--bs-gray-lighter)",
                }}
            >
                {runNameRow}

                <RunsTableCell
                    id={`run-created-at-${runId}`}
                    sx={{fontWeight: "bold"}}
                >
                    {toFriendlyDateTime(run.created_at)}
                </RunsTableCell>

                <RunsTableCell id={`run-updated-at-${runId}`}>{toFriendlyDateTime(run.updated_at)}</RunsTableCell>

                <RunsTableCell id={`run-launched-by-${runId}`}>{run.launchedBy}</RunsTableCell>

                <RunsTableCell id={`run-status-${runId}`}>{getStatus(run)}</RunsTableCell>

                <RunsTableCell id={`download-artifacts-${runId}`}>
                    {runsBeingDeleted.includes(idx) ? (
                        <CircularProgress
                            id={`delete-run-${runId}-download-loading`}
                            size={25}
                        />
                    ) : (
                        run.completed &&
                        run.output_artifacts &&
                        JSON.parse(run.output_artifacts).experiment &&
                        getDownloadsSelector(runId, anyArtifactsAvailable, run, availableArtifacts)
                    )}
                </RunsTableCell>

                {props.projectPermissions?.delete ? (
                    <RunsTableCell
                        id={`delete-training-run-${runId}`}
                        sx={{
                            height: MUI_TABLE_ROW_HEIGHT,
                        }}
                    >
                        {getActionsColumn(idx, runId, run)}
                    </RunsTableCell>
                ) : null}
            </TableRow>
        )
    }

    function getRunNameColumn(run: Run, idx: number) {
        const runButton = getRunButton(run, idx)
        return (
            <RunsTableCell
                id="run-name-column"
                sx={{
                    textAlign: "center",
                    height: MUI_TABLE_ROW_HEIGHT,
                }}
            >
                {run.completed ? (
                    runButton
                ) : (
                    <Tooltip
                        id="run-not-complete-tooltip"
                        title="Run not complete"
                        placement="bottom-start"
                        className="opacity-50"
                    >
                        {runButton}
                    </Tooltip>
                )}
            </RunsTableCell>
        )
    }

    function createRunRows() {
        const runRows = []
        // For each row, the way we render it depends on whether the user is currently editing the name of the run.
        if (props.runs && props.runs.length !== 0 && props.editingLoading.length !== 0) {
            props.runs.forEach((run, idx) => {
                let runNameColumn: JSX.Element
                if (props.editingLoading[idx]?.editing) {
                    runNameColumn = getRunNameRowEditing(run, idx)
                } else {
                    runNameColumn = getRunNameColumn(run, idx)
                }

                const row = getRunRow(run, runNameColumn, idx)
                runRows.push(row)
            })
        }

        return runRows
    }

    function getTableHeader() {
        // Basic list of headers that all users see
        const tableHeaders = ["Training Run Name", "Created At", "Last Modified", "Launched By", "Status", "Download"]

        // Add Actions column if user has delete permissions
        if (props.projectPermissions?.delete) {
            tableHeaders.push("Actions")
        }

        // Create Table header
        return tableHeaders.map((header) => (
            <TableCell
                id={`header-${header}`}
                key={crypto.randomUUID()}
                sx={{
                    textAlign: "center",
                    borderBottom: "1px solid var(--bs-black)",
                }}
            >
                <Typography
                    id={`header-${header}-text`}
                    sx={{fontSize: "0.75rem", fontWeight: "bold"}}
                >
                    {header}
                </Typography>
            </TableCell>
        ))
    }

    /**
     * Returns the button the user can click to delete an existing, completed (or errored) run.
     * @param runId - the id of the run
     * @param run   - the run object
     * @param idx   - the index of the run in the runs array
     * @return      The button, enclosed in a <code>Tooltip</code>
     */
    function getDeleteRunButton(runId: string, run: Run, idx: number) {
        return (
            <Tooltip
                id={`delete-training-run-${runId}-tooltip`}
                title="Delete Run"
            >
                <button
                    id={`delete-training-run-${runId}-button`}
                    disabled={deleteRunModalOpen}
                    onClick={(event: ReactMouseEvent<HTMLElement>) => handleDelete(event, idx, run)}
                >
                    <DeleteOutline
                        id={`delete-training-run-${idx}-fill`}
                        sx={{
                            "&:hover": {
                                color: "red",
                            },
                        }}
                        fontSize="small"
                    />
                </button>
            </Tooltip>
        )
    }

    /**
     * Returns the button the user can click to terminate an existing, in-progress run.
     * @param runId - the id of the run
     * @param run  - the run object
     * @param idx - the index of the run in the runs array
     */
    function getTerminateRunButton(runId: string, run: Run, idx: number) {
        return (
            <Tooltip
                id={`terminate-training-run-${runId}-tooltip`}
                title="Terminate Run"
            >
                <button
                    id={`terminate-training-run-${runId}-button`}
                    disabled={run.completed || terminateRunModalOpen}
                    onClick={(event: ReactMouseEvent<HTMLElement>) => handleTerminateRun(event, run, idx)}
                >
                    <RemoveCircleOutlineIcon
                        id={`terminate-training-run-${runId}-fill`}
                        sx={{
                            "&:hover": {
                                color: "red",
                            },
                        }}
                        fontSize="small"
                    />
                </button>
            </Tooltip>
        )
    }

    /**
     * Returns the actions column for a run -- in general a single button to allow the user to terminate or delete the
     * Run.
     *
     * @param idx   - the index of the run in the runs array
     * @param runId - the id of the run
     * @param run   - the run object
     * @return Either a spinner if the Run is already being deleted/terminated, or whatever button is appropriate for
     * the Run's status.
     */
    function getActionsColumn(idx: number, runId: string, run: Run) {
        return (
            <>
                {runsBeingDeleted.includes(idx) ? (
                    <CircularProgress
                        id={`delete-run-${runId}-actions-loading`}
                        size={25}
                    />
                ) : run.completed ? (
                    getDeleteRunButton(runId, run, idx)
                ) : (
                    getTerminateRunButton(runId, run, idx)
                )}
            </>
        )
    }

    const runRows = createRunRows()

    function getTerminateConfirmation() {
        return (
            <ConfirmationModal
                cancelBtnLabel="Do not terminate"
                content={
                    <span id={`terminate-confirm-${selectedTerminateRunName}-message`}>
                        This cannot be undone. All existing training progress will be lost.
                    </span>
                }
                handleCancel={() => {
                    closeAndResetTerminateRunModal()
                }}
                handleOk={async () => {
                    await abortRun(selectedTerminateIdx, selectedTerminateRun)
                    closeAndResetTerminateRunModal()
                }}
                id={`terminate-confirm-${selectedTerminateRunName}-dialog`}
                okBtnLabel="Terminate"
                title={
                    <span id={`terminate-confirm-${selectedTerminateRunName}-title`}>
                        Terminate in-progress training run &quot;{selectedTerminateRunName}&quot;?
                    </span>
                }
            />
        )
    }

    function getDeleteConfirmation() {
        return (
            <ConfirmationModal
                cancelBtnLabel="Keep"
                content={<span id={`delete-confirm-${selectedDeleteRunName}-message`}>This cannot be undone.</span>}
                handleCancel={() => {
                    closeAndResetDeleteRunModal()
                }}
                handleOk={async () => {
                    await deleteRun(selectedDeleteIdx, selectedDeleteRun)
                    closeAndResetDeleteRunModal()
                }}
                id={`delete-confirm-${selectedDeleteRunName}-dialog`}
                okBtnLabel="Delete"
                title={
                    <span id={`delete-confirm-${selectedDeleteRunName}-title`}>
                        Delete training run &quot;{selectedDeleteRunName}&quot;?
                    </span>
                }
            />
        )
    }

    function getTable() {
        return (
            <Box
                id="run-table-box"
                sx={{
                    display: "flex",
                    marginTop: "32px",
                    width: "100%",
                }}
            >
                <Table
                    id="run-table"
                    sx={{boxShadow: 10}}
                >
                    <CustomTableHead id="run-table-head">
                        <TableRow
                            id="run-table-header-elements"
                            sx={{
                                height: "4rem",
                            }}
                        >
                            {getTableHeader()}
                        </TableRow>
                    </CustomTableHead>
                    <TableBody id="run-table-body">{runRows}</TableBody>
                </Table>
            </Box>
        )
    }

    return (
        <>
            {getTable()}
            {terminateRunModalOpen && getTerminateConfirmation()}
            {deleteRunModalOpen && getDeleteConfirmation()}
        </>
    )
}
