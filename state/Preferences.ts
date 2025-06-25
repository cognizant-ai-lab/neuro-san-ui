import {create} from "zustand"
import {persist} from "zustand/middleware"

interface UserPreferences {
    darkMode: boolean
    toggleDarkMode: () => void
}

export const usePreferences = create<UserPreferences>()(
    // persists to local storage by default
    persist(
        (set) => ({
            darkMode: false,
            toggleDarkMode: () => set((state) => ({darkMode: !state.darkMode})),
        }),
        {
            name: "theme-storage",
        }
    )
)
