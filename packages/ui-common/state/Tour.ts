import {create} from "zustand"
import {persist} from "zustand/middleware"

/**
 * Possible states for whether the user has been shown / taken the tour.
 */
export enum TourPromptState {
    NotPrompted = "NotPrompted",
    Taken = "Taken",
    DontShowAgain = "DontShowAgain",
}

interface TourStore {
    readonly status: TourPromptState
    readonly setStatus: (s: TourPromptState) => void
    readonly reset: () => void
}

/**
 * Persisted zustand store for the tour prompt state.
 * Persists to localStorage under the key "tour".
 */
export const useTourStore = create<TourStore>()(
    persist(
        (set) => ({
            status: TourPromptState.NotPrompted,
            setStatus: (s: TourPromptState) => set({status: s}),
            reset: () => set({status: TourPromptState.NotPrompted}),
        }),
        {
            name: "tour",
        }
    )
)
