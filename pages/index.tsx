import {styled} from "@mui/material"
import Box from "@mui/material/Box"
import NextImage from "next/legacy/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"

import {ConfirmationModal} from "../components/Common/confirmationModal"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT, CONTACT_US_CONFIRMATION_DIALOG_TITLE, GENERIC_LOGO, LOGO} from "../const"
import useEnvironmentStore from "../state/environment"
import useFeaturesStore from "../state/features"
import {getTitleBase} from "../utils/title"

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
    marginTop: "7rem",
})

const LaunchButton = styled("div")({
    background: "#26efe9",
    borderRadius: "1000px",
    display: "inline-block",
    fontWeight: "bold",
    fontSize: "1.25rem",
    marginTop: "2rem",
    minWidth: "270px",
    padding: "1.25rem 2rem",
    textAlign: "center",
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
    fontSize: "1.75rem",
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
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function Index(): ReactElement {
    // Get "generic branding" flag from store
    const {isGeneric} = useFeaturesStore()

    const router = useRouter()

    // Access environment info
    const {buildTarget, supportEmailAddress} = useEnvironmentStore()

    // Keeps track of which button the user is hovering over. Either a button id or null
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false)

    const handleMouseEnter = (event: ReactMouseEvent) => {
        setHoveredId((event.target as HTMLElement).id)
    }

    const handleMouseLeave = () => {
        setHoveredId(null)
    }

    function getButtonStyle(ids: string[]) {
        return {
            color: ids.includes(hoveredId) ? "var(--bs-white)" : "#000000", // Change text color on hover
            cursor: "pointer",
            transition: "background-color 0.3s, color 0.3s", // Smooth transition effect
            boxShadow: ids.includes(hoveredId) ? "0 0 30px 0 #26efe9" : "none", // Add shadow on hover
        }
    }

    // Dynamically set the title to the current host
    useEffect(() => {
        document.title = getTitleBase()
    }, [])

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
                        {!isGeneric && (
                            <>
                                <NavbarLogo id="logo">
                                    <Link
                                        id="splash-logo-link"
                                        href="https://www.cognizant.com/us/en"
                                        target="_blank"
                                    >
                                        <NextImage
                                            id="logo-img"
                                            width="200"
                                            height="45"
                                            src="/cognizant-logo-white.svg"
                                            alt=""
                                        />
                                    </Link>
                                </NavbarLogo>
                                <NavbarMiddleSection id="nav-bar-middle" />
                            </>
                        )}
                    </Navbar>
                    <div id="main-div">
                        <HeaderLineOne id="header-line">
                            <div
                                id="headline-eyebrow"
                                style={{marginBottom: "2rem"}}
                            >
                                {isGeneric ? GENERIC_LOGO : LOGO}
                            </div>
                        </HeaderLineOne>
                        <SubHeaderTitle id="neuro-ai-decisioning-box">Neuro AI Decisioning</SubHeaderTitle>
                        <NeuroAIDescriptionBox id="neuro-ai-description-box">
                            A platform for smarter business decisions
                        </NeuroAIDescriptionBox>
                        <NeuroAIToolsContainer id="opp-finder-and-model-orchestrator-container">
                            {buildTarget === "all" && (
                                <>
                                    <Link
                                        id="of-link"
                                        href={`/opportunityFinder?${buildQueryString()}`}
                                        /* eslint-disable-next-line @typescript-eslint/no-deprecated */
                                        legacyBehavior={true} // Need this so we can "open in new tab"
                                        passHref
                                    >
                                        <a
                                            id="of-link-anchor"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            href={`/of?${buildQueryString()}`}
                                            onMouseEnter={handleMouseEnter}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <LaunchButton
                                                id="opportunity-finder-button"
                                                style={{
                                                    position: "relative",
                                                    ...getButtonStyle([
                                                        "opportunity-finder-button",
                                                        "star-new-span",
                                                        "of-link-anchor",
                                                    ]),
                                                }}
                                            >
                                                Find opportunities
                                            </LaunchButton>
                                        </a>
                                    </Link>
                                    <Link
                                        id="orchestrator-link"
                                        // Use the URL object form of `href` to pass along the query string
                                        href={`/projects?${buildQueryString()}`}
                                        /* eslint-disable-next-line @typescript-eslint/no-deprecated */
                                        legacyBehavior={true}
                                        passHref
                                    >
                                        <a
                                            id="of-link-anchor"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            href={`/projects?${buildQueryString()}`}
                                            style={{marginLeft: "50px"}}
                                            onMouseEnter={handleMouseEnter}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <LaunchButton
                                                id="model-orchestrator-button"
                                                style={{
                                                    position: "relative",
                                                    ...getButtonStyle(["model-orchestrator-button"]),
                                                }}
                                            >
                                                Build models
                                            </LaunchButton>
                                        </a>
                                    </Link>
                                </>
                            )}
                        </NeuroAIToolsContainer>
                        <SubHeaderTitle
                            id="neuro-ai-maa-box"
                            sx={{marginTop: "2.5rem"}}
                        >
                            Neuro AI Multi-Agent Accelerator
                        </SubHeaderTitle>
                        <NeuroAIDescriptionBox id="neuro-ai-description-box">
                            Low-code framework for rapidly agentifying your business
                        </NeuroAIDescriptionBox>
                        <NeuroAIToolsContainer id="multi-agent-accelerator-container">
                            <Link
                                id="agent-network-link"
                                // Use the URL object form of `href` to pass along the query string
                                href={`/agentNetwork?${buildQueryString()}`}
                                /* eslint-disable-next-line @typescript-eslint/no-deprecated */
                                legacyBehavior={true}
                                passHref
                            >
                                <a
                                    id="of-link-anchor"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`/projects?${buildQueryString()}`}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <LaunchButton
                                        id="neuro-san-button"
                                        style={{position: "relative", ...getButtonStyle(["neuro-san-button"])}}
                                    >
                                        Explore reference networks
                                    </LaunchButton>
                                </a>
                            </Link>
                        </NeuroAIToolsContainer>
                    </div>
                </BodyContent>
                <footer
                    id="footer"
                    style={{
                        borderTop: "1px solid rgb(190, 199, 199)",
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
