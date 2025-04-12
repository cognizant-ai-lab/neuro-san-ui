/**
 * Utility functions relating to authentication
 */

import {signIn, useSession} from "next-auth/react"
import {useEffect} from "react"

import {PageLoader} from "../Common/pageLoader"

// Use this provider for authentication via next-auth. It *must* correspond to one of those listed in
// ./pages/api/auth/[...nextauth].js
const AUTHENTICATION_PROVIDER = "auth0"

/**
 * Higher-level component to wrap pages that require authentication.
 *
 * Taken from here: https://github.com/nextauthjs/next-auth/issues/1210#issuecomment-782630909
 *
 * @param children Contained components protected by the authentication guard
 * @return children (protected) components if user is authenticated, otherwise "Loading" message.
 */
export function Auth({children}) {
    // Suppress no-shadow rule -- we have to use what the API gives us
    // eslint-disable-next-line no-shadow
    const {data: session, status} = useSession()

    const isUser = Boolean(session?.user)
    const loading = status === "loading"

    useEffect(() => {
        if (loading) {
            // Do nothing while loading
            return
        }

        // If not authenticated, force log in.
        // By explicitly specifying the provider here, it skips the annoying and unnecessary next-auth interstitial
        // screen and goes straight to the login screen of AUTHENTICATION_PROVIDER.
        if (!isUser) {
            signIn(AUTHENTICATION_PROVIDER)
        }
    }, [isUser, loading])

    if (isUser && !loading) {
        return children
    }

    // Session is being fetched, or no user.
    // If no user, useEffect() will redirect.
    return <PageLoader id="authentication-page" />
}
