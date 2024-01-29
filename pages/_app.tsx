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

import Head from "next/head"
import {useRouter} from "next/router"
import {SessionProvider} from "next-auth/react"
import {ReactElement, useEffect} from "react"
import {Container} from "react-bootstrap"

import {Auth} from "../components/auth"
import ErrorBoundary from "../components/errorboundary"
import NeuroAIChatbot from "../components/internal/chatbot/neuro_ai_chatbot"
import Navbar from "../components/navbar"
import {GENERIC_LOGO, LOGO, MODEL_SERVING_VERSION} from "../const"
import useFeaturesStore, {ModelServingVersion} from "../state/features"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({Component, pageProps: {session, ...pageProps}}): ReactElement {
    const {isGeneric, setIsGeneric, setIsDemoUser, setModelServingVersion} = useFeaturesStore()

    const router = useRouter()

    useEffect(() => {
        // Set "generic branding" flag in store
        setIsGeneric("generic" in router.query)

        // Set "demo" flag in store
        setIsDemoUser("demo" in router.query)
    }, [router.query])

    useEffect(() => {
        // default to using old model serving
        let modelServingVersion: ModelServingVersion
        const queryStringSetting = router.query?.modelServingVersion
        if (queryStringSetting) {
            modelServingVersion = queryStringSetting as ModelServingVersion
        } else {
            modelServingVersion = MODEL_SERVING_VERSION as ModelServingVersion
        }

        setModelServingVersion(modelServingVersion)
    }, [MODEL_SERVING_VERSION, router.query])

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
