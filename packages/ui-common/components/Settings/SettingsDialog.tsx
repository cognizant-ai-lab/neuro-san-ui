import RestoreIcon from "@mui/icons-material/SettingsBackupRestore"
import {ToggleButton} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import FormLabel from "@mui/material/FormLabel"
import TextField from "@mui/material/TextField"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Typography from "@mui/material/Typography"
import {FC, MouseEvent as ReactMouseEvent, useState} from "react"

import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"
import {getBrandingColors} from "../../controller/agent/Agent"
import {useSettingsStore} from "../../state/Settings"
import {PaletteKey, PALETTES} from "../../Theme/Palettes"
import {ConfirmationModal} from "../Common/confirmationModal"
import {MUIDialog} from "../Common/MUIDialog"
import {NotificationType, sendNotification} from "../Common/notification"

interface SettingsDialogProps {
    readonly id: string
    readonly isOpen?: boolean
    readonly onClose?: () => void
}

export const SettingsDialog: FC<SettingsDialogProps> = ({id, isOpen, onClose}) => {
    // Settings store actions
    const updateSettings = useSettingsStore((state) => state.updateSettings)
    const resetSettings = useSettingsStore((state) => state.resetSettings)

    // Reset settings confirmation dialog state
    const [resetToDefaultSettingsOpen, setResetToDefaultSettingsOpen] = useState<boolean>(false)

    // Plasma color
    const plasmaColor = useSettingsStore((state) => state.settings.appearance.plasmaColor)
    const plasmaColorCheckmark = useCheckmarkFade()

    // Agent node color
    const agentNodeColor = useSettingsStore((state) => state.settings.appearance.agentNodeColor)
    const agentNodeColorCheckmark = useCheckmarkFade()

    // Agent icon color
    const agentIconColor = useSettingsStore((state) => state.settings.appearance.agentIconColor)
    const agentIconColorCheckmark = useCheckmarkFade()

    // Which palette to use for heatmaps and depth display?
    const paletteKey = useSettingsStore((state) => state.settings.appearance.rangePalette)
    const rangePaletteCheckmark = useCheckmarkFade()

    // Customer for branding
    const customer = useSettingsStore((state) => state.settings.branding.customer)
    const customerCheckmark = useCheckmarkFade()

    const handlePaletteChange = (_event: ReactMouseEvent<HTMLElement>, newPalette: PaletteKey | null) => {
        if (newPalette) {
            updateSettings({
                appearance: {
                    rangePalette: newPalette,
                },
            })
        }
        rangePaletteCheckmark.trigger()
    }

    const [brandingInput, setBrandingInput] = useState<string>(customer)

    const handleBrandingApply = async () => {
        updateSettings({
            branding: {
                customer: brandingInput,
            },
        })
        customerCheckmark.trigger()

        const brandingColors = await getBrandingColors(brandingInput)
        console.debug("Fetched branding colors:", brandingColors)

        if (brandingColors["plasma"]) {
            updateSettings({
                appearance: {
                    plasmaColor: brandingColors["plasma"],
                },
            })
            plasmaColorCheckmark.trigger()
        }

        if (brandingColors["nodeColor"]) {
            updateSettings({
                appearance: {
                    agentNodeColor: brandingColors["nodeColor"],
                },
            })
            agentNodeColorCheckmark.trigger()
        }

        // primary
        if (brandingColors["primary"]) {
            updateSettings({
                branding: {
                    primary: brandingColors["primary"],
                },
            })
        }

        // background
        if (brandingColors["background"]) {
            updateSettings({
                branding: {
                    background: brandingColors["background"],
                },
            })
        }

        if (Array.isArray(brandingColors["rangePalette"])) {
            updateSettings({
                branding: {
                    rangePalette: brandingColors["rangePalette"] as string[],
                },
            })
        }
    }

    return (
        <>
            {resetToDefaultSettingsOpen ? (
                <ConfirmationModal
                    id={`${id}-reset-to-default-settings-confirmation-modal`}
                    content={
                        "This will reset all settings to their default values and cannot be undone. " +
                        "Are you sure you want to proceed?"
                    }
                    handleCancel={() => {
                        setResetToDefaultSettingsOpen(false)
                    }}
                    handleOk={() => {
                        setResetToDefaultSettingsOpen(false)
                        resetSettings()
                        sendNotification(NotificationType.success, "Settings have been reset to default values.")
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
                    border: "1px solid",
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
                        <Box sx={{display: "flex", alignItems: "center", gap: 2, marginBottom: "1rem"}}>
                            <FormLabel>Branding:</FormLabel>
                            <TextField
                                aria-label="branding-input"
                                onChange={(e) => setBrandingInput(e.target.value)}
                                value={brandingInput}
                                size="small"
                                variant="outlined"
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleBrandingApply}
                            >
                                Apply
                            </Button>
                            <FadingCheckmark show={customerCheckmark.show} />
                        </Box>
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center"}}>
                        <FormLabel>Palette (heatmap and depth):</FormLabel>
                        <ToggleButtonGroup
                            aria-label="depth-heatmap-palette-selection"
                            exclusive={true}
                            onChange={handlePaletteChange}
                            size="small"
                            sx={{marginLeft: "1rem", marginRight: "1rem"}}
                            value={paletteKey}
                        >
                            {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
                                <ToggleButton
                                    aria-label={`${key}-palette-button`}
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
                        <FadingCheckmark show={rangePaletteCheckmark.show} />
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
                        <input
                            aria-label="plasma-color-picker"
                            onChange={(e) =>
                                updateSettings({
                                    appearance: {
                                        plasmaColor: e.target.value,
                                    },
                                })
                            }
                            type="color"
                            value={plasmaColor}
                        />
                        <FadingCheckmark show={plasmaColorCheckmark.show} />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent node color:</FormLabel>
                        <input
                            aria-label="agent-node-color-picker"
                            onChange={(e) =>
                                updateSettings({
                                    appearance: {
                                        agentNodeColor: e.target.value,
                                    },
                                })
                            }
                            type="color"
                            value={agentNodeColor}
                        />
                        <FadingCheckmark show={agentNodeColorCheckmark.show} />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent icon color:</FormLabel>
                        <input
                            aria-label="agent-icon-color-picker"
                            onChange={(e) =>
                                updateSettings({
                                    appearance: {
                                        agentIconColor: e.target.value,
                                    },
                                })
                            }
                            type="color"
                            value={agentIconColor}
                        />
                        <FadingCheckmark show={agentIconColorCheckmark.show} />
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
