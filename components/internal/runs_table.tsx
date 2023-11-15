/**
 * Runs table module
 */

import {Tooltip as AntdTooltip, Modal} from "antd"
import {Position, Tooltip} from "evergreen-ui"
import {ReactElement, KeyboardEvent as ReactKeyboardEvent, useEffect, useState} from "react"
import {Col, Container, Row} from "react-bootstrap"
import {AiFillDelete, AiFillEdit} from "react-icons/ai"
import {BiNoEntry} from "react-icons/bi"
import {FiDownload} from "react-icons/fi"
import ClipLoader from "react-spinners/ClipLoader"
import uuid from "react-uuid"

import {
    DEFAULT_DOWNLOAD_ARTIFACT,
    downloadArtifact,
    getArtifactFriendlyName,
    getDownloadableArtifacts,
    isArtifactAvailable,
} from "./artifacts/artifacts"
import {MaximumBlue} from "../../const"
import {Experiment} from "../../controller/experiments/types"
import {NotificationType, sendNotification} from "../../controller/notification"
import updateRun, {sendAbortRequest} from "../../controller/run/accession"
import {BrowserFetchRuns} from "../../controller/run/fetch"
import {Run, Runs} from "../../controller/run/types"
import {toFriendlyDateTime} from "../../utils/date_time"
import {downloadFile} from "../../utils/file"
import {removeItemOnce} from "../../utils/transformation"
import {InfoTip} from "../infotip"

interface RunTableProps {
    readonly currentUser: string
    readonly editingLoading: {editing: boolean; loading: boolean}[]
    readonly experimentId: number
    readonly projectId: number
    readonly projectName: string
    readonly experiment: Experiment
    readonly runDrawer: boolean
    readonly runs: Runs
    readonly setEditingLoading: (editingLoading: {editing: boolean; loading: boolean}[]) => void
    readonly setRunDrawer: (isOpen: boolean) => void
    readonly setSelectedRunID: (runId: string) => void
    readonly setSelectedRunName: (runName: string) => void
    readonly setRuns: (runs: Runs) => void
}

export default function RunsTable(props: RunTableProps): ReactElement {
    // State for runs that are being deleted. In general there would be only one unless the user is clicking like mad
    const [runsBeingDeleted, setRunsBeingDeleted] = useState<number[]>([])

    // Keeps track of which artifact user wants to download for each Run. Map of runId: artifact_name.
    // Can't initialize this to anything useful here because we don't yet know how many Runs there will be.
    const [selectedArtifacts, setSelectedArtifacts] = useState({})

    // List of all artifacts we know about
    const downloadableArtifacts = getDownloadableArtifacts()

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
        if (props.runs && props.runs.some((run: Run) => !run.completed)) {
            const tempIntervalID = setInterval(updateRunStatuses, 5000, props.experimentId)

            return function cleanup() {
                clearInterval(tempIntervalID)
            }
        }

        return undefined
    }, [props.runs])

    async function updateRunStatuses(experimentIdTmp) {
        if (props.runDrawer) {
            // No need to udpate if Run drawer is open since user can't see runs list
            return
        }

        /*
        Fetches status and completion status for all runs and updates our local copy of Runs with these updated
        status description and completed flag
        */
        if (experimentIdTmp && props.runs) {
            const updatedRunStatuses: Runs = await BrowserFetchRuns(props.currentUser, experimentIdTmp, null, [
                "id",
                "status",
                "completed",
                "eval_error",
                "output_artifacts",
            ])

            if (updatedRunStatuses) {
                // For each status returned, match it up to a corresponding Run object (if we have one) and update that Run
                // object's status and "completed" fields
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
                <div
                    id="run-status-phase"
                    style={{display: "flex"}}
                >
                    Aborted
                    {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                    <InfoTip
                        info="Run aborted by user request"
                        id={props.experimentId.toString()}
                    />
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
                        justifyContent: "center",
                    }}
                >
                    {phase}
                    <button
                        id="download-file"
                        style={{
                            color: MaximumBlue,
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

            phase = `${statusItem.phase} : ${!isNaN(statusItem.progress) ? toPercentage(statusItem.progress) : "?"}%`
            detailedProgress = run.status
        }

        return (
            <div
                id="run-status-phase"
                style={{display: "flex"}}
            >
                {phase}
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <InfoTip
                    info={detailedProgress}
                    id={props.experimentId.toString()}
                />
            </div>
        )
    }

    async function abortRun(idx: number, run: Run) {
        try {
            // Treat it same as deleting -- no renaming etc. while in progress
            setRunsBeingDeleted([...runsBeingDeleted, idx])

            const success = await sendAbortRequest(run.id, props.currentUser)

            // TerminateRun displays error messages so we notify on success here
            if (success) {
                sendNotification(NotificationType.success, "Run abort request sent")
            }
        } finally {
            const tmp = [...runsBeingDeleted]
            setRunsBeingDeleted(removeItemOnce(tmp, idx))
        }
    }

    async function deleteRun(idx: number, run: Run) {
        try {
            setRunsBeingDeleted([...runsBeingDeleted, idx])
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
            const tmp = [...runsBeingDeleted]
            setRunsBeingDeleted(removeItemOnce(tmp, idx))
        }
    }

    function getRunButton(run, idx) {
        const runId = run.id
        const runTitle = run.name || runId
        return (
            <Container
                id={`run-buttons-${idx}`}
                style={{
                    cursor: run.completed ? "pointer" : "not-allowed",
                }}
            >
                <Row
                    id={`run-buttons-${idx}`}
                    style={{
                        alignItems: "center",
                        display: "flex",
                        flexWrap: "nowrap",
                    }}
                >
                    <Col
                        id={`run-button-col-${idx}`}
                        md={0}
                        style={{
                            width: runTitle?.length > 25 ? "25ch" : "100%",
                            paddingRight: 0,
                        }}
                    >
                        <AntdTooltip
                            id={`run-name-tooltip-${idx}`}
                            title={runTitle}
                        >
                            <button
                                id={`run-button-${runId}`}
                                style={{
                                    color: run.completed ? MaximumBlue : "gray",
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
                        </AntdTooltip>
                    </Col>

                    <Col
                        id={`editing-loading-col-${runId}`}
                        md={6}
                        style={{
                            width: 0,
                        }}
                    >
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
                    </Col>
                </Row>
            </Container>
        )
    }

    function getRunNameRowEditing(run: Run, idx: number) {
        const runId = run.id
        return (
            <td
                id={`update-run-name-${runId}`}
                className={tableCellClass}
            >
                <input
                    type="text"
                    id={`update-run-name-${runId}-input`}
                    autoFocus={true}
                    disabled={false}
                    defaultValue={run.name || run.id}
                    onBlur={(event) => updateRunName(event.target.value, run, idx)}
                    onKeyUp={async (event: ReactKeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                            await updateRunName((event.target as HTMLInputElement).value, run, idx)
                        } else if (event.key === "Escape") {
                            resetEditingLoading(idx)
                        }
                    }}
                />
            </td>
        )
    }

    // Common class/styling for table cells
    const tableCellClass = "px-10 py-3 text-center text-xs font-medium tracking-wider"

    function getRunRow(run, runNameRow, idx) {
        const runId = run.id
        // Get list of available artifacts as returned by server
        const availableArtifacts = run && run.output_artifacts && JSON.parse(run.output_artifacts)

        // To handle pathological cases where an experiment failed and no artifacts were generated
        const anyArtifactsAvailable = availableArtifacts && Object.keys(availableArtifacts).length !== 0

        // Return a table row for this particular Run in the Runs table
        return (
            <tr
                id={`run-row-${idx}`}
                key={run.id}
            >
                {runNameRow}

                <td
                    id={`run-created-at-${runId}`}
                    className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider"
                >
                    <span
                        id={`run-created-at-${runId}-text`}
                        className={"px-2 inline-flex text-xs leading-5 font-semibold rounded-full"}
                    >
                        {toFriendlyDateTime(run.created_at)}
                    </span>
                </td>

                <td
                    id={`run-updated-at-${runId}`}
                    className={tableCellClass}
                >
                    {toFriendlyDateTime(run.updated_at)}
                </td>

                <td
                    id={`run-launched-by-${runId}`}
                    className={tableCellClass}
                >
                    {run.launchedBy}
                </td>

                <td
                    id={`run-status-${runId}`}
                    className={tableCellClass}
                >
                    {getStatus(run)}
                </td>

                <td
                    id={`download-artifacts-${runId}`}
                    className={tableCellClass}
                >
                    {runsBeingDeleted.includes(idx) ? (
                        <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - ClipLoader does not have an id property when compiling
                            color={MaximumBlue}
                            loading={true}
                            size={25}
                        />
                    ) : (
                        run.completed &&
                        run.output_artifacts &&
                        JSON.parse(run.output_artifacts).experiment && (
                            <div
                                id={`download-artifacts-div-${idx}`}
                                style={{display: "flex"}}
                            >
                                <select
                                    id={`download-artifact-select-${idx}`}
                                    disabled={!anyArtifactsAvailable}
                                    style={{
                                        fontSize: 15,
                                        opacity: anyArtifactsAvailable ? "100%" : "50%",
                                        width: "180px",
                                    }}
                                    value={
                                        run.id in selectedArtifacts
                                            ? selectedArtifacts[run.id]
                                            : DEFAULT_DOWNLOAD_ARTIFACT
                                    }
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
                                    onClick={() =>
                                        downloadArtifact(
                                            run,
                                            selectedArtifacts[run.id] || DEFAULT_DOWNLOAD_ARTIFACT,
                                            getArtifactFriendlyName(selectedArtifacts[run.id]),
                                            props.projectName,
                                            props.projectId,
                                            props.experiment
                                        )
                                    }
                                />
                            </div>
                        )
                    )}
                </td>

                <td
                    id={`delete-training-run-${runId}`}
                    className={tableCellClass}
                >
                    {getActionsColumn(idx, runId, run)}
                </td>
            </tr>
        )
    }

    function getRunNameColumn(run: Run, runButton: JSX.Element) {
        return (
            <td
                id="run-name-column"
                className={tableCellClass}
            >
                {run.completed ? (
                    runButton
                ) : (
                    /* 2/6/23 DEF - Tooltip does not have an id property when compiling */
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        content="Run not complete"
                        position={Position.BOTTOM_LEFT}
                        statelessProps={{className: "opacity-50"}}
                    >
                        {runButton}
                    </Tooltip>
                )}
            </td>
        )
    }

    function createRunRows() {
        const runRows = []
        if (props.runs && props.runs.length != 0 && props.editingLoading.length != 0) {
            props.runs.forEach((run, idx) => {
                let runNameColumn: JSX.Element
                if (props.editingLoading[idx] && props.editingLoading[idx].editing) {
                    runNameColumn = getRunNameRowEditing(run, idx)
                } else {
                    const runButton = getRunButton(run, idx)

                    runNameColumn = getRunNameColumn(run, runButton)
                }

                const row = getRunRow(run, runNameColumn, idx)
                runRows.push(row)
            })
        }

        return runRows
    }

    // Declare table headers
    const TableHeaders = [
        "Training Run Name",
        "Created At",
        "Last Modified",
        "Launched By",
        "Status",
        "Download",
        "Actions",
    ]

    // Create Table header elements
    const tableHeaderElements: ReactElement[] = []
    TableHeaders.forEach((header) => {
        tableHeaderElements.push(
            <th
                id={`header-${header}`}
                key={uuid()}
                scope="col"
                className="px-10 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
                {header}
            </th>
        )
    })

    /**
     * Returns the button the user can click to delete an existing, completed (or errored) run.
     * @param runId - the id of the run
     * @param run   - the run object
     * @param idx   - the index of the run in the runs array
     * @return      The button, enclosed in a <code>Tooltip</code>
     */
    function getDeleteRunButton(runId: string, run: Run, idx: number) {
        const runName = run.name ?? run.id
        return (
            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                content="Delete Run"
            >
                <button
                    id={`delete-training-run-${runId}-button`}
                    className="align-center"
                    onClick={(event) => {
                        event.preventDefault()
                        Modal.confirm({
                            title: (
                                <span id={`delete-confirm-${runName}-title`}>
                                    Delete training run &quot;{runName}&quot;?
                                </span>
                            ),
                            content: <span id={`delete-confirm-${runName}-message`}>This cannot be undone.</span>,
                            okButtonProps: {
                                id: `delete-confirm-${runName}-ok-button`,
                            },
                            okText: "Delete",
                            onOk: async () => {
                                await deleteRun(idx, run)
                            },
                            cancelButtonProps: {
                                id: `delete-confirm-${runName}-cancel-button`,
                            },
                        })
                    }}
                >
                    <AiFillDelete
                        id={`delete-training-run-${idx}-fill`}
                        className="hover:text-red-700"
                        size={25}
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
            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                content="Terminate Run"
            >
                <button
                    id={`terminate-training-run-${runId}-button`}
                    disabled={run.completed}
                    className="align-center"
                    onClick={(event) => {
                        const runName = run.name ?? run.id
                        event.preventDefault()
                        Modal.confirm({
                            title: (
                                <span id={`delete-confirm-${runName}-title`}>
                                    Terminate in-progress training run &quot;{runName}&quot;?
                                </span>
                            ),
                            content: (
                                <span id={`delete-confirm-${runName}-message`}>
                                    This cannot be undone. All existing training progress will be lost.
                                </span>
                            ),
                            okButtonProps: {
                                id: `terminate-confirm-${runName}-ok-button`,
                            },
                            okText: "Terminate",
                            onOk: async () => {
                                await abortRun(idx, run)
                            },
                            cancelButtonProps: {
                                id: `terminate-confirm-${runName}-cancel-button`,
                            },
                        })
                    }}
                >
                    <BiNoEntry
                        id={`terminate-training-run-${runId}-fill`}
                        className="hover:text-red-700"
                        size={25}
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
                    <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - ClipLoader does not have an id property when compiling
                        color={MaximumBlue}
                        loading={true}
                        size={25}
                    />
                ) : (
                    <div
                        id={`action-buttons-div-${idx}`}
                        style={{display: "flex"}}
                    >
                        {run.completed ? getDeleteRunButton(runId, run, idx) : getTerminateRunButton(runId, run, idx)}
                    </div>
                )}
            </>
        )
    }

    const runRows = createRunRows()

    return (
        <>
            <div
                id="run-table-div-1"
                className="flex flex-col mt-4"
            >
                <div
                    id="run-table-div-2"
                    className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8"
                >
                    <div
                        id="run-table-div-3"
                        className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8"
                    >
                        <div
                            id="run-table-div-4"
                            className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg"
                        >
                            <table
                                id="run-table"
                                className="min-w-full divide-y divide-gray-200"
                            >
                                <thead
                                    id="run-table-head"
                                    className="bg-gray-50"
                                >
                                    <tr id="run-table-header-elements">{tableHeaderElements}</tr>
                                </thead>
                                <tbody
                                    id="run-table-body"
                                    className="bg-white divide-y divide-gray-200"
                                >
                                    {runRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
