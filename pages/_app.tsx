import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "antd/dist/reset.css"
import "../styles/globals.css"
import "bootstrap/dist/css/bootstrap.css"
import "reactflow/dist/style.css"
import "tailwindcss/tailwind.css"
import "../styles/styles.css"
import "../styles/updatenode.css"

import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {ReactElement} from "react"
import {Container, SSRProvider} from "react-bootstrap"

import {Auth} from "../components/auth"
import ErrorBoundary from "../components/errorboundary"
import NeuroAIChatbot from "../components/internal/chatbot/neuro_ai_chatbot"
import Navbar from "../components/navbar"
import {ENABLE_AUTHENTICATION, GENERIC_LOGO, LOGO} from "../const"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({Component, pageProps: {session, ...pageProps}}): ReactElement {
    const router = useRouter()

    // Get "generic branding" flag
    const isGeneric = "generic" in router.query

    let body
    if (router.pathname === "/") {
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
                {/* 2/6/23 DEF - SSRProvider does not have an id property when compiling */}
                <SSRProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                >
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
                                {Component.authRequired && ENABLE_AUTHENTICATION ? (
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
                </SSRProvider>
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
