import {styled, SxProps, Theme} from "@mui/material/styles"
import {FC, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {LOGO_LIGHT_MODE_SX} from "./Navbar"
import {getContactUsConfirmationText} from "../../const"
import {getSheen, SHEEN_EASE, sheenGradient} from "../../Theme/sheen"
import {navigateToUrl} from "../../utils/BrowserNavigation"

const HeaderLine = styled("h6")(({theme}) => ({
    color: (theme.vars ?? theme).palette.text.secondary,
    fontWeight: 600,
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
    margin: 0,
    marginBottom: "0.75rem",
    opacity: 0.8,
    textTransform: "uppercase",
}))

// Short iridescent tick under each section header
const LinkDivider = styled("div")(({theme}) => ({
    backgroundImage: sheenGradient(theme, 90),
    borderRadius: 999,
    height: "2px",
    marginBottom: "0.6rem",
    opacity: 0.8,
    width: "1.6rem",
}))

const FooterSectionHeader = styled("div")({
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: "0.1rem",
})

// Muted links; on hover the text brightens and a gradient underline draws in from the left
const FooterItemLink = styled("a")(({theme}) => {
    const palette = (theme.vars ?? theme).palette
    return {
        backgroundImage: sheenGradient(theme, 90),
        backgroundPosition: "0 100%",
        backgroundRepeat: "no-repeat",
        backgroundSize: "0% 1px",
        color: palette.text.secondary,
        display: "block",
        fontSize: "0.8rem",
        fontWeight: 400,
        marginBottom: "0.45rem",
        paddingBottom: "2px",
        textDecoration: "none",
        transition: `color 0.25s ease, background-size 0.4s ${SHEEN_EASE}`,
        width: "fit-content",
        "&:hover": {
            backgroundSize: "100% 1px",
            color: palette.text.primary,
        },
    }
})

const FooterContainer = styled("footer")(({theme}) => {
    const sheen = getSheen(theme)
    return {
        alignItems: "flex-start",
        backgroundColor: "transparent",
        columnGap: "64px",
        display: "flex",
        isolation: "isolate",
        justifyContent: "center",
        marginTop: "1rem",
        paddingBottom: "1.25rem",
        paddingTop: "2.25rem",
        position: "relative",
        width: "100%",

        "& #logo-img": {opacity: 0.7, transition: "opacity 0.25s ease"},
        "& a:hover #logo-img": {opacity: 1},

        // Iridescent hairline that fades out toward both edges...
        "&::before": {
            background:
                `linear-gradient(90deg, transparent, ${sheen.gradientStart} 25%, ${sheen.gradientMid} 50%, ` +
                `${sheen.gradientEnd} 75%, transparent)`,
            content: '""',
            height: "1px",
            left: "8%",
            opacity: 0.45,
            pointerEvents: "none",
            position: "absolute",
            right: "8%",
            top: 0,
        },
        // ...with a soft glow bleeding down from it
        "&::after": {
            background: `radial-gradient(50% 100% at 50% 0%, ${sheen.tint}, transparent 70%)`,
            content: '""',
            height: "64px",
            left: "15%",
            pointerEvents: "none",
            position: "absolute",
            right: "15%",
            top: 0,
            zIndex: -1,
        },
    }
})

interface FooterProps {
    readonly logoUrl: string
    readonly logoLinkUrl: string
    readonly supportEmailAddress: string
    readonly sx?: SxProps<Theme>
}

/**
 * Footer for all pages, contains additional links and contact information
 *
 * @param logoLinkUrl - The URL that the logo will link to when clicked
 * @param logoUrl - The URL of the logo image to be displayed in the footer. Can be a local or external URL.
 * @param supportEmailAddress - The email address that will be used in the Contact Us link
 * @param sx - Optional MUI sx prop for additional styling overrides
 */
export const Footer: FC<FooterProps> = ({logoLinkUrl, logoUrl, supportEmailAddress, sx}) => {
    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false)

    return (
        <>
            {emailDialogOpen && (
                <ConfirmationModal
                    content={getContactUsConfirmationText(supportEmailAddress)}
                    handleCancel={() => {
                        setEmailDialogOpen(false)
                    }}
                    handleOk={() => {
                        navigateToUrl(`mailto:${supportEmailAddress}`)
                        setEmailDialogOpen(false)
                    }}
                    id="email-dialog"
                    title="Contact Us"
                />
            )}
            <FooterContainer
                id="additional-links-container"
                sx={[LOGO_LIGHT_MODE_SX, ...(Array.isArray(sx) ? sx : [sx ?? false])]}
            >
                <a
                    href={logoLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        id="logo-img"
                        width={200}
                        height={45}
                        src={logoUrl}
                        alt="Cognizant Logo"
                    />
                </a>
                <FooterSectionHeader id="team-links">
                    <HeaderLine id="additional-links-header">Team</HeaderLine>
                    <LinkDivider id="additional-links-divider" />
                    <FooterItemLink
                        id="learn-more-link"
                        href="https://www.cognizant.com/us/en/services/ai/ai-lab"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        About
                    </FooterItemLink>
                    <FooterItemLink
                        id="contact-us-footer-link"
                        href={null}
                        onClick={() => setEmailDialogOpen(true)}
                        rel="noopener noreferrer"
                        sx={{cursor: "pointer"}}
                    >
                        Contact Us
                    </FooterItemLink>
                </FooterSectionHeader>
                <FooterSectionHeader id="services-links">
                    <HeaderLine id="additional-links-header">Services</HeaderLine>
                    <LinkDivider />
                    <FooterItemLink
                        id="ai-innovation-studios-link"
                        href="https://portal-innovationstudio-apps-prod-we-001.azurewebsites.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        AI Innovation Studios
                    </FooterItemLink>
                    <FooterItemLink
                        id="neuro-it-ops-link"
                        href="https://www.cognizant.com/us/en/services/neuro-intelligent-automation/neuro-ai-it-operations"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Neuro IT Ops
                    </FooterItemLink>
                    <FooterItemLink
                        id="flowsource-link"
                        href="https://www.cognizant.com/us/en/services/software-engineering-services/flowsource"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Flowsource
                    </FooterItemLink>
                    <FooterItemLink
                        id="skygrade-link"
                        href="https://www.cognizant.com/us/en/services/cloud-solutions/cognizant-skygrade"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Skygrade
                    </FooterItemLink>
                    <FooterItemLink
                        id="cdit-link"
                        href="https://cditoolkit.cognizant.com/cditlive2.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Cognizant Ignition
                    </FooterItemLink>
                </FooterSectionHeader>
                <FooterSectionHeader>
                    <HeaderLine>Other</HeaderLine>
                    <LinkDivider />
                    <FooterItemLink
                        id="learn-more-link"
                        href="https://logo.dev"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Logos provided by Logo.dev
                    </FooterItemLink>
                </FooterSectionHeader>
            </FooterContainer>
        </>
    )
}
