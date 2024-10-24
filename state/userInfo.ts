import {create} from "zustand"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface UserInfoStore {
    currentUser: string | undefined
    setCurrentUser: (username: string) => void

    picture: string | undefined
    setPicture: (picture: string) => void

    oidcProvider: string | undefined
    setOidcProvider: (oidcProvider: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useUserInfoStore = create<UserInfoStore>((set) => ({
    currentUser: undefined,
    setCurrentUser: (username: string) => set(() => ({currentUser: username})),

    oidcProvider: undefined,
    setOidcProvider: (oidcProvider: string) => set(() => ({oidcProvider: oidcProvider})),

    picture: undefined,
    setPicture: (picture: string) => set(() => ({picture: picture})),
}))

export default useUserInfoStore
