import Box from "@mui/material/Box"
import Divider from "@mui/material/Divider"
import FormLabel from "@mui/material/FormLabel"
import Typography from "@mui/material/Typography"
import {FC, useState} from "react"
import {useColor} from "react-color-palette"
import "react-color-palette/css"

import {ColorPickerDialog} from "./ColorPickerDialog"
import {useSettingsStore} from "../../state/Settings"
import {MUIDialog} from "../Common/MUIDialog"

interface SettingsDialogProps {
    readonly id: string
    readonly isOpen?: boolean
    readonly onClose?: () => void
}

export const SettingsDialog: FC<SettingsDialogProps> = ({id, isOpen, onClose}) => {
    const updateSettings = useSettingsStore((state) => state.updateSettings)

    // Plasma color
    const [plasmaColorPickerAnchorEl, setPlasmaColorPickerAnchorEl] = useState<null | HTMLElement>(null)
    const plasmaColorPickerOpen = Boolean(plasmaColorPickerAnchorEl)
    const plasmaColorFromStore = useSettingsStore((state) => state.settings.appearance.plasmaColor)
    const [plasmaColor, setPlasmaColor] = useColor(plasmaColorFromStore)

    // Agent node color
    const [agentNodeColorPickerAnchorEl, setAgentNodeColorPickerAnchorEl] = useState<null | HTMLElement>(null)
    const agentNodeColorPickerOpen = Boolean(agentNodeColorPickerAnchorEl)
    const agentNodeColorFromStore = useSettingsStore((state) => state.settings.appearance.agentNodeColor)
    const [agentNodeColor, setAgentNodeColor] = useColor(agentNodeColorFromStore)

    // Agent icon color
    const [agentIconColorPickerAnchorEl, setAgentIconColorPickerAnchorEl] = useState<null | HTMLElement>(null)
    const agentIconColorPickerOpen = Boolean(agentIconColorPickerAnchorEl)
    const agentIconColorFromStore = useSettingsStore((state) => state.settings.appearance.agentIconColor)
    const [agentIconColor, setAgentIconColor] = useColor(agentIconColorFromStore)

    return (
        <>
            <ColorPickerDialog
                open={plasmaColorPickerOpen}
                anchorEl={plasmaColorPickerAnchorEl}
                onClose={() => setPlasmaColorPickerAnchorEl(null)}
                color={plasmaColor}
                onChange={setPlasmaColor}
                onClick={() => {
                    setPlasmaColorPickerAnchorEl(null)
                    updateSettings({
                        appearance: {
                            ...useSettingsStore.getState().settings.appearance,
                            plasmaColor: plasmaColor.hex,
                        },
                    })
                }}
            />
            <ColorPickerDialog
                open={agentNodeColorPickerOpen}
                anchorEl={agentNodeColorPickerAnchorEl}
                onClose={() => setAgentNodeColorPickerAnchorEl(null)}
                color={agentNodeColor}
                onChange={setAgentNodeColor}
                onClick={() => {
                    setAgentNodeColorPickerAnchorEl(null)
                    updateSettings({
                        appearance: {
                            ...useSettingsStore.getState().settings.appearance,
                            agentNodeColor: agentNodeColor.hex,
                        },
                    })
                }}
            />
            <ColorPickerDialog
                open={agentIconColorPickerOpen}
                anchorEl={agentIconColorPickerAnchorEl}
                onClose={() => setAgentIconColorPickerAnchorEl(null)}
                color={agentIconColor}
                onChange={setAgentIconColor}
                onClick={() => {
                    setAgentIconColorPickerAnchorEl(null)
                    updateSettings({
                        appearance: {
                            ...useSettingsStore.getState().settings.appearance,
                            agentIconColor: agentIconColor.hex,
                        },
                    })
                }}
            />
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
                                backgroundColor: plasmaColor.hex,
                                width: "1.5rem",
                                height: "1.5rem",
                                border: "1px solid #000",
                                cursor: "pointer",
                            }}
                            onClick={(e) => setPlasmaColorPickerAnchorEl(e.currentTarget)}
                        />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent node color:</FormLabel>
                        <Box
                            style={{
                                backgroundColor: agentNodeColor.hex,
                                width: "1.5rem",
                                height: "1.5rem",
                                border: "1px solid #000",
                                cursor: "pointer",
                            }}
                            onClick={(e) => setAgentNodeColorPickerAnchorEl(e.currentTarget)}
                        />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent icon color:</FormLabel>
                        <Box
                            style={{
                                backgroundColor: agentIconColor.hex,
                                width: "1.5rem",
                                height: "1.5rem",
                                border: "1px solid #000",
                                cursor: "pointer",
                            }}
                            onClick={(e) => setAgentIconColorPickerAnchorEl(e.currentTarget)}
                        />
                    </Box>
                </Box>
            </MUIDialog>
        </>
    )
}
