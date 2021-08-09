// Import Stylesheets
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

// Import Components
import Navbar from "../components/navbar"
import 'react-pro-sidebar/dist/css/styles.css';

// import Constants
import { LOGO } from "../const"

export default function LEAF({ Component, pageProps }): React.ReactElement {

  return (
  <div>
    <Navbar Logo={LOGO}></Navbar>
      <Container>
        <Component {...pageProps} />
      </Container>
  </div>
  )
}