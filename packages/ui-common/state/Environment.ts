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

/**
 * Zustand state store for "environment settings", like the backend API URL
 *
 */
import {create} from "zustand"

/**
 * State store interface
 */
interface EnvironmentStore {
    // URL for NeuroSan API calls. Retrieved from Node.js backend by first page visited
    backendNeuroSanApiUrl: string
    setBackendNeuroSanApiUrl: (backendNeuroSanApiUrl: string) => void

    // Auth0 client ID
    auth0ClientId: string
    setAuth0ClientId: (auth0ClientId: string) => void

    // Auth0 domain
    auth0Domain: string
    setAuth0Domain: (auth0Domain: string) => void

    // team support email address
    supportEmailAddress: string
    setSupportEmailAddress: (supportEmailAddress: string) => void

    // Dev.logo token
    logoDevToken: string
    setLogoDevToken: (devLogoToken: string) => void
}

/**
 * The hook that lets apps use the store
 */
export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
    backendNeuroSanApiUrl: null,
    setBackendNeuroSanApiUrl: (backendNeuroSanApiUrl: string) => set(() => ({backendNeuroSanApiUrl})),

    auth0ClientId: null,
    setAuth0ClientId: (auth0ClientId: string) => set(() => ({auth0ClientId})),

    auth0Domain: null,
    setAuth0Domain: (auth0Domain: string) => set(() => ({auth0Domain})),

    supportEmailAddress: null,
    setSupportEmailAddress: (supportEmailAddress: string) => set(() => ({supportEmailAddress})),

    logoDevToken: null,
    setLogoDevToken: (logoDevToken: string) => set(() => ({logoDevToken})),
}))
