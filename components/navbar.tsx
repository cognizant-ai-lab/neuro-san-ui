/**
 * Main navigation bar that appears at the top of each page
 */

import {startCase} from "lodash"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {signOut, useSession} from "next-auth/react"
import Breadcrumbs from "nextjs-breadcrumbs2"
import {ReactElement} from "react"
import {Navbar as BootstrapNavbar, Container, Dropdown, Nav, NavItem, NavLink, Row} from "react-bootstrap"

import {isSignedIn} from "./auth"
import {ENABLE_AUTHENTICATION, MaximumBlue, UNILEAF_VERSION} from "../const"

// Define Constants
const LOGO_COLOR: string = "white";
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

    // eslint-disable-next-line no-shadow
    const { data: session, status } = useSession()
    const signedIn: boolean = isSignedIn(session, status)

    const propsId = `${props.id}`

    const withBreadcrumbs = props.WithBreadcrumbs ?? true
    
    return <Container id="nav-bar-container">
        <Row id="nav-bar-menu-row">
            <BootstrapNavbar id={`${propsId}`}
                             collapseOnSelect expand="lg"
                             style={{background: MaximumBlue, borderBottomColor: MaximumBlue}}
                             variant="dark" className="border-b-2">
                <Link id="navbar-brand-link" style={{color: NAV_ITEMS_COLOR}}
                      href={{
                          pathname: "/",
                          query: router.query
                      }}
                >
                    <BootstrapNavbar.Brand id="nav-bar-brand"
                                           style={{color: LOGO_COLOR}} className="font-bold ml-2">
                        {props.Logo}
                    </BootstrapNavbar.Brand>
                </Link>
                <BootstrapNavbar.Collapse id="responsive-navbar-nav">
                    <Nav id="nav-bar-initial" className="me-auto"/>
                    <Nav id="nav-bar-grouping">
                        <Nav.Item id="build" className="px-3" style={{color: NAV_ITEMS_COLOR}}>
                            Build: {UNILEAF_VERSION ?? "Unknown"}
                        </Nav.Item>
                        <Nav.Item id="projects" className="px-3">
                            <Link id="project-links" style={{color: NAV_ITEMS_COLOR}}
                                href={{
                                    pathname: "/projects",
                                    query: router.query
                                }}
                            >
                                Projects
                            </Link>
                        </Nav.Item>
                        <Dropdown id="help-dropdown" as={NavItem}>
                            <Dropdown.Toggle as={NavLink} id="help-toggle" className="px-3 py-0"
                                             style={{color: NAV_ITEMS_COLOR, background: MaximumBlue}}>
                                Help
                            </Dropdown.Toggle>
                            <Dropdown.Menu id="help-menu">
                                <Dropdown.Item id="user-guide" href="/userguide" target="_blank">
                                    User guide
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        {signedIn && ENABLE_AUTHENTICATION && session && session.user &&
                            <Dropdown id="user-dropdown" as={NavItem}>
                                <Dropdown.Toggle as={NavLink} className="px-3 py-0"
                                                 id="user-dropdown-toggle"
                                                 style={{color: NAV_ITEMS_COLOR, background: MaximumBlue}}>
                                    {session.user.image &&
                                        <NextImage id="user-image"
                                               src={session.user.image}
                                               width="30"
                                               height="30"
                                               title={session.user.name}
                                               alt="..."
                                        />
                                    }
                                </Dropdown.Toggle>
                                <Dropdown.Menu id="user-menu">
                                    <Dropdown.Item id="user-signed-in-as"
                                                   target="_blank"
                                                   style={{pointerEvents: 'none'}}>
                                        Signed in as:
                                    </Dropdown.Item>
                                    <Dropdown.Item id="user-name" target="_blank" style={{
                                        pointerEvents: 'none',
                                        fontWeight: 'bold'
                                    }}>
                                        {session.user.name}
                                    </Dropdown.Item>
                                    <Dropdown.Divider id="user-divider" style={{
                                        pointerEvents: 'none'
                                    }}/>
                                    <Dropdown.Item button
                                                   id="user-sign-out"
                                                   target="_blank"
                                                   onClick={() => signOut({redirect: false})}>
                                        Sign out
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        }
                    </Nav>
                </BootstrapNavbar.Collapse>
            </BootstrapNavbar>
        </Row>
        {
            withBreadcrumbs && 
                <Row id="nav-bar-breadcrumbs-row">
                    <Breadcrumbs    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    // Breadcrumbs lacks an id attribute    
                        useDefaultStyle 
                        rootLabel="Home" 
                        transformLabel={label => startCase(label)}
                    />
                </Row>
        }
    </Container>
}

export default Navbar;
