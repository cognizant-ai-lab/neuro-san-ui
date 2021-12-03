// Import Stylesheets
import '../styles/updatenode.css'
import '../styles/globals.css'
import 'antd/dist/antd.css'
import 'tailwindcss/tailwind.css'
import 'bootstrap/dist/css/bootstrap.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/core/lib/css/blueprint.css'

// Import External Libraries
import { Container } from 'react-bootstrap'

// Import React
import React from 'react'

// Import Next Components
import Head from 'next/head'

// Import Components
import Navbar from "../components/navbar"
import 'react-pro-sidebar/dist/css/styles.css';

// import Constants
import { LOGO } from "../const"

export default function LEAF({ Component, pageProps }): React.ReactElement {

  let Body
  if (Component.name === "Index") {
    Body = <div>
      <Component {...pageProps} />
    </div>
  } else {
    Body = <>
      <Navbar Logo={LOGO}/>
      <Container>
        <Component {...pageProps} />
      </Container>
    </>

  }

  return (
  <div>
    <Head>
      <title>Unileaf</title>
      <meta name="description" content="Evolutionary AI" />
      <link rel="icon" href="/leaffavicon.png" />
    </Head>
    <body>
      { Body }
    </body>

  </div>
  )
}