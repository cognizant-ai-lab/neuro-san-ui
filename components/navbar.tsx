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

// Define Constants
const BG_COLOR: string = "white";
const LOGO_COLOR: string = "white";
const NAV_ITEMS_COLOR: string = "white";

// Declare the Props Interface
export interface NavbarProps {
    // Logo is the title of the NavBar
    readonly Logo: string,
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
                <Nav className="me-auto"></Nav>
                <Nav>
                    <Nav.Link href="/" style={{color: NAV_ITEMS_COLOR}}>Home</Nav.Link>
                    <Nav.Link href="/projects" style={{color: NAV_ITEMS_COLOR}}>Projects</Nav.Link>
                    <NavDropdown title="Settings" id="collasible-nav-dropdown" style={{color: NAV_ITEMS_COLOR}}>
                        <NavDropdown.Item href="#action/3.1" >Action</NavDropdown.Item>
                        <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                        <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                        <NavDropdown.Divider />
                        <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
                    </NavDropdown>
                    <Nav.Link href="#logout" style={{color: NAV_ITEMS_COLOR}}>Log Out</Nav.Link>
                </Nav>
            </BootstrapNavbar.Collapse>
        </Container>
    </BootstrapNavbar>

}

export default Navbar;