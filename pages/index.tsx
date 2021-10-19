// Import Next Components
import Head from 'next/head'

// Import React
import React from 'react'

export default function Index(): React.ReactElement {
  return (
    <div>
      <Head>
        <title>LEAF Home</title>
        <meta name="description" content="Evolutionary AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      Unileaf v0.1.2
    </div>
  )
}
