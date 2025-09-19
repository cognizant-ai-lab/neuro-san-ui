/**
 * Zustand state store for "environment settings", like the backend API URL
 *
 */
import {create} from "zustand"

/**
 * State store interface
 */
interface EnvironmentStore {
    // URL for NeuroSan API calls. Retrieved from NodeJS backend by first page visited
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
}))
