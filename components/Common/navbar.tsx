/**
 * Main navigation bar that appears at the top of each page
 */

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import {IconButton, Menu, MenuItem, Typography} from "@mui/material"
import Grid from "@mui/material/Grid2"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement, MouseEvent as ReactMouseEvent, useState} from "react"

import {ConfirmationModal} from "./confirmationModal"
import {
    CONTACT_US_CONFIRMATION_DIALOG_TEXT,
    CONTACT_US_CONFIRMATION_DIALOG_TITLE,
    DEFAULT_USER_IMAGE,
    UNILEAF_VERSION,
} from "../../const"
import useEnvironmentStore from "../../state/environment"
import useUserInfoStore from "../../state/userInfo"
import {smartSignOut, useAuthentication} from "../../utils/authentication"

// Declare the Props Interface
interface NavbarProps {
    // id is a string handle to the element used for testing
    id: string

    // Logo is the title of the NavBar
    readonly Logo: string
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

function Navbar(props: NavbarProps): ReactElement {
    /*
    This component is responsible for rendering the navbar component.
    */
    const router = useRouter()

    const {data: session} = useAuthentication()

    const propsId = props.id

    const userInfo = session.user
    const userName = userInfo.name

    // Access user info store
    const {currentUser, setCurrentUser, setPicture, oidcProvider} = useUserInfoStore()

    // Access environment info
    const {auth0ClientId, auth0Domain, supportEmailAddress} = useEnvironmentStore()

    const authenticationType = currentUser ? `ALB using ${oidcProvider}` : "NextAuth"

    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    async function handleSignOut() {
        // Clear our state storage variables
        setCurrentUser(undefined)
        setPicture(undefined)

        await smartSignOut(currentUser, auth0Domain, auth0ClientId, oidcProvider)
    }

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

    return (
        <Grid
            id="nav-bar-container"
            container={true}
            alignItems="center"
            sx={{
                ...MENU_ITEM_TEXT_PROPS,
                minHeight: "50px",
                height: "auto",
                maxHeight: "100px",
                color: "var(--bs-white)",
            }}
        >
            {/*App title*/}
            <Grid id={propsId}>
                <Typography
                    id="nav-bar-brand"
                    sx={{
                        ...MENU_ITEM_TEXT_PROPS,
                        color: "var(--bs-white)",
                        marginLeft: "10px",
                        fontWeight: "bold",
                    }}
                >
                    <Link
                        id="navbar-brand-link"
                        style={{color: "var(--bs-white)"}}
                        href={{
                            pathname: "/",
                            query: router.query,
                        }}
                    >
                        {props.Logo}
                    </Link>
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
                    Build: <strong id="build-strong">{UNILEAF_VERSION ?? "Unknown"}</strong>
                </Typography>
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
                        component="a"
                        href="/userguide"
                        target="_blank"
                        sx={{...DISABLE_OUTLINE_PROPS}}
                    >
                        User guide
                    </MenuItem>
                    <MenuItem
                        id="neuro-ai-for-clients"
                        component="a"
                        href="https://youtu.be/oxiu_oaTMSg"
                        target="_blank"
                    >
                        For Clients (Video)
                    </MenuItem>
                    <MenuItem
                        id="neuro-ai-use-case"
                        component="a"
                        href="https://youtu.be/KkmRtmDudMk"
                        target="_blank"
                    >
                        Use Case (Video)
                    </MenuItem>
                    <MenuItem
                        id="neuro-ai-concepts"
                        component="a"
                        href="https://youtu.be/_8g9Zfj08T8"
                        target="_blank"
                    >
                        Concepts (Video)
                    </MenuItem>
                    <MenuItem
                        href={null}
                        id="contact-us-help"
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
                        window.location.href = `mailto:${supportEmailAddress}`
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
                        <NextImage
                            id="user-image"
                            src={userInfo.image || DEFAULT_USER_IMAGE}
                            width={30}
                            height={30}
                            title={userName}
                            alt=""
                            unoptimized={true}
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
                            {userName}
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
                        <MenuItem
                            id="user-sign-out"
                            sx={{...DISABLE_OUTLINE_PROPS, fontWeight: "bold"}}
                            onClick={handleSignOut}
                        >
                            Sign out
                        </MenuItem>
                    </Menu>
                </Grid>
            ) : null}
        </Grid>
    )
}

export default Navbar
