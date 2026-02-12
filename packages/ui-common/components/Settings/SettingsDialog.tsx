import RestoreIcon from "@mui/icons-material/SettingsBackupRestore"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Divider from "@mui/material/Divider"
import FormLabel from "@mui/material/FormLabel"
import {createTheme, ThemeProvider, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"

import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"
import {getBrandingColors} from "../../controller/agent/Agent"
import {useSettingsStore} from "../../state/Settings"
import {PaletteKey, PALETTES} from "../../Theme/Palettes"
import {ConfirmationModal} from "../Common/ConfirmationModal"
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
    const autoAgentIconColor = useSettingsStore((state) => state.settings.appearance.autoAgentIconColor)

    // Which palette to use for heatmaps and depth display?
    const paletteKey = useSettingsStore((state) => state.settings.appearance.rangePalette)
    const rangePaletteCheckmark = useCheckmarkFade()
    const brandingRangePalette = useSettingsStore((state) => state.settings.branding.rangePalette)

    // Customer branding
    const customer = useSettingsStore((state) => state.settings.branding.customer)
    const brandingCheckmark = useCheckmarkFade()
    const [customerInput, setCustomerInput] = useState<string>(customer)
    const [isBrandingApplying, setIsBrandingApplying] = useState<boolean>(false)

    // Record user's current theme so at least the settings dialog (with default MUI theme) matches that
    const theme = useTheme()
    const paletteMode = theme.palette.mode

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

    /**
     * Handle applying branding based on customer input. Calls backend to get colors then updates settings store.
     */
    const handleBrandingApply = async () => {
        setIsBrandingApplying(true)

        try {
            updateSettings({
                branding: {
                    customer: customerInput,
                },
            })

            const brandingColors = await getBrandingColors(customerInput)
            if (!brandingColors) {
                console.warn(`Failed to fetch branding colors for customer "${customerInput}"`)
                sendNotification(
                    NotificationType.error,
                    `Failed to fetch branding colors for "${customerInput}". Please check the name and try again.`
                )
                return
            }

            updateSettings({
                appearance: {
                    rangePalette: "brand",
                },
            })

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

            // secondary
            if (brandingColors["secondary"]) {
                updateSettings({
                    branding: {
                        secondary: brandingColors["secondary"],
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
                        rangePalette: brandingColors["rangePalette"],
                    },
                })
            }

            brandingCheckmark.trigger()
        } catch (error) {
            console.warn(`Failed to fetch branding colors for customer "${customerInput}":`, error)
            sendNotification(
                NotificationType.error,
                `Failed to fetch branding colors for "${customerInput}". Please check the name and try again.`
            )
            return
        } finally {
            setIsBrandingApplying(false)
        }
    }

    // Effect to keep input in sync with state store
    useEffect(() => {
        setCustomerInput(customer ?? "")
    }, [customer])

    const availablePalettes = customer && brandingRangePalette?.length > 0 ? {brand: brandingRangePalette} : PALETTES
    const paletteKeys: PaletteKey[] = Object.keys(availablePalettes) as (keyof typeof availablePalettes)[]

    return (
        // Always use default theme for settings dialog so user can always see to reset. It's possible that with
        // certain custom themes the dialog would be unreadable.
        <ThemeProvider
            theme={createTheme({
                palette: {
                    mode: paletteMode,
                },
            })}
        >
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
                        Branding
                    </Typography>
                    <Divider sx={{marginBottom: 2}} />
                    <Box sx={{display: "flex", alignItems: "center"}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: 2, marginBottom: "1rem", width: "100%"}}>
                            <FormLabel>Customer:</FormLabel>
                            <TextField
                                aria-label="branding-input"
                                onChange={(e) => setCustomerInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && customerInput?.trim().length > 0) {
                                        void handleBrandingApply()
                                    }
                                }}
                                value={customerInput ?? ""}
                                placeholder="Company or organization name"
                                size="small"
                                sx={{width: "100%"}}
                                variant="outlined"
                            />
                            <Button
                                disabled={
                                    customerInput?.trim().length === 0 ||
                                    isBrandingApplying ||
                                    customerInput === customer
                                }
                                variant="contained"
                                size="small"
                                onClick={handleBrandingApply}
                                startIcon={
                                    isBrandingApplying ? (
                                        <CircularProgress
                                            size={16}
                                            color="inherit"
                                        />
                                    ) : undefined
                                }
                                sx={{minWidth: "8rem"}}
                            >
                                {isBrandingApplying ? "Applying..." : "Apply"}
                            </Button>
                            <FadingCheckmark show={brandingCheckmark.show} />
                        </Box>
                    </Box>
                    <Typography
                        variant="subtitle1"
                        sx={{marginBottom: 1, marginTop: 2, fontWeight: 600}}
                    >
                        Network display
                    </Typography>
                    <Divider sx={{marginBottom: 2}} />
                    <Box sx={{display: "flex", alignItems: "center"}}>
                        <FormLabel>Palette (heatmap and depth):</FormLabel>
                        <Tooltip title={customer ? "Palette is locked when branding is applied" : ""}>
                            <ToggleButtonGroup
                                aria-label="depth-heatmap-palette-selection"
                                disabled={Boolean(customer)}
                                exclusive={true}
                                onChange={handlePaletteChange}
                                size="small"
                                sx={{
                                    cursor: customer ? "not-allowed" : "pointer",
                                    marginLeft: "1rem",
                                    marginRight: "1rem",
                                    opacity: customer ? 0.5 : 1,
                                }}
                                value={paletteKey}
                            >
                                {paletteKeys.map((key) => {
                                    const palette = availablePalettes[key as keyof typeof availablePalettes]
                                    if (!palette || !Array.isArray(palette)) return null

                                    const paletteArray: string[] = palette

                                    return (
                                        <ToggleButton
                                            aria-label={`${key}-palette-button`}
                                            key={key}
                                            value={key}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 0.5,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    sx={{textTransform: "capitalize"}}
                                                >
                                                    {key}
                                                </Typography>
                                                <Box sx={{display: "flex", gap: 0.5}}>
                                                    {Array.from({length: 5}, (_, i) => {
                                                        const paletteLength = paletteArray.length
                                                        const index = Math.floor((i * paletteLength) / 5)
                                                        return paletteArray[index]
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
                                    )
                                })}
                            </ToggleButtonGroup>
                        </Tooltip>
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
                        <Tooltip title={customer ? "Plasma color is locked when branding is applied" : ""}>
                            <input
                                aria-label="plasma-color-picker"
                                disabled={Boolean(customer)}
                                onChange={(e) =>
                                    updateSettings({
                                        appearance: {
                                            plasmaColor: e.target.value,
                                        },
                                    })
                                }
                                style={{cursor: customer ? "not-allowed" : "pointer", opacity: customer ? 0.5 : 1}}
                                type="color"
                                value={plasmaColor}
                            />
                        </Tooltip>
                        <FadingCheckmark show={plasmaColorCheckmark.show} />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent node color:</FormLabel>
                        <Tooltip title={customer ? "Agent node color is locked when branding is applied" : ""}>
                            <input
                                aria-label="agent-node-color-picker"
                                disabled={Boolean(customer)}
                                onChange={(e) =>
                                    updateSettings({
                                        appearance: {
                                            agentNodeColor: e.target.value,
                                        },
                                    })
                                }
                                style={{cursor: customer ? "not-allowed" : "pointer", opacity: customer ? 0.5 : 1}}
                                type="color"
                                value={agentNodeColor}
                            />
                        </Tooltip>
                        <FadingCheckmark show={agentNodeColorCheckmark.show} />
                    </Box>
                    <Box sx={{display: "flex", alignItems: "center", gap: 2, marginTop: "1rem"}}>
                        <FormLabel>Agent icon color:</FormLabel>
                        <Tooltip title={customer ? "Agent icon color is locked when branding is applied" : ""}>
                            <ToggleButtonGroup
                                disabled={Boolean(customer)}
                                exclusive
                                value={autoAgentIconColor ? "auto" : "custom"}
                                onChange={(_, value) => {
                                    if (value !== null) {
                                        updateSettings({
                                            appearance: {
                                                autoAgentIconColor: value === "auto",
                                            },
                                        })
                                        agentIconColorCheckmark.trigger()
                                    }
                                }}
                                size="small"
                                style={{cursor: customer ? "not-allowed" : "pointer", opacity: customer ? 0.5 : 1}}
                            >
                                <ToggleButton value="auto">Auto</ToggleButton>
                                <ToggleButton value="custom">Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </Tooltip>
                        <Tooltip
                            title={
                                customer
                                    ? "Agent icon color is locked when branding is applied"
                                    : autoAgentIconColor
                                      ? "Disabled when Auto is selected"
                                      : ""
                            }
                        >
                            <input
                                aria-label="agent-icon-color-picker"
                                disabled={Boolean(customer) || autoAgentIconColor}
                                onChange={(e) => {
                                    updateSettings({
                                        appearance: {
                                            agentIconColor: e.target.value,
                                        },
                                    })
                                    agentIconColorCheckmark.trigger()
                                }}
                                style={{cursor: customer ? "not-allowed" : "pointer", opacity: customer ? 0.5 : 1}}
                                type="color"
                                value={agentIconColor}
                            />
                        </Tooltip>
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
        </ThemeProvider>
    )
}
