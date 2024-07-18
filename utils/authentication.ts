// See main function comment for more details.

import {signOut, useSession} from "next-auth/react"

import useUserInfoStore from "../state/userInfo"

const AUTH0_DOMAIN = "cognizant-ai.auth0.com"
const CLIENT_ID = "MKuUdcFmgAqwD9qGemVSQHJBLxui7juf"

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
 * @param returnTo The URL to return to after logging out.
 */
function createAuth0LogoutUrl(returnTo: string) {
    return `https://${AUTH0_DOMAIN}/v2/logout?client_id=${CLIENT_ID}&returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * Smart sign out function that abstracts away the authentication provider.
 * We are migrating to ALB-based authentication, instead of it being handled by the app via NextAuth. This function
 * handles the sign out process for both NextAuth and ALB.
 * @param currentUser The username of the current user. If undefined, we don't know what authentication provider we're
 * using, so just return. If null, we're using NextAuth. Otherwise, we're using ALB.
 * @return Nothing, but executes the sign out process.
 *
 */
export async function smartSignOut(currentUser: string) {
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

        const logoutUrl = createAuth0LogoutUrl("https://uitest.evolution.ml")
        console.debug("Logging out with URL:", logoutUrl)
        window.location.href = logoutUrl
    } else {
        // NextAuth case
        await signOut({redirect: false})
    }
}
