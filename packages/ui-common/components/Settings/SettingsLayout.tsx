/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import Box from "@mui/material/Box"
import {styled} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {ComponentPropsWithoutRef, FC, ReactNode} from "react"

import {
    getSheen,
    gradientBorder,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_RADIUS_SURFACE,
    sheenGradient,
} from "../../Theme/sheen"

/**
 * Layout pieces shared by the sections of the Settings dialog.
 */

const SettingsSectionTitleBase: FC<ComponentPropsWithoutRef<typeof Typography>> = (props) => (
    <Typography
        variant="h6"
        {...props}
    />
)

//#region: Styled Components

// Section card: glass with a faint iridescent hairline that strengthens on hover. No backdrop blur: the card already
// sits on the dialog's own frosted glass.
export const Section = styled(Box)(({theme}) => {
    const sheen = getSheen(theme)
    const border = gradientBorder(theme, SHEEN_RADIUS_SURFACE, 1, 0.25)
    return {
        ...border,
        backgroundColor: sheen.glassBg,
        backgroundImage: `linear-gradient(180deg, ${sheen.highlight}, transparent 38%)`,
        border: `1px solid ${sheen.glassBorder}`,
        borderRadius: SHEEN_RADIUS_SURFACE,
        boxShadow: `inset 0 1px 0 ${sheen.highlight}, 0 12px 32px -22px rgba(0, 0, 0, 0.5)`,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
        marginBottom: theme.spacing(2.5),
        padding: theme.spacing(2.5, 3),
        transition: `box-shadow 0.35s ${SHEEN_EASE}`,
        "&::before": {...border["&::before"], transition: "opacity 0.35s ease"},
        "&:hover::before": {opacity: 0.5},
        "& > :last-child": {marginBottom: 0},
    }
})

// Display-font section title with a short gradient accent bar beneath it
export const SettingsSectionTitle = styled(SettingsSectionTitleBase)(({theme}) => ({
    fontFamily: SHEEN_FONT_DISPLAY,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    marginBottom: theme.spacing(0.5),
    "&::after": {
        content: '""',
        display: "block",
        width: 28,
        height: 3,
        marginTop: theme.spacing(0.75),
        borderRadius: 3,
        backgroundImage: sheenGradient(theme, 90),
        boxShadow: `0 0 10px ${getSheen(theme).glow}`,
    },
}))

export const SubSection = styled(Box)(({theme}) => ({
    alignItems: "start",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
}))

export const SubSectionBody = styled(Box)(({theme}) => ({
    alignContent: "center",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.5),
    width: "100%",
}))

const SubsectionTitle = styled(Typography)(({theme}) => ({
    borderBottom: `1px solid ${(theme.vars ?? theme).palette.divider}`,
    color: (theme.vars ?? theme).palette.text.secondary,
    fontWeight: 600,
    paddingBottom: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5),
    width: "100%",
}))

//#endregion: Styled Components

interface SettingsSubsectionProps {
    readonly title: string
    readonly children: ReactNode
}

export const SettingsSubsection: FC<SettingsSubsectionProps> = ({children, title}) => (
    <SubSection>
        <SubsectionTitle variant="subtitle1">{title}</SubsectionTitle>
        <SubSectionBody>{children}</SubSectionBody>
    </SubSection>
)
