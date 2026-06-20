import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import Box from "@mui/material/Box"
import FormLabel from "@mui/material/FormLabel"
import {SxProps, Theme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import {FC, ReactNode} from "react"

import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"

interface SettingsRowProps {
    readonly label: ReactNode
    readonly children: ReactNode
    readonly checkmark?: ReturnType<typeof useCheckmarkFade>
    readonly tooltip: ReactNode
    readonly disabled?: boolean
    readonly sx?: SxProps<Theme>
}

export const SettingsRow: FC<SettingsRowProps> = ({label, children, checkmark, tooltip, disabled = false, sx}) => (
    <Box
        sx={[
            {
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                opacity: disabled ? 0.5 : 1,
            },
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
    >
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
            }}
        >
            <FormLabel>{label}</FormLabel>
        </Box>

        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
            }}
        >
            {children}
            {checkmark ? <FadingCheckmark show={checkmark.show} /> : null}
        </Box>
        <Tooltip title={tooltip}>
            <InfoOutlinedIcon
                aria-label="setting information"
                fontSize="small"
                sx={{
                    color: "text.secondary",
                    cursor: "help",
                    fontSize: "0.9rem",
                }}
            />
        </Tooltip>
    </Box>
)
