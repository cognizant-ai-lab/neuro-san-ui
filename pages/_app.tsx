import "reactflow/dist/style.css"

import "../styles/updatenode.css"
import "../styles/globals.css"
import "../styles/rundialog.css"

import {Container, CssBaseline, ThemeProvider} from "@mui/material"
import CircularProgress from "@mui/material/CircularProgress"
import debugModule from "debug"
import {AppProps} from "next/app"
import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {ReactElement, ReactFragment, useEffect} from "react"

import {UserInfoResponse} from "./api/userInfo/types"
import {Auth} from "../components/auth"
import NeuroAIBreadcrumbs from "../components/breadcrumbs"
import {ChatBot} from "../components/ChatBot/ChatBot"
import ErrorBoundary from "../components/errorboundary"
import Navbar from "../components/navbar"
import {Snackbar} from "../components/Snackbar"
import {GENERIC_LOGO, LOGO} from "../const"
import useEnvironmentStore from "../state/environment"
import useFeaturesStore from "../state/features"
import useUserInfoStore from "../state/userInfo"
import {APP_THEME} from "../theme"

type BaseComponent = AppProps extends {Component: infer C} ? C : never

interface CustomPageProps {
    authRequired?: boolean
    isContainedInViewport?: boolean
    pageContext?: string
    withBreadcrumbs?: boolean
}

type ExtendedAppProps = AppProps & {
    // Extend Component with custom properties
    Component: BaseComponent & CustomPageProps
}

const debug = debugModule("app")

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function NeuroAI({Component, pageProps: {session, ...pageProps}}: ExtendedAppProps): ReactElement {
    const {isGeneric, setEnableProjectSharing} = useFeaturesStore()
    const {
        backendApiUrl,
        setBackendApiUrl,
        setAuth0ClientId,
        setAuth0Domain,
        setEnableAuthorizeAPI,
        setSupportEmailAddress,
    } = useEnvironmentStore()

    // access user info store
    const {currentUser, setCurrentUser, picture, setPicture, setOidcProvider} = useUserInfoStore()

    const {query, isReady, pathname} = useRouter()

    const includeBreadcrumbs = Component.withBreadcrumbs ?? true

    const isContainedInViewport = Component.isContainedInViewport ?? false

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

            if (!data.supportEmailAddress) {
                throw new Error("No Neuro AI support email address in response")
            } else {
                debug(
                    `Received Neuro AI support email address from NodeJS server.
                    Setting to ${data.supportEmailAddress}`
                )
                setSupportEmailAddress(data.supportEmailAddress)
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
                setOidcProvider(response.oidcProvider)
            } else {
                // Indicate that we didn't get the user info from the ALB. Assume we're using NextAuth instead.
                setOidcProvider("NextAuth")
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
                <CircularProgress
                    id="main-page-loading-spinner"
                    sx={{color: "var(--bs-primary)"}}
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
    function getAppComponent() {
        // Haven't figured out whether we have ALB headers yet
        if (currentUser === undefined || !backendApiUrl) {
            debug("Rendering loading spinner")
            return getLoadingSpinner()
        }

        if (currentUser != null) {
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
            <div
                id="body-div"
                style={{
                    // eslint-disable-next-line max-len, quotes, @typescript-eslint/quotes
                    background: `linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url("/NeuroAI_SC_BH1.webp")`,
                    backgroundSize: "cover",
                    height: "100%",
                }}
            >
                <Component
                    id="body-component"
                    {...pageProps}
                />
            </div>
        )
    } else {
        body = (
            <>
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <CssBaseline />
                {/*Note: Still need the NextAuth SessionProvider even in ALB case since we have to use useSession
                unconditionally due to React hooks rules. But it doesn't interfere with ALB log on and will be
                removed when we fully switch to ALB auth.*/}
                <SessionProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    session={session}
                >
                    <ErrorBoundary id="error_boundary">
                        <Navbar
                            id="nav-bar"
                            Logo={isGeneric ? GENERIC_LOGO : LOGO}
                        />
                        <Container
                            id="body-container"
                            maxWidth={false}
                            sx={{
                                flex: 1,
                                height: isContainedInViewport ? "100%" : "auto",
                                paddingBottom: "5rem",
                            }}
                        >
                            {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                            {includeBreadcrumbs && <NeuroAIBreadcrumbs />}
                            {getAppComponent()}
                            <div id="fixed-pos-div">
                                <ChatBot
                                    id="chatbot"
                                    userAvatar={picture || undefined}
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
            <ThemeProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                theme={APP_THEME}
            >
                {body}
            </ThemeProvider>
            <SnackbarProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                Components={{
                    info: Snackbar,
                    success: Snackbar,
                    warning: Snackbar,
                    error: Snackbar,
                }}
            />
        </div>
    )
}
