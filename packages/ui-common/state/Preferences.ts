import {create} from "zustand"
import {persist, subscribeWithSelector} from "zustand/middleware"

interface UserPreferences {
    darkMode: boolean
    toggleDarkMode: () => void
}

// Ensure singleton store instance
let store: ReturnType<typeof createPreferencesStore> | undefined

const createPreferencesStore = () =>
    create<UserPreferences>()(
        subscribeWithSelector(
            // persists to local storage by default
            persist(
                (set) => ({
                    darkMode: false,
                    toggleDarkMode: () => set((state) => ({darkMode: !state.darkMode})),
                }),
                {
                    name: "theme-storage",
                    // Force storage sync across instances
                    partialize: (state) => ({darkMode: state.darkMode}),
                    onRehydrateStorage: () => (state) => {
                        if (state) {
                            // Notify other instances of changes
                            window.dispatchEvent(
                                new CustomEvent("preferences-sync", {
                                    detail: state,
                                })
                            )
                        }
                    },
                }
            )
        )
    )

export const usePreferences = () => {
    if (!store) {
        store = createPreferencesStore()

        // Listen for cross-instance changes
        if (typeof window !== "undefined") {
            window.addEventListener("preferences-sync", (event: Event) => {
                const customEvent = event as CustomEvent<UserPreferences>
                store?.setState(customEvent.detail, true)
            })
        }
    }

    return store()
}
