import RestoreIcon from "@mui/icons-material/SettingsBackupRestore"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import FormLabel from "@mui/material/FormLabel"
import {createTheme, styled, ThemeProvider, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {ComponentPropsWithoutRef, FC, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"

import {ApiKeyInput} from "./ApiKeyInput"
import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"
import {getBrandingSuggestions} from "../../controller/agent/Agent"
import {isAnthropicKeyValid, isOpenAIKeyValid} from "../../controller/llm/Providers"
import {DEFAULT_SETTINGS, LLMProvider, PaletteKey, useSettingsStore} from "../../state/Settings"
import {PALETTES} from "../../Theme/Palettes"
import {ConfirmationModal} from "../Common/ConfirmationModal"
import {MUIDialog} from "../Common/MUIDialog"
import {NotificationType, sendNotification} from "../Common/notification"
import {CustomerLogo} from "../Logo/CustomerLogo"

//#region: Styled Components
const SettingsSectionTitleBase: FC<ComponentPropsWithoutRef<typeof Typography>> = (props) => (
    <Typography
        variant="h6"
        {...props}
    />
)

const SettingsSectionTitle = styled(SettingsSectionTitleBase)(({theme}) => ({
    marginBottom: theme.spacing(0.5),
}))

const Section = styled(Box)(({theme}) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
}))

const SubsectionTitle = styled(Typography)(({theme}) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    fontWeight: 600,
    paddingBottom: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5),
    width: "100%",
}))

const SubSection = styled(Box)(({theme}) => ({
    alignItems: "start",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
}))

const SubSectionBody = styled(Box)(({theme}) => ({
    alignContent: "center",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    width: "100%",
}))
//#endregion: Styled Components

//#region: Types and Interfaces
interface SettingsDialogProps {
    readonly id: string
    readonly isOpen?: boolean
    readonly logoServiceToken?: string
    readonly onClose?: () => void
}

interface LLMProviderInputConfig {
    vendor: LLMProvider
    idSuffix: string
    logo: string
    onTest: (key: string) => Promise<boolean>
    placeholder: string
}
//#endregion: Types and Interfaces

// eslint-disable-next-line react/no-multi-comp -- styled component shim is only used in this module
export const SettingsDialog: FC<SettingsDialogProps> = ({id, isOpen, logoServiceToken, onClose}) => {
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
    const logoCheckmark = useCheckmarkFade()
    const [customerInput, setCustomerInput] = useState<string>(customer)
    const [isBrandingApplying, setIsBrandingApplying] = useState<boolean>(false)
    const logoSource = useSettingsStore((state) => state.settings.branding.logoSource)
    const iconSuggestion = useSettingsStore((state) => state.settings.branding.iconSuggestion)

    // Zen mode
    const enableZenMode = useSettingsStore((state) => state.settings.behavior.enableZenMode)
    const enableZenModeCheckmark = useCheckmarkFade()

    // API keys
    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)

    // Native names setting
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)
    const nativeNamesCheckmark = useCheckmarkFade()

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

        let brandingSuggestions
        try {
            brandingSuggestions = await getBrandingSuggestions(customerInput)
        } catch (e) {
            console.warn(`Failed to fetch branding suggestions for customer "${customerInput}"`, e)
            sendNotification(
                NotificationType.error,
                `Failed to fetch branding suggestions for "${customerInput}"`,
                "Please check the name and try again. If the problem persists, there may be an issue with the " +
                    "branding service."
            )
            return
        } finally {
            setIsBrandingApplying(false)
        }

        updateSettings({
            branding: {
                customer: customerInput,
            },
        })

        updateSettings({
            appearance: {
                rangePalette: "brand",
            },
        })

        if (brandingSuggestions["plasma"]) {
            updateSettings({
                appearance: {
                    plasmaColor: brandingSuggestions["plasma"],
                },
            })
            plasmaColorCheckmark.trigger()
        }

        if (brandingSuggestions["nodeColor"]) {
            updateSettings({
                appearance: {
                    agentNodeColor: brandingSuggestions["nodeColor"],
                },
            })
            agentNodeColorCheckmark.trigger()
        }

        // primary
        if (brandingSuggestions["primary"]) {
            updateSettings({
                branding: {
                    primary: brandingSuggestions["primary"],
                },
            })
        }

        // secondary
        if (brandingSuggestions["secondary"]) {
            updateSettings({
                branding: {
                    secondary: brandingSuggestions["secondary"],
                },
            })
        }

        // background
        if (brandingSuggestions["background"]) {
            updateSettings({
                branding: {
                    background: brandingSuggestions["background"],
                },
            })
        }

        if (Array.isArray(brandingSuggestions["rangePalette"])) {
            updateSettings({
                branding: {
                    rangePalette: brandingSuggestions["rangePalette"],
                },
            })
        }

        if (brandingSuggestions["iconSuggestion"]) {
            updateSettings({
                branding: {
                    iconSuggestion: brandingSuggestions["iconSuggestion"],
                    logoSource: logoServiceToken ? "auto" : "generic",
                },
            })
        }

        brandingCheckmark.trigger()
        setIsBrandingApplying(false)
    }

    const handleBrandingClear = () => {
        updateSettings({
            appearance: {
                rangePalette: DEFAULT_SETTINGS.appearance.rangePalette,
            },
            branding: {...DEFAULT_SETTINGS.branding},
        })
    }

    const persistKey = (vendor: LLMProvider, key: string) => {
        updateSettings({
            apiKeys: {
                [vendor]: key,
            },
        })
    }

    // Effect to keep input in sync with state store
    useEffect(() => {
        setCustomerInput(customer ?? "")
    }, [customer])

    const availablePalettes = customer && brandingRangePalette?.length > 0 ? {brand: brandingRangePalette} : PALETTES
    const paletteKeys: PaletteKey[] = Object.keys(availablePalettes) as PaletteKey[]

    // Config for API key inputs, so we can easily add new providers in the future by just adding to this array
    const apiKeyConfigs: LLMProviderInputConfig[] = [
        {
            vendor: "OpenAI",
            idSuffix: "openai",
            logo: theme.palette.mode === "dark" ? "/OpenAI-white.png" : "/OpenAI-black.png",
            onTest: isOpenAIKeyValid,
            placeholder: "sk-...",
        },
        {
            vendor: "Anthropic",
            idSuffix: "anthropic",
            logo: "/claude.png",
            onTest: isAnthropicKeyValid,
            placeholder: "sk-ant-...",
        },
    ]

    const getConfirmationModal = () => (
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
    )

    const getApiKeysSection = () => (
        <Section>
            <SettingsSectionTitle>API Keys</SettingsSectionTitle>
            <SubSection>
                <SubsectionTitle variant="subtitle1">Providers</SubsectionTitle>
                <SubSectionBody>
                    <Box sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5}}>
                        {apiKeyConfigs.map(({vendor, idSuffix, logo, onTest, placeholder}) => (
                            <ApiKeyInput
                                key={idSuffix}
                                forgetKey={() => persistKey(vendor, "")}
                                id={`${id}-${idSuffix}`}
                                logo={logo}
                                onSave={(key) => persistKey(vendor, key)}
                                onTest={onTest}
                                persistedValue={apiKeys[vendor]}
                                placeholder={placeholder}
                                vendor={vendor}
                            />
                        ))}
                    </Box>
                </SubSectionBody>
            </SubSection>
        </Section>
    )

    const getBehaviorSection = () => (
        <Section>
            <SettingsSectionTitle>Behavior</SettingsSectionTitle>
            <SubSection>
                <SubsectionTitle variant="subtitle1">Zen mode</SubsectionTitle>
                <SubSectionBody>
                    <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                        <FormLabel>Enable &quot;Zen&quot; mode:</FormLabel>
                        <Tooltip
                            title={
                                "Hides most of the UI during agent network animations, " +
                                "providing a more immersive experience."
                            }
                        >
                            <Checkbox
                                checked={enableZenMode}
                                data-testid="zen-mode-checkbox"
                                onChange={(_, checked) => {
                                    updateSettings({behavior: {enableZenMode: checked}})
                                    enableZenModeCheckmark.trigger()
                                }}
                                sx={{p: 0.0}}
                            />
                        </Tooltip>
                        <FadingCheckmark show={enableZenModeCheckmark.show} />
                    </Box>
                </SubSectionBody>
            </SubSection>
        </Section>
    )

    const getNamingSubsection = () => (
        <SubSection>
            <SubsectionTitle variant="subtitle1">Agent names</SubsectionTitle>
            <SubSectionBody>
                <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}>
                    <FormLabel>Display as:</FormLabel>
                    <ToggleButtonGroup
                        aria-label="agent-name-format-selection"
                        exclusive={true}
                        onChange={(_, value) => {
                            if (value !== null) {
                                updateSettings({
                                    appearance: {
                                        useNativeNames: value === "native",
                                    },
                                })
                                nativeNamesCheckmark.trigger()
                            }
                        }}
                        size="small"
                        sx={{mx: 2}}
                        value={useNativeNames ? "native" : "beautified"}
                    >
                        <ToggleButton value="native">Native</ToggleButton>
                        <ToggleButton value="beautified">Beautified</ToggleButton>
                    </ToggleButtonGroup>
                    <FormLabel>Preview: </FormLabel>
                    <FormLabel
                        sx={{
                            marginBottom: 0,
                            border: "1px solid",
                            borderRadius: 1,
                            backgroundColor: "background.paper",
                            ml: 0.5,
                            px: 1,
                            py: 0.25,
                            lineHeight: 0,
                            fontSize: "0.7rem",
                            maxWidth: "100%",
                        }}
                    >
                        <pre>
                            {`category/some_agent_name → ${
                                useNativeNames ? "category/some_agent_name [unchanged]" : "Category Some Agent Name"
                            }`}
                        </pre>
                    </FormLabel>
                    <FadingCheckmark show={nativeNamesCheckmark.show} />
                </Box>
            </SubSectionBody>
        </SubSection>
    )

    const getBrandingSubsection = () => (
        <SubSection>
            <SubsectionTitle variant="subtitle1">Branding</SubsectionTitle>
            <SubSectionBody>
                <Box
                    sx={{
                        alignItems: "center",
                        display: "flex",
                        flexDirection: "row",
                        gap: 2,
                    }}
                >
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
                            customerInput?.trim().length === 0 || isBrandingApplying || customerInput === customer
                        }
                        variant="contained"
                        size="small"
                        onClick={handleBrandingApply}
                        loading={isBrandingApplying}
                    >
                        Apply
                    </Button>
                    <Button
                        disabled={!customer || isBrandingApplying}
                        variant="contained"
                        size="small"
                        onClick={handleBrandingClear}
                        loading={isBrandingApplying}
                    >
                        Clear
                    </Button>
                    <FadingCheckmark show={brandingCheckmark.show} />
                </Box>

                <Box
                    aria-label="logo-options-container"
                    sx={{display: "flex", alignItems: "center"}}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            marginBottom: "1rem",
                            width: "100%",
                        }}
                    >
                        <FormLabel>Logo:</FormLabel>
                        <Tooltip title={customer ? null : "Set a customer name to enable logo options"}>
                            <span>
                                <ToggleButtonGroup
                                    aria-label="logo-selection"
                                    disabled={!customer}
                                    exclusive={true}
                                    onChange={(_, value) => {
                                        if (value !== null) {
                                            updateSettings({
                                                branding: {
                                                    logoSource: value,
                                                },
                                            })
                                            logoCheckmark.trigger()
                                        }
                                    }}
                                    size="small"
                                    sx={{marginRight: "1rem"}}
                                    value={logoSource || "none"}
                                >
                                    <Tooltip title={customer && "No logo will be displayed"}>
                                        <span style={{cursor: customer ? "pointer" : "not-allowed"}}>
                                            <ToggleButton value="none">None</ToggleButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip
                                        title={
                                            customer &&
                                            "Display a simple, anonymous generic logo based on a generic brand"
                                        }
                                    >
                                        <span style={{cursor: customer ? "pointer" : "not-allowed"}}>
                                            <ToggleButton value="generic">Generic</ToggleButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip
                                        title={
                                            customer &&
                                            (logoServiceToken
                                                ? "Use a service to attempt to automatically find a suitable " +
                                                  "logo based on the customer name."
                                                : "No Logo.dev token found, cannot use Auto logo source")
                                        }
                                    >
                                        <span
                                            style={{
                                                cursor: customer && logoServiceToken ? "pointer" : "not-allowed",
                                            }}
                                        >
                                            <ToggleButton
                                                disabled={!logoServiceToken}
                                                value="auto"
                                            >
                                                Auto
                                            </ToggleButton>
                                        </span>
                                    </Tooltip>
                                </ToggleButtonGroup>
                            </span>
                        </Tooltip>
                        <FormLabel>Preview:</FormLabel>
                        <Box>
                            {logoSource === "auto" || logoSource === "generic" ? (
                                <CustomerLogo
                                    logoServiceToken={logoServiceToken}
                                    customer={customer}
                                    logoSource={logoSource}
                                    iconSuggestion={iconSuggestion}
                                />
                            ) : (
                                "(None)"
                            )}
                        </Box>
                        <FadingCheckmark show={logoCheckmark.show} />
                    </Box>
                </Box>
            </SubSectionBody>
        </SubSection>
    )

    const getNetworkDisplaySubsection = () => (
        <SubSection>
            <SubsectionTitle variant="subtitle1">Network display</SubsectionTitle>
            <SubSectionBody>
                <FormLabel sx={{marginBottom: 2}}>Palette (heatmap and depth):</FormLabel>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <Tooltip title={customer ? "Palette is locked when branding is applied" : ""}>
                        <span>
                            <ToggleButtonGroup
                                aria-label="depth-heatmap-palette-selection"
                                disabled={Boolean(customer)}
                                exclusive={true}
                                onChange={handlePaletteChange}
                                size="small"
                                sx={{
                                    cursor: customer ? "not-allowed" : "pointer",
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
                        </span>
                    </Tooltip>
                    <FadingCheckmark show={rangePaletteCheckmark.show} />
                </Box>
            </SubSectionBody>
        </SubSection>
    )

    const getNetworkAnimationSubsection = () => (
        <SubSection>
            <SubsectionTitle variant="subtitle1">Network animation</SubsectionTitle>
            <SubSectionBody>
                <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                    <FormLabel>Plasma animation color:</FormLabel>
                    <Tooltip title={customer ? "Plasma color is locked when branding is applied" : ""}>
                        <input
                            aria-label="plasma-color-picker"
                            disabled={Boolean(customer)}
                            onChange={(e) => {
                                updateSettings({
                                    appearance: {
                                        plasmaColor: e.target.value,
                                    },
                                })
                                plasmaColorCheckmark.trigger()
                            }}
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
                            onChange={(e) => {
                                updateSettings({
                                    appearance: {
                                        agentNodeColor: e.target.value,
                                    },
                                })
                                agentNodeColorCheckmark.trigger()
                            }}
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
                        <span>
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
                                style={{
                                    cursor: customer ? "not-allowed" : "pointer",
                                    opacity: customer ? 0.5 : 1,
                                }}
                            >
                                <ToggleButton
                                    data-testid="auto-agent-icon-color-button"
                                    value="auto"
                                >
                                    Auto
                                </ToggleButton>
                                <ToggleButton value="custom">Custom</ToggleButton>
                            </ToggleButtonGroup>
                        </span>
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
            </SubSectionBody>
        </SubSection>
    )

    const getAppearanceSection = () => (
        <Section>
            <SettingsSectionTitle>Appearance</SettingsSectionTitle>
            {getNamingSubsection()}
            {getBrandingSubsection()}
            {getNetworkDisplaySubsection()}
            {getNetworkAnimationSubsection()}
        </Section>
    )

    const getResetSettingsSection = () => (
        <SubSection sx={{marginTop: 4, paddingTop: 2, borderTop: "4px solid var(--bs-border-color)"}}>
            <SubSectionBody>
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
            </SubSectionBody>
        </SubSection>
    )

    /* Dev note:
    Before you go removing the "useless" spans in the code that wrap MUI elements: they are required because
    MUI's disabled state on certain components sets pointer-events: none, which prevents tooltips from working.
    Wrapping in a span allows the tooltip to still function while the inner component is disabled.
    See: https://github.com/mui/material-ui/issues/8416
    */
    return (
        // Always use default theme for settings dialog so user can always see to reset. It's possible that with
        // certain custom themes the dialog would be unreadable.
        <ThemeProvider
            theme={createTheme({
                palette: {
                    mode: paletteMode,
                },
                typography: {
                    // Default fonts are too large for the settings dialog, so we reduce the base font size
                    fontSize: 12,
                },
            })}
        >
            {resetToDefaultSettingsOpen ? getConfirmationModal() : null}
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
                {getApiKeysSection()}
                {getBehaviorSection()}
                {getAppearanceSection()}
                {getResetSettingsSection()}
            </MUIDialog>
        </ThemeProvider>
    )
}
