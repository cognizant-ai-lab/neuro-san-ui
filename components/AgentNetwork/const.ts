export const DEFAULT_FRONTMAN_X_POS = 150
export const DEFAULT_FRONTMAN_Y_POS = 450

// Minimum distance from center
export const BASE_RADIUS = 100

// Distance between depth levels
export const LEVEL_SPACING = 100

// Palette for progressive coloring of nodes based on depth
export const BACKGROUND_COLORS = [
    "var(--bs-accent3-light)",
    "var(--bs-accent2-dark)",
    "var(--bs-accent1-dark)",
    "var(--bs-primary)",
    "var(--bs-dark)",
    "var(--bs-black)",
    "var(--bs-info)",
]

// Palette for heatmap coloring of nodes. Gradient centered around the corporate value --bs-accent3-light from
// global.css.
export const HEATMAP_COLORS = [
    "#054b59",
    "#197d86",
    "#3fb0bb",
    "#7edfe3",
    "#97f5f7",
    "#bfeff0",
    "#f3d2cc",
    "#f7a89c",
    "#f47664",
    "#d94835",
]
