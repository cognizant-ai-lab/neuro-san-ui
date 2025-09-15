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
