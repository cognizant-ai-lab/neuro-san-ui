import {Button, Modal} from "antd"
import {useState} from "react"

export const ConfirmationModal = ({title = "", text = ""}) => {
    const [modalOpen, setModalOpen] = useState(true)

    return (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <Modal
            title={title}
            open={modalOpen}
            destroyOnClose={true}
            closable={false}
            onOk={() => setModalOpen(false)}
            okButtonProps={{
                id: "confirmation-modal-ok-btn",
            }}
            okType="default"
            footer={[
                <Button
                    id="confirmation-ok-btn"
                    key="confirmation-ok"
                    type="primary"
                    onClick={() => setModalOpen(false)}
                >
                    Confirm
                </Button>,
            ]}
            maskClosable={false}
        >
            <p id="confirmation-modal-text">{text}</p>
        </Modal>
    )
}
