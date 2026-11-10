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
 * Global command palette (⌘K / Ctrl+K): a centered frosted-glass panel that springs in over a blurred backdrop, with
 * a large search field and grouped, keyboard-navigable actions built on cmdk. Only wires up capabilities the app
 * already has: navigation, color scheme, settings, the guided tour, external docs and contacting support.
 */

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded"
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded"
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded"
import HomeRoundedIcon from "@mui/icons-material/HomeRounded"
import HubRoundedIcon from "@mui/icons-material/HubRounded"
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded"
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded"
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded"
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded"
import Box from "@mui/material/Box"
import Modal from "@mui/material/Modal"
import {Theme, useColorScheme, useTheme} from "@mui/material/styles"
import {Command, useCommandState} from "cmdk"
import {AnimatePresence, motion, useReducedMotion} from "motion/react"
import {ReactNode, useCallback, useEffect, useMemo, useState} from "react"

import {useSettingsStore} from "../../state/Settings"
import {
    getSheen,
    glassSurface,
    gradientBorder,
    gradientText,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_FONT_MONO,
    SHEEN_RADIUS,
    SHEEN_RADIUS_SURFACE,
    sheenGradient,
} from "../../Theme/sheen"
import {isDarkMode} from "../../Theme/Theme"
import {navigateToUrl} from "../../utils/BrowserNavigation"
import {spotlightStyles, useSpotlight} from "../Common/Spotlight"
import {SettingsDialog} from "../Settings/SettingsDialog"

// Window event that opens the palette from anywhere (e.g. the Navbar search pill)
export const OPEN_COMMAND_PALETTE_EVENT_NAME = "neuro-san-open-command-palette"

/**
 * Opens the command palette, wherever it is mounted.
 */
export const openCommandPalette = (): void => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT_NAME))
}

/**
 * Label of the platform's command modifier key: ⌘ on Apple platforms, Ctrl elsewhere. Resolved after mount so that
 * server and client markup match.
 */
export const useModifierKeyLabel = (): string => {
    const [label, setLabel] = useState("Ctrl")
    useEffect(() => {
        if (/Mac|iPhone|iPad|iPod/u.test(navigator.userAgent)) {
            setLabel("⌘")
        }
    }, [])
    return label
}

export interface CommandPaletteProps {
    // Client-side navigation (e.g. Next router push)
    readonly onNavigate: (path: string) => void

    // Starts the guided app tour
    readonly onStartTour?: () => void

    // Support email address; "Contact support" is offered only when present
    readonly supportEmailAddress?: string

    // Optional logo.dev token, forwarded to the Settings dialog
    readonly logoServiceToken?: string

    // Current path, so the current page can be marked
    readonly pathname?: string
}

interface PaletteAction {
    readonly id: string
    readonly label: string
    readonly hint?: string
    readonly icon: ReactNode
    readonly keywords?: string[]
    readonly disabled?: boolean
    readonly external?: boolean
    readonly current?: boolean
    readonly handleSelect: () => void
}

interface PaletteGroup {
    readonly heading: string
    readonly actions: PaletteAction[]
}

const PANEL_SPRING = {type: "spring", stiffness: 420, damping: 32, mass: 0.9} as const
const HIGHLIGHT_SPRING = {type: "spring", stiffness: 520, damping: 40} as const

// Small keycap
const Kbd = ({children}: {readonly children: ReactNode}) => (
    <Box
        component="kbd"
        sx={(theme: Theme) => ({
            alignItems: "center",
            backgroundColor: getSheen(theme).highlight,
            border: `1px solid ${getSheen(theme).glassBorder}`,
            borderRadius: "6px",
            boxShadow: `inset 0 -1px 0 ${getSheen(theme).glassBorder}`,
            color: "text.secondary",
            display: "inline-flex",
            fontFamily: SHEEN_FONT_MONO,
            fontSize: "0.7rem",
            height: 20,
            justifyContent: "center",
            lineHeight: 1,
            minWidth: 20,
            px: "5px",
        })}
    >
        {children}
    </Box>
)

/**
 * One palette row. Reads the active (keyboard/pointer highlighted) item from cmdk so the tinted highlight and its
 * gradient bar can glide between rows as a single shared-layout element.
 */
const PaletteItem = ({action}: {readonly action: PaletteAction}) => {
    const selected = useCommandState((state) => state.value === action.label)
    const reduceMotion = useReducedMotion()

    return (
        <Command.Item
            disabled={action.disabled}
            id={`command-palette-item-${action.id}`}
            keywords={action.keywords}
            onSelect={action.handleSelect}
            value={action.label}
        >
            {selected && (
                <motion.span
                    aria-hidden={true}
                    className="command-palette-highlight"
                    layoutId="command-palette-highlight"
                    transition={reduceMotion ? {duration: 0} : HIGHLIGHT_SPRING}
                />
            )}
            <span className="command-palette-item-icon">{action.icon}</span>
            <span className="command-palette-item-text">
                <span className="command-palette-item-label">{action.label}</span>
                {action.hint && <span className="command-palette-item-hint">{action.hint}</span>}
            </span>
            {action.current && <span className="command-palette-item-badge">Current</span>}
            {action.external && (
                <OpenInNewRoundedIcon
                    className="command-palette-item-trailing"
                    sx={{fontSize: "0.95rem"}}
                />
            )}
            {selected && !action.external && (
                <ArrowForwardRoundedIcon
                    className="command-palette-item-trailing"
                    sx={{fontSize: "1rem"}}
                />
            )}
        </Command.Item>
    )
}

const getPanelSx = (theme: Theme) => {
    const sheen = getSheen(theme)
    const palette = (theme.vars ?? theme).palette
    return {
        ...glassSurface(theme, SHEEN_RADIUS_SURFACE),
        ...gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.75),
        ...spotlightStyles(theme, 340),
        border: 0,
        boxShadow: [
            `inset 0 1px 0 ${sheen.highlight}`,
            `0 40px 120px -30px ${sheen.glow}`,
            "0 30px 80px -24px rgba(0, 0, 0, 0.6)",
        ].join(", "),
        color: palette.text.primary,
        overflow: "hidden",
        width: "min(640px, calc(100vw - 32px))",

        "& [cmdk-root]": {outline: "none"},

        // Search field
        "& [cmdk-input]": {
            background: "transparent",
            border: 0,
            color: palette.text.primary,
            flex: 1,
            fontFamily: SHEEN_FONT_DISPLAY,
            fontSize: "1.55rem",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            minWidth: 0,
            outline: "none",
            padding: 0,
            "&::placeholder": {color: palette.text.secondary, opacity: 0.7},
        },

        // Results list, animating its height with cmdk's measured list height
        "& [cmdk-list]": {
            height: "min(var(--cmdk-list-height, auto), 52vh)",
            maxHeight: "52vh",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "6px 8px 8px",
            scrollPaddingBlock: "8px",
            transition: `height 0.25s ${SHEEN_EASE}`,
        },

        "& [cmdk-group-heading]": {
            color: palette.text.secondary,
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            padding: "12px 12px 6px",
            textTransform: "uppercase",
        },

        "& [cmdk-item]": {
            alignItems: "center",
            borderRadius: `${SHEEN_RADIUS}px`,
            cursor: "pointer",
            display: "flex",
            gap: "12px",
            minHeight: 48,
            padding: "8px 12px",
            position: "relative",
            transition: "color 0.2s ease",
            userSelect: "none",
            "& > :not(.command-palette-highlight)": {position: "relative", zIndex: 1},
        },
        "& [cmdk-item][data-disabled='true']": {cursor: "not-allowed", opacity: 0.45},

        // Shared highlight: sheen tint wash with a glowing gradient bar at its left edge
        "& .command-palette-highlight": {
            backgroundColor: sheen.tint,
            backgroundImage: `linear-gradient(90deg, ${sheen.highlight}, transparent 70%)`,
            borderRadius: `${SHEEN_RADIUS}px`,
            boxShadow: `inset 0 0 0 1px ${sheen.glassBorder}`,
            inset: 0,
            position: "absolute",
            zIndex: 0,
            "&::before": {
                backgroundImage: sheenGradient(theme, 180),
                borderRadius: 3,
                bottom: 10,
                boxShadow: `0 0 12px ${sheen.glow}`,
                content: '""',
                left: 0,
                position: "absolute",
                top: 10,
                width: 3,
            },
        },

        "& .command-palette-item-icon": {
            alignItems: "center",
            backgroundColor: sheen.highlight,
            border: `1px solid ${sheen.glassBorder}`,
            borderRadius: "10px",
            color: palette.text.secondary,
            display: "inline-flex",
            flexShrink: 0,
            height: 32,
            justifyContent: "center",
            transition: `color 0.2s ease, box-shadow 0.3s ${SHEEN_EASE}, transform 0.3s ${SHEEN_EASE}`,
            width: 32,
            "& svg": {fontSize: "1.1rem"},
        },
        "& [cmdk-item][data-selected='true'] .command-palette-item-icon": {
            boxShadow: `0 0 18px -4px ${sheen.glow}`,
            color: palette.primary.main,
            transform: "scale(1.06)",
        },
        "& .command-palette-item-text": {display: "flex", flex: 1, flexDirection: "column", minWidth: 0},
        "& .command-palette-item-label": {fontSize: "0.95rem", fontWeight: 500},
        "& .command-palette-item-hint": {
            color: palette.text.secondary,
            fontSize: "0.78rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        "& .command-palette-item-badge": {
            ...gradientText(theme),
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
        },
        "& .command-palette-item-trailing": {color: palette.text.secondary},

        "& [cmdk-empty]": {
            color: palette.text.secondary,
            fontSize: "0.9rem",
            padding: "28px 12px",
            textAlign: "center",
        },
    }
}

/**
 * The command palette. Mount once near the app root; opens with ⌘K / Ctrl+K or `openCommandPalette()`.
 */
export const CommandPalette = ({
    logoServiceToken,
    onNavigate,
    onStartTour,
    pathname,
    supportEmailAddress,
}: CommandPaletteProps) => {
    const theme = useTheme()
    const reduceMotion = useReducedMotion()
    const modifierKey = useModifierKeyLabel()
    const spotlight = useSpotlight()

    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [settingsOpen, setSettingsOpen] = useState(false)

    const {mode, setMode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    // Same rule as the Navbar toggle: the color scheme is locked while customer branding is active
    const customer = useSettingsStore((state) => state.settings.branding.customer)
    const hasCustomer = customer?.trim().length > 0

    const closePalette = useCallback(() => setIsOpen(false), [])

    // ⌘K / Ctrl+K toggles; the window event opens
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
                event.preventDefault()
                setIsOpen((wasOpen) => !wasOpen)
            }
        }
        const onOpenEvent = () => setIsOpen(true)
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener(OPEN_COMMAND_PALETTE_EVENT_NAME, onOpenEvent)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT_NAME, onOpenEvent)
        }
    }, [])

    // Fresh search every time it opens
    useEffect(() => {
        if (isOpen) {
            setSearch("")
        }
    }, [isOpen])

    // Close the palette first, then perform the action
    const run = useCallback(
        (perform: () => void) => () => {
            setIsOpen(false)
            perform()
        },
        []
    )

    const groups: PaletteGroup[] = useMemo(() => {
        const navigate = [
            {id: "home", label: "Home", hint: "Back to the start", path: "/", icon: <HomeRoundedIcon />},
            {
                id: "multi-agent-accelerator",
                label: "Multi-Agent Accelerator",
                hint: "Explore, chat with and design agent networks",
                path: "/multiAgentAccelerator",
                icon: <HubRoundedIcon />,
                keywords: ["maa", "agents", "network", "chat"],
            },
            {
                id: "user-guide",
                label: "User Guide",
                hint: "Documentation and how-tos",
                path: "/UserGuide",
                icon: <MenuBookRoundedIcon />,
                keywords: ["help", "docs", "documentation"],
            },
        ].map(({path, ...action}) => ({
            ...action,
            current: pathname === path,
            handleSelect: run(() => onNavigate(path)),
        }))

        const preferences: PaletteAction[] = [
            {
                id: "toggle-theme",
                label: darkMode ? "Switch to light mode" : "Switch to dark mode",
                hint: hasCustomer ? "Unavailable while customer branding is active" : "Toggle the color scheme",
                icon: darkMode ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />,
                keywords: ["theme", "dark", "light", "appearance", "color"],
                disabled: hasCustomer,
                handleSelect: run(() => setMode(darkMode ? "light" : "dark")),
            },
            {
                id: "settings",
                label: "Open settings",
                hint: "Appearance, branding and API keys",
                icon: <SettingsRoundedIcon />,
                keywords: ["preferences", "branding", "keys", "byok"],
                handleSelect: run(() => setSettingsOpen(true)),
            },
        ]

        const help: PaletteAction[] = [
            ...(onStartTour
                ? [
                      {
                          id: "tour",
                          label: "Take a tour",
                          hint: "A guided walkthrough of the app",
                          icon: <ExploreRoundedIcon />,
                          keywords: ["onboarding", "walkthrough", "help"],
                          handleSelect: run(onStartTour),
                      },
                  ]
                : []),
            ...(supportEmailAddress
                ? [
                      {
                          id: "contact-support",
                          label: "Contact support",
                          hint: supportEmailAddress,
                          icon: <MailOutlineRoundedIcon />,
                          keywords: ["email", "help", "contact us"],
                          handleSelect: run(() => navigateToUrl(`mailto:${supportEmailAddress}`)),
                      },
                  ]
                : []),
            {
                id: "neuro-san-studio",
                label: "Neuro-san studio (examples)",
                hint: "github.com/cognizant-ai-lab/neuro-san-studio",
                icon: <OpenInNewRoundedIcon />,
                keywords: ["github", "examples", "explore"],
                external: true,
                handleSelect: run(() =>
                    window.open("https://github.com/cognizant-ai-lab/neuro-san-studio", "_blank", "noopener")
                ),
            },
            {
                id: "neuro-san",
                label: "Neuro-san (core)",
                hint: "github.com/cognizant-ai-lab/neuro-san",
                icon: <OpenInNewRoundedIcon />,
                keywords: ["github", "core", "explore"],
                external: true,
                handleSelect: run(() =>
                    window.open("https://github.com/cognizant-ai-lab/neuro-san", "_blank", "noopener")
                ),
            },
        ]

        return [
            {heading: "Navigate", actions: navigate},
            {heading: "Preferences", actions: preferences},
            {heading: "Help & resources", actions: help},
        ]
    }, [darkMode, hasCustomer, onNavigate, onStartTour, pathname, run, setMode, supportEmailAddress])

    const panelSx = useMemo(() => getPanelSx(theme), [theme])

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <Modal
                        key="command-palette"
                        open={true}
                        onClose={closePalette}
                        hideBackdrop={true}
                        // Keep the palette above dialogs, menus and the chat window
                        sx={{zIndex: theme.zIndex.modal + 10}}
                    >
                        <Box
                            aria-label="Command palette"
                            aria-modal={true}
                            id="command-palette"
                            role="dialog"
                            sx={{
                                alignItems: "flex-start",
                                display: "flex",
                                inset: 0,
                                justifyContent: "center",
                                outline: "none",
                                paddingTop: "min(16vh, 140px)",
                                position: "fixed",
                            }}
                        >
                            {/* Dimmed, blurred backdrop */}
                            <motion.div
                                animate={{opacity: 1}}
                                data-testid="command-palette-backdrop"
                                exit={{opacity: 0}}
                                initial={{opacity: 0}}
                                onClick={closePalette}
                                style={{
                                    backgroundColor: "rgba(6, 6, 12, 0.6)",
                                    inset: 0,
                                    position: "fixed",
                                }}
                                transition={{duration: 0.22, ease: "easeOut"}}
                            />
                            <motion.div
                                animate={{opacity: 1, scale: 1, y: 0, filter: "blur(0px)"}}
                                exit={{
                                    opacity: 0,
                                    scale: reduceMotion ? 1 : 0.97,
                                    y: reduceMotion ? 0 : -6,
                                    filter: "blur(4px)",
                                    transition: {duration: 0.16, ease: "easeIn"},
                                }}
                                initial={{
                                    opacity: 0,
                                    scale: reduceMotion ? 1 : 0.92,
                                    y: reduceMotion ? 0 : -14,
                                    filter: reduceMotion ? "blur(0px)" : "blur(10px)",
                                }}
                                style={{position: "relative", transformOrigin: "50% 0%"}}
                                transition={reduceMotion ? {duration: 0.15} : PANEL_SPRING}
                            >
                                <Box
                                    {...spotlight}
                                    sx={panelSx}
                                >
                                    <Command
                                        label="Command palette"
                                        loop={true}
                                    >
                                        <Box
                                            sx={{
                                                alignItems: "center",
                                                borderBottom: `1px solid ${getSheen(theme).glassBorder}`,
                                                display: "flex",
                                                gap: "14px",
                                                padding: "18px 20px",
                                            }}
                                        >
                                            <SearchRoundedIcon
                                                sx={{
                                                    color: "primary.main",
                                                    filter: `drop-shadow(0 0 8px ${getSheen(theme).glow})`,
                                                    fontSize: "1.6rem",
                                                }}
                                            />
                                            <Command.Input
                                                autoFocus={true}
                                                id="command-palette-input"
                                                onValueChange={setSearch}
                                                placeholder="Search pages and actions…"
                                                value={search}
                                            />
                                            <Kbd>esc</Kbd>
                                        </Box>
                                        <Command.List label="Actions">
                                            <Command.Empty>
                                                No results for “<strong>{search}</strong>”
                                            </Command.Empty>
                                            {groups.map((group) => (
                                                <Command.Group
                                                    heading={group.heading}
                                                    key={group.heading}
                                                >
                                                    {group.actions.map((action) => (
                                                        <PaletteItem
                                                            action={action}
                                                            key={action.id}
                                                        />
                                                    ))}
                                                </Command.Group>
                                            ))}
                                        </Command.List>
                                        <Box
                                            sx={{
                                                alignItems: "center",
                                                borderTop: `1px solid ${getSheen(theme).glassBorder}`,
                                                color: "text.secondary",
                                                display: "flex",
                                                fontSize: "0.72rem",
                                                gap: "14px",
                                                padding: "10px 18px",
                                                "& > span": {alignItems: "center", display: "inline-flex", gap: "6px"},
                                            }}
                                        >
                                            <span>
                                                <Kbd>↑</Kbd>
                                                <Kbd>↓</Kbd>
                                                navigate
                                            </span>
                                            <span>
                                                <Kbd>↵</Kbd>
                                                select
                                            </span>
                                            <span>
                                                <Kbd>{modifierKey}</Kbd>
                                                <Kbd>K</Kbd>
                                                toggle
                                            </span>
                                            <Box
                                                component="span"
                                                sx={{
                                                    ...gradientText(theme),
                                                    fontFamily: SHEEN_FONT_DISPLAY,
                                                    fontSize: "0.9rem",
                                                    marginLeft: "auto",
                                                }}
                                            >
                                                Neuro® AI
                                            </Box>
                                        </Box>
                                    </Command>
                                </Box>
                            </motion.div>
                        </Box>
                    </Modal>
                )}
            </AnimatePresence>
            {settingsOpen && (
                <SettingsDialog
                    id="command-palette-settings-dialog"
                    isOpen={settingsOpen}
                    logoServiceToken={logoServiceToken}
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </>
    )
}
