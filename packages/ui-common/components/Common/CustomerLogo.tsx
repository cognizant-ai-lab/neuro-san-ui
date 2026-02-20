// Have to suppress this lint error to allow dynamic access of MUI icons
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import {FC, ReactElement} from "react"

import {useSettingsStore} from "../../state/Settings"

interface CustomerLogoProps {
    readonly fallbackElement?: ReactElement | string
    readonly logoDevToken?: string
}

/**
 * Returns a JSX element for the Cognizant logo, wrapped in a link to the Cognizant website.
 */
export const getCognizantLogoImage = () => (
    <a
        id="splash-logo-link"
        href="https://www.cognizant.com/us/en"
        style={{
            display: "flex",
            paddingLeft: "0.15rem",
        }}
        target="_blank"
        rel="noopener noreferrer"
    >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            id="logo-img"
            width="200"
            height="45"
            src="/cognizant-logo-white.svg"
            alt="Cognizant Logo"
        />
    </a>
)

/**
 * Component to display the customer's logo based on the settings.
 * @param logoDevToken - Optional token for fetching the logo from logo.dev
 * @returns JSX element representing the customer's logo, MUI icon, or Cognizant fallback, or null if no logo
 * should be displayed or if the logo.dev token is missing/invalid.
 */
export const CustomerLogo: FC<CustomerLogoProps> = ({fallbackElement, logoDevToken}) => {
    const customer = useSettingsStore((state) => state.settings.branding.customer)
    const iconSuggestion = useSettingsStore((state) => state.settings.branding.iconSuggestion)
    const logoSource = useSettingsStore((state) => state.settings.branding.logoSource)

    // null: render Cognizant logo (default)
    if (logoSource === null) {
        return getCognizantLogoImage()
    }

    // "none": explicitly render no logo
    if (logoSource === "none") {
        return fallbackElement
    }

    // "generic": try MUI icon, then Cognizant fallback
    if (logoSource === "generic") {
        const MuiIcon = MuiIcons[iconSuggestion as keyof typeof MuiIcons]
        const muiIconElement = MuiIcon ? <MuiIcon sx={{fontSize: "2rem"}} /> : null
        return muiIconElement || getCognizantLogoImage()
    }

    // "auto": use logo.dev service
    const logoUrl =
        logoDevToken && customer?.trim().length > 0
            ? `https://img.logo.dev/name/${encodeURIComponent(customer)}?token=${logoDevToken}&theme=light&format=png&size=75`
            : null

    return logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={logoUrl}
            alt={`${customer} logo`}
            width={40}
            height={40}
            style={{borderRadius: "50%"}}
        />
    ) : (
        fallbackElement
    )
}
