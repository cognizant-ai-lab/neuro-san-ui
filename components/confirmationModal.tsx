import {Button, Modal} from "antd"
import {useState} from "react"
import ClipLoader from "react-spinners/ClipLoader"

export const ConfirmationModal = ({
    title = "",
    text = "",
    handleOk = null,
    handleCancel = null,
}: {
    title: string
    text: string
    handleOk?: () => void
    handleCancel?: () => void
}) => {
    const [modalOpen, setModalOpen] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const footerBtns = [
        <Button
            id="confirmation-ok-btn"
            key="confirmation-ok"
            type="primary"
            disabled={isLoading}
            onClick={async () => {
                if (handleOk) {
                    const isHandleOkAsync = handleOk.constructor.name === "AsyncFunction"
                    if (isHandleOkAsync) {
                        setIsLoading(true)
                        await handleOk()
                        setIsLoading(false)
                    } else {
                        handleOk()
                    }
                }
                setModalOpen(false)
            }}
        >
            {isLoading ? (
                <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    key="confirmation-modal-loading"
                    loading={true}
                    color="#FFFFFF"
                    cssOverride={{verticalAlign: "middle"}}
                    size={12}
                />
            ) : (
                "Confirm"
            )}
        </Button>,
    ]

    if (handleCancel) {
        footerBtns.unshift(
            <Button
                id="confirmation-cancel-btn"
                key="confirmation-cancel"
                onClick={() => {
                    if (handleCancel) handleCancel()
                    setModalOpen(false)
                }}
                disabled={isLoading}
            >
                Cancel
            </Button>
        )
    }

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <Modal
            title={title}
            open={modalOpen}
            destroyOnClose={true}
            closable={false}
            okButtonProps={{
                id: "confirmation-modal-ok-btn",
            }}
            cancelButtonProps={{
                id: "confirmation-modal-cancel-btn",
            }}
            okType="default"
            footer={footerBtns}
            maskClosable={false}
        >
            <p id="confirmation-modal-text">{text}</p>
        </Modal>
    )
}
