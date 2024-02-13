import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "antd/dist/reset.css"

import "bootstrap/dist/css/bootstrap.css"
import "reactflow/dist/style.css"
// Tailwind is a dev dependency but this file is a "production" source. Weird situation, so disable the rule
// eslint-disable-next-line import/no-extraneous-dependencies
import "tailwindcss/tailwind.css"

import "../styles/updatenode.css"
import "../styles/globals.css"
import "../styles/styles.css"

import debugModule from "debug"
import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {ReactElement, ReactFragment, useEffect} from "react"
import {Container} from "react-bootstrap"

import {Auth} from "../components/auth"
import ErrorBoundary from "../components/errorboundary"
import NeuroAIChatbot from "../components/internal/chatbot/neuro_ai_chatbot"
import Navbar from "../components/navbar"
import {GENERIC_LOGO, LOGO, MD_BASE_URL, MODEL_SERVING_VERSION} from "../const"
import useEnvironmentStore from "../state/environment"
import useFeaturesStore, {ModelServingVersion} from "../state/features"

const debug = debugModule("app")

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({Component, pageProps: {session, ...pageProps}}): ReactElement {
    const {isGeneric} = useFeaturesStore()
    const {setBackendApiUrl} = useEnvironmentStore()

    const {query, isReady, pathname} = useRouter()

    useEffect(() => {
        if (isReady) {
            let modelServingVersion: ModelServingVersion
            const queryStringSetting = query?.modelServingVersion
            if (queryStringSetting) {
                debug(`Setting model serving version from query string: ${queryStringSetting}`)
                modelServingVersion = queryStringSetting as ModelServingVersion
            } else {
                debug(`Setting model serving version from const: ${MODEL_SERVING_VERSION}`)
                modelServingVersion = MODEL_SERVING_VERSION as ModelServingVersion
            }

            // Set features in store
            const featureFlags = {
                isGeneric: "generic" in query,
                isDemoUser: "demo" in query,
                modelServingVersion: modelServingVersion,
            }

            debug(`Setting feature flags to ${JSON.stringify(featureFlags, null, 2)}`)
            useFeaturesStore.setState(featureFlags)
        }
    }, [isReady])

    useEffect(() => {
        async function getBackendApiUrl() {
            // Fetch URL for backend API. Since this gets saved in the zustand store, subsequent pages will not need
            // to fetch it again
            const res = await fetch("/api/environment", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })

            // If error, and no MD_BASE_URL to fall back on, throw error
            if (!res.ok && !MD_BASE_URL) {
                throw new Error(`Failed to fetch environment variables: ${res.status} ${res.statusText}`)
            }

            const data = await res.json()
            // If error, and no MD_BASE_URL to fall back on, throw error
            if (!data.backendApiUrl && !MD_BASE_URL) {
                throw new Error("No backend API URL found in response")
            }

            if (data.backendApiUrl) {
                // Cache backend API URL in feature store
                debug(`Received backend API URL from NodeJS server. Setting to ${data.backendApiUrl}`)
                setBackendApiUrl(data.backendApiUrl)
            }
        }

        void getBackendApiUrl()
    }, [])

    let body: JSX.Element | ReactFragment
    if (pathname === "/") {
        body = (
            <div id="body-div">
                <Component
                    id="body-component"
                    {...pageProps}
                />
            </div>
        )
    } else {
        body = (
            <>
                {/* 2/6/23 DEF - SessionProvider does not have an id property when compiling */}
                <SessionProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    session={session}
                >
                    <ErrorBoundary id="error_boundary">
                        <Navbar
                            id="nav-bar"
                            Logo={isGeneric ? GENERIC_LOGO : LOGO}
                            WithBreadcrumbs={Component.withBreadcrumbs ?? true}
                        />
                        <Container id="body-container">
                            {Component.authRequired ? (
                                <Auth // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - SessionProvider does not have an id property when compiling
                                >
                                    <Component
                                        id="body-auth-component"
                                        {...pageProps}
                                    />
                                </Auth>
                            ) : (
                                <Component
                                    id="body-non-auth-component"
                                    {...pageProps}
                                />
                            )}
                            <div
                                id="fixed-pos-div"
                                style={{position: "fixed", right: "20px", bottom: "0"}}
                            >
                                <NeuroAIChatbot
                                    id="chatbot"
                                    userAvatar={undefined}
                                    pageContext={Component.pageContext || ""}
                                />
                            </div>
                        </Container>
                    </ErrorBoundary>
                </SessionProvider>
            </>
        )
    }

    return (
        <div id="unileaf">
            {/* 2/6/23 DEF - Head does not have an id property when compiling */}
            <Head // eslint-disable-line enforce-ids-in-jsx/missing-ids
            >
                <title id="unileaf-title">Cognizant Neuro® AI</title>
                <meta
                    id="unileaf-description"
                    name="description"
                    content="Cognizant Neuro® AI"
                />
                <link
                    id="unileaf-link"
                    rel="icon"
                    href="/cognizantfavicon.ico"
                />
            </Head>
            {body}
        </div>
    )
}
