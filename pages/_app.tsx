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
import {Container} from "react-bootstrap";

// React
import React from 'react'
import 'react-pro-sidebar/dist/css/styles.css';

// NextJS Components
import Head from 'next/head'
import {useRouter} from "next/router";
import {SessionProvider} from "next-auth/react"

// Local Components
import Navbar from "../components/navbar"

// import Constants
import {LOGO} from "../const"


export default function LEAF({
  Component,
  pageProps: { session, ...pageProps }
}): React.ReactElement {

  const router = useRouter()
  let Body
  if (router.pathname === "/") {
    Body = <div>
      <Component {...pageProps} />
    </div>
  } else {
    Body =
    <>
      <SessionProvider session={session}>
        <Navbar Logo={LOGO} />
        <Container>
            <Component {...pageProps} />
        </Container>
      </SessionProvider>
    </>
  }

  return (
  <div>
    <Head>
      <title>Unileaf</title>
      <meta name="description" content="Evolutionary AI" />
      <link rel="icon" href="/leaffavicon.png" />
    </Head>
    {
      Body
    }
  </div>
  )
}