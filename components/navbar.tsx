/**
 * Main navigation bar that appears at the top of each page
 */

import {startCase} from "lodash"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import Breadcrumbs from "nextjs-breadcrumbs2"
import {ReactElement, useState} from "react"
import {Navbar as BootstrapNavbar, Container, Dropdown, Nav, NavItem, NavLink, Row} from "react-bootstrap"

import {ConfirmationModal} from "./confirmationModal"
import {
    CONTACT_US_CONFIRMATION_DIALOG_TEXT,
    CONTACT_US_CONFIRMATION_DIALOG_TITLE,
    MaximumBlue,
    UNILEAF_VERSION,
} from "../const"
import useEnvironmentStore from "../state/environment"
import useUserInfoStore from "../state/userInfo"
import {smartSignOut, useAuthentication} from "../utils/authentication"

// Define Constants
const LOGO_COLOR: string = "white"
const NAV_ITEMS_COLOR: string = "white"

// Declare the Props Interface
interface NavbarProps {
    // id is a string handle to the element used for testing
    id: string

    // Logo is the title of the NavBar
    readonly Logo: string

    readonly WithBreadcrumbs?: boolean
}

function Navbar(props: NavbarProps): ReactElement {
    /*
    This component is responsible for rendering the
    navbar component. The logo and the sidebar callback are configurable,
    but not the list items.
    */
    const router = useRouter()

    const {data: session} = useAuthentication()

    const propsId = props.id

    const withBreadcrumbs = props.WithBreadcrumbs ?? true

    const userInfo = session.user
    const userName = userInfo.name

    // Access user info store
    const {currentUser, setCurrentUser, setPicture} = useUserInfoStore()

    // Access environment info
    const {auth0ClientId, auth0Domain} = useEnvironmentStore()

    const authenticationType = `(Authentication: ${currentUser ? "ALB" : "NextAuth"})`

    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    async function handleSignOut() {
        // Clear our state storage variables
        setCurrentUser(undefined)
        setPicture(undefined)

        await smartSignOut(currentUser, auth0Domain, auth0ClientId)
    }

    return (
        <Container id="nav-bar-container">
            <Row id="nav-bar-menu-row">
                <BootstrapNavbar
                    id={propsId}
                    collapseOnSelect
                    expand="lg"
                    style={{background: MaximumBlue, borderBottomColor: MaximumBlue}}
                    variant="dark"
                    className="border-b-2"
                >
                    <Link
                        id="navbar-brand-link"
                        style={{color: NAV_ITEMS_COLOR}}
                        href={{
                            pathname: "/",
                            query: router.query,
                        }}
                    >
                        <BootstrapNavbar.Brand
                            id="nav-bar-brand"
                            style={{color: LOGO_COLOR}}
                            className="font-bold ml-2"
                        >
                            {props.Logo}
                        </BootstrapNavbar.Brand>
                    </Link>
                    <BootstrapNavbar.Collapse id="responsive-navbar-nav">
                        <Nav
                            id="nav-bar-initial"
                            className="me-auto"
                        />
                        <Nav id="nav-bar-grouping">
                            <Nav.Item
                                id="build"
                                className="px-3"
                                style={{color: NAV_ITEMS_COLOR}}
                            >
                                Build: <strong id="build-strong">{UNILEAF_VERSION ?? "Unknown"}</strong>
                            </Nav.Item>
                            <Dropdown
                                id="help-dropdown"
                                as={NavItem}
                            >
                                <Dropdown.Toggle
                                    as={NavLink}
                                    id="help-toggle"
                                    className="px-3 py-0"
                                    style={{color: NAV_ITEMS_COLOR, background: MaximumBlue}}
                                >
                                    Help
                                </Dropdown.Toggle>
                                <Dropdown.Menu
                                    id="help-menu"
                                    style={{backgroundColor: "ghostwhite"}}
                                >
                                    <Dropdown.Item
                                        id="user-guide"
                                        href="/userguide"
                                        target="_blank"
                                    >
                                        User guide
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        id="neuro-ai-for-clients"
                                        href="https://youtu.be/oxiu_oaTMSg"
                                        target="_blank"
                                    >
                                        For Clients (Video)
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        id="neuro-ai-use-case"
                                        href="https://youtu.be/KkmRtmDudMk"
                                        target="_blank"
                                    >
                                        Use Case (Video)
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        id="neuro-ai-concepts"
                                        href="https://youtu.be/_8g9Zfj08T8"
                                        target="_blank"
                                    >
                                        Concepts (Video)
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        href={null}
                                        id="authentication-type-menu-item"
                                        as="div"
                                    >
                                        {authenticationType}
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                        href={null}
                                        id="contact-us-help"
                                        onClick={() => setEmailDialogOpen(true)}
                                    >
                                        Contact Us
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                            {emailDialogOpen ? (
                                // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                                <ConfirmationModal
                                    title={CONTACT_US_CONFIRMATION_DIALOG_TITLE}
                                    text={CONTACT_US_CONFIRMATION_DIALOG_TEXT}
                                    handleCancel={() => {
                                        setEmailDialogOpen(false)
                                    }}
                                    handleOk={() => {
                                        window.location.href = "mailto:NeuroAiSupport@cognizant.com"
                                        setEmailDialogOpen(false)
                                    }}
                                />
                            ) : null}
                            {userInfo && (
                                <Dropdown
                                    id="user-dropdown"
                                    as={NavItem}
                                >
                                    <Dropdown.Toggle
                                        as={NavLink}
                                        className="px-3 py-0 d-flex align-items-center"
                                        id="user-dropdown-toggle"
                                        style={{
                                            color: NAV_ITEMS_COLOR,
                                            background: MaximumBlue,
                                        }}
                                    >
                                        {session?.user?.image && (
                                            <NextImage
                                                id="user-image"
                                                src={userInfo.image}
                                                width="30"
                                                height="30"
                                                title={userName}
                                                alt="User image"
                                            />
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu
                                        id="user-menu"
                                        style={{backgroundColor: "ghostwhite"}}
                                    >
                                        <Dropdown.Item
                                            id="user-signed-in-as"
                                            target="_blank"
                                            style={{pointerEvents: "none"}}
                                        >
                                            Signed in as:
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            id="user-name"
                                            target="_blank"
                                            style={{
                                                pointerEvents: "none",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {userName}
                                        </Dropdown.Item>
                                        <Dropdown.Divider
                                            id="user-divider"
                                            style={{
                                                pointerEvents: "none",
                                            }}
                                        />
                                        <Dropdown.Item
                                            id="user-sign-out"
                                            target="_blank"
                                            onClick={handleSignOut}
                                        >
                                            Sign out
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}
                        </Nav>
                    </BootstrapNavbar.Collapse>
                </BootstrapNavbar>
            </Row>
            {withBreadcrumbs && (
                <Row id="nav-bar-breadcrumbs-row">
                    <Breadcrumbs // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // Breadcrumbs lacks an id attribute
                        useDefaultStyle
                        rootLabel="Home"
                        transformLabel={(label) => startCase(label)}
                    />
                </Row>
            )}
        </Container>
    )
}

export default Navbar
