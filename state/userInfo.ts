import {create} from "zustand"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface UserInfoStore {
    currentUser: string | undefined
    setCurrentUser: (username: string) => void

    picture: string | undefined
    setPicture: (picture: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useUserInfoStore = create<UserInfoStore>((set) => ({
    currentUser: undefined,
    setCurrentUser: (username: string) => set(() => ({currentUser: username})),

    picture: undefined,
    setPicture: (picture: string) => set(() => ({picture: picture})),
}))

export default useUserInfoStore
