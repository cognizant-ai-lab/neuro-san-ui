/**
 * Main navigation bar that appears at the top of each page
 */

// React
import React from 'react'

// Import Constants
import {ENABLE_AUTHENTICATION, MaximumBlue} from '../const'

// Styling Libraries
import {Container, Nav, Navbar as BootstrapNavbar} from "react-bootstrap";
import Image from 'next/image'
import Link from "next/link";

// Authentication
import {signOut, useSession} from "next-auth/react";

// Custom components
import {isSignedIn} from "../utils/auth";

// Define Constants
const LOGO_COLOR: string = "white";
const NAV_ITEMS_COLOR: string = "white";

// Declare the Props Interface
export interface NavbarProps {
    // Logo is the title of the NavBar
    readonly Logo: string
}

export function Navbar(props: NavbarProps): React.ReactElement {
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
                            <Nav.Item className="px-3">
                                <Link href={`/projects`} >
                                    <a style={{color: NAV_ITEMS_COLOR}}>Projects</a>
                                </Link>
                            </Nav.Item>
                            <Nav.Item className="px-3">
                                <button>
                                    {(signedIn && ENABLE_AUTHENTICATION) &&
                                        <a style={{color: NAV_ITEMS_COLOR}} onClick={() => signOut()}>Sign out</a>}
                                </button>
                            </Nav.Item>
                            <Nav.Item className="px-3">
                                {signedIn && ENABLE_AUTHENTICATION &&
                                    <Image
                                        src={session.user.image}
                                        width="30"
                                        height="30"
                                        title={session.user.name}
                                        alt="..."
                                    />
                                }
                            </Nav.Item>
                        </Nav>
                    </BootstrapNavbar.Collapse>
                </Container>
            </BootstrapNavbar>
}

export default Navbar;