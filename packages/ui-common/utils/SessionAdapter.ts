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
 * Indirection over the session provider, so that nothing reachable from the package entry point statically imports
 * `next-auth`. Apps that use next-auth register the real implementation via `registerNextAuthSession` in
 * `./NextAuthAdapter`; apps that do not get the inert default below and never need next-auth installed.
 */

export type SessionStatus = "loading" | "authenticated" | "unauthenticated"

export interface SessionUser {
    readonly name?: string | null
    readonly image?: string | null
}

export interface Session {
    readonly data?: {readonly user?: SessionUser} | null
}

export interface SessionAdapter {
    /**
     * Must obey the rules of hooks: it is called unconditionally on every render of the components that use it.
     */
    readonly useSession: () => Session

    readonly useSessionStatus: () => SessionStatus

    readonly signIn: (provider?: string) => unknown

    readonly signOut: (options?: {redirect?: boolean}) => unknown
}

const NO_SESSION: Session = {data: undefined}

const NOT_REGISTERED_MESSAGE =
    "No session adapter is registered, so this package cannot sign the user in or out. If your app uses " +
    "next-auth, render `NextAuthSessionProvider` from " +
    '"@cognizant-ai-lab/ui-common/utils/NextAuthAdapter" in place of next-auth\'s own `SessionProvider`. ' +
    "Otherwise register your own adapter with `setSessionAdapter`."

/**
 * Reporting no session lets apps that have no login at all render normally, but signing in or out with no adapter
 * cannot work, so those fail loudly rather than appearing to succeed.
 */
const defaultAdapter: SessionAdapter = {
    useSession: () => NO_SESSION,
    useSessionStatus: () => "unauthenticated",
    signIn: () => {
        throw new Error(NOT_REGISTERED_MESSAGE)
    },
    signOut: () => {
        throw new Error(NOT_REGISTERED_MESSAGE)
    },
}

let currentAdapter: SessionAdapter = defaultAdapter

/**
 * Registers the session implementation. Call this once during module initialisation, before the first render:
 * swapping adapters between renders changes which hooks run and will break the rules of hooks.
 *
 * @param adapter The implementation to use for the lifetime of the app
 */
export const setSessionAdapter = (adapter: SessionAdapter): void => {
    currentAdapter = adapter
}

/**
 * @returns The registered session implementation, or the default if none was registered
 */
export const getSessionAdapter = (): SessionAdapter => currentAdapter

/**
 * Restores the default adapter. Intended for tests.
 */
export const resetSessionAdapter = (): void => {
    currentAdapter = defaultAdapter
}
