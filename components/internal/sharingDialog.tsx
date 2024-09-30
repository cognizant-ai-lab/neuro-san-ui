/**
 * See class comment.
 */

import {Alert, Button, Modal, Tooltip} from "antd"
import {camelCase, startCase} from "lodash"
import {ChangeEvent, ReactNode, useEffect, useState} from "react"
import {Col, Form, Row} from "react-bootstrap"
import {IoMdClose} from "react-icons/io"

import {getShares, share} from "../../controller/authorize/share"
import {Project} from "../../controller/projects/types"
import {RoleType} from "../../generated/auth"
import {NotificationType, sendNotification} from "../notification"

interface SharingDialogProps {
    readonly title: ReactNode
    readonly visible: boolean
    readonly closeModal: () => void
    readonly currentUser: string
    readonly project: Project
}

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
    const [targetUser, setTargetUser] = useState<string>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [operationComplete, setOperationComplete] = useState<boolean>(false)
    const [currentShares, setCurrentShares] = useState<[string, RoleType][]>([])

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
        setTargetUser(null)
        setOperationComplete(false)
    }

    // Share the project with the target user
    async function handleOk() {
        setLoading(true)
        try {
            // Call sharing API
            await share(project.id, currentUser, targetUser)

            // Update the current shares list in the dialog to reassure the user
            setCurrentShares((prevShares) => [...prevShares, [targetUser, RoleType.TOURIST]])
            setOperationComplete(true)
        } catch (e) {
            sendNotification(NotificationType.error, "Failed to share project", `Due to: ${e}`)
        } finally {
            setLoading(false)
        }
    }

    // Not allowed to share with self
    const isSharingWithSelf = targetUser === currentUser

    // Can't share with a user already shared with
    const alreadySharedWithUser = currentShares?.some(([user]) => user === targetUser)

    // Have to specify a target user to share with
    const targetUserSpecified = targetUser && targetUser.trim() !== ""
    const enableOkButton = operationComplete || (targetUserSpecified && !isSharingWithSelf && !alreadySharedWithUser)

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

    const opacity = enableOkButton ? 1.0 : 0.5

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <Modal
            title={title}
            open={visible}
            centered={true}
            destroyOnClose={true}
            okText={operationComplete ? "Close" : "Ok"}
            footer={[
                <Button
                    id="sharing-dialog-cancel-button"
                    key="cancel_button"
                    onClick={closeAndClear}
                    style={{display: operationComplete ? "none" : "inline-block"}}
                >
                    Cancel
                </Button>,
                <Tooltip
                    id="ok_button_tooltip"
                    key="ok_button_tooltip"
                    title={reasonOkButtonDisabled}
                >
                    <Button
                        id="sharing-dialog-ok-button"
                        key="ok_button"
                        type="primary"
                        onClick={operationComplete ? closeAndClear : handleOk}
                        disabled={!enableOkButton}
                        loading={loading}
                        style={{opacity: opacity}}
                    >
                        {operationComplete ? "Close" : "Ok"}
                    </Button>
                </Tooltip>,
            ]}
        >
            <Form id="sharing-form">
                <Form.Group
                    id="sharing-form-group-target-user"
                    as={Row}
                    style={{marginTop: "16px", paddingRight: "0", paddingLeft: "0"}}
                >
                    <Col
                        id="sharing-form-col-target-user"
                        md={8}
                        style={{margin: "0", padding: "0 4px"}}
                    >
                        <Form.Control
                            id="sharing-form-target-user"
                            placeholder="User to share with"
                            type="text"
                            value={targetUser || ""}
                            onChange={handleInputChange}
                            disabled={operationComplete}
                            ref={(input) => input?.focus()}
                        />
                    </Col>
                    <Col
                        id="sharing-form-col-role"
                        md={4}
                        style={{margin: "0", padding: "0 8px"}}
                    >
                        <Form.Select
                            id="sharing-form-role-select"
                            defaultValue={1}
                            disabled={operationComplete}
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
                        </Form.Select>
                    </Col>
                </Form.Group>
                <Form.Group
                    id="sharing-form-group-checkbox"
                    as={Row}
                    style={{marginTop: "16px"}}
                >
                    <Col id="sharing-form-col-checkbox">
                        <Tooltip
                            id="sharing-form-checkbox-tooltip"
                            title={
                                "This feature is not yet implemented. " +
                                "For now, only entire project hierarchies can be shared."
                            }
                        >
                            <span id="sharing-form-checkbox-tooltip-span">
                                <Form.Check
                                    id="sharing-form-checkbox"
                                    type="checkbox"
                                    label="Also share related items such as Experiments and Runs"
                                    style={{fontSize: "large"}}
                                    checked={true}
                                    disabled={true}
                                />
                            </span>
                        </Tooltip>
                    </Col>
                </Form.Group>
                <Form.Group
                    id="sharing-form-group-current-shares"
                    style={{marginTop: "16px"}}
                >
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
                                            <IoMdClose
                                                id={`close-icon-${index}`}
                                                style={{
                                                    marginRight: "10px",
                                                    cursor: relation !== RoleType.OWNER ? "pointer" : "not-allowed",
                                                    transition: "color 0.3s ease",
                                                    color: "black",
                                                }}
                                                onMouseEnter={(e) =>
                                                    relation !== RoleType.OWNER && (e.currentTarget.style.color = "red")
                                                }
                                                onMouseLeave={(e) => (e.currentTarget.style.color = "black")}
                                                onClick={async () => {
                                                    if (relation !== RoleType.OWNER) {
                                                        Modal.confirm({
                                                            title: "Remove share",
                                                            content:
                                                                "You are about to revoke access to project " +
                                                                `"${project.name}" for "${user}". Are you sure?`,
                                                            centered: true,
                                                            okButtonProps: {
                                                                id: "remove-share-ok-button",
                                                            },
                                                            okText: "Remove",
                                                            onOk: async () => {
                                                                await share(project.id, currentUser, user, false)
                                                                setCurrentShares((prevShares) =>
                                                                    prevShares.filter(([u]) => u !== user)
                                                                )
                                                                setOperationComplete(false)
                                                                setTargetUser(null)
                                                            },
                                                            cancelButtonProps: {
                                                                id: "unshare-cancel-button",
                                                            },
                                                        })
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
                </Form.Group>
            </Form>
            {operationComplete ? (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    message={`Project shared with "${targetUser}"`}
                    type="success"
                    style={{marginTop: "20px", marginBottom: "20px"}}
                />
            ) : null}
        </Modal>
    )
}
