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
 * Main navigation bar that appears at the top of each page: a floating frosted-glass pill with the brand on the left,
 * page links in the middle (with a gradient indicator that glides between them), and a cluster of actions on the right
 * (command palette, menus, user, color scheme and settings).
 */

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import Business from "@mui/icons-material/Business"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import SettingsIcon from "@mui/icons-material/Settings"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import {SxProps, Theme, useColorScheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {motion, useReducedMotion} from "motion/react"
import {JSX as ReactJSX, MouseEvent as ReactMouseEvent, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {DEFAULT_USER_IMAGE, getContactUsConfirmationText, NEURO_SAN_UI_VERSION} from "../../const"
import {useSettingsStore} from "../../state/Settings"
import {
    getSheen,
    glassSurface,
    glowShadow,
    gradientBorder,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_FONT_MONO,
    sheenConic,
    sheenGradient,
} from "../../Theme/sheen"
import {isDarkMode} from "../../Theme/Theme"
import {navigateToUrl} from "../../utils/BrowserNavigation"
import {openCommandPalette, useModifierKeyLabel} from "../CommandPalette/CommandPalette"
import {getCognizantLogoImage} from "../Logo/Common"
import {CustomerLogo} from "../Logo/CustomerLogo"
import {SettingsDialog} from "../Settings/SettingsDialog"

// Declare the Props Interface
export interface NavbarProps {
    // id is a string handle to the element used for testing
    readonly id: string

    // Logo is the title of the NavBar
    readonly logo: string

    // Query from the router, used to pass query parameters
    readonly query: Record<string, string | string[]>

    // Pathname is the path to the current page, used for navigation
    readonly pathname: string

    // Info about the currently authenticated user
    readonly userInfo: {name: string; image: string}

    // Flag indicating whether authentication is enabled
    readonly enableAuthentication: boolean

    // The type of authentication used (e.g., Auth0, OIDC, etc.)
    readonly authenticationType: string

    // Function to sign out the user
    readonly signOut: () => void

    // Support email address for contact us functionality
    readonly supportEmailAddress: string

    // Optional logo.dev token for customer branding
    readonly logoServiceToken?: string

    // Optional flag to show/hide the settings button, defaults to true
    readonly showSettingsButton?: boolean

    // Optional callback fired when the user clicks the "Take a tour" button in the Help menu
    readonly onStartTour?: () => void

    // Optional client-side navigation for the page links. Without it, the links do regular page loads.
    readonly onNavigate?: (path: string) => void
}

// Page links shown in the middle of the bar
const NAV_LINKS = [
    {id: "nav-link-home", label: "Home", path: "/"},
    {id: "nav-link-multi-agent-accelerator", label: "Multi-Agent Accelerator", path: "/multiAgentAccelerator"},
    {id: "nav-link-user-guide", label: "User Guide", path: "/UserGuide"},
] as const

const MENU_ITEM_TEXT_PROPS = {
    color: "text.primary",
    fontSize: "18px",
}

// The Cognizant logo asset is white; in light mode render it as a dark monochrome mark so it stays legible
export const LOGO_LIGHT_MODE_SX: SxProps<Theme> = (theme) => ({
    "& #logo-img": theme.applyStyles("light", {filter: "brightness(0)", opacity: 0.85}),
})

// Radius that turns any box into a pill / circle
const PILL_RADIUS = 999

// The bar holds a lot; show the page links, build number and search label only when there is room for them
const WIDE = "@media (min-width: 1440px)"
const EXTRA_WIDE = "@media (min-width: 1800px)"

// Spring shared by the sliding nav indicator and the theme toggle morph
const NAV_SPRING = {type: "spring", stiffness: 480, damping: 36} as const

// Floating, detached frosted-glass pill with a faint iridescent hairline, stuck just below the top of the viewport
const NAV_BAR_SX: SxProps<Theme> = (theme) => ({
    ...glassSurface(theme, PILL_RADIUS),
    ...gradientBorder(theme, PILL_RADIUS, 1, 0.35),
    // The gradient hairline replaces the plain glass border
    border: 0,
    boxShadow: `inset 0 1px 0 ${getSheen(theme).highlight}, 0 12px 40px -16px rgba(0, 0, 0, 0.45)`,
    flexWrap: "nowrap",
    gap: "0.5rem",
    margin: "12px 16px 0",
    padding: "0.35rem 0.45rem 0.35rem 1.1rem",
    position: "sticky",
    top: "12px",
    width: "auto",
    zIndex: theme.zIndex.appBar,
    // A slightly smaller wordmark leaves room for the page links
    "& #logo-img": {height: "auto", width: 150},
})

// Menu toggles: text pills that pick up a tint on hover
const MENU_PILL_SX: SxProps<Theme> = (theme) => ({
    alignItems: "center",
    borderRadius: `${PILL_RADIUS}px`,
    display: "flex",
    padding: "0.3rem 0.3rem 0.3rem 0.75rem",
    transition: `background-color 0.25s ${SHEEN_EASE}`,
    whiteSpace: "nowrap",
    "&:hover": {backgroundColor: getSheen(theme).tint},
})

// Small glass circle for the icon buttons (dark mode, settings)
const ICON_CIRCLE_SX: SxProps<Theme> = (theme) => ({
    ...glassSurface(theme, PILL_RADIUS),
    boxShadow: `inset 0 1px 0 ${getSheen(theme).highlight}`,
    flexShrink: 0,
    height: 34,
    overflow: "hidden",
    position: "relative",
    transition: `box-shadow 0.3s ${SHEEN_EASE}, transform 0.3s ${SHEEN_EASE}`,
    width: 34,
    "&:hover": {boxShadow: glowShadow(theme, 18), transform: "translateY(-1px)"},
})

// "Search… ⌘K" pill that opens the command palette
const SEARCH_PILL_SX: SxProps<Theme> = (theme) => {
    const sheen = getSheen(theme)
    const border = gradientBorder(theme, PILL_RADIUS, 1, 0.25)
    return {
        ...glassSurface(theme, PILL_RADIUS),
        ...border,
        alignItems: "center",
        border: 0,
        boxShadow: `inset 0 1px 0 ${sheen.highlight}`,
        color: "text.secondary",
        cursor: "pointer",
        display: "flex",
        flexShrink: 0,
        font: "inherit",
        fontSize: "0.85rem",
        gap: "0.45rem",
        height: 34,
        padding: "0 0.4rem 0 0.75rem",
        transition: `box-shadow 0.3s ${SHEEN_EASE}, color 0.2s ease, transform 0.3s ${SHEEN_EASE}`,
        "&::before": {...border["&::before"], transition: "opacity 0.3s ease"},
        "&:hover, &:focus-visible": {
            boxShadow: glowShadow(theme, 18),
            color: (theme.vars ?? theme).palette.text.primary,
            outline: "none",
            transform: "translateY(-1px)",
        },
        "&:hover::before, &:focus-visible::before": {opacity: 0.9},
        "& kbd": {
            backgroundColor: sheen.highlight,
            border: `1px solid ${sheen.glassBorder}`,
            borderRadius: "999px",
            fontFamily: SHEEN_FONT_MONO,
            fontSize: "0.68rem",
            lineHeight: 1,
            padding: "4px 7px",
        },
    }
}

const DISABLE_OUTLINE_PROPS = {
    outline: "none",
    "&:focus": {
        outline: "none",
    },
    "&:active": {
        outline: "none",
    },
}

export const Navbar = ({
    enableAuthentication,
    authenticationType,
    id,
    logo,
    logoServiceToken,
    onNavigate,
    onStartTour,
    pathname,
    query,
    showSettingsButton = true,
    signOut,
    supportEmailAddress,
    userInfo,
}: NavbarProps): ReactJSX.Element => {
    const reduceMotion = useReducedMotion()
    const modifierKey = useModifierKeyLabel()

    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    // Dark mode
    const {mode, setMode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    // Help menu wiring
    const [helpMenuAnchorEl, setHelpMenuAnchorEl] = useState<null | HTMLElement>(null)
    const helpMenuOpen = Boolean(helpMenuAnchorEl)
    const handleCloseHelpMenu = () => {
        setHelpMenuAnchorEl(null)
    }

    // User menu wiring
    const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null)
    const userMenuOpen = Boolean(userMenuAnchorEl)
    const handleCloseUserMenu = () => {
        setUserMenuAnchorEl(null)
    }

    // Explore menu wiring
    const [exploreMenuAnchorEl, setExploreMenuAnchorEl] = useState<null | HTMLElement>(null)
    const exploreMenuOpen = Boolean(exploreMenuAnchorEl)
    const handleCloseExploreMenu = () => {
        setExploreMenuAnchorEl(null)
    }

    // Settings dialog state
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

    // Page link the indicator currently sits under: the hovered one, else the current page
    const [hoveredLink, setHoveredLink] = useState<string | null>(null)
    const activeLink = NAV_LINKS.find((link) => link.path === pathname)?.path ?? null
    const indicatorLink = hoveredLink ?? activeLink

    // Customer for branding
    const customer = useSettingsStore((state) => state.settings.branding.customer)
    const primary = useSettingsStore((state) => state.settings.branding.primary)
    const hasCustomer = customer?.trim().length > 0

    // Logo settings
    const iconSuggestion = useSettingsStore((state) => state.settings.branding.iconSuggestion)
    const logoSource = useSettingsStore((state) => state.settings.branding.logoSource)

    const iconTransition = reduceMotion ? {duration: 0} : NAV_SPRING

    return (
        <Grid
            id="nav-bar-container"
            container={true}
            sx={[
                NAV_BAR_SX,
                LOGO_LIGHT_MODE_SX,
                {
                    alignItems: "center",
                    ...MENU_ITEM_TEXT_PROPS,
                },
            ]}
        >
            {settingsDialogOpen && (
                <SettingsDialog
                    id="settings-dialog"
                    isOpen={settingsDialogOpen}
                    logoServiceToken={logoServiceToken}
                    onClose={() => setSettingsDialogOpen(false)}
                />
            )}

            {/* ---------- Left: brand ---------- */}
            <Box
                sx={{
                    alignItems: "center",
                    display: "flex",
                    flexShrink: 0,
                    gap: 2,
                }}
            >
                {hasCustomer ? (
                    <>
                        <CustomerLogo
                            customer={customer}
                            fallbackIcon={Business}
                            iconSuggestion={iconSuggestion}
                            logoServiceToken={logoServiceToken}
                            logoSource={logoSource}
                        />
                        <Typography
                            data-testid="customer-branding"
                            sx={{
                                fontSize: "20px",
                                fontWeight: "600",
                                paddingLeft: "0.15rem",
                                width: "200px",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            {customer}
                        </Typography>
                    </>
                ) : (
                    getCognizantLogoImage()
                )}
            </Box>

            {/*App title*/}
            <Grid
                id={id}
                sx={{display: "flex", alignItems: "center", flexShrink: 0}}
            >
                {hasCustomer ? getCognizantLogoImage() : null}
                <Typography
                    id="nav-bar-brand"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        marginLeft: "0.6rem",
                        fontSize: "16px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                    }}
                >
                    <a
                        id="navbar-brand-link"
                        style={{
                            fontFamily: SHEEN_FONT_DISPLAY,
                            fontWeight: 500,
                            fontSize: "1.3rem",
                            letterSpacing: "-0.025em",
                            color: "inherit",
                            position: "relative",
                            bottom: "1px",
                            textDecoration: "none",
                        }}
                        href={
                            Object.keys(query || {}).length > 0
                                ? `/?${new URLSearchParams(query as Record<string, string>).toString()}`
                                : "/"
                        }
                    >
                        {logo} {pathname === "/multiAgentAccelerator" ? "Multi-Agent Accelerator" : "Decisioning"}
                    </a>
                </Typography>
            </Grid>

            {/* ---------- Middle: page links with a gliding gradient indicator ---------- */}
            <Box
                component="nav"
                aria-label="Main"
                id="nav-bar-links"
                onMouseLeave={() => setHoveredLink(null)}
                sx={{
                    display: "none",
                    flex: 1,
                    justifyContent: "center",
                    minWidth: 0,
                    [WIDE]: {display: "flex"},
                }}
            >
                <Box
                    component="ul"
                    sx={{display: "flex", gap: "0.15rem", listStyle: "none", margin: 0, padding: 0}}
                >
                    {NAV_LINKS.map((link) => {
                        const isActive = link.path === activeLink
                        return (
                            <li
                                key={link.id}
                                style={{position: "relative"}}
                            >
                                {indicatorLink === link.path && (
                                    <Box
                                        aria-hidden={true}
                                        component={motion.span}
                                        layoutId="nav-bar-active-indicator"
                                        transition={reduceMotion ? {duration: 0} : NAV_SPRING}
                                        sx={(theme: Theme) => ({
                                            backgroundColor: getSheen(theme).tint,
                                            borderRadius: `${PILL_RADIUS}px`,
                                            boxShadow: `inset 0 0 0 1px ${getSheen(theme).glassBorder}`,
                                            inset: 0,
                                            position: "absolute",
                                            // Glowing gradient underline
                                            "&::after": {
                                                backgroundImage: sheenGradient(theme, 90),
                                                borderRadius: 2,
                                                bottom: 3,
                                                boxShadow: `0 0 10px ${getSheen(theme).glow}`,
                                                content: '""',
                                                height: 2,
                                                left: "28%",
                                                position: "absolute",
                                                right: "28%",
                                            },
                                        })}
                                    />
                                )}
                                <Box
                                    aria-current={isActive ? "page" : undefined}
                                    component="a"
                                    href={link.path}
                                    id={link.id}
                                    onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => {
                                        if (onNavigate && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
                                            event.preventDefault()
                                            onNavigate(link.path)
                                        }
                                    }}
                                    onFocus={() => setHoveredLink(link.path)}
                                    onBlur={() => setHoveredLink(null)}
                                    onMouseEnter={() => setHoveredLink(link.path)}
                                    sx={{
                                        color: isActive ? "text.primary" : "text.secondary",
                                        display: "block",
                                        fontSize: "0.9rem",
                                        fontWeight: isActive ? 600 : 500,
                                        outline: "none",
                                        padding: "0.45rem 0.95rem",
                                        position: "relative",
                                        textDecoration: "none",
                                        transition: "color 0.2s ease",
                                        whiteSpace: "nowrap",
                                        "&:hover, &:focus-visible": {color: "text.primary"},
                                    }}
                                >
                                    {link.label}
                                </Box>
                            </li>
                        )
                    })}
                </Box>
            </Box>

            {/* ---------- Right: actions ---------- */}
            {/*Build Number*/}
            <Grid
                id="build"
                sx={{
                    flex: 1, // Fill the gap when the page links are hidden
                    [WIDE]: {flex: "0 0 auto"},
                    display: "flex",
                    justifyContent: "flex-end", // Right align
                    alignItems: "center", // Vertically center
                    marginRight: "0.25rem",
                }}
            >
                <Typography
                    id="build-text"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        color: "text.secondary",
                        display: "none",
                        fontSize: "11px",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "0.02em",
                        opacity: 0.75,
                        whiteSpace: "nowrap",
                        "@media (min-width: 1000px)": {display: "block"},
                        [WIDE]: {display: "none"},
                        [EXTRA_WIDE]: {display: "block"},
                    }}
                >
                    Build: <strong id="build-strong">{NEURO_SAN_UI_VERSION}</strong>
                </Typography>
            </Grid>

            {/*Command palette trigger*/}
            <Box
                aria-keyshortcuts="Meta+K Control+K"
                aria-label="Open command palette"
                component="button"
                id="command-palette-trigger"
                onClick={openCommandPalette}
                sx={SEARCH_PILL_SX}
                type="button"
            >
                <SearchRoundedIcon sx={{fontSize: "1.05rem"}} />
                <Box
                    component="span"
                    sx={{display: "none", [EXTRA_WIDE]: {display: "inline"}}}
                >
                    Search…
                </Box>
                <kbd>{modifierKey} K</kbd>
            </Box>

            {/*Explore menu*/}
            <Grid
                id="explore-dropdown"
                sx={{cursor: "pointer"}}
            >
                <Typography
                    id="explore-toggle"
                    sx={[MENU_PILL_SX, {...MENU_ITEM_TEXT_PROPS, fontSize: "15px", fontWeight: 500}]}
                    onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                        setExploreMenuAnchorEl(event.currentTarget)
                    }}
                >
                    Explore
                    <ArrowDropDownIcon
                        id="nav-explore-dropdown-arrow"
                        sx={{color: primary || "text.secondary", fontSize: 20}}
                    />
                </Typography>
                <Menu
                    id="explore-menu"
                    anchorEl={exploreMenuAnchorEl}
                    open={exploreMenuOpen}
                    onClose={handleCloseExploreMenu}
                >
                    <MenuItem
                        id="explore-neuro-san-studio"
                        key="explore-neuro-san-studio"
                        component="a"
                        href="https://github.com/cognizant-ai-lab/neuro-san-studio"
                        rel="noopener noreferrer"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                        target="_blank"
                    >
                        Neuro-san studio (examples)
                    </MenuItem>
                    <MenuItem
                        id="explore-neuro-san"
                        key="explore-neuro-san"
                        component="a"
                        href="https://github.com/cognizant-ai-lab/neuro-san"
                        rel="noopener noreferrer"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                        target="_blank"
                    >
                        Neuro-san (core)
                    </MenuItem>
                </Menu>
            </Grid>

            {/*Help menu*/}
            <Grid
                id="help-dropdown"
                sx={{cursor: "pointer"}}
            >
                <Typography
                    id="help-toggle"
                    sx={[MENU_PILL_SX, {...MENU_ITEM_TEXT_PROPS, fontSize: "15px", fontWeight: 500}]}
                    onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                        setHelpMenuAnchorEl(event.currentTarget)
                    }}
                >
                    Help
                    <ArrowDropDownIcon
                        id="nav-help-dropdown-arrow"
                        sx={{color: primary || "text.secondary", fontSize: 20}}
                    />
                </Typography>
                <Menu
                    id="help-menu"
                    anchorEl={helpMenuAnchorEl}
                    open={helpMenuOpen}
                    onClose={handleCloseHelpMenu}
                >
                    <MenuItem
                        id="user-guide"
                        key="user-guide"
                        component="a"
                        href="/UserGuide"
                        rel="noopener noreferrer"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                        target="_blank"
                    >
                        User guide
                    </MenuItem>
                    <MenuItem
                        id="take-a-tour"
                        key="take-a-tour"
                        onClick={() => {
                            handleCloseHelpMenu()
                            onStartTour?.()
                        }}
                        sx={{...DISABLE_OUTLINE_PROPS}}
                    >
                        Take a tour
                    </MenuItem>
                    <MenuItem
                        href={null}
                        id="contact-us-help"
                        key="contact-us-help"
                        onClick={() => setEmailDialogOpen(true)}
                    >
                        Contact Us
                    </MenuItem>
                </Menu>
            </Grid>

            {/*Contact us dialog*/}
            {emailDialogOpen ? (
                <ConfirmationModal
                    id="email-dialog"
                    content={getContactUsConfirmationText(supportEmailAddress)}
                    handleCancel={() => {
                        setEmailDialogOpen(false)
                    }}
                    handleOk={() => {
                        navigateToUrl(`mailto:${supportEmailAddress}`)
                        setEmailDialogOpen(false)
                    }}
                    title="Contact Us"
                />
            ) : null}

            {/*User menu*/}
            {userInfo ? (
                <Grid id="user-dropdown">
                    <IconButton
                        aria-label="User dropdown toggle"
                        id="user-dropdown-toggle"
                        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                            setUserMenuAnchorEl(event.currentTarget)
                        }}
                        sx={(theme) => ({
                            ...MENU_ITEM_TEXT_PROPS,
                            borderRadius: `${PILL_RADIUS}px`,
                            padding: "3px 2px 3px 3px",
                            "&:hover": {backgroundColor: getSheen(theme).tint},
                            // Avatar framed by an iridescent ring that starts turning on hover
                            "& .user-avatar-ring": {
                                background: sheenConic(theme),
                                borderRadius: "50%",
                                boxShadow: `0 0 14px -4px ${getSheen(theme).glow}`,
                                display: "flex",
                                padding: "2px",
                            },
                            "&:hover .user-avatar-ring": {animation: "sheenSpin 2.4s linear infinite"},
                            "& #user-image": {
                                borderRadius: "50%",
                                boxShadow: `0 0 0 2px ${(theme.vars ?? theme).palette.background.paper}`,
                                display: "block",
                            },
                        })}
                    >
                        <span className="user-avatar-ring">
                            <img
                                id="user-image"
                                src={userInfo.image || DEFAULT_USER_IMAGE}
                                width={28}
                                height={28}
                                title={userInfo.name}
                                alt=""
                            />
                        </span>
                        <ArrowDropDownIcon
                            id="nav-user-dropdown-arrow"
                            sx={{color: primary || "text.secondary", fontSize: 20}}
                        />
                    </IconButton>
                    <Menu
                        id="user-menu"
                        anchorEl={userMenuAnchorEl}
                        open={userMenuOpen}
                        onClose={handleCloseUserMenu}
                    >
                        <MenuItem
                            id="user-signed-in-as"
                            disabled
                            sx={{fontWeight: "bold"}}
                        >
                            Signed in as
                        </MenuItem>
                        <MenuItem
                            id="user-name"
                            disabled
                            sx={{
                                whiteSpace: "normal",
                                wordWrap: "break-word",
                                fontSize: "smaller",
                            }}
                        >
                            {userInfo.name}
                        </MenuItem>
                        <MenuItem
                            id="auth-type-title"
                            disabled
                            sx={{fontWeight: "bold"}}
                        >
                            Authentication
                        </MenuItem>
                        <MenuItem
                            id="authentication-type-menu-item"
                            disabled
                            sx={{fontSize: "smaller"}}
                        >
                            {authenticationType}
                        </MenuItem>
                        {enableAuthentication && (
                            <MenuItem
                                id="user-sign-out"
                                sx={{...DISABLE_OUTLINE_PROPS, fontWeight: "bold"}}
                                onClick={signOut}
                            >
                                Sign out
                            </MenuItem>
                        )}
                    </Menu>
                </Grid>
            ) : null}
            {/*Dark mode toggle: sun and moon morph into each other (rotate + scale + fade)*/}
            <Tooltip
                id="dark-mode-toggle"
                title={
                    hasCustomer
                        ? "Dark mode toggle is not available when customer branding is active. Reset via Settings menu."
                        : "Toggle dark mode"
                }
            >
                <IconButton
                    aria-label="Toggle dark mode"
                    id="dark-mode-button"
                    onClick={() => {
                        !hasCustomer && setMode(darkMode ? "light" : "dark")
                    }}
                    sx={[
                        ICON_CIRCLE_SX,
                        {
                            cursor: hasCustomer ? "not-allowed" : "pointer",
                            "& .theme-toggle-icon": {
                                alignItems: "center",
                                display: "flex",
                                inset: 0,
                                justifyContent: "center",
                                position: "absolute",
                            },
                        },
                    ]}
                >
                    <motion.span
                        animate={darkMode ? {rotate: 0, scale: 1, opacity: 1} : {rotate: -90, scale: 0.3, opacity: 0}}
                        className="theme-toggle-icon"
                        initial={false}
                        transition={iconTransition}
                    >
                        <DarkModeIcon
                            id="dark-mode-icon"
                            sx={{
                                fontSize: "1rem",
                                color: darkMode ? "secondary.main" : "text.secondary",
                            }}
                        />
                    </motion.span>
                    <motion.span
                        animate={darkMode ? {rotate: 90, scale: 0.3, opacity: 0} : {rotate: 0, scale: 1, opacity: 1}}
                        aria-hidden={true}
                        className="theme-toggle-icon"
                        initial={false}
                        transition={iconTransition}
                    >
                        <LightModeIcon
                            id="light-mode-icon"
                            sx={{color: "secondary.main", fontSize: "1.05rem"}}
                        />
                    </motion.span>
                </IconButton>
            </Tooltip>
            {/* Settings */}
            {showSettingsButton && (
                <Tooltip title="Settings">
                    <IconButton
                        aria-label="Settings"
                        id="settings-button"
                        onClick={() => {
                            setSettingsDialogOpen(true)
                        }}
                        sx={[ICON_CIRCLE_SX, {"&:hover #settings-icon": {color: "text.primary"}}]}
                    >
                        <SettingsIcon
                            id="settings-icon"
                            sx={{
                                ...MENU_ITEM_TEXT_PROPS,
                                color: "text.secondary",
                                fontSize: "1rem",
                                transition: `color 0.2s ease, transform 0.5s ${SHEEN_EASE}`,
                                "button:hover > &": {transform: "rotate(60deg)"},
                            }}
                        />
                    </IconButton>
                </Tooltip>
            )}
        </Grid>
    )
}
