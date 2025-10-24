/**
 * Helper to determine if dark mode is active based on mode and systemMode.
 * @param mode Current mode setting: "light", "dark", or "system"
 * @param systemMode If mode is "system", this indicates the system preference: "light" or "dark"
 * @returns true if dark mode is active, false otherwise
 */
export const isDarkMode = (mode: "light" | "dark" | "system", systemMode: "light" | "dark") =>
    mode === "dark" || (mode === "system" && systemMode === "dark")
