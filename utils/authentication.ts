// See main function comment for more details.

import {signOut, useSession} from "next-auth/react"

import useUserInfoStore from "../state/userInfo"

/**
 * Hook for abstracting away the authentication provider. We are migrating to ALB-based authentication, instead of it
 * being handled by the app via NextAuth. This way existing pages only need trivial changes to use this hook instead
 * of NextAuth's useSession hook.
 */
export function useAuthentication() {
    const {data: session} = useSession()
    const {currentUser: albUser, picture: albPicture} = useUserInfoStore()

    // Return the user data in the same format as NextAuth's useSession hook. We prioritize the ALB info if we have
    // it, but if not degrade gracefully to the NextAuth info.
    return {
        data: {
            user: {
                name: albUser || session?.user?.name,
                image: albPicture || session?.user?.image,
            },
        },
    }
}

/**
 * Create the logout URL for Auth0.
 * @param auth0Domain The Auth0 domain. See Auth0 doc for more details.
 * @param auth0ClientId The Auth0 client ID. See Auth0 doc for more details. Identifies the app being used in Auth0.
 * @return The logout URL.
 */
function createAuth0LogoutUrl(auth0Domain: string, auth0ClientId: string) {
    const baseUrl = `${window.location.protocol}//${window.location.host}`
    const returnTo = encodeURIComponent(baseUrl)
    return `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${returnTo}`
}

/**
 * Smart sign out function that abstracts away the authentication provider.
 * We are migrating to ALB-based authentication, instead of it being handled by the app via NextAuth. This function
 * handles the sign out process for both NextAuth and ALB.
 * @param currentUser The username of the current user. If undefined, we don't know what authentication provider we're
 * using, so just return. If null, we're using NextAuth. Otherwise, we're using ALB.
 * @param auth0Domain The Auth0 domain. See Auth0 doc for more details.
 * @param auth0ClientId The Auth0 client ID. See Auth0 doc for more details. Identifies the app being used in Auth0.
 * @return Nothing, but executes the sign out process.
 *
 */
export async function smartSignOut(currentUser: string, auth0Domain: string, auth0ClientId: string) {
    if (currentUser === undefined) {
        // Don't know what authentication provider we're using, so just return
        return
    }

    if (currentUser !== null) {
        // ALB case

        // Use server endpoint to clear ALB cookies
        void (await fetch("/api/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }))

        window.location.href = createAuth0LogoutUrl(auth0Domain, auth0ClientId)
    } else {
        // NextAuth case
        await signOut({redirect: true})
    }
}
