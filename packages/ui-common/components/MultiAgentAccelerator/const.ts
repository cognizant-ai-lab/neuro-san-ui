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

export const DEFAULT_FRONTMAN_X_POS = 150
export const DEFAULT_FRONTMAN_Y_POS = 450

// Minimum distance from center
export const BASE_RADIUS = 100

// Distance between depth levels
export const LEVEL_SPACING = 150

// Palette for progressive coloring of nodes based on depth
export const BACKGROUND_COLORS = [
    "#f7fbff",
    "#deebf7",
    "#c6dbef",
    "#9ecae1",
    "#6baed6",
    "#4292c6",
    "#2171b5",
    "#08519c",
    "#08306b",
    "#041c45",
]

// Zero-based index of the one where colors start to get dark. Used for displaying contrasting text colors.
export const BACKGROUND_COLORS_DARK_IDX = 6 // Somewhat subjective

// Palette for heatmap coloring of nodes
// For now, use same palette as background colors
export const HEATMAP_COLORS = BACKGROUND_COLORS
