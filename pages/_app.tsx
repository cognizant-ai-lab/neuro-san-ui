// Third party
import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "antd/dist/reset.css"
import "bootstrap/dist/css/bootstrap.css"
import "reactflow/dist/style.css"
import "tailwindcss/tailwind.css"

// Custom
import "../styles/updatenode.css"
import "../styles/globals.css"
import "../styles/styles.css"

// External Libraries

// Bootstrap
import {Container, SSRProvider} from "react-bootstrap"

// React
import React from 'react'

// NextJS Components
import Head from 'next/head'
import {useRouter} from "next/router";
import {SessionProvider} from "next-auth/react"

// Local Components
import Navbar from "../components/navbar"

// Constants
import {ENABLE_AUTHENTICATION, LOGO} from "../const"
import {Auth} from "../components/auth";
import ErrorBoundary from "../components/errorboundary";
import {NeuroAIChatbot} from "../components/internal/chatbot/neuro_ai_chatbot";

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({
  Component,
  pageProps: { session, ...pageProps }
}): React.ReactElement {
  const router = useRouter()
  // Check if demo user as requested by URL param
  const isDemoUser = "demo" in router.query

  let body
  if (router.pathname === "/") {
    body = <div id="body-div">
      <Component id="body-component" {...pageProps} />
    </div>
  } else {
    body =
    <>
      { /* 2/6/23 DEF - SSRProvider does not have an id property when compiling */ }
      <SSRProvider      // eslint-disable-line enforce-ids-in-jsx/missing-ids
            >
        { /* 2/6/23 DEF - SessionProvider does not have an id property when compiling */ }
        <SessionProvider        // eslint-disable-line enforce-ids-in-jsx/missing-ids
                session={session}>
          <ErrorBoundary id="error_boundary">
            <Navbar id="nav-bar" Logo={LOGO} WithBreadcrumbs={Component.withBreadcrumbs ?? true}/>
            <Container id="body-container">
              {Component.authRequired && ENABLE_AUTHENTICATION
                  ? <Auth         // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                  // 2/6/23 DEF - SessionProvider does not have an id property when compiling
                          >
                      <Component id="body-auth-component" {...pageProps} />
                    </Auth>
                  : <Component id="body-non-auth-component" {...pageProps} />
              }
              { isDemoUser &&
              <div id="fixed-pos-div" style={{position: "fixed", right: "20px", bottom: "0"}}>
                <NeuroAIChatbot id="chatbot" userAvatar={undefined}/>
              </div>
              }
            </Container>
          </ErrorBoundary>
        </SessionProvider>
      </SSRProvider>
    </>
  }

  return (
  <div id="unileaf">
    { /* 2/6/23 DEF - Head does not have an id property when compiling */ }
    <Head      // eslint-disable-line enforce-ids-in-jsx/missing-ids
        >
      <title id="unileaf-title">Cognizant Neuro® AI</title>
      <meta id="unileaf-description" name="description" content="Cognizant Neuro® AI" />
      <link id="unileaf-link" rel="icon" href="/cognizantfavicon.ico" />
    </Head>
    {
      body
    }
  </div>
  )
}
