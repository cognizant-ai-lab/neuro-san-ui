/**
 * Zustand state store for "environment settings", like the backend API URL
 *
 */
import debugModule from "debug"
import {create} from "zustand"

import {MD_BASE_URL} from "../const"

const debug = debugModule("environment")

/**
 * State store interface
 */
interface EnvironmentStore {
    // URL for backend API calls. Retrieved from NodeJS backend by first page visited
    backendApiUrl: string
    setBackendApiUrl: (backendApiUrl: string) => void
}

/**
 * The hook that lets apps use the store
 */
const useEnvironmentStore = create<EnvironmentStore>((set) => ({
    backendApiUrl: null,
    setBackendApiUrl: (backendApiUrl: string) => set(() => ({backendApiUrl: backendApiUrl})),
}))

/**
 * Get the backend API URL from the state. For migration purposes, if the state is not set, use the environment
 * variable like before.
 */
export function getBaseUrl() {
    const backendApiUrl = useEnvironmentStore.getState().backendApiUrl
    debug(
        backendApiUrl
            ? `Using NodeJS backend API URL: ${backendApiUrl}`
            : `Falling back to environment variable: ${MD_BASE_URL}`
    )
    return backendApiUrl || MD_BASE_URL
}

export default useEnvironmentStore
