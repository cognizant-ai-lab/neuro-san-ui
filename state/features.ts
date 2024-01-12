import {create} from "zustand"

interface FeaturesStore {
    isDemoUser: boolean
    setIsDemoUser: (isDemo: boolean) => void

    isGeneric: boolean
    setIsGeneric: (isGeneric: boolean) => void
}

const useFeaturesStore = create<FeaturesStore>((set) => ({
    isDemoUser: false,
    setIsDemoUser: (isDemoUser) => set(() => ({isDemoUser: isDemoUser})),
    isGeneric: false,
    setIsGeneric: (isGeneric) => set(() => ({isGeneric: isGeneric})),
}))

export default useFeaturesStore
