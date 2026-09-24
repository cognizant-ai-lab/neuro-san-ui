/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import EditIcon from "@mui/icons-material/Edit"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import {alpha, useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {getZIndex} from "../../../utils/zIndexLayers"

//#region: Types

export interface TitleProps {
    readonly id: string
    readonly networkDisplayName: string
    readonly setIsEditingNetwork: (isEditing: boolean) => void
    readonly showEditButton: boolean
}

//#endregion: Types

export const Title: FC<TitleProps> = ({id, networkDisplayName, setIsEditingNetwork, showEditButton}) => {
    const theme = useTheme()

    if (!networkDisplayName) return null

    return (
        <Box
            id={id}
            sx={{
                alignItems: "center",
                display: "flex",
                gap: 1,
                left: "50%",
                pointerEvents: "none",
                position: "absolute",
                top: theme.spacing(1),
                transform: "translateX(-50%)",
                zIndex: getZIndex(2, theme),
            }}
        >
            <Tooltip
                title={networkDisplayName}
                placement="top"
            >
                <Typography
                    id={`${id}-network-title`}
                    variant="subtitle1"
                    sx={{
                        backdropFilter: "blur(6px)",
                        backgroundColor: alpha(theme.palette.background.paper, 0.75),
                        border: `1px solid ${alpha(theme.palette.divider, 0.75)}`,
                        borderRadius: 2,
                        boxShadow: theme.shadows[6],
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        letterSpacing: "0.01em",
                        lineHeight: 1.35,
                        maxWidth: 400,
                        overflow: "hidden",
                        pointerEvents: "auto",
                        px: 2,
                        py: 0.45,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {networkDisplayName}
                </Typography>
            </Tooltip>
            {showEditButton && (
                <Button
                    id={`${id}-enter-edit-mode-btn`}
                    variant="contained"
                    size="small"
                    onClick={() => setIsEditingNetwork(true)}
                    startIcon={<EditIcon />}
                    sx={{
                        pointerEvents: "auto",
                        "&:hover": {backgroundColor: theme.palette.primary.main},
                    }}
                >
                    Edit
                </Button>
            )}
        </Box>
    )
}
