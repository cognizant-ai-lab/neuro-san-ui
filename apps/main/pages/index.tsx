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

import {styled} from "@mui/material/styles"
import NextImage from "next/image"
import Link from "next/link"
import {useRouter} from "next/router"
import {FC, JSX as ReactJSX} from "react"

import {Footer} from "../../../packages/ui-common/components/Common/Footer"
import {LOGO_LIGHT_MODE_SX} from "../../../packages/ui-common/components/Common/Navbar"
import {NeuroSanStudioCallout} from "../../../packages/ui-common/components/MultiAgentAccelerator/NeuroSanStudioCallout"
import {LOGO} from "../../../packages/ui-common/const"
import {useEnvironmentStore} from "../../../packages/ui-common/state/Environment"
import {
    getSheen,
    glassSurface,
    glowShadow,
    gradientBorder,
    gradientText,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    sheenGradient,
} from "../../../packages/ui-common/Theme/sheen"
import {ConstellationBackdrop} from "../components/Splash/ConstellationBackdrop"
import {CustomPageProps} from "../Types/Types"

// #region: Styled Components
const PILL_RADIUS = 999

const SplashContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    isolation: "isolate",
    overflow: "hidden",
    position: "relative",
})

// Scrolls over the (stationary) constellation backdrop
const OuterContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflowX: "hidden",
    overflowY: "auto",
    position: "relative",
    width: "100%",
    zIndex: 1,
})

const BodyContent = styled("div")({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    margin: "1rem 5% 2rem 5%",
})

// Mini navbar: a floating glass pill
const Navbar = styled("div")(({theme}) => ({
    ...glassSurface(theme, PILL_RADIUS),
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "0.55rem 1.25rem",
    position: "relative",
    zIndex: 2,
}))

const NavbarLogo = styled("h1")({
    display: "flex",
    fontSize: "1.25rem",
    margin: 0,
    width: "250px",
    "& img": {height: "30px", width: "auto"},
})

const NavbarMiddleSection = styled("div")({
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridGap: "27.32%",
    width: "28.59%",
})

// The hero fills the first screen. On wide screens the copy sits on the left with the constellation on the right;
// on narrow screens everything is centered over it.
const Hero = styled("div")(({theme}) => ({
    alignItems: "center",
    columnGap: "2rem",
    display: "grid",
    gridTemplateAreas: '"copy" "callout"',
    gridTemplateColumns: "minmax(0, 1fr)",
    minHeight: "calc(100vh - 6rem)",
    padding: "clamp(3rem, 10vh, 7rem) 0 1.5rem",
    position: "relative",
    rowGap: "3rem",
    textAlign: "center",
    [theme.breakpoints.up("lg")]: {
        gridTemplateAreas: '"copy ." "copy callout"',
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
        gridTemplateRows: "1fr auto",
        textAlign: "left",
    },
}))

const Copy = styled("div")(({theme}) => ({
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gridArea: "copy",
    [theme.breakpoints.up("lg")]: {alignItems: "flex-start", alignSelf: "center"},
}))

// Small glass pill above the headline with an iridescent border
const EyebrowPill = styled("div")(({theme}) => {
    const sheen = getSheen(theme)
    return {
        ...glassSurface(theme, PILL_RADIUS),
        ...gradientBorder(theme, PILL_RADIUS, 1, 0.8),
        alignItems: "center",
        border: 0,
        color: (theme.vars ?? theme).palette.text.primary,
        display: "inline-flex",
        fontSize: "0.85rem",
        fontWeight: 500,
        gap: "0.55rem",
        letterSpacing: "0.02em",
        padding: "0.4rem 1rem 0.4rem 0.75rem",

        // Glowing status dot
        "& .eyebrow-dot": {
            backgroundImage: sheenGradient(theme),
            borderRadius: "50%",
            boxShadow: `0 0 10px 1px ${sheen.glow}`,
            height: "0.5rem",
            width: "0.5rem",
        },
    }
})

const HeaderLineOne = styled("h1")(({theme}) => ({
    color: (theme.vars ?? theme).palette.text.primary,
    fontFamily: SHEEN_FONT_DISPLAY,
    fontSize: "clamp(3.5rem, 7.6vw, 8rem)",
    fontWeight: 500,
    lineHeight: 0.92,
    margin: 0,
    letterSpacing: "-0.035em",
    marginTop: "1.75rem",
    maxWidth: "11ch",
    textWrap: "balance",
}))

// The key phrase of the headline, filled with the flowing signature gradient
// Display-size gradient: the UI accent (indigo → purple → blue) reads as flat violet at this size and its indigo end is
// dim on near-black, so the headline uses lighter, more separated stops.
const HEADLINE_GRADIENT_DARK =
    "linear-gradient(100deg, #B8A4FF 0%, #E3A6FF 30%, #8FB8FF 62%, #6FE0FF 82%, #B8A4FF 100%)"
const HEADLINE_GRADIENT_LIGHT =
    "linear-gradient(100deg, #5B3FE0 0%, #9B3FE0 30%, #2F64D8 62%, #0E8FC0 82%, #5B3FE0 100%)"

const SubHeaderTitle = styled("span")(({theme}) => ({
    ...gradientText(theme),
    backgroundImage: HEADLINE_GRADIENT_DARK,
    ...theme.applyStyles("light", {backgroundImage: HEADLINE_GRADIENT_LIGHT}),
    display: "inline-block",
    // Soft luminous bloom behind the letters (a text-shadow would show through the clipped fill)
    filter: `drop-shadow(0 10px 40px ${getSheen(theme).tint})`,
    // Room for descenders, which background-clip would otherwise crop
    paddingBottom: "0.12em",
}))

const NeuroAIDescriptionBox = styled("div")(({theme}) => ({
    color: (theme.vars ?? theme).palette.text.secondary,
    fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
    letterSpacing: "-0.005em",
    lineHeight: 1.55,
    marginTop: "1.75rem",
    maxWidth: "34rem",
    textWrap: "balance",
}))

const ActionsRow = styled("div")(({theme}) => ({
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "center",
    marginTop: "2.75rem",
    [theme.breakpoints.up("lg")]: {justifyContent: "flex-start"},
}))

// Soft blurred gradient halo behind the launch button, brightening on hover
const CtaHalo = styled("span")(({theme}) => ({
    display: "inline-block",
    isolation: "isolate",
    position: "relative",
    "&::before": {
        backgroundImage: sheenGradient(theme),
        borderRadius: `${PILL_RADIUS}px`,
        content: '""',
        filter: "blur(22px)",
        inset: "4px 10px -6px",
        opacity: 0.5,
        pointerEvents: "none",
        position: "absolute",
        transition: `opacity 0.4s ${SHEEN_EASE}`,
        zIndex: -1,
    },
    "&:hover::before": {opacity: 0.9},
}))

const LaunchButton = styled("div")(({theme}) => ({
    alignItems: "center",
    backgroundImage: sheenGradient(theme),
    borderRadius: `${PILL_RADIUS}px`,
    // Specular top edge plus a soft colored drop shadow
    boxShadow:
        "inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.08), " +
        `0 10px 30px -12px ${getSheen(theme).glow}`,
    // White reads best on the deep indigo/purple/blue gradient in both color schemes
    color: (theme.vars ?? theme).palette.primary.contrastText,
    display: "inline-flex",
    fontWeight: 600,
    fontSize: "1.15rem",
    gap: "0.35rem",
    isolation: "isolate",
    justifyContent: "center",
    letterSpacing: "-0.005em",
    minWidth: "270px",
    overflow: "hidden",
    padding: "1.1rem 2.1rem",
    position: "relative",
    textAlign: "center",
    transition: `box-shadow 0.35s ${SHEEN_EASE}`,

    "&:hover": {
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.5), ${glowShadow(theme, 36)}`,
        cursor: "pointer",
    },

    // Arrow glyph from the Cognizant icon font, nudging forward on hover
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
        content: String.raw`"\e907"`,
        transition: `transform 0.35s ${SHEEN_EASE}`,
    },
    "&:hover::after": {transform: "translateX(4px)"},
}))

// Secondary action: glass pill button
const ActionLink = styled("a")(({theme}) => {
    const palette = (theme.vars ?? theme).palette
    return {
        ...glassSurface(theme, PILL_RADIUS),
        color: palette.text.primary,
        display: "inline-flex",
        alignItems: "center",
        fontSize: "1.05rem",
        fontWeight: 500,
        gap: "0.4rem",
        padding: "1.05rem 1.7rem",
        textDecoration: "none",
        transition: `box-shadow 0.35s ${SHEEN_EASE}`,
        "&::after": {
            content: '"↗"',
            opacity: 0.6,
            transition: `transform 0.35s ${SHEEN_EASE}`,
        },
        "&:hover": {boxShadow: glowShadow(theme, 24)},
        "&:hover::after": {transform: "translate(2px, -2px)"},
    }
})

// The GitHub callout sits under the constellation on wide screens
const CalloutContainer = styled("div")(({theme}) => ({
    gridArea: "callout",
    justifySelf: "center",
    maxWidth: "100%",
    width: 380,
    [theme.breakpoints.up("lg")]: {alignSelf: "end", justifySelf: "end"},
}))

// #endregion: Styled Components

// Main function.
export const Index: FC & CustomPageProps = Object.assign(
    (): ReactJSX.Element => {
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
            <SplashContainer
                id="splash-page__container"
                sx={LOGO_LIGHT_MODE_SX}
            >
                <ConstellationBackdrop />
                <OuterContainer id="outer-container">
                    <BodyContent id="body-content">
                        <Navbar id="nav-bar">
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
                        </Navbar>
                        <Hero id="main-div">
                            <Copy>
                                <EyebrowPill id="headline-eyebrow-pill">
                                    <span
                                        aria-hidden={true}
                                        className="eyebrow-dot"
                                    />
                                    <span id="headline-eyebrow">{LOGO}</span>
                                </EyebrowPill>
                                <HeaderLineOne id="header-line">
                                    <SubHeaderTitle id="neuro-ai-maa-box">Multi-Agent Accelerator</SubHeaderTitle>
                                </HeaderLineOne>
                                <NeuroAIDescriptionBox id="neuro-ai-description-box">
                                    Low-code framework for rapidly agentifying your business.
                                </NeuroAIDescriptionBox>
                                <ActionsRow id="multi-agent-accelerator-container">
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
                                            <CtaHalo>
                                                <LaunchButton id="neuro-san-button">
                                                    Explore agent networks
                                                </LaunchButton>
                                            </CtaHalo>
                                        </a>
                                    </Link>
                                    <ActionLink
                                        id="explore-more-link"
                                        href="https://github.com/cognizant-ai-lab/neuro-san-studio"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Explore more.
                                    </ActionLink>
                                </ActionsRow>
                            </Copy>
                            <CalloutContainer>
                                <NeuroSanStudioCallout />
                            </CalloutContainer>
                        </Hero>
                    </BodyContent>
                    <Footer
                        supportEmailAddress={supportEmailAddress}
                        logoLinkUrl="https://www.cognizant.com/"
                        logoUrl="/cognizant-logo-white.svg"
                    />
                </OuterContainer>
            </SplashContainer>
        )
    },
    // Explicitly want to leave this splash page open
    {authRequired: false}
)

export default Index
