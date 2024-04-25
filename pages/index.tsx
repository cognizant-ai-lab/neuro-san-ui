import NextImage from "next/legacy/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {ReactElement, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"
import {FaStar} from "react-icons/fa"
import {styled} from "styled-components"

import {GENERIC_LOGO, LOGO} from "../const"
import useFeaturesStore from "../state/features"
import {getTitleBase} from "../utils/title"

const OuterContainer = styled.div`
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/landingpagebackground.png");
    background-size: cover;
    width: 100%;
    min-height: 100%;
    overflow: scroll;
    position: absolute;
`

const Marginer = styled.div`
    margin: 6% 9.375% 6% 9.375%;
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
                                <NextImage
                                    id="logo-img"
                                    width="250"
                                    height="45"
                                    src="/cognizant-logo-white.svg"
                                    alt=""
                                />
                            </NavbarLogo>
                            <NavbarMiddleSection id="nav-bar-middle" />
                        </>
                    )}
                </Navbar>
                <LeftRight id="main">
                    <div id="main-div">
                        <HeaderLineOne id="header-line">
                            <div
                                id="headline-eyebrow"
                                className="d-block text-white mb-8"
                            >
                                {isGeneric ? GENERIC_LOGO : LOGO}
                            </div>
                        </HeaderLineOne>
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
                                    <span
                                        id="star-new-span"
                                        style={{
                                            display: "flex",
                                            position: "absolute",
                                            top: 0,
                                            right: 0,
                                            paddingRight: "12px",
                                            marginRight: "10px",
                                            marginTop: "4px",
                                        }}
                                    >
                                        <FaStar
                                            id="star"
                                            style={{color: "gold"}}
                                            size={16}
                                        />
                                        <span
                                            id="new-span"
                                            style={{
                                                fontVariantCaps: "all-small-caps",
                                                verticalAlign: "middle",
                                                fontSize: "small",
                                                textAlign: "center",
                                            }}
                                        >
                                            NEW!
                                        </span>
                                    </span>
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
                        {!isGeneric && (
                            <Description id="description">
                                With the Cognizant Neuro® AI platform, realize the business value of generative AI
                                faster. Adopt and augment cutting-edge AI models, solve complex business problems more
                                effectively, maximize utility of your data and with the Cognizant Neuro AI Control
                                Plane, get unparalleled visibility and control. The generative AI future of business
                                begins here.
                            </Description>
                        )}
                    </div>
                    <Right id="right" />
                </LeftRight>
            </Marginer>
        </OuterContainer>
    )
}

// Explicitly want to leave this splash page open
Index.authRequired = false
