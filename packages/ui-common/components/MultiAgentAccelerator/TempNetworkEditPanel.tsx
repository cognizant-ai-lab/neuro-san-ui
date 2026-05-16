/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * A floating panel rendered over the AgentFlow canvas when a temporary network is selected.
 * Allows the user to describe topological changes in natural language; the prompt is forwarded
 * to the Agent Network Designer (without skip_designer) so that the full reasoning model applies
 * the edit and returns a new temporary-network reservation.
 *
 * This is distinct from the regular right-panel chat, which queries the temp network itself for
 * informational purposes and never touches the network topology.
 */

import SendIcon from "@mui/icons-material/Send"
import StopCircleIcon from "@mui/icons-material/StopCircle"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import {alpha, useTheme} from "@mui/material/styles"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, JSX as ReactJSX, useEffect, useRef, useState} from "react"

import {AGENT_NETWORK_DEFINITION_KEY, AGENT_NETWORK_DESIGNER_ID, AGENT_NETWORK_NAME_KEY} from "./const"
import {extractTemporaryNetworksFromMessage, mergeNetworks} from "./TemporaryNetworks"
import {sendChatQuery} from "../../controller/agent/Agent"
import {StreamingUnit} from "../../controller/llm/LlmChat"
import {TemporaryNetwork} from "../../state/TemporaryNetworks"
import {getZIndex} from "../../utils/zIndexLayers"
import {chatMessageFromChunk} from "../AgentChat/Common/Utils"

// #region: Types

interface TempNetworkEditPanelProps {
    /** The neuro-san server URL */
    readonly neuroSanURL: string
    /** The current logged-in user's ID */
    readonly currentUser: string
    /** The currently selected temporary network whose topology the user wants to edit */
    readonly currentTempNetwork: TemporaryNetwork
    /**
     * Called when the network designer returns a successful updated network.
     * @param replacement The best-matching updated TemporaryNetwork
     * @param allNewNetworks All new TemporaryNetwork entries returned by the designer
     */
    readonly onNetworkUpdated: (replacement: TemporaryNetwork, allNewNetworks: TemporaryNetwork[]) => void
}

// #endregion: Types

// #region: Helpers

/**
 * Parses a single streamed JSON line and appends any new TemporaryNetwork entries to `accumulated`.
 * Unlike the manual-edit variant in MultiAgentAccelerator, this version does NOT override the
 * network definition — the authoritative definition comes from the backend response.
 */
const collectNetworksFromChunk = (chunk: string, accumulated: TemporaryNetwork[]): TemporaryNetwork[] => {
    try {
        const chatMessage = chatMessageFromChunk(chunk)
        if (!chatMessage) return accumulated
        const converted = extractTemporaryNetworksFromMessage(chatMessage)
        if (converted.length === 0) return accumulated
        return mergeNetworks(accumulated, converted)
    } catch (e: unknown) {
        console.warn("TempNetworkEditPanel: failed to parse chunk:", e)
        return accumulated
    }
}

// #endregion: Helpers

// How long to show a success / error status message before clearing it automatically (ms)
const STATUS_CLEAR_DELAY_MS = 4_000

/**
 * Floating topological-edit panel shown over the ReactFlow canvas when a temp network is active.
 *
 * The panel renders as a compact bar anchored to the bottom-centre of its containing element.
 * The containing element must have `position: "relative"` for correct placement.
 */
export const TempNetworkEditPanel: FC<TempNetworkEditPanelProps> = ({
    neuroSanURL,
    currentUser,
    currentTempNetwork,
    onNetworkUpdated,
}): ReactJSX.Element => {
    const theme = useTheme()
    const shadowColor = theme.palette.mode === "dark" ? theme.palette.common.white : theme.palette.common.black

    const [editPrompt, setEditPrompt] = useState<string>("")
    const [isStreaming, setIsStreaming] = useState<boolean>(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusIsError, setStatusIsError] = useState<boolean>(false)

    const controllerRef = useRef<AbortController | null>(null)
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Auto-clear status message after a delay
    const scheduleStatusClear = () => {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
        clearTimerRef.current = setTimeout(() => {
            setStatusMessage(null)
            setStatusIsError(false)
        }, STATUS_CLEAR_DELAY_MS)
    }

    // Clean up timer on unmount
    useEffect(
        () => () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
        },
        []
    )

    const handleSend = async (): Promise<void> => {
        if (!editPrompt.trim() || isStreaming) return

        const controller = new AbortController()
        controllerRef.current = controller

        setIsStreaming(true)
        setStatusMessage("Applying topological changes\u2026")
        setStatusIsError(false)

        let newNetworks: TemporaryNetwork[] = []

        try {
            await sendChatQuery(
                neuroSanURL,
                controller.signal,
                editPrompt,
                AGENT_NETWORK_DESIGNER_ID,
                (chunk) => {
                    newNetworks = collectNetworksFromChunk(chunk, newNetworks)
                },
                // No persistent chat context — each topological edit is self-contained
                null,
                {
                    [AGENT_NETWORK_DEFINITION_KEY]: currentTempNetwork.agentNetworkDefinition,
                    ...(currentTempNetwork.agentNetworkName
                        ? {[AGENT_NETWORK_NAME_KEY]: currentTempNetwork.agentNetworkName}
                        : {}),
                    // Omitting skip_designer so the full reasoning model is used for topological edits
                },
                currentUser,
                StreamingUnit.Line
            )

            if (newNetworks.length === 0) {
                setStatusMessage("No topology changes were returned. Please try a different prompt.")
                setStatusIsError(true)
                scheduleStatusClear()
            } else {
                const replacement =
                    newNetworks.find((n) => n.agentNetworkName === currentTempNetwork.agentNetworkName) ??
                    newNetworks[0]

                setEditPrompt("")
                setStatusMessage("Network topology updated.")
                setStatusIsError(false)
                scheduleStatusClear()
                onNetworkUpdated(replacement, newNetworks)
            }
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === "AbortError") {
                setStatusMessage(null)
                setStatusIsError(false)
            } else {
                setStatusMessage(`Failed to apply changes: ${e instanceof Error ? e.message : String(e)}`)
                setStatusIsError(true)
                scheduleStatusClear()
            }
        } finally {
            setIsStreaming(false)
            controllerRef.current = null
        }
    }

    const handleStop = (): void => {
        controllerRef.current?.abort()
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void handleSend()
        }
    }

    return (
        <Box
            id="temp-network-edit-panel"
            sx={{
                position: "absolute",
                bottom: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(620px, 90%)",
                zIndex: getZIndex(2, theme),
                borderRadius: "10px",
                background: alpha(theme.palette.background.paper, 0.92),
                backdropFilter: "blur(6px)",
                boxShadow: `0 4px 16px ${alpha(shadowColor, 0.18)}`,
                border: `1px solid ${theme.palette.divider}`,
                padding: "0.6rem 0.75rem",
            }}
        >
            {/* Header label */}
            <Box
                id="temp-network-edit-panel-header"
                sx={{display: "flex", alignItems: "center", gap: 0.5, mb: 0.5}}
            >
                {/* Inline status */}
                {statusMessage && (
                    <Box
                        id="temp-network-edit-panel-status"
                        sx={{display: "flex", alignItems: "center", gap: 0.5, ml: 1}}
                    >
                        {isStreaming && (
                            <CircularProgress
                                id="temp-network-edit-panel-spinner"
                                size={10}
                                thickness={5}
                            />
                        )}
                        <Typography
                            id="temp-network-edit-panel-status-text"
                            variant="caption"
                            sx={{color: statusIsError ? theme.palette.error.main : theme.palette.text.secondary}}
                        >
                            {statusMessage}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Input row */}
            <Box
                id="temp-network-edit-panel-input-row"
                sx={{display: "flex", alignItems: "flex-end", gap: 0.75}}
            >
                <TextField
                    id="temp-network-edit-panel-input"
                    fullWidth
                    size="small"
                    placeholder="Describe the change you'd like to make, for example, add node X or delete node X."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    multiline
                    maxRows={4}
                    slotProps={{
                        input: {
                            sx: {fontSize: "0.85rem"},
                        },
                    }}
                />

                {isStreaming ? (
                    <Tooltip title="Stop">
                        <span>
                            <IconButton
                                aria-label="Stop"
                                id="temp-network-edit-panel-stop"
                                onClick={handleStop}
                                size="small"
                                color="error"
                                sx={{mb: "2px"}}
                            >
                                <StopCircleIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : (
                    <Tooltip title="Send (Enter)">
                        <span>
                            <IconButton
                                aria-label="Send"
                                id="temp-network-edit-panel-send"
                                onClick={() => void handleSend()}
                                size="small"
                                disabled={!editPrompt.trim()}
                                color="primary"
                                sx={{mb: "2px"}}
                            >
                                <SendIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
            </Box>
        </Box>
    )
}
