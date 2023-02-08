// Stylesheets
import '../styles/updatenode.css'
import '../styles/globals.css'
import 'antd/dist/antd.css'
import 'tailwindcss/tailwind.css'
import 'bootstrap/dist/css/bootstrap.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'

// External Libraries

// Bootstrap
import {Container, SSRProvider} from "react-bootstrap"

// React
import React from 'react'
import 'react-pro-sidebar/dist/css/styles.css'

// NextJS Components
import Head from 'next/head'
import {useRouter} from "next/router";
import {SessionProvider} from "next-auth/react"

// Local Components
import Navbar from "../components/navbar"

// import Constants
import {ENABLE_AUTHENTICATION, LOGO} from "../const"
import {Auth} from "../components/auth";

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function LEAF({
  Component,
  pageProps: { session, ...pageProps }
}): React.ReactElement {

  const router = useRouter()
  let Body
  if (router.pathname === "/") {
    Body = <div id="body-div">
      <Component id="body-component" {...pageProps} />
    </div>
  } else {
    Body =
    <>
      { /* 2/6/23 DEF - SSRProvider does not have an id property when compiling */ }
      <SSRProvider      // eslint_disable-line enforce-ids-in-jsx/missing-ids
            >
        { /* 2/6/23 DEF - SessionProvider does not have an id property when compiling */ }
        <SessionProvider        // eslint_disable-line enforce-ids-in-jsx/missing-ids
                session={session}>
          <Navbar id="nav-bar" Logo={LOGO} />
          <Container id="body-container">
            {Component.authRequired && ENABLE_AUTHENTICATION
                ? <Auth         // eslint_disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - SessionProvider does not have an id property when compiling
                        >
                    <Component id="body-auth-component" {...pageProps} />
                  </Auth>
                : <Component id="body-non-auth-component" {...pageProps} />
            }
          </Container>
        </SessionProvider>
      </SSRProvider>
    </>
  }

  return (
  <div id="unileaf">
    { /* 2/6/23 DEF - Head does not have an id property when compiling */ }
    <Head      // eslint_disable-line enforce-ids-in-jsx/missing-ids
        >
      <title id="unileaf-title">Unileaf</title>
      <meta id="unileaf-description" name="description" content="Evolutionary AI" />
      <link id="unileaf-link" rel="icon" href="/leaffavicon.png" />
    </Head>
    {
      Body
    }
  </div>
  )
}
