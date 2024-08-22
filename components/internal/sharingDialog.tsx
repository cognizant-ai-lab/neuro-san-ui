import {Tooltip, Alert, Modal} from "antd"
import {ReactNode, useState} from "react"
import {Col, Form, Row} from "react-bootstrap"

import {share} from "../../controller/authorization/share"
import {NotificationType, sendNotification} from "../notification"

interface SharingDialogProps {
    readonly title: ReactNode
    readonly visible: boolean
    readonly closeModal: () => void
    readonly currentUser: string
    readonly projectId: number
}

export default function SharingDialog({
    title,
    visible,
    closeModal,
    currentUser,
    projectId,
}: SharingDialogProps): JSX.Element | null {
    const [targetUser, setTargetUser] = useState<string>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [operationComplete, setOperationComplete] = useState<boolean>(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTargetUser(e.target.value)
    }

    function closeAndClear() {
        closeModal()
        setTargetUser(null)
        setOperationComplete(false)
    }

    async function handleOk() {
        setLoading(true)
        try {
            await share(projectId, currentUser, targetUser)
            setOperationComplete(true)
        } catch (e) {
            sendNotification(NotificationType.error, "Failed to share project", `Due to: ${e}`)
        } finally {
            setLoading(false)
        }
    }

    const shouldDisableOkButton = !targetUser || targetUser.trim() === ""

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <Modal
            title={title}
            open={visible}
            onOk={operationComplete ? closeAndClear : handleOk}
            onCancel={closeAndClear}
            centered={true}
            destroyOnClose={true}
            okText={operationComplete ? "Close" : "Ok"}
            okButtonProps={{
                disabled: !operationComplete && shouldDisableOkButton,
                loading: loading,
                style: {opacity: shouldDisableOkButton && !operationComplete ? 0.5 : 1},
            }}
            cancelButtonProps={{style: {display: operationComplete ? "none" : "inline-block"}}}
        >
            <Form id="sharing-form">
                <Form.Group
                    id="sharing-form-group-email"
                    as={Row}
                    className="my-8 pr-0 pl-0"
                >
                    <Col
                        id="sharing-form-col-email"
                        md={8}
                        className="mx-0 px-1"
                    >
                        <Form.Control
                            id="sharing-form-target-user"
                            placeholder="john.doe@my_company.com"
                            value={targetUser}
                            onChange={handleInputChange}
                        />
                    </Col>
                    <Col
                        id="sharing-form-col-role"
                        md={4}
                        className="mx-0 px-1"
                    >
                        <Form.Select
                            id="sharing-form-role-select"
                            defaultValue={1}
                        >
                            <option
                                id="sharing-form-role-viewer"
                                value="1"
                            >
                                Viewer
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
                    className="my-8"
                >
                    <Col id="sharing-form-col-checkbox">
                        <Tooltip
                            id="sharing-form-checkbox-tooltip"
                            title={
                                "This feature is not yet implemented. " +
                                "For now, only entire project hierarchies can be shared."
                            }
                        >
                            <span id="sharing-form-checkbox-tooltip">
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
            </Form>
            {operationComplete ? (
                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                <Alert
                    message={`Project shared with "${targetUser}"`}
                    type="success"
                />
            ) : null}
        </Modal>
    )
}
