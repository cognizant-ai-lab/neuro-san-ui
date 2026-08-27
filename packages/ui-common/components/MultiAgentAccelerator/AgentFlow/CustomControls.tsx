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

import AdjustRoundedIcon from "@mui/icons-material/AdjustRounded"
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import {ControlButton, Controls} from "@xyflow/react"
import {FC} from "react"

import {Layout, useSettingsStore} from "../../../state/Settings"

export const CustomControls: FC = () => {
    const theme = useTheme()

    const updateSettings = useSettingsStore((state) => state.updateSettings)

    const layout = useSettingsStore((state) => state.settings.appearance.layout)
    const setLayout = (newLayout: Layout) => {
        updateSettings({
            appearance: {
                layout: newLayout,
            },
        })
    }

    const showRadialGuides = useSettingsStore((state) => state.settings.appearance.showRadialGuides)
    const setShowRadialGuides = (newValue: boolean) => {
        updateSettings({
            appearance: {
                showRadialGuides: newValue,
            },
        })
    }

    const showThoughtBubbles = useSettingsStore((state) => state.settings.appearance.showThoughtBubbles)
    const setShowThoughtBubbles = (newValue: boolean) => {
        updateSettings({
            appearance: {
                showThoughtBubbles: newValue,
            },
        })
    }

    // Get the background color for the control buttons; differs based on whether the button is active or not
    const getControlButtonBackgroundColor = (isActive: boolean) => {
        return isActive ? theme.palette.action.selected : undefined
    }

    return (
        // Generate the control bar for the flow, including layout and radial guides toggles
        <Controls
            position="top-left"
            style={{
                position: "absolute",
                top: "0px",
                left: "0px",
                height: "auto",
                width: "auto",
            }}
            showInteractive={true}
        >
            <Tooltip
                id="radial-layout-tooltip"
                title="Radial layout"
                placement="right"
            >
                <span id="radial-layout-span">
                    <ControlButton
                        id="radial-layout-button"
                        onClick={() => setLayout("radial")}
                        style={{
                            backgroundColor: getControlButtonBackgroundColor(layout === "radial"),
                        }}
                    >
                        <HubOutlinedIcon id="radial-layout-icon" />
                    </ControlButton>
                </span>
            </Tooltip>
            <Tooltip
                id="linear-layout-tooltip"
                title="Linear layout"
                placement="right"
            >
                <span id="linear-layout-span">
                    <ControlButton
                        id="linear-layout-button"
                        onClick={() => setLayout("linear")}
                        style={{
                            backgroundColor: getControlButtonBackgroundColor(layout === "linear"),
                        }}
                    >
                        <ScatterPlotOutlinedIcon id="linear-layout-icon" />
                    </ControlButton>
                </span>
            </Tooltip>
            <Tooltip
                id="radial-guides-tooltip"
                title={`Enable/disable radial guides${layout === "radial" ? "" : " (only available in radial layout)"}`}
                placement="right"
            >
                <span id="radial-guides-span">
                    <ControlButton
                        id="radial-guides-button"
                        onClick={() => setShowRadialGuides(!showRadialGuides)}
                        style={{
                            backgroundColor: getControlButtonBackgroundColor(showRadialGuides),
                        }}
                        disabled={layout !== "radial"}
                    >
                        <AdjustRoundedIcon id="radial-guides-icon" />
                    </ControlButton>
                </span>
            </Tooltip>
            <Tooltip
                id="thought-bubble-tooltip"
                title={`Toggle thought bubbles ${showThoughtBubbles ? "off" : "on"}`}
                placement="right"
            >
                <span id="thought-bubble-span">
                    <ControlButton
                        id="thought-bubble-button"
                        onClick={() => setShowThoughtBubbles(!showThoughtBubbles)}
                        style={{
                            backgroundColor: getControlButtonBackgroundColor(showThoughtBubbles),
                        }}
                    >
                        <ChatBubbleOutlinedIcon id="thought-bubble-icon" />
                    </ControlButton>
                </span>
            </Tooltip>
        </Controls>
    )
}
