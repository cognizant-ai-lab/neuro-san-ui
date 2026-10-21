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

import Box from "@mui/material/Box"
import {alpha, useTheme} from "@mui/material/styles"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import {FC} from "react"

import {GraphColoringOption, usePalette, useSettingsStore} from "../../../state/Settings"
import {getZIndex} from "../../../utils/zIndexLayers"

//#region: Types

export interface LegendProps {
    readonly id: string
    readonly maxDepth: number
}

//#endregion: Types

export const Legend: FC<LegendProps> = ({id, maxDepth}) => {
    const theme = useTheme()

    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const graphColoringOption = useSettingsStore((state) => state.settings.appearance.graphColoringOption)
    const setGraphColoringOption = (newValue: GraphColoringOption) => {
        updateSettings({
            appearance: {
                graphColoringOption: newValue,
            },
        })
    }

    const isHeatmap = graphColoringOption === "heatmap"

    const palette = usePalette()

    // Generate Legend for depth or heatmap colors
    const length = isHeatmap ? palette.length : Math.min(maxDepth, palette.length)
    return (
        <Box
            id={id}
            sx={{
                alignItems: "center",
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.text.primary, 0.18)}`,
                borderRadius: "5px",
                display: "flex",
                padding: theme.spacing(0.5),
                position: "absolute",
                right: theme.spacing(2),
                top: theme.spacing(4),
                zIndex: getZIndex(2, theme),
            }}
        >
            {/* Depth palette */}
            {Array.from({length}, (_, i) => (
                <Box
                    id={`${id}-legend-depth-${i}`}
                    key={i}
                    sx={{
                        alignItems: "center",
                        backgroundColor: palette[i],
                        borderRadius: "50%",
                        color: theme.palette.getContrastText(palette[i]),
                        display: "flex",
                        fontSize: "0.5rem",
                        justifyContent: "center",
                        marginLeft: theme.spacing(0.75),
                        width: "15px",
                    }}
                >
                    {i}
                </Box>
            ))}
            <ToggleButtonGroup
                id={`${id}-coloring-toggle`}
                value={graphColoringOption}
                exclusive={true}
                onChange={(_, newValue) => {
                    if (newValue !== null) {
                        setGraphColoringOption(newValue)
                    }
                }}
                size="small"
                sx={{
                    marginLeft: theme.spacing(2),
                    "& .MuiToggleButton-root": {
                        borderColor: theme.palette.divider,
                        color: theme.palette.text.primary,
                        minHeight: 22,
                        px: 1,
                        "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                        },
                        "&.Mui-selected": {
                            backgroundColor: theme.palette.action.selected,
                            borderColor: theme.palette.text.primary,
                        },
                        "&.Mui-selected:hover": {
                            backgroundColor: theme.palette.action.selected,
                            borderColor: theme.palette.text.primary,
                        },
                    },
                }}
            >
                <ToggleButton
                    id={`${id}-depth-toggle`}
                    value="depth"
                    sx={{
                        fontSize: "0.5rem",
                        height: "1rem",
                    }}
                >
                    Depth
                </ToggleButton>
                <ToggleButton
                    id={`${id}-heatmap-toggle`}
                    value="heatmap"
                    sx={{
                        fontSize: "0.5rem",
                        height: "1rem",
                    }}
                >
                    Heatmap
                </ToggleButton>
            </ToggleButtonGroup>
        </Box>
    )
}
