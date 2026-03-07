import {styled, SxProps} from "@mui/material/styles"
import {FC, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {getContactUsConfirmationText} from "../../const"
import {navigateToUrl} from "../../utils/BrowserNavigation"

const HeaderLine = styled("h6")({
    fontWeight: "bold",
    fontSize: "smaller",
})

const LinkDivider = styled("div")({
    border: "1px solid var(--bs-accent3-medium)",
    marginBottom: "1.2rem",
    width: "2.4rem",
})

const FooterSectionHeader = styled("div")({
    display: "inline-flex",
    flexDirection: "column",
    marginTop: "0.1rem",
})

const FooterItemLink = styled("a")(({theme}) => ({
    color: theme.palette.grey[500],
    display: "block",
    marginBottom: "0.37rem",
    width: "fit-content",
    fontSize: "smaller",
    "&:hover": {
        color: theme.palette.text.primary,
    },
}))

const FooterContainer = styled("footer")({
    backgroundColor: "var(--bs-primary)",
    borderTop: "var(--bs-border-width) var(--bs-border-style) var(--bs-gray-lighter)",
    columnGap: "60px",
    display: "flex",
    justifyContent: "center",
    marginTop: "1rem",
    paddingTop: "2rem",
    paddingBottom: "1rem",
    width: "100%",
})

interface FooterProps {
    readonly logoUrl: string
    readonly logoLinkUrl: string
    readonly supportEmailAddress: string
    readonly sx?: SxProps
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
                sx={sx}
            >
                <a
                    href={logoLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        sx={{cursor: "pointer", textDecoration: "underline"}}
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
