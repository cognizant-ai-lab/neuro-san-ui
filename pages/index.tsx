// Import React
import React from 'react'
import styled from "styled-components";

const OuterContainer = styled.div`
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/landingpagebackground.png");
    background-size: cover;
    width: 100%;
    height: 100vh;
    position: absolute;
`

const Marginer = styled.div`
  margin: 6% 9.375% 6% 9.375%
`

const Navbar = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    height: 5%;
    align-items: center;
`

const NavbarLogo = styled.h4`
    color: white;
`

const NavbarMiddleSection = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 12.5%;
`

const NavbarItem = styled.a`
    text-decoration: none;
    color: white;
    font-size: 1rem;
    padding: 0;
    margin: 0;
    text-align: center;
`

export default function Index(): React.ReactElement {
  return (
    <OuterContainer>
      <Marginer>
          <Navbar>
              <NavbarLogo>LEAF</NavbarLogo>
              <NavbarMiddleSection>
                  <NavbarItem>Publications</NavbarItem>
                  <NavbarItem>Contact</NavbarItem>
                  <NavbarItem>About</NavbarItem>
              </NavbarMiddleSection>
              <NavbarItem>Partner</NavbarItem>
          </Navbar>

      </Marginer>
    </OuterContainer>
  )
}
