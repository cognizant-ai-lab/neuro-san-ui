import Business from "@mui/icons-material/Business"
import ClearIcon from "@mui/icons-material/Clear"
import RestoreIcon from "@mui/icons-material/SettingsBackupRestore"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import FormLabel from "@mui/material/FormLabel"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import MenuItem from "@mui/material/MenuItem"
import Select, {SelectChangeEvent} from "@mui/material/Select"
import {createTheme, styled, ThemeProvider, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {
    ComponentPropsWithoutRef,
    FC,
    ChangeEvent as ReactChangeEvent,
    MouseEvent as ReactMouseEvent,
    ReactNode,
    useEffect,
    useMemo,
    useState,
} from "react"

import {ApiKeyInput} from "./ApiKeyInput"
import {useCheckmarkFade} from "./FadingCheckmark"
import InfoTip from "./InfoTip"
import {SettingsRow} from "./SettingsRow"
import {getBrandingSuggestions, testConnection, TestConnectionResult} from "../../controller/agent/Agent"
import {isAnthropicKeyValid, isOpenAIKeyValid} from "../../controller/llm/Providers"
import {BrandingSuggestions} from "../../controller/Types/Branding"
import {useEnvironmentStore} from "../../state/Environment"
import {DEFAULT_SETTINGS, LLMProvider, PaletteKey, useSettingsStore} from "../../state/Settings"
import {PALETTES} from "../../Theme/Palettes"
import {ConfirmationModal} from "../Common/ConfirmationModal"
import {MUIDialog} from "../Common/MUIDialog"
import {NotificationType, sendNotification} from "../Common/notification"
import {StatusLight} from "../Common/StatusLight"
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
    gap: theme.spacing(2.5),
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
    checkmark: ReturnType<typeof useCheckmarkFade>
    vendor: LLMProvider
    idSuffix: string
    logo: string
    onTest: (key: string) => Promise<boolean>
    placeholder: string
}

interface SettingsSubsectionProps {
    readonly title: string
    readonly children: ReactNode
}

type Protocol = "http" | "https"

//#endregion: Types and Interfaces

// eslint-disable-next-line react/no-multi-comp -- only relevant to this module.
const SettingsSubsection: FC<SettingsSubsectionProps> = ({title, children}) => (
    <SubSection>
        <SubsectionTitle variant="subtitle1">{title}</SubsectionTitle>
        <SubSectionBody>{children}</SubSectionBody>
    </SubSection>
)
const URL_PROTOCOL_REGEX = /^https?:\/\//iu
const HTTP_PROTOCOL_REGEX = /^http:\/\//iu

const stripProtocol = (value: string) => (value ?? "").replace(URL_PROTOCOL_REGEX, "")

/**
 * Normalize a Neuro SAN URL input by stripping the protocol and determining the protocol to use.
 * @param value The input URL value to normalize.
 * @param fallbackProtocol The protocol to use if the input value does not specify one.
 * @return An object containing the normalized host and protocol.
 */
const normalizeNeuroSanUrlInput = (value: string, fallbackProtocol: Protocol) => {
    const trimmedValue = value.trim()
    const hasProtocol = URL_PROTOCOL_REGEX.exec(trimmedValue)

    return {
        host: stripProtocol(trimmedValue),
        protocol: hasProtocol ? (HTTP_PROTOCOL_REGEX.test(trimmedValue) ? "http" : "https") : fallbackProtocol,
    } satisfies {
        host: string
        protocol: Protocol
    }
}
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
    const [customerInput, setCustomerInput] = useState<string>(customer ?? "")
    const [isBrandingApplying, setIsBrandingApplying] = useState<boolean>(false)
    const logoSource = useSettingsStore((state) => state.settings.branding.logoSource)
    const iconSuggestion = useSettingsStore((state) => state.settings.branding.iconSuggestion)

    // Zen mode
    const enableZenMode = useSettingsStore((state) => state.settings.behavior.enableZenMode)
    const enableZenModeCheckmark = useCheckmarkFade()

    // API keys
    const apiKeys = useSettingsStore((state) => state.settings.apiKeys)
    const openAIKeyCheckmark = useCheckmarkFade()
    const anthropicKeyCheckmark = useCheckmarkFade()

    // Native names setting
    const useNativeNames = useSettingsStore((state) => state.settings.appearance.useNativeNames)
    const nativeNamesCheckmark = useCheckmarkFade()

    /*
        Neuro SAN URL
        This can come from three sources:
        1) The default URL from server environment variables
        2) The persisted value in the Zustand store
        3) The current state value, from the user's input in the settings dialog
     */
    const defaultNeuroSanUrl = useEnvironmentStore((state) => state.backendNeuroSanApiUrl ?? "")
    const persistedNeuroSanUrl = useSettingsStore((state) => state.settings.externalServices.neuroSanUrl)
    const effectiveNeuroSanUrl = persistedNeuroSanUrl || defaultNeuroSanUrl
    const neuroSanUrlNoProtocol = effectiveNeuroSanUrl.replace(/https?:\/\//u, "")

    const [neuroSanUrlInput, setNeuroSanUrlInput] = useState<string>(neuroSanUrlNoProtocol)
    const [neuroSanProtocol, setNeuroSanProtocol] = useState<Protocol>(
        effectiveNeuroSanUrl.startsWith("http://") ? "http" : "https"
    )

    const [neuroSanUrlValidated, setNeuroSanUrlValidated] = useState<boolean | null>(null)
    const neuroSanURLCheckmark = useCheckmarkFade()

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

    const updateBranding = (brandingSuggestions: BrandingSuggestions) => {
        const {
            plasma,
            nodeColor,
            primary,
            secondary,
            background,
            rangePalette,
            iconSuggestion: newIconSuggestion,
        } = brandingSuggestions

        // Update persisted settings with new branding suggestions
        const updates: Parameters<typeof updateSettings>[0] = {
            branding: {
                customer: customerInput,
                ...(primary ? {primary} : {}),
                ...(secondary ? {secondary} : {}),
                ...(background ? {background} : {}),
                ...(Array.isArray(rangePalette) ? {rangePalette} : {}),
                ...(newIconSuggestion
                    ? {
                          iconSuggestion: newIconSuggestion,
                          logoSource: logoServiceToken ? "auto" : "generic",
                      }
                    : {}),
            },
            appearance: {
                rangePalette: "brand",
                ...(plasma ? {plasmaColor: plasma} : {}),
                ...(nodeColor ? {agentNodeColor: nodeColor} : {}),
            },
        }

        updateSettings(updates)

        // Trigger checkmarks for items we changed
        brandingCheckmark.trigger()
        rangePaletteCheckmark.trigger()

        if (plasma) {
            plasmaColorCheckmark.trigger()
        }

        if (nodeColor) {
            agentNodeColorCheckmark.trigger()
        }

        if (newIconSuggestion) {
            logoCheckmark.trigger()
        }
    }

    /**
     * Handle applying branding based on customer input. Calls backend to get colors then updates settings store.
     */
    const handleBrandingApply = async () => {
        setIsBrandingApplying(true)

        try {
            const brandingSuggestions = await getBrandingSuggestions(customerInput)
            if (brandingSuggestions) {
                updateBranding(brandingSuggestions)
            }
        } catch (e) {
            console.error(`Failed to fetch branding suggestions for customer "${customerInput}"`, e)
            sendNotification(
                NotificationType.error,
                `Failed to fetch branding suggestions for "${customerInput}"`,
                "Please check the name and try again. If the problem persists, there may be an issue with the " +
                    "branding service."
            )
        } finally {
            setIsBrandingApplying(false)
        }
    }

    const handleBrandingClear = () => {
        // Clear branding settings
        updateSettings({
            appearance: {
                agentIconColor: DEFAULT_SETTINGS.appearance.agentIconColor,
                agentNodeColor: DEFAULT_SETTINGS.appearance.agentNodeColor,
                autoAgentIconColor: DEFAULT_SETTINGS.appearance.autoAgentIconColor,
                plasmaColor: DEFAULT_SETTINGS.appearance.plasmaColor,
                rangePalette: DEFAULT_SETTINGS.appearance.rangePalette,
            },
            branding: {...DEFAULT_SETTINGS.branding},
        })

        // Trigger checkmarks for all the settings that are affected by branding
        agentIconColorCheckmark.trigger()
        agentNodeColorCheckmark.trigger()
        plasmaColorCheckmark.trigger()
        rangePaletteCheckmark.trigger()
        brandingCheckmark.trigger()
        logoCheckmark.trigger()
    }

    const persistKey = (vendor: LLMProvider, key: string, checkmark: ReturnType<typeof useCheckmarkFade>) => {
        updateSettings({
            apiKeys: {
                [vendor]: key,
            },
        })
        checkmark.trigger()
    }

    const handleTestConnection = async () => {
        const normalized = normalizeNeuroSanUrlInput(neuroSanUrlInput, neuroSanProtocol)

        setNeuroSanProtocol(normalized.protocol)
        setNeuroSanUrlInput(normalized.host)

        const result: TestConnectionResult = await testConnection(`${normalized.protocol}://${normalized.host}`)
        setNeuroSanUrlValidated(result.success)
    }

    const handleNeuroSanUrlChange = (e: ReactChangeEvent<HTMLInputElement>) => {
        setNeuroSanUrlInput(e.target.value)
        setNeuroSanUrlValidated(null)
    }

    const handleSaveNeuroSanUrl = () => {
        const normalized = normalizeNeuroSanUrlInput(neuroSanUrlInput, neuroSanProtocol)

        setNeuroSanProtocol(normalized.protocol)
        setNeuroSanUrlInput(normalized.host)

        updateSettings({
            externalServices: {
                neuroSanUrl: `${normalized.protocol}://${normalized.host}`,
            },
        })

        neuroSanURLCheckmark.trigger()
    }

    const handleNeuroSanProtocolChange = (e: SelectChangeEvent<Protocol>) => {
        const newProtocol = e.target.value
        setNeuroSanProtocol(newProtocol)
        setNeuroSanUrlValidated(null)
    }

    const handleNeuroSanUrlBlur = () => {
        const normalized = normalizeNeuroSanUrlInput(neuroSanUrlInput, neuroSanProtocol)
        setNeuroSanProtocol(normalized.protocol)
        setNeuroSanUrlInput(normalized.host)
    }

    const handleResetNeuroSanUrl = () => {
        const normalized = normalizeNeuroSanUrlInput(defaultNeuroSanUrl, "https")
        setNeuroSanUrlInput(normalized.host)
        setNeuroSanProtocol(normalized.protocol)
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
            checkmark: openAIKeyCheckmark,
            idSuffix: "openai",
            logo: theme.palette.mode === "dark" ? "/OpenAI-white.png" : "/OpenAI-black.png",
            onTest: isOpenAIKeyValid,
            placeholder: "sk-...",
            vendor: "OpenAI",
        },
        {
            checkmark: anthropicKeyCheckmark,
            idSuffix: "anthropic",
            logo: "/claude.png",
            onTest: isAnthropicKeyValid,
            placeholder: "sk-ant-...",
            vendor: "Anthropic",
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

    const getNeuroSanSubsection = () => {
        return (
            <SettingsSubsection title="Neuro SAN">
                <SettingsRow
                    id={`${id}-neuro-san-server-url-row`}
                    checkmark={neuroSanURLCheckmark}
                    key={`${id}-neuro-san-server-url`}
                    label=""
                    tooltip="URL for the Neuro SAN server."
                >
                    <Select<Protocol>
                        aria-label="protocol-select"
                        onChange={handleNeuroSanProtocolChange}
                        size="small"
                        sx={{minWidth: 100, flexShrink: 0}}
                        value={neuroSanProtocol}
                    >
                        <MenuItem value="https">https://</MenuItem>
                        <MenuItem value="http">http://</MenuItem>
                    </Select>
                    <TextField
                        aria-label="neuro-san-server-url-host-input"
                        onBlur={handleNeuroSanUrlBlur}
                        onChange={handleNeuroSanUrlChange}
                        placeholder="example.com:1234"
                        size="small"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="Clear input"
                                            edge="end"
                                            size="small"
                                            onClick={() => {
                                                setNeuroSanUrlInput("")
                                                setNeuroSanUrlValidated(null)
                                            }}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{flex: 1}}
                        value={neuroSanUrlInput}
                    />
                    <StatusLight
                        id={`${id}-status-light`}
                        statusValue={neuroSanUrlValidated === null ? "unknown" : neuroSanUrlValidated ? "green" : "red"}
                    />
                    <Button
                        disabled={neuroSanUrlInput.trim().length === 0}
                        onClick={handleTestConnection}
                        size="small"
                        variant="contained"
                    >
                        Test
                    </Button>
                    <Button
                        disabled={neuroSanUrlInput.trim().length === 0 || neuroSanUrlInput === neuroSanUrlNoProtocol}
                        onClick={handleSaveNeuroSanUrl}
                        size="small"
                        variant="contained"
                    >
                        Save
                    </Button>
                    <Button
                        disabled={neuroSanUrlInput === stripProtocol(defaultNeuroSanUrl) && neuroSanProtocol === (defaultNeuroSanUrl.startsWith("http://") ? "http" : "https")}
                        onClick={handleResetNeuroSanUrl}
                        size="small"
                        variant="contained"
                    >
                        Default
                    </Button>
                </SettingsRow>
            </SettingsSubsection>
        )
    }

    const getServicesSection = () => (
        <Section>
            <SettingsSectionTitle>External Services</SettingsSectionTitle>
            {getNeuroSanSubsection()}
        </Section>
    )

    const getApiKeysSection = () => (
        <Section>
            <Box sx={{display: "flex", alignItems: "center", gap: theme.spacing(2)}}>
                <SettingsSectionTitle>API Keys</SettingsSectionTitle>
                <InfoTip
                    title={
                        "API keys are used to access external services. Some networks may require an API key for " +
                        "you to use them. Your keys will be saved in your browser local storage and sent to " +
                        "services that require them. Do not use this option if you are on a shared or public computer."
                    }
                />
            </Box>
            <SubsectionTitle variant="subtitle1">Providers</SubsectionTitle>
            <SubSectionBody>
                <Box sx={{display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5}}>
                    {apiKeyConfigs.map(({checkmark, vendor, idSuffix, logo, onTest, placeholder}) => (
                        <SettingsRow
                            checkmark={checkmark}
                            key={`${id}-${idSuffix}`}
                            label=""
                            tooltip={`API key for ${vendor}.`}
                        >
                            <ApiKeyInput
                                forgetKey={() => persistKey(vendor, "", checkmark)}
                                id={`${id}-${idSuffix}`}
                                logo={logo}
                                onSave={(key) => persistKey(vendor, key, checkmark)}
                                onTest={onTest}
                                persistedValue={apiKeys[vendor]}
                                placeholder={placeholder}
                                vendor={vendor}
                            />
                        </SettingsRow>
                    ))}
                </Box>
            </SubSectionBody>
        </Section>
    )

    const getBehaviorSection = () => (
        <Section>
            <SettingsSectionTitle>Behavior</SettingsSectionTitle>
            <SettingsSubsection title="Zen mode">
                <SettingsRow
                    label='Enable "Zen" mode:'
                    checkmark={enableZenModeCheckmark}
                    tooltip={
                        "Hides most of the UI during agent network animations providing a more immersive " +
                        "experience."
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
                </SettingsRow>
            </SettingsSubsection>
        </Section>
    )

    const getNamingSubsection = () => (
        <SettingsSubsection title="Agent names">
            <SettingsRow
                label="Display as:"
                checkmark={nativeNamesCheckmark}
                tooltip={
                    "Choose how agent names are displayed in the network. " +
                    '"Native" shows the original agent name as provided by the system, while "Beautified" applies ' +
                    "formatting to make names more human-readable. This setting does not affect the actual names of " +
                    "agents, only how they are displayed in the UI."
                }
            >
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
            </SettingsRow>
        </SettingsSubsection>
    )

    const getBrandingSubsection = () => (
        <SettingsSubsection title="Branding">
            <SettingsRow
                checkmark={brandingCheckmark}
                label="Customer:"
                tooltip={
                    "Set a customer or organization name to automatically apply a custom color palette and " +
                    "logo to the network"
                }
            >
                <TextField
                    aria-label="branding-input"
                    onChange={(e) => setCustomerInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && customerInput?.trim().length > 0) {
                            void handleBrandingApply()
                        }
                    }}
                    value={customerInput}
                    placeholder="Company or organization name"
                    size="small"
                    sx={{width: "100%"}}
                    variant="outlined"
                />
                <Button
                    disabled={customerInput?.trim().length === 0 || isBrandingApplying || customerInput === customer}
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
            </SettingsRow>
            <SettingsRow
                checkmark={logoCheckmark}
                label="Logo:"
                tooltip={
                    "Choose a logo to display in the top-left corner of the network. " +
                    '"None" will display no logo, "Generic" will display a simple generic logo, and "Auto" will ' +
                    "attempt to find a suitable logo based on the customer name using an external service (if " +
                    "configured on the server). Logo is only displayed when customer branding is applied."
                }
            >
                <Tooltip title={customer ? undefined : "Set a customer name to enable logo options"}>
                    {/*"span" required for tooltip when child is disabled. See:*/}
                    {/*https://github.com/mui/material-ui/issues/8416*/}
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
                            sx={{cursor: customer && logoServiceToken ? "pointer" : "not-allowed", marginRight: "1rem"}}
                            value={logoSource || "none"}
                        >
                            <Tooltip title={customer && "No logo will be displayed"}>
                                {/*"span" required for tooltip when child is disabled. See:*/}
                                {/*https://github.com/mui/material-ui/issues/8416*/}
                                <span>
                                    <ToggleButton value="none">None</ToggleButton>
                                </span>
                            </Tooltip>
                            <Tooltip
                                title={customer && "Display a simple, anonymous generic logo based on a generic brand"}
                            >
                                {/*"span" required for tooltip when child is disabled. See:*/}
                                {/*https://github.com/mui/material-ui/issues/8416*/}
                                <span>
                                    <ToggleButton value="generic">Generic</ToggleButton>
                                </span>
                            </Tooltip>
                            <Tooltip
                                title={
                                    customer
                                        ? logoServiceToken
                                            ? "Use a service to attempt to automatically find a suitable logo based " +
                                              "on the customer name."
                                            : "Logo service not configured on the server. Cannot use Auto logo source"
                                        : undefined
                                }
                            >
                                {/*"span" required for tooltip when child is disabled. See:*/}
                                {/*https://github.com/mui/material-ui/issues/8416*/}
                                <span>
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
                            customer={customer ?? ""}
                            fallbackIcon={Business}
                            iconSuggestion={iconSuggestion ?? undefined}
                            logoServiceToken={logoServiceToken}
                            logoSource={logoSource}
                        />
                    ) : (
                        "(None)"
                    )}
                </Box>
            </SettingsRow>
        </SettingsSubsection>
    )

    const getNetworkDisplaySubsection = () => (
        <SettingsSubsection title="Network display">
            <SettingsRow
                checkmark={rangePaletteCheckmark}
                label="Palette:"
                tooltip="Choose the color palette to use for heatmaps and depth display in the network. "
            >
                <Tooltip title={customer ? "Palette is determined by customer branding and cannot be changed" : ""}>
                    {/*"span" required for tooltip when child is disabled. See:*/}
                    {/*https://github.com/mui/material-ui/issues/8416*/}
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
            </SettingsRow>
        </SettingsSubsection>
    )

    const getNetworkAnimationSubsection = () => (
        <SettingsSubsection title="Network animation">
            <SettingsRow
                checkmark={plasmaColorCheckmark}
                label="Plasma animation color:"
                tooltip={
                    customer
                        ? "Plasma color is locked when branding is applied"
                        : "Select the color for the plasma animation."
                }
            >
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
            </SettingsRow>
            <SettingsRow
                checkmark={agentNodeColorCheckmark}
                label="Agent node color:"
                tooltip={
                    customer
                        ? "Agent node color is locked when branding is applied"
                        : "Select the color for the agent node animation."
                }
            >
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
            </SettingsRow>
            <SettingsRow
                checkmark={agentIconColorCheckmark}
                label="Agent icon color:"
                tooltip={
                    customer
                        ? "Agent icon color is locked when branding is applied"
                        : "Select the color for the agent icon animation."
                }
            >
                {/*"span" required for tooltip when child is disabled. See:*/}
                {/*https://github.com/mui/material-ui/issues/8416*/}
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
            </SettingsRow>
        </SettingsSubsection>
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

    const settingsTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: paletteMode,
                },
                typography: {
                    fontSize: 12,
                },
            }),
        [paletteMode]
    )

    return (
        // Always use default theme for settings dialog so user can always see to reset. It's possible that with
        // certain custom themes the dialog would be unreadable.
        <ThemeProvider theme={settingsTheme}>
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
                {getServicesSection()}
                {getApiKeysSection()}
                {getBehaviorSection()}
                {getAppearanceSection()}
                {getResetSettingsSection()}
            </MUIDialog>
        </ThemeProvider>
    )
}
