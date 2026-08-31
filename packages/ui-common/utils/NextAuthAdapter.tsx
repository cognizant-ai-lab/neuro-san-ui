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
 * next-auth binding for the session adapter. This is the only module in the package that imports next-auth, and it
 * is deliberately not reachable from the package entry point, so consumers who do not use next-auth never need it
 * installed.
 */

import {SessionProvider, signIn, signOut, useSession} from "next-auth/react"
import {ReactNode} from "react"

import {setSessionAdapter} from "./SessionAdapter"

/**
 * Points the package at next-auth for session information.
 *
 * Prefer {@link NextAuthSessionProvider}, which calls this for you. Call this directly only if your app renders
 * next-auth's own `SessionProvider`, and call it at module scope: swapping adapters between renders changes which
 * hooks run.
 */
export const registerNextAuthSession = (): void => {
    setSessionAdapter({
        useSession: () => useSession(),
        useSessionStatus: () => useSession().status,
        signIn,
        signOut: (options) => (options?.redirect === false ? signOut({redirect: false}) : signOut({redirect: true})),
    })
}

registerNextAuthSession()

interface NextAuthSessionProviderProps {
    readonly children: ReactNode
}

/**
 * Drop-in replacement for next-auth's `SessionProvider` that also points this package's components at next-auth.
 * Use it anywhere you would have used `SessionProvider`, and the components in this package will pick up the
 * signed-in user.
 *
 * @param children The application tree that should have access to the session
 */
export const NextAuthSessionProvider = ({children}: NextAuthSessionProviderProps) => (
    <SessionProvider>{children}</SessionProvider>
)
