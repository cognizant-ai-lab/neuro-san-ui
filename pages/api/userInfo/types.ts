/**
 * Types for userInfo API
 */

export type UserInfoResponse = {
    readonly username?: string
    readonly picture?: string
    readonly oidcHeaderFound: boolean
    readonly oidcProvider?: string
}
