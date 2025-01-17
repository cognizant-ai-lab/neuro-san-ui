/**
 * See class comment.
 */

import CloseIcon from "@mui/icons-material/Close"
import InfoIcon from "@mui/icons-material/Info"
import {Box, Button, Checkbox, FormControlLabel, Input, Select, styled, Tooltip, Typography} from "@mui/material"
import Grid from "@mui/material/Grid2"
import {camelCase, startCase} from "lodash"
import {ChangeEvent, ReactNode, useEffect, useState} from "react"

import {MaximumBlue} from "../../const"
import {getShares, share} from "../../controller/authorize/share"
import {Project} from "../../controller/projects/types"
import {RoleType} from "../../generated/auth"
import {ConfirmationModal} from "../confirmationModal"
import {MUIAlert} from "../MUIAlert"
import {MUIDialog} from "../MUIDialog"
import {NotificationType, sendNotification} from "../notification"

// #region: Styled Components
const StyledButton = styled(Button)({
    fontSize: "0.8em",
    padding: "0px 7px",
})

const StyledOKButton = styled(StyledButton)(({disabled}) => ({
    backgroundColor: disabled ? "rgba(0, 0, 0, 0.12) !important" : `${MaximumBlue} !important`,
    marginBottom: "2px",
    paddingBottom: "1px",
}))
// #endregion: Styled Components

// #region: Types
interface SharingDialogProps {
    readonly title: ReactNode
    readonly visible: boolean
    readonly closeModal: () => void
    readonly currentUser: string
    readonly project: Project
}
// #endregion: Types

/**
 * Dialog for sharing a project with another user.
 * @param title The title of the dialog (customizable by caller)
 * @param visible Whether the dialog is visible initially
 * @param closeModal Function to close the dialog
 * @param currentUser The current user's login
 * @param project The project to share
 */
export default function SharingDialog({
    title,
    visible,
    closeModal,
    currentUser,
    project,
}: SharingDialogProps): JSX.Element | null {
    const [currentShares, setCurrentShares] = useState<[string, RoleType][]>([])
    const [operationComplete, setOperationComplete] = useState<boolean>(false)
    const [targetUser, setTargetUser] = useState<string | null>(null)
    const [targetUserToRemove, setTargetUserToRemove] = useState<string | null>(null)

    // For remove share dialog
    const [removeShareDialogOpen, setRemoveShareDialogOpen] = useState<boolean>(false)

    // Retrieve current list of shares
    useEffect(() => {
        async function getCurrentShares() {
            try {
                const currentSharesTmp = await getShares(project.id, currentUser)
                setCurrentShares(currentSharesTmp)
            } catch (e) {
                sendNotification(NotificationType.error, "Failed to get current shares", `Due to: ${e}`)
            }
        }

        void getCurrentShares()
    }, [])

    // Keypress handler
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTargetUser(e.target.value)
    }

    // Close the dialog and clear the state
    function closeAndClear() {
        closeModal()
        setRemoveShareDialogOpen(false)
        setTargetUser(null)
        setTargetUserToRemove(null)
        setOperationComplete(false)
    }

    // Share the project with the target user
    async function handleOk() {
        try {
            // Call sharing API
            await share(project.id, currentUser, targetUser)

            // Update the current shares list in the dialog to reassure the user. Note: at this point we are guessing
            // that the share was successful since we don't have confirmation from the backend.
            setCurrentShares((prevShares) => [...prevShares, [targetUser, RoleType.TOURIST]])
            setOperationComplete(true)
        } catch (e) {
            sendNotification(NotificationType.error, "Failed to share project", `Due to: ${e}`)
        }
    }

    // Not allowed to share with self
    const isSharingWithSelf = targetUser === currentUser

    // Can't share with a user already shared with
    const alreadySharedWithUser = currentShares?.some(([user]) => user === targetUser)

    // Have to specify a target user to share with
    const targetUserSpecified = targetUser && targetUser.trim() !== ""
    const isValidTargetUser = targetUserSpecified && !isSharingWithSelf && !alreadySharedWithUser
    const enableOkButton = operationComplete || isValidTargetUser

    function getReasonOkButtonDisabled() {
        if (isSharingWithSelf) {
            return "Cannot share with yourself"
        } else if (!targetUserSpecified) {
            return "Please specify a user to share with"
        } else if (alreadySharedWithUser) {
            return "Project already shared with this user"
        } else {
            return undefined
        }
    }

    const reasonOkButtonDisabled = enableOkButton ? undefined : getReasonOkButtonDisabled()

    const Footer: JSX.Element = (
        <>
            <StyledButton
                id="sharing-dialog-cancel-button"
                key="cancel_button"
                onClick={closeAndClear}
                sx={{display: operationComplete ? "none" : "inline-block"}}
                variant="outlined"
            >
                Cancel
            </StyledButton>
            <Tooltip
                id="ok_button_tooltip"
                key="ok_button_tooltip"
                title={reasonOkButtonDisabled}
            >
                <span id="ok_button_span">
                    <StyledOKButton
                        id="sharing-dialog-ok-button"
                        key="ok_button"
                        onClick={operationComplete ? closeAndClear : handleOk}
                        disabled={!enableOkButton}
                        variant="contained"
                    >
                        {operationComplete ? "Close" : "Ok"}
                    </StyledOKButton>
                </span>
            </Tooltip>
        </>
    )

    function getCurrentSharesDisplay() {
        return (
            <>
                <div
                    id="sharing-form-current-shares-text"
                    style={{fontSize: "large"}}
                >
                    People with access
                </div>
                <hr id="sharing-form-current-shares-hr" />

                {currentShares && currentShares.length > 0 ? (
                    <>
                        <div id="current-shares-container">
                            {currentShares.map(([user, relation], index) => (
                                <div
                                    key={user}
                                    id={`current-share-${index}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        marginTop: "4px",
                                        marginBottom: "4px",
                                        width: "100%",
                                    }}
                                >
                                    <Tooltip
                                        id={`remove-share-tooltip-${index}`}
                                        title={relation === RoleType.OWNER ? "Cannot remove owner" : "Remove share"}
                                    >
                                        <CloseIcon
                                            id={`close-icon-${index}`}
                                            style={{
                                                color: "var(--bs-black)",
                                                cursor: relation !== RoleType.OWNER ? "pointer" : "not-allowed",
                                                fontSize: "0.9em",
                                                marginRight: "10px",
                                                transition: "color 0.3s ease",
                                            }}
                                            onMouseEnter={(e) =>
                                                relation !== RoleType.OWNER &&
                                                (e.currentTarget.style.color = "var(--bs-red)")
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--bs-black)")}
                                            onClick={async () => {
                                                if (relation !== RoleType.OWNER) {
                                                    setTargetUserToRemove(user)
                                                    setRemoveShareDialogOpen(true)
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                    {user} - {startCase(camelCase(relation))}
                                </div>
                            ))}
                        </div>
                        <hr id="sharing-form-current-shares-hr-bottom" />
                    </>
                ) : (
                    <div
                        id="sharing-form-no-shares"
                        style={{marginTop: "16px"}}
                    >
                        Not currently shared with anyone.
                    </div>
                )}
            </>
        )
    }

    return (
        <>
            <MUIDialog
                contentSx={{fontSize: "0.8rem", minWidth: "600px", paddingTop: "0"}}
                footer={Footer}
                id="ui-mockup-dialog"
                isOpen={visible}
                onClose={closeModal}
                title={title}
            >
                <Grid
                    id="sharing-form"
                    container={true}
                >
                    <Grid
                        id="sharing-form-group-target-user"
                        size={12}
                        sx={{display: "flex", marginTop: "16px", paddingRight: "0", paddingLeft: "0", gap: 2}}
                    >
                        <Grid
                            id="sharing-form-col-target-user"
                            size={6}
                            sx={{display: "flex"}}
                        >
                            <Box
                                id="sharing-form-target-user-box"
                                sx={{position: "relative", width: "100%"}}
                            >
                                <Input
                                    id="sharing-form-target-user"
                                    placeholder="User to share with"
                                    type="text"
                                    value={targetUser || ""}
                                    onChange={handleInputChange}
                                    disabled={operationComplete}
                                    disableUnderline={true}
                                    sx={{
                                        border: "1px solid lightgray",
                                        borderRadius: "8px",
                                        width: "100%",
                                        fontSize: "0.8rem",
                                        paddingLeft: "8px",
                                        height: "2.0rem",
                                    }}
                                    inputRef={(input) => input?.focus()}
                                />
                                <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    id={`sharing-dialog-share-with-tooltip-${project?.id}`}
                                    title="Please share with a user's GitHub username, not their email address."
                                >
                                    <InfoIcon // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                        data-testid={`sharing-dialog-share-with-info-icon-${project?.id}`}
                                        id={`sharing-dialog-share-with-info-icon-${project?.id}`}
                                        sx={{
                                            color: "var(--bs-primary)",
                                            fontSize: 15,
                                            position: "absolute",
                                            top: "5px",
                                            right: "5px",
                                        }}
                                    />
                                </Tooltip>
                            </Box>
                        </Grid>
                        <Grid
                            id="sharing-form-col-role"
                            size={6}
                        >
                            <Select
                                id="sharing-form-role-select"
                                defaultValue={1}
                                disabled={operationComplete}
                                sx={{
                                    height: "2.0rem",
                                    width: "100%",
                                    fontSize: "0.8rem",
                                    borderRadius: "8px",
                                    border: "1px solid lightgray",
                                }}
                            >
                                <option
                                    id="sharing-form-role-viewer"
                                    value="1"
                                >
                                    Tourist
                                </option>
                                <option
                                    id="sharing-form-role-collaborator"
                                    value="2"
                                    disabled={true}
                                >
                                    Collaborator (Future)
                                </option>
                            </Select>
                        </Grid>
                    </Grid>
                    <Grid
                        id="sharing-form-group-checkbox"
                        size={12}
                        sx={{marginTop: "10px"}}
                    >
                        <Grid id="sharing-form-col-checkbox">
                            <Tooltip
                                id="sharing-form-checkbox-tooltip"
                                title={
                                    "This feature is not yet implemented. " +
                                    "For now, only entire project hierarchies can be shared."
                                }
                            >
                                <FormControlLabel
                                    id="sharing-form-checkbox-tooltip-span"
                                    control={
                                        <Checkbox
                                            id="sharing-form-checkbox"
                                            checked={true}
                                            disabled={true}
                                            sx={{lineHeight: "30px", opacity: "50%"}}
                                        />
                                    }
                                    label={
                                        <Typography
                                            id="sharing-form-checkbox-label"
                                            sx={{opacity: "50%", fontSize: "0.8rem"}}
                                        >
                                            Also share related items such as Experiments, Runs and data sources
                                        </Typography>
                                    }
                                />
                            </Tooltip>
                        </Grid>
                    </Grid>
                    <Grid
                        id="sharing-form-group-current-shares"
                        sx={{marginTop: "15px"}}
                    >
                        {getCurrentSharesDisplay()}
                    </Grid>
                </Grid>
                {operationComplete ? (
                    <MUIAlert
                        id="project-shared-with-alert"
                        severity="success"
                        sx={{marginTop: "1rem"}}
                    >
                        {`Project shared with "${targetUser}"`}
                    </MUIAlert>
                ) : null}
            </MUIDialog>
            {removeShareDialogOpen ? (
                <ConfirmationModal
                    content={
                        "You are about to revoke access to project " +
                        `${project.name}" for "${targetUserToRemove}". Are you sure?`
                    }
                    handleCancel={() => {
                        setRemoveShareDialogOpen(false)
                        setTargetUserToRemove(null)
                    }}
                    handleOk={async () => {
                        await share(project.id, currentUser, targetUserToRemove, false)
                        setCurrentShares((prevShares) => prevShares.filter(([u]) => u !== targetUserToRemove))
                        setOperationComplete(false)
                        setTargetUser(null)
                        setTargetUserToRemove(null)
                        setRemoveShareDialogOpen(false)
                    }}
                    id="remove-share-dialog"
                    maskCloseable={true}
                    okBtnLabel="Remove"
                    title="Remove share"
                />
            ) : null}
        </>
    )
}
