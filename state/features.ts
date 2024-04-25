import {create} from "zustand"

// Currently support two mod
export type ModelServingVersion = "old" | "new"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface FeaturesStore {
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
    isGeneric: null,
    setIsGeneric: (isGeneric) => set(() => ({isGeneric: isGeneric})),
    modelServingVersion: null,
    setModelServingVersion: (modelServingVersion: ModelServingVersion) =>
        set(() => ({modelServingVersion: modelServingVersion})),
}))

export default useFeaturesStore
