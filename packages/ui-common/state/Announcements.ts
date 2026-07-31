import {create} from "zustand"
import {persist} from "zustand/middleware"

export enum AnnouncementId {
    NeuroSanStudioGithubStar = "NeuroSanStudioGithubStar",
}

interface AnnouncementsStore {
    readonly lastShownAt: Partial<Record<AnnouncementId, number>>
    readonly markShown: (id: AnnouncementId) => void
    readonly hasShown: (id: AnnouncementId) => boolean
    readonly reset: (id?: AnnouncementId) => void
}

const ANNOUNCEMENTS_STORAGE_KEY = "announcements"

/**
 * Persisted zustand store for announcements we want to show to the user once, or every some amount of time.
 */
export const useAnnouncementsStore = create<AnnouncementsStore>()(
    persist(
        (set, get) => ({
            lastShownAt: {},

            markShown: (id) =>
                set((state) => ({
                    lastShownAt: {
                        ...state.lastShownAt,
                        [id]: Date.now(),
                    },
                })),

            hasShown: (id) => Boolean(get().lastShownAt[id]),

            reset: (id) =>
                set((state) => {
                    if (!id) {
                        return {lastShownAt: {}}
                    }

                    const {[id]: _removed, ...remaining} = state.lastShownAt
                    return {lastShownAt: remaining}
                }),
        }),
        {
            name: ANNOUNCEMENTS_STORAGE_KEY,
        }
    )
)
