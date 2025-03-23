import CloseIcon from "@mui/icons-material/Close"
import {SxProps} from "@mui/material"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import {FC, ReactNode} from "react"

// #region: Types
type Anchor = "top" | "left" | "bottom" | "right"

interface MUIDrawerProps {
    id: string
    anchor?: Anchor
    children: ReactNode
    isOpen: boolean
    onClose: () => void
    paperProps?: SxProps
    title?: ReactNode
}
// #endregion: Types

export const MUIDrawer: FC<MUIDrawerProps> = ({id, anchor = "right", children, isOpen, onClose, paperProps, title}) => (
    <Drawer
        id={id}
        anchor={anchor}
        onClose={onClose}
        open={isOpen}
        PaperProps={paperProps}
    >
        <Box
            id={`${id}-container`}
            sx={{display: "flex", flexDirection: "column", height: "100%"}}
        >
            <Toolbar
                id={`${id}-toolbar`}
                sx={{
                    backgroundColor: "var(--bs-primary)",
                    color: "var(--bs-white)",
                }}
            >
                <IconButton
                    id={`${id}-icon-button`}
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{
                        right: "10px",
                        position: "relative",
                    }}
                >
                    <CloseIcon
                        id={`${id}-close-icon`}
                        fontSize="inherit"
                    />
                </IconButton>
                <Typography
                    id={`${id}-title`}
                    variant="h6"
                    noWrap
                    component="div"
                    sx={{fontWeight: "bold"}}
                >
                    {title}
                </Typography>
            </Toolbar>
            <Box
                id={`${id}-box`}
                sx={{flex: 1, overflow: "hidden"}}
            >
                {children}
            </Box>
        </Box>
    </Drawer>
)
