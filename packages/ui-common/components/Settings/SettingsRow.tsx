import Box from "@mui/material/Box"
import FormLabel from "@mui/material/FormLabel"
import {SxProps, Theme, useTheme} from "@mui/material/styles"
import {FC, ReactNode} from "react"

import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"
import InfoTip from "./InfoTip"

interface SettingsRowProps {
    readonly checkmark?: ReturnType<typeof useCheckmarkFade>
    readonly children: ReactNode
    readonly disabled?: boolean
    readonly label: ReactNode
    readonly labelWidth?: string | number
    readonly sx?: SxProps<Theme>
    readonly tooltip: ReactNode
}

/**
 * Lightweight component to encapsulate a row in the Settings page.
 */
export const SettingsRow: FC<SettingsRowProps> = ({
    checkmark,
    children,
    disabled = false,
    label,
    labelWidth = "8rem",
    sx,
    tooltip,
}) => {
    const theme = useTheme()

    return (
        <Box
            sx={[
                {
                    alignItems: "center",
                    display: "flex",
                    flexDirection: "row",
                    gap: theme.spacing(2),
                    opacity: disabled ? 0.5 : 1,
                    width: "100%",
                },
                // Can't spread sx directly because it can be an array or object
                ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
            ]}
        >
            {label ? (
                <Box
                    sx={{
                        alignItems: "center",
                        display: "flex",
                        flexBasis: labelWidth,
                        flexShrink: 0,
                    }}
                >
                    <FormLabel>{label}</FormLabel>
                </Box>
            ) : null}

            <Box
                sx={{
                    alignItems: "center",
                    display: "flex",
                    flex: 1,
                    gap: theme.spacing(2),
                    minWidth: 0,
                }}
            >
                {children}
                {checkmark ? <FadingCheckmark show={checkmark.show} /> : null}
            </Box>
            <Box sx={{flexShrink: 0}}>
                <InfoTip title={tooltip} />
            </Box>
        </Box>
    )
}
