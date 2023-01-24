/**
 * Main navigation bar that appears at the top of each page
 */

// React
import React from 'react'

// Import Constants
import {ENABLE_AUTHENTICATION, MaximumBlue, UNILEAF_VERSION} from '../const'

// Styling Libraries
import {Container, Dropdown, Nav, Navbar as BootstrapNavbar, NavItem, NavLink} from "react-bootstrap";
import Image from 'next/image'
import Link from "next/link";

// Authentication
import {signOut, useSession} from "next-auth/react";

// Custom components
import {isSignedIn} from "./auth";

// Define Constants
const LOGO_COLOR: string = "white";
const NAV_ITEMS_COLOR: string = "white";

// Declare the Props Interface
interface NavbarProps {
    // Logo is the title of the NavBar
    readonly Logo: string
}

function Navbar(props: NavbarProps): React.ReactElement {
    /*
    This component is responsible for rendering the
    navbar component. The logo and the sidebar callback are configurable,
    but not the list items.
    */

    const { data: session, status } = useSession()
    const signedIn: boolean = isSignedIn(session, status)

    return <BootstrapNavbar collapseOnSelect expand="lg"
                style={{background: MaximumBlue, borderBottomColor: MaximumBlue}}
                variant="dark" className="border-b-2">
                <Container>
                    <BootstrapNavbar.Brand href="/" style={{color: LOGO_COLOR}} className="font-bold ml-2">
                        { props.Logo }
                    </BootstrapNavbar.Brand>
                    <BootstrapNavbar.Collapse id="responsive-navbar-nav">
                        <Nav className="me-auto"/>
                        <Nav>
                            <Nav.Item className="px-3" style={{color: NAV_ITEMS_COLOR}}>
                                Build: {UNILEAF_VERSION ?? "Unknown"}
                            </Nav.Item>
                            <Nav.Item className="px-3">
                                <Link href={`/projects`} >
                                    <a style={{color: NAV_ITEMS_COLOR}}>Projects</a>
                                </Link>
                            </Nav.Item>
                            <Dropdown as={NavItem} >
                              <Dropdown.Toggle as={NavLink} className="px-3 py-0"
                                               style={{color: NAV_ITEMS_COLOR, background: MaximumBlue}}>
                                  Help
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item href="/userguide" target="_blank">
                                    User guide
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                            { signedIn && ENABLE_AUTHENTICATION && session && session.user &&
                                <Dropdown as={NavItem} >
                                    <Dropdown.Toggle as={NavLink} className="px-3 py-0"
                                                     id="user-dropdown-toggle"
                                                     style={{color: NAV_ITEMS_COLOR, background: MaximumBlue}}>
                                        { session.user.image &&
                                            <Image
                                                src={session.user.image}
                                                width="30"
                                                height="30"
                                                title={session.user.name}
                                                alt="..."
                                            />
                                        }
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item target="_blank" style={{ pointerEvents: 'none' }}>
                                            Signed in as:
                                        </Dropdown.Item>
                                        <Dropdown.Item id="user-name" target="_blank" style={{
                                                    pointerEvents: 'none',
                                                    fontWeight: 'bold'
                                                }}>
                                            {session.user.name}
                                        </Dropdown.Item>
                                        <Dropdown.Divider style={{
                                            pointerEvents: 'none'
                                        }} />
                                        <Dropdown.Item button
                                            id="user-sign-out"
                                            target="_blank"
                                            onClick={() => signOut({redirect: false})}>
                                                Sign out
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            }
                            { (!signedIn || !ENABLE_AUTHENTICATION || !session || !session.user) &&
                                <Nav.Item className="px-3">
                                </Nav.Item>
                            }
                        </Nav>
                    </BootstrapNavbar.Collapse>
                </Container>
            </BootstrapNavbar>
}

export default Navbar;
