import CloseIcon from "@mui/icons-material/Close"
import {styled, SxProps} from "@mui/material"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import {FC, ReactNode} from "react"

// #region: Styled Components
const StyledDialogTitle = styled(DialogTitle)({
    fontSize: "1rem",
    maxWidth: "580px",
    paddingBottom: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
})
// #endregion: Styled Components

// #region: Types
interface MUIDialogProps {
    children: ReactNode
    className?: string
    closeable?: boolean
    contentSx?: SxProps
    footer?: JSX.Element
    id: string
    isOpen: boolean
    onClose: () => void
    paperProps?: SxProps
    title?: ReactNode
}
// #endregion: Types

export const MUIDialog: FC<MUIDialogProps> = ({
    children,
    className,
    closeable = true,
    contentSx,
    footer,
    id,
    isOpen,
    onClose,
    paperProps,
    title,
}) => (
    <Dialog
        data-testid={id}
        id={id}
        onClose={onClose}
        open={isOpen}
        className={className}
        PaperProps={paperProps}
    >
        <StyledDialogTitle id={`${id}-title`}>{title}</StyledDialogTitle>
        {closeable && (
            <IconButton
                aria-label="close"
                id={`${id}-close-icon-btn`}
                onClick={onClose}
                sx={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                }}
            >
                <CloseIcon
                    data-testid={`${id}-close-icon`}
                    id={`${id}-close-icon`}
                    sx={{color: "var(--bs-gray-medium)", fontSize: "1rem"}}
                />
            </IconButton>
        )}
        <DialogContent
            id={`${id}-content`}
            sx={contentSx}
        >
            {children}
        </DialogContent>
        <DialogActions
            id={`${id}-footer`}
            sx={{padding: "10px"}}
        >
            {footer}
        </DialogActions>
    </Dialog>
)
