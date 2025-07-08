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

    // URL for NeuroSan API calls. Retrieved from NodeJS backend by first page visited
    backendNeuroSanApiUrl: string
    setBackendNeuroSanApiUrl: (backendNeuroSanApiUrl: string) => void

    // URL for neuro-san Opportunity Finder agent
    unileafAgentServerUrl?: string
    setUnileafAgentServerUrl: (unileafAgentServerUrl: string) => void

    // Auth0 client ID
    auth0ClientId: string
    setAuth0ClientId: (auth0ClientId: string) => void

    // Auth0 domain
    auth0Domain: string
    setAuth0Domain: (auth0Domain: string) => void

    // enableAuthorizeAPI flag
    enableAuthorizeAPI: boolean
    setEnableAuthorizeAPI: (useAuthorizeAPI: boolean) => void

    // team support email address
    supportEmailAddress: string
    setSupportEmailAddress: (supportEmailAddress: string) => void

    // Build target
    buildTarget: string
    setBuildTarget: (buildTarget: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useEnvironmentStore = create<EnvironmentStore>((set) => ({
    backendApiUrl: null,
    setBackendApiUrl: (backendApiUrl: string) => set(() => ({backendApiUrl})),

    backendNeuroSanApiUrl: null,
    setBackendNeuroSanApiUrl: (backendNeuroSanApiUrl: string) => set(() => ({backendNeuroSanApiUrl})),

    unileafAgentServerUrl: null,
    setUnileafAgentServerUrl: (unileafAgentServerUrl: string) => set(() => ({unileafAgentServerUrl})),

    auth0ClientId: null,
    setAuth0ClientId: (auth0ClientId: string) => set(() => ({auth0ClientId})),

    auth0Domain: null,
    setAuth0Domain: (auth0Domain: string) => set(() => ({auth0Domain})),

    enableAuthorizeAPI: false,
    setEnableAuthorizeAPI: (enableAuthorizeAPI: boolean) => set(() => ({enableAuthorizeAPI})),

    supportEmailAddress: null,
    setSupportEmailAddress: (supportEmailAddress: string) => set(() => ({supportEmailAddress})),

    buildTarget: null,
    setBuildTarget: (buildTarget: string) => set(() => ({buildTarget})),
}))

export default useEnvironmentStore
