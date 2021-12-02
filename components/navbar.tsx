// Import Constants
import { 
    MaximumBlue,
    BaseBlack
} from '../const'

// Import React
import React from 'react'

// Import Styling Libraries
import { 
    NavDropdown, 
    Nav, 
    Container, 
    Navbar as BootstrapNavbar 
} from "react-bootstrap";
import Link from "next/link";

// Define Constants
const BG_COLOR: string = "white";
const LOGO_COLOR: string = "white";
const NAV_ITEMS_COLOR: string = "white";

// Declare the Props Interface
export interface NavbarProps {
    // Logo is the title of the NavBar
    readonly Logo: string,

    // The name of the Page this component is being rendered in
    readonly PageName: string
}

export function Navbar(props: NavbarProps): React.ReactElement {
    /*
    This component is responsible for rendering the
    navbar component. The logo and the sidebar callback are configurable,
    but not the list items.
    */

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
                    <Nav.Item>
                        <Link href={`/projects`} >
                            <a style={{color: NAV_ITEMS_COLOR}}>Projects</a>
                        </Link>
                    </Nav.Item>

                </Nav>
            </BootstrapNavbar.Collapse>
        </Container>
    </BootstrapNavbar>

}

export default Navbar;