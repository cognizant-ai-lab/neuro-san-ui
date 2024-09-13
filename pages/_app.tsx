import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "antd/dist/reset.css"

import "bootstrap/dist/css/bootstrap.css"
import "reactflow/dist/style.css"

import "react-bootstrap-typeahead/css/Typeahead.css"
import "react-bootstrap-typeahead/css/Typeahead.bs5.css"

// Tailwind is a dev dependency but this file is a "production" source. Weird situation, so disable the rule
// eslint-disable-next-line import/no-extraneous-dependencies
import "tailwindcss/tailwind.css"

import "../styles/updatenode.css"
import "../styles/globals.css"
import "../styles/llmDropdown.css"
import "../styles/splashpage.css"
import "../styles/styles.css"
import "../styles/opportunityFinder.css"

import debugModule from "debug"
import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {ReactElement, ReactFragment, useEffect} from "react"
import {Container} from "react-bootstrap"
import ClipLoader from "react-spinners/ClipLoader"

import {UserInfoResponse} from "./api/userInfo/types"
import {Auth} from "../components/auth"
import ErrorBoundary from "../components/errorboundary"
import NeuroAIChatbot from "../components/internal/chatbot/neuro_ai_chatbot"
import Navbar from "../components/navbar"
import {GENERIC_LOGO, LOGO, MaximumBlue} from "../const"
import useEnvironmentStore from "../state/environment"
import useFeaturesStore from "../state/features"
import useUserInfoStore from "../state/userInfo"

const debug = debugModule("app")

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({Component, pageProps: {session, ...pageProps}}): ReactElement {
    const {isGeneric, setEnableProjectSharing} = useFeaturesStore()
    const {backendApiUrl, setBackendApiUrl, setAuth0ClientId, setAuth0Domain, setEnableAuthorizeAPI} =
        useEnvironmentStore()

    // access user info store
    const {currentUser, setCurrentUser, picture, setPicture} = useUserInfoStore()

    const {query, isReady, pathname} = useRouter()

    useEffect(() => {
        if (isReady) {
            // Set features in store
            const featureFlags = {
                isGeneric: "generic" in query,
            }

            debug(`Setting feature flags to ${JSON.stringify(featureFlags, null, 2)}`)
            useFeaturesStore.setState(featureFlags)
        }
    }, [isReady])

    useEffect(() => {
        async function getEnvironment() {
            // Fetch environment settings.
            // Save these in the zustand store so that subsequent pages will not need to fetch them again
            const res = await fetch("/api/environment", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })

            // Check result
            if (!res.ok) {
                throw new Error(`Failed to fetch environment variables: ${res.status} ${res.statusText}`)
            }

            const data = await res.json()

            // Make sure we got the backend API URL
            if (!data.backendApiUrl) {
                throw new Error("No backend API URL found in response")
            } else {
                // Cache backend API URL in feature store
                debug(`Received backend API URL from NodeJS server. Setting to ${data.backendApiUrl}`)
                setBackendApiUrl(data.backendApiUrl)
            }

            // Make sure we got the auth0 client ID
            if (!data.auth0ClientId) {
                throw new Error("No Auth0 client ID found in response")
            } else {
                // Cache auth0 client ID in feature store
                debug(`Received Auth0 client ID from NodeJS server. Setting to ${data.auth0ClientId}`)
                setAuth0ClientId(data.auth0ClientId)
            }

            // Make sure we got the auth0 domain
            if (!data.auth0Domain) {
                throw new Error("No Auth0 domain found in response")
            } else {
                // Cache auth0 domain in feature store
                debug(`Received Auth0 domain from NodeJS server. Setting to ${data.auth0Domain}`)
                setAuth0Domain(data.auth0Domain)
            }

            // get enableAuthorizeAPI flag
            setEnableAuthorizeAPI(data.enableAuthorizeAPI)

            // Set project sharing enabled flag
            const enableProjectSharing = data.enableProjectSharing
            setEnableProjectSharing(enableProjectSharing || false)
        }

        void getEnvironment()
    }, [])

    useEffect(() => {
        async function getUserInfo() {
            debug("Fetching user info from ALB")
            const res = await fetch("/api/userInfo", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })

            // Check result
            if (!res.ok) {
                // This is bad: it means we saw the ALB header but it's not in the right format so we're stuck
                debug("Failed to fetch user info")
                throw new Error(`Failed to fetch user info: ${res.status} ${res.statusText}`)
            }

            const response: UserInfoResponse = await res.json()

            // Make sure we got the user info
            if (response.oidcHeaderFound) {
                // Save user info from ALB
                setCurrentUser(response.username)
                setPicture(response.picture)
            } else {
                // Indicate that we didn't get the user info from the ALB
                setCurrentUser(null)
                setPicture(null)
            }
        }

        void getUserInfo()
    }, [])

    let body: JSX.Element | ReactFragment

    function getLoadingSpinner() {
        return (
            <h3 id="loading-header">
                <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    color={MaximumBlue}
                    loading={true}
                    size={35}
                />
                <span
                    id="main-page-loading-span"
                    style={{marginLeft: "1em"}}
                >
                    Loading...
                </span>
            </h3>
        )
    }

    /**
     * Gets the outer container of the app.
     * This is a transition function to allow a smooth migration to ALB authentication. For now, this function
     * switches between the NextAuth and ALB authentication cases. If we retrieved the ALB authentication headers,
     * we use that path. Otherwise, we use NextAuth.
     *
     * @returns The outer container of the app
     */
    function getAppContainer() {
        // Haven't figured out whether we have ALB headers yet
        if (picture === undefined || !backendApiUrl) {
            debug("Rendering loading spinner")
            return getLoadingSpinner()
        }

        if (picture != null) {
            // We got the ALB headers
            debug("Rendering ALB authentication case")

            return backendApiUrl && currentUser ? (
                <Component
                    id="body-non-auth-component"
                    {...pageProps}
                />
            ) : (
                getLoadingSpinner()
            )
        } else {
            debug("Rendering NextAuth authentication case")

            return Component.authRequired ? (
                <Auth // eslint-disable-line enforce-ids-in-jsx/missing-ids
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
            )
        }
    }

    if (pathname === "/") {
        // Main page is special
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
            // Note: Still need the NextAuth SessionProvider even in ALB case since we have to use useSession
            // unconditionally due to React hooks rules. But it doesn't interfere with ALB log on and will be removed
            // when we fully switch to ALB auth.
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
                        {getAppContainer()}
                        <div
                            id="fixed-pos-div"
                            style={{position: "fixed", right: "20px", bottom: "0"}}
                        >
                            <NeuroAIChatbot
                                id="chatbot"
                                userAvatar={picture || undefined}
                                pageContext={Component.pageContext || ""}
                            />
                        </div>
                    </Container>
                </ErrorBoundary>
            </SessionProvider>
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
