import RestoreIcon from "@mui/icons-material/SettingsBackupRestore"
import {ToggleButton} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import FormLabel from "@mui/material/FormLabel"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Typography from "@mui/material/Typography"
import {FC, MouseEvent as ReactMouseEvent, useState} from "react"
import {useColor} from "react-color-palette"

import "react-color-palette/css"
import {ColorPickerDialog} from "./ColorPickerDialog"
import {useSettingsStore} from "../../state/Settings"
import {PaletteKey, PALETTES} from "../../Theme/Palettes"
import {ConfirmationModal} from "../Common/confirmationModal"
import {MUIDialog} from "../Common/MUIDialog"

interface SettingsDialogProps {
    readonly id: string
    readonly isOpen?: boolean
    readonly onClose?: () => void
}

export const SettingsDialog: FC<SettingsDialogProps> = ({id, isOpen, onClose}) => {
    const updateSettings = useSettingsStore((state) => state.updateSettings)
    const resetSettings = useSettingsStore((state) => state.resetSettings)

    // Reset settings confirmation dialog state
    const [resetToDefaultSettingsOpen, setResetToDefaultSettingsOpen] = useState<boolean>(false)

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

    // In your component:
    const heatmapPalette = useSettingsStore((state) => state.settings.appearance.rangePalette)

    const handlePaletteChange = (_event: ReactMouseEvent<HTMLElement>, newPalette: PaletteKey | null) => {
        if (newPalette) {
            updateSettings({
                appearance: {
                    ...useSettingsStore.getState().settings.appearance,
                    rangePalette: newPalette,
                },
            })
        }
    }

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
            {resetToDefaultSettingsOpen ? (
                <ConfirmationModal
                    id="{id}-reset-to-default-settings-confirmation-modal"
                    content="Reset to default settings?"
                    handleCancel={() => {
                        setResetToDefaultSettingsOpen(false)
                    }}
                    handleOk={() => {
                        resetSettings()
                        setResetToDefaultSettingsOpen(false)
                    }}
                    title="Reset to default settings"
                />
            ) : null}
            <MUIDialog
                id={id}
                title={<Box sx={{fontSize: "1.5rem"}}>Settings</Box>}
                isOpen={isOpen}
                onClose={onClose}
                paperProps={{
                    minWidth: "50%",
                    minHeight: "50%",
                    backgroundColor: "var(--bs-dark-mode-dim)",
                    borderColor: "var(--bs-white)",
                    border: "1px solid var(--bs-white)",
                }}
            >
                <Box sx={{marginBottom: 3}}>
                    <Typography
                        variant="h6"
                        sx={{marginBottom: 1}}
                    >
                        Appearance
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{marginBottom: 1, marginTop: 2, fontWeight: 600}}
                    >
                        Network display
                    </Typography>
                    <Divider sx={{marginBottom: 2}} />
                    <Box sx={{display: "flex", alignItems: "center"}}>
                        <FormLabel>Palette (heatmap and depth):</FormLabel>
                        <ToggleButtonGroup
                            value={heatmapPalette}
                            exclusive
                            onChange={handlePaletteChange}
                            size="small"
                            sx={{marginLeft: "1rem", gap: 1}}
                        >
                            {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
                                <ToggleButton
                                    key={key}
                                    value={key}
                                >
                                    <Box
                                        sx={{display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center"}}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{textTransform: "capitalize"}}
                                        >
                                            {key}
                                        </Typography>
                                        <Box sx={{display: "flex", gap: 0.5}}>
                                            {Array.from({length: 5}, (_, i) => {
                                                const paletteLength = PALETTES[key].length
                                                // Evenly sample 5 colors from the palette
                                                const index = Math.floor((i * paletteLength) / 5)
                                                return PALETTES[key][index]
                                            }).map((color) => (
                                                <Box
                                                    key={color}
                                                    sx={{
                                                        width: "0.75rem",
                                                        height: "0.75rem",
                                                        backgroundColor: color,
                                                        border: "1px solid",
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                    <Typography
                        variant="subtitle1"
                        sx={{marginBottom: 1, marginTop: 2, fontWeight: 600}}
                    >
                        Network animation
                    </Typography>
                    <Divider sx={{marginBottom: 2}} />
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
                <Box sx={{marginTop: 4, paddingTop: 2, borderTop: "1px solid var(--bs-border-color)"}}>
                    <Button
                        variant="text"
                        startIcon={<RestoreIcon />}
                        onClick={() => {
                            setResetToDefaultSettingsOpen(true)
                        }}
                        sx={{color: "var(--bs-secondary)"}}
                    >
                        Reset to defaults
                    </Button>
                </Box>
            </MUIDialog>
        </>
    )
}
