import {styled, SxProps} from "@mui/material/styles"
import {FC, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT, CONTACT_US_CONFIRMATION_DIALOG_TITLE} from "../../const"

const HeaderLineFive = styled("h5")({
    fontWeight: "bold",
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

    "&:hover": {
        color: theme.palette.text.primary,
    },
}))

const FooterContainer = styled("footer")({
    borderTop: "var(--bs-border-width) var(--bs-border-style) var(--bs-gray-lighter)",
    marginLeft: "2rem",
    marginRight: "2rem",
})

interface FooterProps {
    readonly supportEmailAddress: string
    readonly sx?: SxProps
}

/**
 * Footer for all pages, contains additional links and contact information
 * @param supportEmailAddress - The email address that will be used in the Contact Us link
 * @param sx - Optional MUI sx prop for additional styling overrides
 */
export const Footer: FC<FooterProps> = ({supportEmailAddress, sx}) => {
    // For email dialog
    const [emailDialogOpen, setEmailDialogOpen] = useState<boolean>(false)

    return (
        <>
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
            <FooterContainer sx={sx}>
                <div
                    id="additional-links-container"
                    style={{
                        columnGap: "60px",
                        display: "flex",
                        marginLeft: "1.5rem",
                        marginTop: "1.1rem",
                    }}
                >
                    <FooterSectionHeader id="team-links">
                        <HeaderLineFive id="additional-links-header">Team</HeaderLineFive>
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
                        <HeaderLineFive id="additional-links-header">Services</HeaderLineFive>
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
                        <HeaderLineFive>Other</HeaderLineFive>
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
                </div>
            </FooterContainer>
        </>
    )
}
