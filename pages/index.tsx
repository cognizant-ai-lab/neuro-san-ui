// Import React
import React from 'react';
import {useEffect} from 'react';
import styled from "styled-components";

import Image from 'next/image'
import {Link} from "evergreen-ui";
import {LOGO} from "../const";

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

const NavbarLogo = styled.h1`
    color: white;
    font-size: 1.25rem;
`

const NavbarMiddleSection = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 27.32%;
    width: 28.59%;
`

const NavbarItem = styled.a`
    text-decoration: none;
    color: white;
    font-size: .938rem;
    padding: 0;
    margin: 0;
    text-align: center;
`

const LeftRight = styled.div`
    display: grid;
    grid-template-columns: 4fr 1fr;
    // grid-gap: 18.125rem;
`

const HeaderLineOne = styled.h1`
    width: auto; height: auto;
    margin: 0; padding: 0;
    margin-top: 8.438rem;
    color: white;
    font-size: 5rem;
`
const HeaderLineTwo = styled.h1`
    width: auto; height: auto;
    margin: 0; padding: 0;
    margin-top: -2.225%;
    color: white;
    font-size: 5rem;
`

const GetStartedButton = styled.a`
    display: block;
    margin-top: 4rem;
    color: white;
    font-size: 1.25rem;
    padding-bottom: 0.313rem;
    border-bottom: 2px solid #FDB716;
    width: 7.063rem;
    text-align: center;
`

const Description = styled.p`
    color: white;
    font-size: 1.219rem;
    width: 39rem;
    margin-top: 5.021rem;
`

const Right = styled.div`
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
`

const ImageDiv = styled.div`
    width: 15.563rem; height: 29.375rem;
`

const D2DText = styled.p`
    color: white;
    font-size: 2.5rem;
    width: 20.563rem;
    margin-top: 5.021rem;
    text-align: right;
`

export default function Index(): React.ReactElement {
    // Dynamically set the title to the current host
    useEffect(() => {
        var subdomain:string  = window.location.host.split('.')[0]
        var title:string = subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
        document.title =`${title}`
    },[]);

  return (
    <OuterContainer>
      <Marginer>
          <Navbar>
              <NavbarLogo>{LOGO}</NavbarLogo>
              <NavbarMiddleSection>
                  <NavbarItem>Publications</NavbarItem>
                  <NavbarItem>Contact</NavbarItem>
                  <NavbarItem>About</NavbarItem>
              </NavbarMiddleSection>
              <NavbarItem>Partner</NavbarItem>
          </Navbar>
          <LeftRight>
              <div>
                  <HeaderLineOne>OPTIMIZE YOUR</HeaderLineOne>
                  <HeaderLineTwo>BUSINESS</HeaderLineTwo>
                  <Link href={`/projects`} >
                      <GetStartedButton>Get Started</GetStartedButton>
                  </Link>
                  <Description>
                      Research and builds applications with modern AI techniques such as evolutionary computation and deep learning across disciplines using LEAF (Learning and Evolutionary AI Framework)
                  </Description>
              </div>
              <Right>
                  <ImageDiv>
                      <Image
                          src="/nnleaf.svg"
                          width="249"
                          height="587"
                          layout="responsive"
                          alt=""
                      />
                  </ImageDiv>
                  <D2DText>Data to Decisions</D2DText>
              </Right>
          </LeftRight>

      </Marginer>
    </OuterContainer>
  )
}

// Explicitly want to leave this splash page open
Index.authRequired = false