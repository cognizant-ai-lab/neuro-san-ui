// See main function comment for more details.

import {useSession} from "next-auth/react"

import useUserInfoStore from "../state/userInfo"

/**
 * Hook for abstracting away the authentication provider. We are migrating to ALB-based authentication, instead of it
 * being handled by the app via NextAuth. This way existing pages only need trivial changes to use this hook instead
 * of NextAuth's useSession hook.
 */
export function useAuthentication() {
    // eslint-disable-next-line no-shadow
    const {data: session, status} = useSession()
    const {currentUser: albUser, picture: albPicture} = useUserInfoStore()

    console.debug(
        `useAuthentication: session=${JSON.stringify(session)}, status=${status}, albUser=${albUser}, ` +
            `albPicture=${albPicture}`
    )

    // Return the user data in the same format as NextAuth's useSession hook. We prioritize the ALB info if we have
    // it, but if not degrade gracefully to the NextAuth info.
    return {
        data: {
            user: {
                name: albUser || session?.user?.name,
                image: albPicture || session?.user?.image,
            },
        },
        status,
    }
}
