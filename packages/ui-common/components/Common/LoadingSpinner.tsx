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
import {keyframes} from "@mui/material/styles"
import {FC} from "react"

import {getSheen} from "../../Theme/sheen"

interface LoadingSpinnerProps {
    id: string
}

const SPINNER_SIZE = 35

const rotate = keyframes({to: {transform: "rotate(360deg)"}})

// Keeps only a thin ring of the element (masks are alpha-only, so the color here is irrelevant)
const RING_MASK = "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))"

/**
 * A simple loading spinner: an iridescent gradient ring (conic gradient masked to a ring) that spins, with a soft
 * glow, next to a "Loading..." label.
 * @param id The id for the spinner and text elements, for testing
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({id}) => {
    return (
        <Box
            component="h3"
            id={id}
            sx={{alignItems: "center", display: "flex"}}
        >
            {/* Glow lives on a wrapper: a filter on the ring itself would be clipped by its mask */}
            <Box
                component="span"
                sx={(theme) => ({display: "inline-flex", filter: `drop-shadow(0 0 6px ${getSheen(theme).glow})`})}
            >
                <Box
                    aria-label="Loading"
                    id={`${id}-spinner`}
                    role="progressbar"
                    sx={(theme) => {
                        const sheen = getSheen(theme)
                        return {
                            // The conic gradient gives the ring a bright iridescent head and a tail fading to nothing
                            animation: `${rotate} 0.9s linear infinite`,
                            background:
                                `conic-gradient(from 0deg, transparent 8%, ${sheen.gradientEnd} 45%, ` +
                                `${sheen.gradientMid} 75%, ${sheen.gradientStart})`,
                            borderRadius: "50%",
                            flexShrink: 0,
                            height: SPINNER_SIZE,
                            mask: RING_MASK,
                            WebkitMask: RING_MASK,
                            width: SPINNER_SIZE,
                        }
                    }}
                />
            </Box>
            <Box
                component="span"
                id={`${id}-loading-text`}
                sx={{color: "text.secondary", fontWeight: 500, letterSpacing: "-0.01em", marginLeft: "1em"}}
            >
                Loading...
            </Box>
        </Box>
    )
}
