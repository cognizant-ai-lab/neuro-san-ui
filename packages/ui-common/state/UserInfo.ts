/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {create} from "zustand"

import {OidcProvider} from "../utils/types"

/**
 * Zustand state store for "feature flags" like, "generic branding".
 */
export interface UserInfoStore {
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
