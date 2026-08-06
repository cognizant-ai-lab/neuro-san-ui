import CloseIcon from "@mui/icons-material/Close"
import {AlertColor} from "@mui/material/Alert"
import Backdrop from "@mui/material/Backdrop"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import Paper from "@mui/material/Paper"
import {alpha, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import {FC, useCallback, useEffect, useRef, useState} from "react"

import {sendChatQuery} from "../../../controller/agent/Agent"
import {StreamingUnit} from "../../../controller/llm/LlmChat"
import {useAgentChatHistoryStore} from "../../../state/ChatHistory"
import {TemporaryNetwork, useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {getZIndex} from "../../../utils/zIndexLayers"
import {chatMessageFromChunk} from "../../AgentChat/Common/Utils"
import {MUIAlert} from "../../Common/MUIAlert"
import {
    AGENT_NETWORK_DEFINITION_KEY,
    AGENT_NETWORK_DESIGNER_ID,
    AGENT_NETWORK_NAME_KEY,
    AgentNetworkDefinitionEntry,
} from "../const"
import {
    convertReservationsToNetworks,
    extractNetworkHocon,
    extractReservations,
    mergeNetworks,
} from "../TemporaryNetworks"

//#region Constants
const DOCK_PROMPT_PLACEHOLDER = "Describe a change to the network"
const DOCK_STREAM_TIMEOUT_MS = 120_000

// How long the dock's status banner stays visible before auto-dismissing. Error banners persist until dismissed.
// Exported for tests.

export const DOCK_BANNER_AUTO_DISMISS_MS = 5_000

//#endregion Constants

//#region Interfaces and Types

export type NetworkEditorDockProps = {
    readonly currentUser: string
    readonly id: string
    readonly isEditingNetwork: boolean
    readonly networkId: string
    readonly neuroSanURL: string
    readonly setIsEditingNetwork: (isEditing: boolean) => void
    /**
     * Setter for changing the selected network.
     */
    readonly setSelectedNetwork: (network: string | null) => void
    readonly tempNetworks: TemporaryNetwork[]
}

//#endregion Interfaces and Types

/**
 * Implements the dock that appears at the bottom of the screen when the user is editing a network. Allows user to
 * enter plain-language instructions for modifying the overall network.
 */
export const NetworkEditorDock: FC<NetworkEditorDockProps> = ({
    neuroSanURL,
    currentUser,
    id,
    isEditingNetwork,
    networkId,
    setIsEditingNetwork,
    setSelectedNetwork,
    tempNetworks,
}) => {
    const theme = useTheme()
    // Inline status banner shown above the dock header after an "apply" succeeds, is canceled, or fails.
    const [dockBanner, setDockBanner] = useState<{severity: AlertColor; title: string; detail: string} | null>(null)
    const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Dock (edit-mode prompt bar) state
    const [dockPrompt, setDockPrompt] = useState<string>("")
    const [isDockStreaming, setIsDockStreaming] = useState<boolean>(false)
    const dockAbortControllerRef = useRef<AbortController | null>(null)

    // Stop-confirm overlay state: null = not shown, "confirming" = abort dialog open.
    const [stopState, setStopState] = useState<"confirming" | null>(null)

    // Show a dock banner. Success/cancel banners auto-dismiss; error banners persist until dismissed.
    const showDockBanner = useCallback((bannerInfo: {severity: AlertColor; title: string; detail: string}) => {
        clearTimeout(bannerTimeoutRef.current)
        setDockBanner(bannerInfo)
        if (bannerInfo.severity !== "error") {
            bannerTimeoutRef.current = setTimeout(() => setDockBanner(null), DOCK_BANNER_AUTO_DISMISS_MS)
        }
    }, [])

    const handleStopClick = useCallback(() => {
        setStopState("confirming")
    }, [])

    const handleKeepApplying = useCallback(() => {
        setStopState(null)
    }, [])

    const handleDismissBanner = useCallback(() => {
        clearTimeout(bannerTimeoutRef.current)
        setDockBanner(null)
    }, [])

    const handleStopAndDiscard = useCallback(() => {
        dockAbortControllerRef.current?.abort()
        dockAbortControllerRef.current = null
        setStopState(null)
        showDockBanner({
            severity: "info",
            title: "Applying cancelled.",
            detail: "Nothing was changed. Your prompt is restored below.",
        })
    }, [showDockBanner])

    const handleExitEditMode = useCallback(() => {
        if (isDockStreaming) {
            dockAbortControllerRef.current?.abort()
            dockAbortControllerRef.current = null
            setIsDockStreaming(false)
        }
        setIsEditingNetwork(false)
    }, [isDockStreaming, setIsEditingNetwork])

    // Pressing Escape exits edit mode, mirroring the explicit exit button. Skip while the
    // node popup is open, so Escape closes the popup first rather than the whole edit mode.
    useEffect(() => {
        if (!isEditingNetwork) return undefined
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleExitEditMode()
        }
        document.addEventListener("keydown", handleEscape)
        return () => document.removeEventListener("keydown", handleEscape)
    }, [handleExitEditMode, isEditingNetwork])

    /**
     * Applies the networks returned by the designer: upserts them and triggers navigation if needed.
     * Returns true when a matching reservation was applied, false (and surfaces an error banner) otherwise.
     */
    const saveUpdates = useCallback(
        (newNetworksFromSave: TemporaryNetwork[], currentAgentNetworkName: string | undefined): boolean => {
            if (newNetworksFromSave.length === 0) {
                showDockBanner({
                    severity: "error",
                    title: "Failed to apply network change.",
                    detail: "The network designer did not return a reservation. Please try again.",
                })
                return false
            }

            // Find the returned reservation that stands in for the current network (matched by name). When
            // present, persist every returned network, then carry the open network's chat history over to the
            // replacement and notify the parent so it can navigate to the new reservation.
            const replacement = newNetworksFromSave.find((n) => n.agentNetworkName === currentAgentNetworkName)
            if (replacement) {
                useTempNetworksStore.getState().upsertTempNetworks(newNetworksFromSave)
                if (networkId) {
                    useAgentChatHistoryStore.getState().copyHistory(networkId, replacement.agentInfo.agent_name)
                    setSelectedNetwork(replacement.agentInfo.agent_name)
                }
                return true
            }

            // Reservations came back, but none matched the current network — surface this in the dock banner.
            showDockBanner({
                severity: "error",
                title: "Failed to apply network change.",
                detail: "A reservation was returned but did not match the current network. Please try again.",
            })
            return false
        },
        [networkId, setSelectedNetwork, showDockBanner]
    )

    /**
     * Streams the Agent Network Designer endpoint with a natural-language prompt and the current
     * network definition, collecting any returned reservations.
     */
    const applyNetworkDesignerChanges = useCallback(
        async (
            signal: AbortSignal,
            userPrompt: string,
            currentDefinition: AgentNetworkDefinitionEntry[],
            agentNetworkName: string | undefined
        ): Promise<TemporaryNetwork[]> => {
            let newNetworks: TemporaryNetwork[] = []

            await sendChatQuery(
                neuroSanURL,
                signal,
                userPrompt,
                AGENT_NETWORK_DESIGNER_ID,
                (chunk: string) => {
                    const chatMessage = chatMessageFromChunk(chunk)
                    if (!chatMessage) {
                        return
                    }

                    const reservations = extractReservations(chatMessage)
                    if (reservations.length === 0) {
                        return
                    }

                    const networkHocon = extractNetworkHocon(chatMessage)
                    const agentNetworkNameFromMessage = chatMessage.sly_data?.[AGENT_NETWORK_NAME_KEY] as
                        string | undefined
                    const networkName = agentNetworkName ?? agentNetworkNameFromMessage

                    const definitionFromMessage = chatMessage.sly_data?.[AGENT_NETWORK_DEFINITION_KEY] as
                        AgentNetworkDefinitionEntry[] | undefined

                    const converted = convertReservationsToNetworks(
                        reservations,
                        networkHocon,
                        definitionFromMessage ?? currentDefinition,
                        networkName
                    )
                    newNetworks = mergeNetworks(newNetworks, converted)
                },
                null,
                {
                    [AGENT_NETWORK_DEFINITION_KEY]: currentDefinition,
                    ...(agentNetworkName ? {[AGENT_NETWORK_NAME_KEY]: agentNetworkName} : {}),
                },
                currentUser,
                StreamingUnit.Line
            )

            return newNetworks
        },
        [currentUser, neuroSanURL]
    )

    const handleDockApply = useCallback(async () => {
        const readyToApplyEdit = Boolean(dockPrompt.trim() && neuroSanURL && currentUser)
        if (!readyToApplyEdit) return

        const currentTempNetwork = networkId
            ? tempNetworks.find((n) => n.agentInfo.agent_name === networkId)
            : undefined
        const currentDefinition = currentTempNetwork?.agentNetworkDefinition ?? []

        setIsDockStreaming(true)
        const controller = new AbortController()
        dockAbortControllerRef.current = controller
        let hasTimedOut = false
        const timeoutId = setTimeout(() => {
            hasTimedOut = true
            controller.abort()
        }, DOCK_STREAM_TIMEOUT_MS)
        try {
            const newNetworks = await applyNetworkDesignerChanges(
                controller.signal,
                dockPrompt,
                currentDefinition,
                currentTempNetwork?.agentNetworkName
            )
            const appliedSuccess = saveUpdates(newNetworks, currentTempNetwork?.agentNetworkName)
            if (appliedSuccess) {
                setDockPrompt("")
                showDockBanner({
                    severity: "success",
                    title: "Changes applied.",
                    detail: "Your network has been updated.",
                })
            }
        } catch (e: unknown) {
            const isAbort = e instanceof DOMException && e.name === "AbortError"
            if (isAbort) {
                if (hasTimedOut) {
                    showDockBanner({
                        severity: "error",
                        title: "Failed to apply network change.",
                        detail: "The request timed out. Please try again.",
                    })
                }
            } else {
                showDockBanner({severity: "error", title: "Failed to apply network change.", detail: String(e)})
            }
        } finally {
            clearTimeout(timeoutId)
            dockAbortControllerRef.current = null
            setIsDockStreaming(false)
        }
    }, [
        applyNetworkDesignerChanges,
        currentUser,
        dockPrompt,
        networkId,
        neuroSanURL,
        saveUpdates,
        showDockBanner,
        tempNetworks,
    ])

    // Clear the banner auto-dismiss timer on unmount.
    useEffect(() => {
        return () => {
            clearTimeout(bannerTimeoutRef.current)
        }
    }, [])

    const getBackdrop = () => (
        <Backdrop
            open={isDockStreaming}
            sx={{zIndex: (t) => t.zIndex.modal + 1}}
        >
            {stopState === "confirming" ? (
                <Paper
                    elevation={6}
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        px: 4,
                        py: 3,
                        borderRadius: 2,
                        maxWidth: 420,
                    }}
                >
                    <Typography
                        variant="body1"
                        sx={{fontWeight: "bold"}}
                    >
                        Abort changes?
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        The in-progress update will be cancelled and discarded. Your network will not be modified.
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={handleKeepApplying}
                        >
                            Keep applying
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<span style={{fontSize: "0.7rem"}}>&#9632;</span>}
                            onClick={handleStopAndDiscard}
                        >
                            Stop &amp; discard
                        </Button>
                    </Box>
                </Paper>
            ) : (
                <Paper
                    elevation={6}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        px: 4,
                        py: 2.5,
                        borderRadius: 2,
                        maxWidth: 480,
                    }}
                >
                    <CircularProgress size={24} />
                    <Box sx={{flex: 1}}>
                        <Typography
                            variant="body1"
                            sx={{fontWeight: "bold"}}
                        >
                            Applying changes to network
                        </Typography>
                        {dockPrompt && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{mt: 0.25}}
                            >
                                {dockPrompt}
                            </Typography>
                        )}
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<span style={{fontSize: "0.65rem"}}>&#9632;</span>}
                        onClick={handleStopClick}
                        sx={{
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            color: theme.palette.common.white,
                            borderColor: theme.palette.common.white,
                            fontWeight: "bold",
                            "&:hover": {
                                borderColor: theme.palette.error.main,
                                color: theme.palette.error.main,
                                backgroundColor: alpha(theme.palette.error.main, 0.08),
                            },
                        }}
                    >
                        Stop
                    </Button>
                </Paper>
            )}
        </Backdrop>
    )

    const getDockBanner = () => (
        <MUIAlert
            closeable
            id={id}
            onClose={handleDismissBanner}
            severity={dockBanner.severity}
            sx={{
                borderRadius: 0,
                // Override MUIAlert's default 1rem bottom margin so the banner sits flush
                // against the dock header below it.
                marginBottom: 0,
                py: 0,
                // Match the dock header's right padding so the banner's close X lines up
                // vertically with the header's close X below it.
                paddingRight: 0.5,
                alignItems: "center",
                // Frost the banner like the dock header, so the graph doesn't show through the
                // app's translucent paper background; keep a tinted, mostly opaque severity wash.
                "& .MuiAlert-action": {
                    alignItems: "center",
                    marginRight: 0,
                    paddingTop: 0,
                },
            }}
        >
            <Typography
                variant="caption"
                component="span"
            >
                <strong>{dockBanner.title}</strong>
                {` ${dockBanner.detail}`}
            </Typography>
        </MUIAlert>
    )

    const getEditDock = () =>
        isEditingNetwork && (
            <Box
                sx={{
                    backdropFilter: "blur(8px)",
                    backgroundColor: alpha(theme.palette.background.paper, 0.2),
                    borderTop: `2px solid ${theme.palette.primary.main}`,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: getZIndex(2, theme),
                }}
            >
                {/* Status banner: shown after an "apply" succeeds, is canceled, or fails */}
                {dockBanner && getDockBanner()}
                {/* Dock header */}
                <Box
                    sx={{
                        backdropFilter: "blur(6px)",
                        borderBottom: "1px solid divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingLeft: 1.25,
                        paddingRight: 0.25,
                    }}
                >
                    <Typography
                        variant="overline"
                        sx={{fontWeight: "bold", letterSpacing: 1, lineHeight: 1.8}}
                    >
                        Network Editor
                    </Typography>
                    <IconButton
                        size="small"
                        aria-label="close edit mode"
                        onClick={handleExitEditMode}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
                {/* Prompt input row */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 1,
                        px: 1,
                        py: 0.5,
                        alignItems: "center",
                    }}
                >
                    <TextField
                        autoFocus
                        fullWidth
                        placeholder={DOCK_PROMPT_PLACEHOLDER}
                        variant="outlined"
                        size="small"
                        value={dockPrompt}
                        onChange={(e) => setDockPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                void handleDockApply()
                            }
                        }}
                        disabled={isDockStreaming}
                        slotProps={{htmlInput: {style: {fontSize: "0.75rem"}}}}
                    />
                    <Button
                        variant="contained"
                        onClick={() => void handleDockApply()}
                        disabled={isDockStreaming || !dockPrompt.trim()}
                        sx={{
                            fontSize: 16,
                            marginBottom: "1px",
                            marginRight: 0,
                            minWidth: 110,
                            paddingTop: 0.3,
                            paddingBottom: 0.3,
                            whiteSpace: "nowrap",
                        }}
                        startIcon={
                            isDockStreaming ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : undefined
                        }
                    >
                        {isDockStreaming ? "Applying..." : "Apply"}
                    </Button>
                </Box>
            </Box>
        )

    return (
        <>
            {getBackdrop()}
            {getEditDock()}
        </>
    )
}
