/**
 * Utility functions relating to authentication
 */

import { Session } from "next-auth"


/**
 * Helper method to determine if a user is signed in
 * @param session Session info (obtained from next-auth)
 * @param status Status info (obtained from react-auth)
 *
 * @return `true` if user is signed in (authenticated) with some provider, otherwise `false`
 */
export function isSignedIn(session: Session, status: string): boolean {
    const loading = status === "loading"

    // When rendering client side don't display anything until loading is complete
    if (typeof window !== 'undefined' && loading) return false

    // If no session exists, display access denied message
    return Boolean(session)
}