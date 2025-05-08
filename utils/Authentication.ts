// See main function comment for more details.

import {signOut, useSession} from "next-auth/react"

import {OidcProvider} from "../pages/api/userInfo/types"
import useUserInfoStore from "../state/UserInfo"

/**
 * The Azure AD tenant ID.
 */
export const AD_TENANT_ID = "de08c407-19b9-427d-9fe8-edf254300ca7"

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
 * @param oidcProvider The OIDC provider. See OIDC doc for more details.
 * @param auth0Domain The Auth0 domain. See Auth0 doc for more details.
 * @param auth0ClientId The Auth0 client ID. See Auth0 doc for more details. Identifies the app being used in Auth0.
 * @return The logout URL.
 */
function createAuth0LogoutUrl(oidcProvider: OidcProvider, auth0Domain: string, auth0ClientId: string) {
    switch (oidcProvider) {
        case "AD":
            return `https://login.microsoftonline.com/${AD_TENANT_ID}/oauth2/v2.0/logout`

        case "Github":
        default: {
            const baseUrl = `${window.location.protocol}//${window.location.host}`
            const returnTo = encodeURIComponent(baseUrl)
            return `https://${auth0Domain}/v2/logout?client_id=${auth0ClientId}&returnTo=${returnTo}`
        }
    }
}

/**
 * Smart sign out function that abstracts away the authentication provider.
 * We are migrating to ALB-based authentication, instead of it being handled by the app via NextAuth. This function
 * handles the sign out process for both NextAuth and ALB.
 * @param currentUser The username of the current user. If undefined, we don't know what authentication provider we're
 * using, so just return. If null, we're using NextAuth. Otherwise, we're using ALB.
 * @param auth0Domain The Auth0 domain. See Auth0 doc for more details.
 * @param auth0ClientId The Auth0 client ID. See Auth0 doc for more details. Identifies the app being used in Auth0.
 * @param oidcProvider The OIDC provider. See OIDC doc for more details.
 * @return Nothing, but executes the sign out process.
 *
 */
export async function smartSignOut(
    currentUser: string,
    auth0Domain: string,
    auth0ClientId: string,
    oidcProvider: OidcProvider
) {
    if (currentUser === undefined) {
        // Don't know what authentication provider we're using, so just return
        return
    }

    if (oidcProvider === "NextAuth") {
        // NextAuth case
        await signOut({redirect: true})
    } else {
        // ALB case

        // Use server endpoint to clear ALB cookies
        void (await fetch("/api/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }))

        window.location.href = createAuth0LogoutUrl(oidcProvider, auth0Domain, auth0ClientId)
    }
}
