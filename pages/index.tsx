// Import React
import {useEffect} from "react"
import styled from "styled-components"

// eslint-disable-next-line no-shadow
import Image from "next/legacy/image"
import Link from "next/link"
import {getTitleBase} from "../utils/title"

import {useRouter} from "next/router";
import {GENERIC_LOGO, LOGO} from "../const";

const OuterContainer = styled.div`
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/landingpagebackground.png");
    background-size: cover;
    width: 100%;
    min-height: 100%;
    overflow: scroll;
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
    width: 250px;
`

const NavbarMiddleSection = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 27.32%;
    width: 28.59%;
`

const LeftRight = styled.div`
    display: grid;
    grid-template-columns: 4fr 1fr;
`

const HeaderLineOne = styled.h1`
    margin: 0;
    margin-top: 6rem;
    color: white;
`

const GetStartedButton = styled.div`
    display: inline-block;
    margin-top: 4rem;
    color: #000048;
    font-weight: bold;
    font-size: 1.25rem;
    border-radius: 1000px;
    padding: 1rem 2rem;
    background: #26efe9;
    text-align: center;
`

const Description = styled.p`
    color: white;
    font-size: 1rem;
    width: 39rem;
    margin-top: 4rem;
`

const Right = styled.div`
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
`

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function Index(): React.ReactElement {
  const router = useRouter()

  // Get "generic branding" flag
  const isGeneric = "generic" in router.query

  // Dynamically set the title to the current host
  useEffect(() => {
    document.title = getTitleBase()
  }, []);

  return (
    <OuterContainer id="outer-container">
      <Marginer id="marginer">
          <Navbar id="nav-bar">
              {!isGeneric &&
                  <>
                      <NavbarLogo id="logo">
                        <Image id="logo-img" width="250" height="45" src="/cognizant-logo-white.svg" alt=""/>
                      </NavbarLogo>
                      <NavbarMiddleSection id="nav-bar-middle"/>
                  </>
              }
          </Navbar>
          <LeftRight id="main">
              <div id="main-div">
                  <HeaderLineOne id="header-line"><div id="headline-eyebrow" className="d-block text-white mb-8">
                      {isGeneric ? GENERIC_LOGO : LOGO}</div><div id="tagline-h2" className="h2">
                      Accelerate Generative AI Model Orchestration at Enterprise Scale</div></HeaderLineOne>
                  <Link id="get-started-link"
                        // Use the URL object form of `href` to pass along the query string, in case the user entered
                        // with /?demo
                        href={{
                            pathname: "/projects",
                            query: router.query
                        }}
                  >
                      <GetStartedButton id="get-started">Get started</GetStartedButton>
                  </Link>
                  {!isGeneric &&
                      <Description id="description">
                          With the Cognizant Neuro® AI platform, realize the business value
                          of generative AI faster. Adopt and augment cutting-edge AI models,
                          solve complex business problems more effectively, maximize utility
                          of your data and with the Cognizant Neuro AI Control Plane, get
                          unparalleled visibility and control. The generative AI future of
                          business begins here.
                      </Description>
                  }
              </div>
              <Right id="right">
              </Right>
          </LeftRight>

      </Marginer>
    </OuterContainer>
  )
}

// Explicitly want to leave this splash page open
Index.authRequired = false
