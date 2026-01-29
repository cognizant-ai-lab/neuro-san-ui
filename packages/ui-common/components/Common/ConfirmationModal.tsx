import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import {styled} from "@mui/material/styles"
import {FC, JSX as ReactJSX, ReactNode, useState} from "react"

import {MUIDialog} from "./MUIDialog"

// #region: Styled Components
const StyledButton = styled(Button)({
    fontSize: "0.8em",
    padding: "0px 7px",
})

const StyledOKButton = styled(StyledButton)(({disabled}) => ({
    backgroundColor: disabled ? "rgba(0, 0, 0, 0.12) !important" : "var(--bs-primary) !important",
}))
// #endregion: Styled Components

// #region: Types
interface ConfirmationModalProps {
    cancelBtnLabel?: string
    closeable?: boolean
    content: ReactNode
    handleCancel?: () => void
    handleOk?: () => void
    id: string
    maskCloseable?: boolean
    okBtnLabel?: string
    title: ReactNode
}
// #endregion: Types

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
    cancelBtnLabel,
    closeable = true,
    content = "",
    handleCancel = null,
    handleOk = null,
    id = "",
    maskCloseable = false,
    okBtnLabel,
    title = "",
}) => {
    const [modalOpen, setModalOpen] = useState<boolean>(true)
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const handleCloseWrapper = (_event?: object, reason?: string) => {
        // Prevent closing on click of gray background mask
        if (!maskCloseable && reason === "backdropClick") {
            return
        }
        handleCancel?.() // call handleCancel if it's not null
        setModalOpen(false)
    }

    const handleOKWrapper = async () => {
        try {
            if (handleOk) {
                setIsLoading(true)
                handleOk()
            }
        } finally {
            setModalOpen(false)
            setIsLoading(false)
        }
    }

    const Footer: ReactJSX.Element = (
        <>
            {handleCancel && ( // If there is no handleCancel passed, Cancel button will not be rendered
                <StyledButton
                    // This ID needs to be dynamic because there can be several instances of this on the page
                    id={`${id}-confirm-cancel-btn`}
                    key="confirm-cancel"
                    onClick={() => handleCloseWrapper()}
                    disabled={isLoading}
                    variant="outlined"
                >
                    {cancelBtnLabel ?? "Cancel"}
                </StyledButton>
            )}
            <StyledOKButton
                // This ID needs to be dynamic because there can be several instances of this on the page
                id={`${id}-confirm-ok-btn`}
                key="confirm-ok"
                disabled={isLoading}
                onClick={() => handleOKWrapper()}
                variant="contained"
            >
                {okBtnLabel ?? "Confirm"}
            </StyledOKButton>
        </>
    )

    return (
        <MUIDialog
            closeable={closeable}
            contentSx={{fontSize: "0.8rem", minWidth: "550px", paddingTop: "0"}}
            footer={Footer}
            id={`${id}-confirm-main`}
            isOpen={modalOpen}
            onClose={(_event?: object, reason?: string) => handleCloseWrapper(_event, reason)}
            title={title}
        >
            {/* This ID needs to be dynamic because there can be several instances of this on the page */}
            <Box
                id={`${id}-confirm-content`}
                sx={{marginTop: "15px"}}
            >
                {content}
            </Box>
        </MUIDialog>
    )
}
