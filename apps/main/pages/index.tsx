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

import {
    CONTACT_US_CONFIRMATION_DIALOG_TEXT,
    CONTACT_US_CONFIRMATION_DIALOG_TITLE,
    LOGO,
} from "@cognizant-ai-lab/ui-common/const"
import Box from "@mui/material/Box"
import {styled} from "@mui/material/styles"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement, useState} from "react"

import {ConfirmationModal} from "../../../packages/ui-common/components/Common/ConfirmationModal"
import {useEnvironmentStore} from "../../../packages/ui-common/state/Environment"

// #region: Styled Components
const OuterContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "auto",
    paddingBottom: "2rem",
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

const HeaderLineFive = styled("h5")({
    color: "var(--bs-white)",
    fontWeight: "bold",
})

const LinkDivider = styled("div")({
    border: "1px solid rgb(38 239 233)",
    marginBottom: "1.2rem",
    width: "2.4rem",
})

const MoreLinks = styled("div")({
    marginTop: "0.1rem",
})

const ActionLink = styled("a")({
    "&:hover": {
        color: "var(--bs-accent3-medium)",
    },
})

const SplashLink = styled("a")({
    color: "rgb(120, 115, 115)",
    display: "block",
    marginBottom: "0.37rem",
    width: "fit-content",

    "&:hover": {
        color: "var(--bs-white)",
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

    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false)

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
            {emailDialogOpen && (
                <ConfirmationModal
                    content={CONTACT_US_CONFIRMATION_DIALOG_TEXT}
                    handleCancel={() => {
                        setEmailDialogOpen(false)
                    }}
                    handleOk={() => {
                        window.location.href = `mailto:${supportEmailAddress}`
                        setEmailDialogOpen(false)
                    }}
                    id="email-dialog"
                    title={CONTACT_US_CONFIRMATION_DIALOG_TITLE}
                />
            )}
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
                                    href={`/projects?${buildQueryString()}`}
                                >
                                    <LaunchButton id="neuro-san-button">Explore agent networks</LaunchButton>
                                </a>
                            </Link>
                        </NeuroAIToolsContainer>
                    </div>
                </BodyContent>
                <footer
                    id="footer"
                    style={{
                        borderTop: "var(--bs-border-width) var(--bs-border-style) var(--bs-gray-lighter)",
                        marginLeft: "2rem",
                        marginRight: "2rem",
                    }}
                >
                    <div
                        id="additional-links-container"
                        style={{
                            columnGap: "60px",
                            display: "flex",
                            marginLeft: "1.5rem",
                            marginTop: "1.1rem",
                        }}
                    >
                        <MoreLinks id="team-links">
                            <HeaderLineFive id="additional-links-header">Team</HeaderLineFive>
                            <LinkDivider id="additional-links-divider" />
                            <SplashLink
                                id="learn-more-link"
                                href="https://www.cognizant.com/us/en/services/ai/ai-lab"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                About
                            </SplashLink>
                            <SplashLink
                                id="contact-us-footer-link"
                                href={null}
                                onClick={() => setEmailDialogOpen(true)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{cursor: "pointer"}}
                            >
                                Contact Us
                            </SplashLink>
                        </MoreLinks>
                        <MoreLinks id="services-links">
                            <HeaderLineFive id="additional-links-header">Services</HeaderLineFive>
                            <LinkDivider id="additional-links-divider" />
                            <SplashLink
                                id="ai-innovation-studios-link"
                                href="https://portal-innovationstudio-apps-prod-we-001.azurewebsites.net/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                AI Innovation Studios
                            </SplashLink>
                            <SplashLink
                                id="neuro-it-ops-link"
                                href="https://www.cognizant.com/us/en/services/neuro-intelligent-automation/neuro-ai-it-operations"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Neuro IT Ops
                            </SplashLink>
                            <SplashLink
                                id="flowsource-link"
                                href="https://www.cognizant.com/us/en/services/software-engineering-services/flowsource"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Flowsource
                            </SplashLink>
                            <SplashLink
                                id="skygrade-link"
                                href="https://www.cognizant.com/us/en/services/cloud-solutions/cognizant-skygrade"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Skygrade
                            </SplashLink>
                            <SplashLink
                                id="cdit-link"
                                href="https://cditoolkit.cognizant.com/cditlive2.0/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Cognizant Ignition
                            </SplashLink>
                        </MoreLinks>
                    </div>
                </footer>
            </OuterContainer>
        </div>
    )
}

// Explicitly want to leave this splash page open
Index.authRequired = false
