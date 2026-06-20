// Have to suppress this lint error to allow dynamic access of MUI icons
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import {SvgIconProps} from "@mui/material/SvgIcon"
import {FC} from "react"

import {LogoSource} from "../../state/Settings"

//#region Types and Interfaces
interface CustomerLogoProps {
    readonly customer: string
    readonly fallbackIcon?: FC<SvgIconProps>
    readonly iconSuggestion?: string
    readonly logoServiceToken?: string
    readonly logoSource: LogoSource
}
//#endregion

export const LOGO_DEV_URL = "https://img.logo.dev/name"

/**
 * Component to display the customer's logo based on the settings.
 * @param customer - Name of the customer, used for fetching the logo from logo.dev when logoSource is "auto"
 * @param fallbackIcon - Optional MUI icon to use as a fallback if other approaches fail
 * @param iconSuggestion - Optional MUI icon name to use when logoSource is "generic"
 * @param logoServiceToken - Optional token for fetching the logo from logo.dev
 * @param logoSource - Source of the logo, determines how the logo is rendered ("none", "generic", or "auto")
 * @returns JSX element representing the customer's logo, MUI icon, or Cognizant fallback, or null if no logo
 * should be displayed or if the logo.dev token is missing/invalid.
 */
export const CustomerLogo: FC<CustomerLogoProps> = ({
    customer,
    fallbackIcon: FallbackIcon,
    iconSuggestion,
    logoServiceToken,
    logoSource,
}) => {
    const hasCustomer = customer?.trim()?.length > 0
    const fallback = FallbackIcon ? <FallbackIcon sx={{fontSize: "2rem"}} /> : null

    // "generic": check if suggested MUI icon is valid
    switch (logoSource) {
        case "generic": {
            const MuiIcon = MuiIcons[iconSuggestion as keyof typeof MuiIcons]
            const LogoIcon = MuiIcon ?? FallbackIcon

            return LogoIcon ? <LogoIcon sx={{fontSize: "2rem"}} /> : null
        }
        case "auto": {
            if (!hasCustomer || !logoServiceToken || logoServiceToken.trim().length === 0) {
                return fallback
            }

            // "auto": use logo.dev service
            // eslint-disable-next-line max-len -- better to keep URL together
            const logoUrl = `${LOGO_DEV_URL}/${encodeURIComponent(customer)}?token=${logoServiceToken}&theme=dark&format=png&size=75`

            return (
                <img
                    src={logoUrl}
                    alt={`${customer} Logo`}
                    width={40}
                    height={40}
                    style={{borderRadius: "50%"}}
                />
            )
        }
        case "none":
        default:
            return fallback
    }
}
