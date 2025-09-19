import {create} from "zustand"

import {OidcProvider} from "../utils/types"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
interface UserInfoStore {
    currentUser: string | undefined
    setCurrentUser: (username: string) => void

    picture: string | undefined
    setPicture: (picture: string) => void

    oidcProvider: OidcProvider | undefined
    setOidcProvider: (oidcProvider: OidcProvider) => void
}

/**
 * The hook that lets apps use the store
 */
export const useUserInfoStore = create<UserInfoStore>((set) => ({
    currentUser: undefined,
    setCurrentUser: (username: string) => set(() => ({currentUser: username})),

    oidcProvider: undefined,
    setOidcProvider: (oidcProvider: OidcProvider) => set(() => ({oidcProvider})),

    picture: undefined,
    setPicture: (picture: string) => set(() => ({picture})),
}))
