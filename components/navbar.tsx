/**
 * Main navigation bar that appears at the top of each page
 */

// React
import React from 'react'

// Third party
import Breadcrumbs from "nextjs-breadcrumbs"
import {Container, Dropdown, Nav, Navbar as BootstrapNavbar, NavItem, NavLink} from "react-bootstrap"
import {Row} from "react-bootstrap"
import {startCase} from "lodash"

// Import Constants
import {ENABLE_AUTHENTICATION, MaximumBlue, UNILEAF_VERSION} from '../const'

// Styling Libraries

import Image from 'next/image'
import Link from "next/link"

// Authentication
import {signOut, useSession} from "next-auth/react"

// Custom components
import {isSignedIn} from "./auth"




// Define Constants
const LOGO_COLOR: string = "white";
const NAV_ITEMS_COLOR: string = "white";

// Declare the Props Interface
interface NavbarProps {
    // id is a string handle to the element used for testing
    id: string
    
    // Logo is the title of the NavBar
    readonly Logo: string
    
    readonly WithBreadcrumbs?: boolean
}

function Navbar(props: NavbarProps): React.ReactElement {
    /*
    This component is responsible for rendering the
    navbar component. The logo and the sidebar callback are configurable,
    but not the list items.
    */

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

                <BootstrapNavbar.Brand id="nav-bar-brand"
                                       href="/" style={{color: LOGO_COLOR}} className="font-bold ml-2">
                    {props.Logo}
                </BootstrapNavbar.Brand>
                <BootstrapNavbar.Collapse id="responsive-navbar-nav">
                    <Nav id="nav-bar-initial" className="me-auto"/>
                    <Nav id="nav-bar-grouping">
                        <Nav.Item id="build" className="px-3" style={{color: NAV_ITEMS_COLOR}}>
                            Build: {UNILEAF_VERSION ?? "Unknown"}
                        </Nav.Item>
                        <Nav.Item id="projects" className="px-3">
                            <Link id="project-links" href={`/projects`}>
                                <a id="projects-anchor" style={{color: NAV_ITEMS_COLOR}}>Projects</a>
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
                                        <Image id="user-image"
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
