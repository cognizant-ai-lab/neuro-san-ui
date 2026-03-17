/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {LOGO} from "@cognizant-ai-lab/ui-common/const"
import Box from "@mui/material/Box"
import {styled} from "@mui/material/styles"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement} from "react"

import {Footer} from "../../../packages/ui-common/components/Common/Footer"
import {useEnvironmentStore} from "../../../packages/ui-common/state/Environment"

// #region: Styled Components
const OuterContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "auto",
    width: "100%",
})

const BodyContent = styled("div")({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    margin: "4.5% 9.375% 3% 9.375%",
})

const Navbar = styled("div")({
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    height: "5%",
    alignItems: "center",
})

const NavbarLogo = styled("h1")({
    color: "var(--bs-white)",
    fontSize: "1.25rem",
    width: "250px",
})

const NavbarMiddleSection = styled("div")({
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridGap: "27.32%",
    width: "28.59%",
})

const HeaderLineOne = styled("h1")({
    color: "var(--bs-white)",
    fontWeight: 400,
    margin: "0",
    marginTop: "2rem",
})

const LaunchButton = styled("div")({
    background: "var(--bs-accent3-medium)",
    borderRadius: "1000px",
    color: "var(--bs-primary)",
    display: "inline-block",
    fontWeight: "bold",
    fontSize: "1.25rem",
    marginTop: "2rem",
    minWidth: "270px",
    padding: "1.25rem 2rem",
    textAlign: "center",

    "&:hover": {
        color: "var(--bs-white)",
        cursor: "pointer",
        transition: "background-color 0.3s, color 0.3s", // Smooth transition effect
        boxShadow: "0 0 30px 0 var(--bs-accent3-medium)", // Add shadow on hover
    },

    "&::after": {
        WebkitFontFeatureSettings: '"liga"',
        msFontFeatureSettings: '"liga" 1',
        fontFeatureSettings: '"liga"',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        fontFamily: '"Cognizant-Icons"',
        fontStyle: "normal",
        fontVariant: "normal",
        WebkitFontVariantLigatures: "discretionary-ligatures",
        fontVariantLigatures: "discretionary-ligatures",
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1,
        marginLeft: "0.25rem",
        textTransform: "none",
        content: '""',
    },
})

const ActionLink = styled("a")({
    "&:hover": {
        color: "var(--bs-accent3-medium)",
    },
})
const SubHeaderTitle = styled(Box)({
    color: "var(--bs-white)",
    fontSize: "2rem",
    fontWeight: "bold",
    marginTop: "2.25rem",
})

const NeuroAIDescriptionBox = styled(Box)({
    color: "var(--bs-white)",
    fontSize: "1.3rem",
    marginTop: "1.25rem",
})

const NeuroAIToolsContainer = styled(Box)({
    marginTop: "0.25rem",
})
// #endregion: Styled Components

// Main function.
export default function Index(): ReactElement {
    const router = useRouter()

    // Access environment info
    const {supportEmailAddress} = useEnvironmentStore()

    // Function to build the query string from the current route
    const buildQueryString = () => {
        const {query} = router
        return Object.keys(query)
            .map((key) => `${key}=${query[key]}`)
            .join("&")
    }

    return (
        <div
            id="splash-page__container"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <OuterContainer id="outer-container">
                <BodyContent id="body-content">
                    <Navbar id="nav-bar">
                        <>
                            <NavbarLogo id="logo">
                                <Link
                                    id="splash-logo-link"
                                    href="https://www.cognizant.com/us/en"
                                    target="_blank"
                                >
                                    <NextImage
                                        id="logo-img"
                                        width={200}
                                        height={45}
                                        src="/cognizant-logo-white.svg"
                                        alt="Cognizant Logo"
                                    />
                                </Link>
                            </NavbarLogo>
                            <NavbarMiddleSection id="nav-bar-middle" />
                        </>
                    </Navbar>
                    <div id="main-div">
                        <HeaderLineOne id="header-line">
                            <div
                                id="headline-eyebrow"
                                style={{marginBottom: "2rem"}}
                            >
                                {LOGO}
                            </div>
                        </HeaderLineOne>

                        <SubHeaderTitle id="neuro-ai-maa-box">Multi-Agent Accelerator</SubHeaderTitle>
                        <NeuroAIDescriptionBox id="neuro-ai-description-box">
                            Low-code framework for rapidly agentifying your business.{" "}
                            <ActionLink
                                id="explore-more-link"
                                href="https://github.com/cognizant-ai-lab/neuro-san-studio"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Explore more.
                            </ActionLink>
                        </NeuroAIDescriptionBox>
                        <NeuroAIToolsContainer id="multi-agent-accelerator-container">
                            <Link
                                id="agent-network-link"
                                // Use the URL object form of `href` to pass along the query string
                                href={`/multiAgentAccelerator?${buildQueryString()}`}
                                /* eslint-disable-next-line @typescript-eslint/no-deprecated */
                                legacyBehavior={true}
                                passHref
                            >
                                <a
                                    id="explore-agent-networks-link-anchor"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href="#"
                                >
                                    <LaunchButton id="neuro-san-button">Explore agent networks</LaunchButton>
                                </a>
                            </Link>
                        </NeuroAIToolsContainer>
                    </div>
                </BodyContent>
                <Footer
                    supportEmailAddress={supportEmailAddress}
                    logoLinkUrl="https://www.cognizant.com/"
                    logoUrl="/cognizant-logo-white.svg"
                />
            </OuterContainer>
        </div>
    )
}

// Explicitly want to leave this splash page open
Index.authRequired = false
