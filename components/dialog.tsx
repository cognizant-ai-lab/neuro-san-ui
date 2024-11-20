import CloseIcon from "@mui/icons-material/Close"
import {SxProps} from "@mui/material"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"

// #region: Types
interface DialogProps {
    children: React.ReactNode
    className?: string
    id: string
    isOpen: boolean
    onClose: () => void
    sx?: SxProps
    title?: string
}
// #endregion: Types

export const MUIDialog: React.FC<DialogProps> = ({children, className, id, onClose, isOpen, sx, title}) => (
    <Dialog
        id={id}
        onClose={onClose}
        open={isOpen}
        className={className}
        PaperProps={{
            sx: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100%",
                minWidth: "100%",
            },
        }}
    >
        <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
        <IconButton
            aria-label="close"
            id={`${id}-close-icon-btn`}
            onClick={onClose}
            sx={(theme) => ({
                position: "absolute",
                right: 8,
                top: 8,
                color: theme.palette.grey[500],
            })}
        >
            <CloseIcon id={`${id}-close-icon`} />
        </IconButton>
        <DialogContent
            id={`${id}-content`}
            sx={sx}
        >
            {children}
        </DialogContent>
    </Dialog>
)
