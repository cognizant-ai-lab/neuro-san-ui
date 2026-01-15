import {Button} from "@mui/material"
import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import FormLabel from "@mui/material/FormLabel"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import {FC, useState} from "react"
import {ColorPicker, useColor} from "react-color-palette"
import "react-color-palette/css"

import {useLocalStorage} from "../../utils/useLocalStorage"
import {MUIDialog} from "../Common/MUIDialog"

interface SettingsDialogProps {
    readonly id: string
    readonly isOpen?: boolean
    readonly onClose?: () => void
}

// eslint-disable-next-line newline-per-chained-call
const green = getComputedStyle(document.documentElement).getPropertyValue("--bs-green").trim()

export const SettingsDialog: FC<SettingsDialogProps> = ({id, isOpen, onClose}) => {
    const [color, setColor] = useColor(green)
    const [colorPickerAnchorEl, setColorPickerAnchorEl] = useState<null | HTMLElement>(null)
    const colorPickerOpen = Boolean(colorPickerAnchorEl)

    const [, setPlasmaColorLocalStorage] = useLocalStorage("plasmaColor", green)

    return (
        <>
            <Popover
                open={colorPickerOpen}
                anchorEl={colorPickerAnchorEl}
                onClose={() => setColorPickerAnchorEl(null)}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: "300px",
                            padding: "1rem",
                            paddingTop: 5,
                        },
                    },
                }}
            >
                <Typography
                    variant="h6"
                    sx={{mb: 2, color: "white"}}
                >
                    Choose Color
                </Typography>
                <ColorPicker
                    height={100}
                    color={color}
                    onChange={setColor}
                    hideInput={true}
                    hideAlpha={true}
                />
                <Button
                    variant="contained"
                    onClick={() => {
                        setColorPickerAnchorEl(null)
                        setPlasmaColorLocalStorage(color.hex)
                    }}
                    sx={{mt: 2, width: "100%"}}
                >
                    OK
                </Button>
            </Popover>
            <MUIDialog
                id={id}
                title={<Box sx={{fontSize: "1.5rem"}}>Settings</Box>}
                isOpen={isOpen}
                onClose={onClose}
                paperProps={{
                    fontSize: "0.8rem",
                    minWidth: "75%",
                    minHeight: "75%",
                    paddingTop: "0",
                    backgroundColor: "var(--bs-dark-mode-dim)",
                    borderColor: "white",
                    border: "1px solid var(--bs-white)",
                }}
            >
                <Box sx={{mb: 3}}>
                    <Typography
                        variant="h6"
                        sx={{mb: 1}}
                    >
                        Appearance
                    </Typography>
                    <Divider sx={{mb: 2}} />
                    <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                        <FormLabel>Plasma animation color:</FormLabel>
                        <Box
                            style={{
                                backgroundColor: color.hex,
                                width: "1.5rem",
                                height: "1.5rem",
                                border: "1px solid #000",
                                cursor: "pointer",
                            }}
                            onClick={(e) => setColorPickerAnchorEl(e.currentTarget)}
                        />
                    </Box>
                </Box>
            </MUIDialog>
        </>
    )
}
