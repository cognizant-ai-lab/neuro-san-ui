/**
 * Configuration settings for next-auth.
 *
 * See next-auth documentation for more information on these settings.
 */

import NextAuth from "next-auth"
import type {NextAuthConfig} from "next-auth"
import Auth0 from "next-auth/providers/auth0"

const config: NextAuthConfig = {
    providers: [
        Auth0({
            clientId: process.env["AUTH0_CLIENT_ID"],
            clientSecret: process.env["AUTH0_CLIENT_SECRET"],
            issuer: `https://${process.env["AUTH0_DOMAIN"]}`,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.nickname,
                    email: profile.email,
                    image: profile.picture,
                }
            },
        }),
    ],
    session: {strategy: "jwt"},
    theme: {
        colorScheme: "auto",
        brandColor: "0033a0",
        logo: "https://neuro-ai.evolution.ml/cognizantfavicon.ico",
    },
    debug: process.env.NODE_ENV === "development",
    trustHost: true,
}

const {handlers} = NextAuth(config)

// ts-prune-ignore-next
export const GET = handlers.GET

// ts-prune-ignore-next
export const POST = handlers.POST
