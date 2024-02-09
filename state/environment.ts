/**
 * Zustand state store for "environment settings", like the backend API URL
 *
 */
import {create} from "zustand"

import {MD_BASE_URL} from "../const"

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
    return useEnvironmentStore.getState().backendApiUrl || MD_BASE_URL
}

export default useEnvironmentStore
