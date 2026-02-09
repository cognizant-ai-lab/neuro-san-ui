/**
 * Helper to determine if dark mode is active based on mode and systemMode.
 * @param mode Current mode setting: "light", "dark", or "system"
 * @param systemMode If mode is "system", this indicates the system preference: "light" or "dark"
 * @returns true if dark mode is active, false otherwise
 */
export const isDarkMode = (mode: "light" | "dark" | "system", systemMode: "light" | "dark") =>
    mode === "dark" || (mode === "system" && systemMode === "dark")

/**
 * Adjusts the brightness of a hex color by a given percentage.
 * @param color - The hex color string (e.g., "#RRGGBB" or "#RGB").
 * @param percent - The percentage to adjust brightness (-100 to 100). Positive values make the color lighter,
 * negative values make it darker.
 * @returns The adjusted hex color string.
 */
export const adjustBrightness = (color: string, percent: number): string => {
    if (!color?.startsWith("#") || (color?.length !== 7 && color?.length !== 4)) {
        // Return original color if not in expected format
        return color
    }

    // Expand 3-character hex colors to 6 characters
    let hexColor = color
    if (color.length === 4) {
        hexColor = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    }

    const num = parseInt(hexColor.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, Math.max(0, (num >> 16) + amt))
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))

    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}
