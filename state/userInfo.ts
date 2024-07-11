import {create} from "zustand"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface UserInfoStore {
    currentUser: string
    setCurrentUser: (username: string) => void

    picture: string
    setPicture: (picture: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useUserInfoStore = create<UserInfoStore>((set) => ({
    currentUser: null,
    setCurrentUser: (username: string) => set(() => ({currentUser: username})),

    picture: null,
    setPicture: (picture: string) => set(() => ({picture: picture})),
}))

export default useUserInfoStore
