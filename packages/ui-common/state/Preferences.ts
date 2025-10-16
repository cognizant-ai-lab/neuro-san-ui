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
