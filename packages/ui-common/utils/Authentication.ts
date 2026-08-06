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

// See main function comment for more details.

import {signOut, useSession} from "next-auth/react"

import {navigateToUrl} from "./BrowserNavigation"
import {OidcProvider} from "./types"
import {DEFAULT_USER_IMAGE, DEFAULT_USERNAME} from "../const"
import {useEnvironmentStore} from "../state/Environment"
import {useUserInfoStore} from "../state/UserInfo"

/**
 * The Azure AD tenant ID.
 */
export const AD_TENANT_ID = "de08c407-19b9-427d-9fe8-edf254300ca7"

/**
 * Hook for abstracting away the authentication provider. We are migrating to ALB-based authentication, instead of it
 * being handled by the app via NextAuth. This way existing pages only need trivial changes to use this hook instead
 * of NextAuth's useSession hook.
 */
export const useAuthentication = () => {
    const enableAuthentication = useEnvironmentStore((state) => state.enableAuthentication)

    if (enableAuthentication === undefined) {
        throw new Error("useAuthentication called before authentication mode was loaded")
    }

    if (!enableAuthentication) {
        // Auth disabled: return a stub
        return {data: {user: {name: DEFAULT_USERNAME, image: DEFAULT_USER_IMAGE}}}
    }

    // Auth mode is runtime configuration, not a build-time constant.
    // This hook relies on the app shell gating render until enableAuthentication is known.
    // Components that can remain mounted while enableAuthentication changes must not use this hook.

    /* eslint-disable react-hooks/rules-of-hooks */
    const {data: session} = useSession()
    const {currentUser: albUser, picture: albPicture} = useUserInfoStore()
    /* eslint-enable react-hooks/rules-of-hooks */
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
const createAuth0LogoutUrl = (oidcProvider: OidcProvider, auth0Domain: string, auth0ClientId: string) => {
    switch (oidcProvider) {
        case "AD":
            return `https://login.microsoftonline.com/${AD_TENANT_ID}/oauth2/v2.0/logout`

        case "Github":
        case "NextAuth":
        case "None":
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
 * handles the sign-out process for both NextAuth and ALB.
 * @param currentUser The username of the current user. If undefined, we don't know what authentication provider we're
 * using, so just return. If null, we're using NextAuth. Otherwise, we're using ALB.
 * @param auth0Domain The Auth0 domain. See Auth0 doc for more details.
 * @param auth0ClientId The Auth0 client ID. See Auth0 doc for more details. Identifies the app being used in Auth0.
 * @param oidcProvider The OIDC provider. See OIDC doc for more details.
 * @return Nothing, but executes the sign-out process.
 *
 */
export const smartSignOut = async (
    currentUser: string,
    auth0Domain: string,
    auth0ClientId: string,
    oidcProvider: OidcProvider
) => {
    const enableAuthentication = useEnvironmentStore.getState().enableAuthentication

    if (currentUser === undefined || !enableAuthentication) {
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

        navigateToUrl(createAuth0LogoutUrl(oidcProvider, auth0Domain, auth0ClientId))
    }
}

/**
 * Infer authentication type
 * @param enableAuthentication Flag indicating whether authentication is enabled or not
 * @param currentUser The current user, if any.
 * @param oidcProvider Type of OIDC provider, if there is one.
 */
export const getAuthenticationType = (
    enableAuthentication: boolean,
    currentUser: string,
    oidcProvider: OidcProvider
) => (enableAuthentication ? (currentUser ? `ALB using ${oidcProvider}` : "NextAuth") : "None")
