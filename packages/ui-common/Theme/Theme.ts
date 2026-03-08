/**
 * Helper to determine if dark mode is active based on mode and systemMode.
 * @param mode Current mode setting: "light", "dark", or "system"
 * @param systemMode If mode is "system", this indicates the system preference: "light" or "dark"
 * @returns true if dark mode is active, false otherwise
 */
export const isDarkMode = (mode: "light" | "dark" | "system", systemMode: "light" | "dark") =>
    mode === "dark" || (mode === "system" && systemMode === "dark")

/**
 * Expands 3-character hex colors to 6 characters.
 * @param color - The hex color string (e.g., "#RGB" or "#RRGGBB")
 * @returns The expanded hex color string (e.g., "#RRGGBB")
 */
const expandHexColor = (color: string): string => {
    if (color.length === 4 && color.startsWith("#")) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    }
    return color
}

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

    const hexColor = expandHexColor(color)

    const num = parseInt(hexColor.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, Math.max(0, (num >> 16) + amt))
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))

    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`
}

/**
 * Helper function to determine if a color is light
 *
 * @param color - The hex color string (e.g., "#RRGGBB" or "#RGB")
 * @returns true if the color is light (per luminance calculation), false otherwise
 */
export const isLightColor = (color: string): boolean => {
    // Expand 3-character hex to 6-character hex if needed.
    const hexColor = expandHexColor(color)

    // Remove # if present
    const colorWithoutHash = hexColor.replace("#", "")

    // Convert to RGB
    const r = parseInt(colorWithoutHash.substring(0, 2), 16)
    const g = parseInt(colorWithoutHash.substring(2, 4), 16)
    const b = parseInt(colorWithoutHash.substring(4, 6), 16)

    // Calculate relative luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return true if light (threshold 0.5)
    return luminance > 0.5
}
