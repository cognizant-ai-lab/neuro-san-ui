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
            profile: (profile) => ({
                id: profile.sub,
                name: profile.nickname,
                email: profile.email,
                image: profile.picture,
            }),
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

export const GET = handlers.GET

export const POST = handlers.POST
