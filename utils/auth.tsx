/**
 * Utility functions relating to authentication
 */

import React from "react";
import {signIn, useSession} from "next-auth/react";
import { Session } from "next-auth"
import {ENABLE_AUTHENTICATION} from "../const";

/**
 * Helper method to determine if a user is signed in
 * @param session Session info (obtained from next-auth)
 * @param status Status info (obtained from react-auth)
 *
 * @return `true` if user is signed in (authenticated) with some provider, otherwise `false`
 */
export function isSignedIn(session: Session, status: string): boolean {
    // If authentication is disabled, pretend user is signed in
    if (!ENABLE_AUTHENTICATION) {
        return true
    }

    const loading = status === "loading"

    // When rendering client side don't display anything until loading is complete
    if (typeof window !== 'undefined' && loading) return false

    // If no session exists, display access denied message
    return Boolean(session)
}

/**
 * Higher-level component to wrap pages that require authentication.
 *
 * Taken from here: https://github.com/nextauthjs/next-auth/issues/1210#issuecomment-782630909
 *
 * @param children Contained components protected by the authentication guard
 * @return children (protected) components if user is authenticated, otherwise "Loading" message.
 */
export function Auth({ children }) {
    const { data: session, status } = useSession()

    const isUser = !!session?.user
    const loading = status === "loading"

    React.useEffect(() => {
        if (loading) return // Do nothing while loading
        if (!isUser) signIn() // If not authenticated, force log in
    }, [isUser, loading])

    if (isUser) {
        return children
    }

    // Session is being fetched, or no user.
    // If no user, useEffect() will redirect.
    return <div>Loading session...</div>
}
