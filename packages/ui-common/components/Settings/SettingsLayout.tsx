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

export const Section = styled(Box)(({theme}) => ({
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
}))

export const SettingsSectionTitle = styled(SettingsSectionTitleBase)(({theme}) => ({
    marginBottom: theme.spacing(0.5),
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
    alignItems: "baseline",
    borderBottom: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    display: "flex",
    fontWeight: 600,
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(0.5),
    marginBottom: theme.spacing(1.5),
    width: "100%",
}))

//#endregion: Styled Components

interface SettingsSubsectionProps {
    readonly title: string
    /** Shown at the right end of the title row */
    readonly status?: ReactNode
    readonly children: ReactNode
}

export const SettingsSubsection: FC<SettingsSubsectionProps> = ({children, status: statusNode, title}) => (
    <SubSection>
        <SubsectionTitle variant="subtitle1">
            {title}
            {statusNode && (
                <Box
                    component="span"
                    sx={{ml: "auto"}}
                >
                    {statusNode}
                </Box>
            )}
        </SubsectionTitle>
        <SubSectionBody>{children}</SubSectionBody>
    </SubSection>
)
