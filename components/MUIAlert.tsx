import CloseIcon from "@mui/icons-material/Close"
import {Alert, AlertColor, Collapse, IconButton, styled, SxProps} from "@mui/material"
import {FC, ReactNode, useState} from "react"

// #region: Styled Components
const StyledAlert = styled(Alert)({
    fontSize: "large",
    marginBottom: "1rem",

    "& .MuiAlert-message": {
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
    },
})
// #endregion: Styled Components

// #region: Types
interface MUIAlertProps {
    children: ReactNode
    closeable?: boolean
    id: string
    severity: AlertColor
    sx?: SxProps
}
// #endregion: Types

export const MUIAlert: FC<MUIAlertProps> = ({children, closeable = false, id, severity, sx}) => {
    const [alertOpen, setAlertOpen] = useState<boolean>(true)

    const handleClose = () => {
        setAlertOpen(false)
    }

    return (
        <Collapse
            id={`${id}-collapse`}
            in={alertOpen}
        >
            <StyledAlert
                action={
                    closeable && (
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            id={`${id}-icon-button`}
                            onClick={() => {
                                setAlertOpen(false)
                            }}
                            size="small"
                            sx={{
                                bottom: "2px",
                                position: "relative",
                            }}
                        >
                            <CloseIcon
                                fontSize="inherit"
                                id={`${id}-close-icon`}
                            />
                        </IconButton>
                    )
                }
                id={id}
                onClose={closeable ? handleClose : undefined}
                severity={severity}
                sx={sx}
            >
                {children}
            </StyledAlert>
        </Collapse>
    )
}
