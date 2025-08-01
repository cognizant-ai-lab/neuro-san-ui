import "reactflow/dist/style.css"

import "../styles/globals.css"

import {Container, createTheme, CssBaseline, ThemeProvider} from "@mui/material"
import debugModule from "debug"
import {startCase} from "lodash"
import {AppProps} from "next/app"
import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {ReactElement, ReactFragment, useEffect, useMemo, useState} from "react"

import {Auth} from "../components/Authentication/auth"
import {NeuroAIBreadcrumbs} from "../components/Common/breadcrumbs"
import {Navbar} from "../components/Common/Navbar"
import {Snackbar} from "../components/Common/Snackbar"
import {ErrorBoundary} from "../components/ErrorPage/ErrorBoundary"
import {LOGO} from "../const"
import useEnvironmentStore from "../state/environment"
import {usePreferences} from "../state/Preferences"
import useUserInfoStore from "../state/UserInfo"
import {APP_THEME, BRAND_COLORS} from "../theme"
import {UserInfoResponse} from "./api/userInfo/types"
import {LoadingSpinner} from "../components/Common/LoadingSpinner"
import {getTitleBase} from "../utils/title"

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

const DEFAULT_APP_NAME = `Cognizant ${LOGO}`

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function NeuroAI({Component, pageProps: {session, ...pageProps}}: ExtendedAppProps): ReactElement {
    const {backendNeuroSanApiUrl, setBackendNeuroSanApiUrl, setAuth0ClientId, setAuth0Domain, setSupportEmailAddress} =
        useEnvironmentStore()

    // access user info store
    const {currentUser, setCurrentUser, setPicture, setOidcProvider} = useUserInfoStore()

    const {pathname} = useRouter()

    const [pageTitle, setPageTitle] = useState<string>(DEFAULT_APP_NAME)

    const includeBreadcrumbs = Component.withBreadcrumbs ?? true

    const isContainedInViewport = Component.isContainedInViewport ?? false

    // Dark mode
    const {darkMode} = usePreferences()

    const theme = useMemo(
        () =>
            createTheme({
                ...APP_THEME,
                palette: {
                    ...APP_THEME.palette,
                    mode: darkMode ? "dark" : "light",
                    background: {
                        default: darkMode ? BRAND_COLORS["bs-dark-mode-dim"] : BRAND_COLORS["bs-white"],
                    },
                    text: {
                        primary: darkMode ? BRAND_COLORS["bs-white"] : BRAND_COLORS["bs-primary"],
                        secondary: darkMode ? BRAND_COLORS["bs-gray-light"] : BRAND_COLORS["bs-gray-medium-dark"],
                    },
                },
            }),
        [darkMode]
    )

    useEffect(() => {
        const urlPaths: string[] = pathname?.split("/").filter((path) => path !== "")
        const pageName = startCase(urlPaths?.at(-1))

        // If we are on the splash screen, set the page title to the default
        if (urlPaths.length === 0) {
            setPageTitle(DEFAULT_APP_NAME)
        }

        // If there is just one URL path, set the page title. This prevents overriding Project, Experiment and
        // DMS pages, which directly set the page title to document.title.
        if (urlPaths.length === 1) {
            setPageTitle(`${getTitleBase()} | ${pageName}`)
        }
    }, [pathname])

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

            // Save env vars in zustand store
            setBackendNeuroSanApiUrl(data.backendNeuroSanApiUrl)
            setAuth0ClientId(data.auth0ClientId)
            setAuth0Domain(data.auth0Domain)
            setSupportEmailAddress(data.supportEmailAddress)
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
        if (currentUser === undefined || !backendNeuroSanApiUrl) {
            return <LoadingSpinner id="loading-header" />
        }

        if (currentUser != null) {
            // We got the ALB headers
            return backendNeuroSanApiUrl && currentUser ? (
                <Component
                    id="body-non-auth-component"
                    {...pageProps}
                />
            ) : (
                <LoadingSpinner id="loading-header" />
            )
        } else {
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
                    background:
                        "linear-gradient(0deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/NeuroAI_SC_BH1.webp')",
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
                            Logo={LOGO}
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
                <title id="unileaf-title">{pageTitle}</title>
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
                theme={theme}
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
