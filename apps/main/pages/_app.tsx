import "reactflow/dist/style.css"

import "../styles/globals.css"

import {
    Auth,
    ErrorBoundary,
    LoadingSpinner,
    Navbar,
    NavbarProps,
    NeuroAIBreadcrumbs,
    smartSignOut,
    Snackbar,
    useAuthentication,
} from "@cognizant-ai-lab/ui-common"
import {LOGO} from "@cognizant-ai-lab/ui-common/const"
import {Container, createTheme, CssBaseline, ThemeProvider} from "@mui/material"
import debugModule from "debug"
import startCase from "lodash-es/startCase.js"
import {AppProps} from "next/app"
import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {SnackbarProvider} from "notistack"
import {ReactElement, ReactFragment, useEffect, useMemo, useState} from "react"

import useEnvironmentStore from "../../../packages/ui-common/state/environment"
import {usePreferences} from "../../../packages/ui-common/state/Preferences"
import useUserInfoStore from "../../../packages/ui-common/state/UserInfo"
import {APP_THEME, BRAND_COLORS} from "../theme"
import {UserInfoResponse} from "./api/userInfo/types"
import {getTitleBase} from "../../../packages/ui-common/utils/title"

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

/**
 * Utility component to pass user data along to Navbar. We have to make this a separate component because we need
 * to use useAuthentication for this, and "rules of hooks" apply.
 * @param props All props for Navbar except userInfo.
 * @return Navbar with userInfo passed to it.
 */
function NavbarWrapper(props: Omit<NavbarProps, "userInfo">): ReactElement {
    const {data} = useAuthentication()
    const userInfo = data?.user
    return (
        <Navbar
            {...props}
            id="nav-bar"
            userInfo={userInfo}
        />
    )
}

// Main function.
// Has to be export default for Next.js so tell ts-prune to ignore
// ts-prune-ignore-next
// eslint-disable-next-line react/no-multi-comp
export default function NeuroSanUI({Component, pageProps: {session, ...pageProps}}: ExtendedAppProps): ReactElement {
    const {
        auth0ClientId,
        auth0Domain,
        backendNeuroSanApiUrl,
        setAuth0ClientId,
        setAuth0Domain,
        setBackendNeuroSanApiUrl,
        setSupportEmailAddress,
        supportEmailAddress,
    } = useEnvironmentStore()

    // Access NextJS router
    const router = useRouter()

    // Access user info store
    const {currentUser, setCurrentUser, setPicture, oidcProvider, setOidcProvider} = useUserInfoStore()

    // Infer authentication type
    const authenticationType = currentUser ? `ALB using ${oidcProvider}` : "NextAuth"

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
                console.error(`Failed to fetch environment variables: ${res.status} ${res.statusText}`)
                return
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
                console.error(`Failed to fetch user info: ${res.status} ${res.statusText}`)
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

    async function handleSignOut() {
        // Clear our state storage variables
        setCurrentUser(undefined)
        setPicture(undefined)

        await smartSignOut(currentUser, auth0Domain, auth0ClientId, oidcProvider)
    }

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
                <Auth>
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
                <CssBaseline />
                {/*Note: Still need the NextAuth SessionProvider even in ALB case since we have to use useSession
                unconditionally due to React hooks rules. But it doesn't interfere with ALB log on and will be
                removed when we fully switch to ALB auth.*/}
                <SessionProvider session={session}>
                    <ErrorBoundary id="error_boundary">
                        <NavbarWrapper
                            id="nav-bar"
                            logo={LOGO}
                            query={router.query}
                            pathname={router.pathname}
                            authenticationType={authenticationType}
                            signOut={handleSignOut}
                            supportEmailAddress={supportEmailAddress}
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
            <Head>
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
            <ThemeProvider theme={theme}>{body}</ThemeProvider>
            <SnackbarProvider
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
