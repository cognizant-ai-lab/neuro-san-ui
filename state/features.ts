/**
 * Zustand state store for "feature flags" like "demo mode", "generic branding".
 *
 */
import {create} from "zustand"

// Currently support two mod
export type ModelServingVersion = "old" | "new"

/**
 * Zustand state store for "feature flags" like "demo mode", "generic branding".
 */
interface FeaturesStore {
    // Demo users have access to in-development or incomplete features
    isDemoUser: boolean
    setIsDemoUser: (isDemo: boolean) => void

    // Generic branding for the entire app, if Cognizant branding is not desired
    isGeneric: boolean
    setIsGeneric: (isGeneric: boolean) => void

    // Whether to use next gen model serving
    modelServingVersion: ModelServingVersion
    setModelServingVersion: (modelServingVersion: ModelServingVersion) => void
}

/**
 * The hook that lets apps use the store
 */
const useFeaturesStore = create<FeaturesStore>((set) => ({
    isDemoUser: false,
    setIsDemoUser: (isDemoUser) => set(() => ({isDemoUser: isDemoUser})),
    isGeneric: false,
    setIsGeneric: (isGeneric) => set(() => ({isGeneric: isGeneric})),
    modelServingVersion: "old",
    setModelServingVersion: (modelServingVersion: ModelServingVersion) =>
        set(() => ({modelServingVersion: modelServingVersion})),
}))

export default useFeaturesStore
