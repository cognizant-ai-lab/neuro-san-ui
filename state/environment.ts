/**
 * Zustand state store for "environment settings", like the backend API URL
 *
 */
import {create} from "zustand"

/**
 * State store interface
 */
interface EnvironmentStore {
    // URL for backend API calls. Retrieved from NodeJS backend by first page visited
    backendApiUrl: string
    setBackendApiUrl: (backendApiUrl: string) => void

    // Auth0 client ID
    auth0ClientId: string
    setAuth0ClientId: (auth0ClientId: string) => void

    // Auth0 domain
    auth0Domain: string
    setAuth0Domain: (auth0Domain: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useEnvironmentStore = create<EnvironmentStore>((set) => ({
    backendApiUrl: null,
    setBackendApiUrl: (backendApiUrl: string) => set(() => ({backendApiUrl: backendApiUrl})),

    auth0ClientId: null,
    setAuth0ClientId: (auth0ClientId: string) => set(() => ({auth0ClientId: auth0ClientId})),

    auth0Domain: null,
    setAuth0Domain: (auth0Domain: string) => set(() => ({auth0Domain: auth0Domain})),
}))

export default useEnvironmentStore
