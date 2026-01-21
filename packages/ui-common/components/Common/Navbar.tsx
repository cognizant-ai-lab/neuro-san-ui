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
 * Main navigation bar that appears at the top of each page
 */

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import SettingsIcon from "@mui/icons-material/Settings"
import {IconButton, Menu, MenuItem, Tooltip, Typography, useColorScheme} from "@mui/material"
import Grid from "@mui/material/Grid"
import {JSX as ReactJSX, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"

import {ConfirmationModal} from "./confirmationModal"
import {LoadingSpinner} from "./LoadingSpinner"
import {
    authenticationEnabled,
    CONTACT_US_CONFIRMATION_DIALOG_TEXT,
    CONTACT_US_CONFIRMATION_DIALOG_TITLE,
    DEFAULT_USER_IMAGE,
    NEURO_SAN_UI_VERSION,
} from "../../const"
import {isDarkMode} from "../../Theme/Theme"
import {navigateToUrl} from "../../utils/BrowserNavigation"
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

    // The type of authentication used (e.g., Auth0, OIDC, etc.)
    readonly authenticationType: string

    // Function to sign out the user
    readonly signOut: () => void

    // Support email address for contact us functionality
    readonly supportEmailAddress: string
}

const MENU_ITEM_TEXT_PROPS = {
    color: "var(--bs-white)",
    backgroundColor: "var(--bs-primary)",
    fontFamily: "var(--bs-body-font-family)",
    fontSize: "18px",
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
    authenticationType,
    id,
    logo,
    pathname,
    query,
    signOut,
    supportEmailAddress,
    userInfo,
}: NavbarProps): ReactJSX.Element => {
    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    // Dark mode
    const {mode, setMode, systemMode} = useColorScheme()
    const darkMode = isDarkMode(mode, systemMode)

    // Gate to make sure we only attempt to render after Next.js has completed its rehydration
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        // Indicate that the component has been hydrated
        setHydrated(true)
    }, [])

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

    return hydrated ? (
        <Grid
            id="nav-bar-container"
            container={true}
            alignItems="center"
            sx={{
                ...MENU_ITEM_TEXT_PROPS,
                color: "var(--bs-white)",
                padding: "0.25rem",
            }}
        >
            {settingsDialogOpen && (
                <SettingsDialog
                    id="settings-dialog"
                    isOpen={settingsDialogOpen}
                    onClose={() => setSettingsDialogOpen(false)}
                />
            )}
            <a
                id="splash-logo-link"
                href="https://www.cognizant.com/us/en"
                style={{
                    display: "flex",
                    paddingLeft: "0.15rem",
                }}
                target="_blank"
                rel="noopener noreferrer"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    id="logo-img"
                    width="200"
                    height="45"
                    src="/cognizant-logo-white.svg"
                    alt="Cognizant Logo"
                />
            </a>
            {/*App title*/}
            <Grid id={id}>
                <Typography
                    id="nav-bar-brand"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        color: "var(--bs-white)",
                        marginLeft: "0.85rem",
                        fontSize: "16px",
                        fontWeight: "bold",
                    }}
                >
                    <a
                        id="navbar-brand-link"
                        style={{
                            fontWeight: 500,
                            fontSize: "1.1rem",
                            color: "var(--bs-white)",
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

            {/*Build Number*/}
            <Grid
                id="build"
                sx={{
                    flex: 1, // Take available space
                    display: "flex",
                    justifyContent: "flex-end", // Right align
                    alignItems: "center", // Vertically center
                    color: "var(--bs-white)",
                    marginRight: "50px",
                }}
            >
                <Typography
                    id="build-text"
                    sx={{...MENU_ITEM_TEXT_PROPS}}
                >
                    Build: <strong id="build-strong">{NEURO_SAN_UI_VERSION}</strong>
                </Typography>
            </Grid>

            {/*Explore menu*/}
            <Grid
                id="explore-dropdown"
                sx={{cursor: "pointer", marginRight: "30px"}}
            >
                <Typography
                    id="explore-toggle"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        display: "flex",
                        alignItems: "center",
                    }}
                    onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                        setExploreMenuAnchorEl(event.currentTarget)
                    }}
                >
                    Explore
                    <ArrowDropDownIcon
                        id="nav-explore-dropdown-arrow"
                        sx={{color: "var(--bs-white)", fontSize: 22}}
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
                        target="_blank"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                    >
                        Neuro-san studio (examples)
                    </MenuItem>
                    <MenuItem
                        id="explore-neuro-san"
                        key="explore-neuro-san"
                        component="a"
                        href="https://github.com/cognizant-ai-lab/neuro-san"
                        target="_blank"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                    >
                        Neuro-san (core)
                    </MenuItem>
                </Menu>
            </Grid>

            {/*Help menu*/}
            <Grid
                id="help-dropdown"
                sx={{cursor: "pointer", marginRight: "30px"}}
            >
                <Typography
                    id="help-toggle"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        display: "flex",
                        alignItems: "center",
                    }}
                    onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                        setHelpMenuAnchorEl(event.currentTarget)
                    }}
                >
                    Help
                    <ArrowDropDownIcon
                        id="nav-help-dropdown-arrow"
                        sx={{color: "var(--bs-white)", fontSize: 22}}
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
                        href="/userguide"
                        target="_blank"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                    >
                        User guide
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
                    content={CONTACT_US_CONFIRMATION_DIALOG_TEXT}
                    handleCancel={() => {
                        setEmailDialogOpen(false)
                    }}
                    handleOk={() => {
                        navigateToUrl(`mailto:${supportEmailAddress}`)
                        setEmailDialogOpen(false)
                    }}
                    title={CONTACT_US_CONFIRMATION_DIALOG_TITLE}
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
                        sx={{
                            ...MENU_ITEM_TEXT_PROPS,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            id="user-image"
                            src={userInfo.image || DEFAULT_USER_IMAGE}
                            width={30}
                            height={30}
                            title={userInfo.name}
                            alt=""
                        />
                        <ArrowDropDownIcon
                            id="nav-user-dropdown-arrow"
                            sx={{color: "var(--bs-white)", fontSize: 22}}
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
                        {authenticationEnabled() && (
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
            {/*Dark mode toggle*/}
            <Tooltip
                id="dark-mode-toggle"
                title="Toggle dark mode"
            >
                <DarkModeIcon
                    id="dark-mode-icon"
                    sx={{
                        marginRight: "1rem",
                        fontSize: "1rem",
                        cursor: "pointer",
                        color: darkMode ? "var(--bs-yellow)" : "var(--bs-gray-dark)",
                    }}
                    onClick={() => {
                        setMode(darkMode ? "light" : "dark")
                    }}
                />
            </Tooltip>
            {/* Settings */}
            <Tooltip title="Settings">
                <SettingsIcon
                    sx={{
                        marginRight: "1rem",
                        fontSize: "1rem",
                        cursor: "pointer",
                    }}
                    onClick={() => {
                        setSettingsDialogOpen(true)
                    }}
                />
            </Tooltip>
        </Grid>
    ) : (
        <LoadingSpinner id="navbar-loading-spinner" />
    )
}
