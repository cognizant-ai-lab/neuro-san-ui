import {styled} from "@mui/material/styles"
import {FC, useState} from "react"

import {ConfirmationModal} from "./ConfirmationModal"
import {CONTACT_US_CONFIRMATION_DIALOG_TEXT, CONTACT_US_CONFIRMATION_DIALOG_TITLE} from "../../const"

const HeaderLineFive = styled("h5")({
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

const SplashLink = styled("a")(({theme}) => ({
    color: theme.palette.grey[500],
    display: "block",
    marginBottom: "0.37rem",
    width: "fit-content",

    "&:hover": {
        color: theme.palette.text.primary,
    },
}))

interface FooterProps {
    readonly supportEmailAddress: string
}

/**
 * Footer for all pages, contains additional links and contact information
 * @param supportEmailAddress - The email address that will be used in the Contact Us link
 */
export const Footer: FC<FooterProps> = ({supportEmailAddress}) => {
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
                    <MoreLinks>
                        <HeaderLineFive>Other</HeaderLineFive>
                        <LinkDivider />
                        <SplashLink
                            id="learn-more-link"
                            href="https://logo.dev"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Logos provided by Logo.dev
                        </SplashLink>
                    </MoreLinks>
                </div>
            </footer>
        </>
    )
}
