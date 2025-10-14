/**
 * Types for userInfo API
 */

/**
 * The OIDC provider types we know about
 */
export type OidcProvider = "Github" | "AD" | "NextAuth" | "None"

/**
 * Response from the userInfo API
 */
export type UserInfoResponse = {
    readonly username?: string
    readonly picture?: string
    readonly oidcHeaderFound: boolean
    readonly oidcHeaderValid?: boolean
    readonly oidcProvider?: OidcProvider
}
