/**
 * Configuration settings for next-auth.
 *
 * See next-auth documentation for more information on these settings.
 */

import NextAuth from "next-auth"
import Auth0Provider from "next-auth/providers/auth0"

// Needs to be exported for next-auth to use it
// ts-prune-ignore-next
export default NextAuth({
    // Configure one or more authentication providers
    providers: [
        Auth0Provider({
            clientId: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET,
            issuer: process.env.AUTH0_ISSUER,
            // See discussion here regarding next line: https://github.com/nextauthjs/next-auth/issues/638
            authorization: `https://${process.env.AUTH0_DOMAIN}/authorize?response_type=code&prompt=login`,
        }),
        // ...add more providers here
    ],

    session: {
        // Use JSON Web Tokens for session instead of database sessions.
        strategy: "jwt",
    },

    theme: {
        colorScheme: "auto", // "auto" | "dark" | "light"
        brandColor: "0033a0", // Hex color value
        logo: "http://unileaf.evolution.ml/leaffavicon.png", // Absolute URL to logo image
    },

    // Set this to "true" for verbose debugging messages from next-auth
    debug: false,
})
