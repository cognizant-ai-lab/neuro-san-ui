import {create} from "zustand"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface FeaturesStore {
    // Generic branding for the entire app, if Cognizant branding is not desired
    isGeneric: boolean
    setIsGeneric: (isGeneric: boolean) => void

    // Whether to allow Project Sharing
    enableProjectSharing: boolean
    setEnableProjectSharing: (enableProjectSharing: boolean) => void
}

/**
 * The hook that lets apps use the store
 */
const useFeaturesStore = create<FeaturesStore>((set) => ({
    isGeneric: null,
    setIsGeneric: (isGeneric) => set(() => ({isGeneric: isGeneric})),

    enableProjectSharing: null,
    setEnableProjectSharing: (enableProjectSharing) => set(() => ({enableProjectSharing: enableProjectSharing})),
}))

export default useFeaturesStore
