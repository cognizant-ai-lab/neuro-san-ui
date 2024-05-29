import NextImage from "next/legacy/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"
import {styled} from "styled-components"

import {GENERIC_LOGO, LOGO} from "../const"
import useFeaturesStore from "../state/features"
import {getTitleBase} from "../utils/title"

const OuterContainer = styled.div`
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/NeuroAI_SC_BH1.webp");
    background-size: cover;
    width: 100%;
    min-height: 100%;
    overflow: scroll;
    position: absolute;
`

const Marginer = styled.div`
    margin: 3% 9.375% 6% 9.375%;
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

const HeaderLineOne = styled.h1`
    margin: 0;
    margin-top: 6rem;
    color: white;
`

const LaunchButton = styled.div`
    display: inline-block;
    margin-top: 4rem;
    font-weight: bold;
    font-size: 1.25rem;
    border-radius: 1000px;
    padding: 1rem 2rem;
    background: #26efe9;
    text-align: center;
`
const HeaderLineFour = styled.h4`
    color: white;
`

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function Index(): ReactElement {
    // Get "generic branding" flag from store
    const {isGeneric} = useFeaturesStore()

    const router = useRouter()

    // Keeps track of which button the user is hovering over. Either a button id or null
    const [hoveredId, setHoveredId] = useState<string>(null)

    const handleMouseEnter = (event: ReactMouseEvent) => {
        setHoveredId((event.target as HTMLElement).id)
    }

    const handleMouseLeave = () => {
        setHoveredId(null)
    }

    function getButtonStyle(ids: string[]) {
        return {
            color: ids.includes(hoveredId) ? "white" : "#000000", // Change text color on hover
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
        <OuterContainer id="outer-container">
            <Marginer id="marginer">
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
                            className="d-block text-white mb-8"
                        >
                            {isGeneric ? GENERIC_LOGO : LOGO}
                        </div>
                    </HeaderLineOne>
                    <div id="neuro-ai-tools-container">
                        <Link
                            id="of-link"
                            href={`/opportunityFinder?${buildQueryString()}`}
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
                                    Opportunity Finder
                                </LaunchButton>
                            </a>
                        </Link>
                        <Link
                            id="orchestrator-link"
                            // Use the URL object form of `href` to pass along the query string
                            href={`/projects?${buildQueryString()}`}
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
                                    style={{position: "relative", ...getButtonStyle(["model-orchestrator-button"])}}
                                >
                                    Model Orchestrator
                                </LaunchButton>
                            </a>
                        </Link>
                    </div>
                </div>
                <div id="splash-links-container">
                    <a
                        id="learn-more-link"
                        className="splash-link"
                        href="https://www.cognizant.com/us/en/services/ai/ai-lab"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Learn More →
                    </a>
                    <div id="additional-links-container">
                        <HeaderLineFour id="addition-links-header">Additional Links</HeaderLineFour>
                        <a
                            id="ai-innovation-studios-link"
                            className="splash-link"
                            href="https://portal-innovationstudio-apps-prod-we-001.azurewebsites.net/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            AI Innovation Studios
                        </a>
                        <a
                            id="neuro-it-ops-link"
                            className="splash-link"
                            href="https://www.cognizant.com/us/en/services/neuro-intelligent-automation/neuro-ai-it-operations"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Neuro IT Ops
                        </a>
                        <a
                            id="flowsource-link"
                            className="splash-link"
                            href="https://www.cognizant.com/us/en/services/software-engineering-services/flowsource"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Flowsource
                        </a>
                        <a
                            id="skygrade-link"
                            className="splash-link"
                            href="https://www.cognizant.com/us/en/services/cloud-solutions/cognizant-skygrade"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Skygrade
                        </a>
                    </div>
                </div>
            </Marginer>
        </OuterContainer>
    )
}

// Explicitly want to leave this splash page open
Index.authRequired = false
