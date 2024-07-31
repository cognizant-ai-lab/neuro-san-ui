import {Button, Modal} from "antd"
import {useState} from "react"

// Will be used in https://github.com/leaf-ai/unileaf/pull/1764
// ts-prune-ignore-next
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
                try {
                    if (handleOk) {
                        setIsLoading(true)
                        await handleOk()
                    }
                } finally {
                    setModalOpen(false)
                    setIsLoading(false)
                }
            }}
        >
            Confirm
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
