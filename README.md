# Copyright

Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

# UI Developer Start Guide

This README is intended to help a new UI developer get up to speed toward making changes to the Neuro SAN UI code.
By following these instructions, you will be able to run the UI locally on your development machine and make changes
to the code locally, without deploying anything to the hosted services.

You will configure your local environment to connect to the Neuro️ SAN backend services.

Note: Previous names for this project were UniLEAF and NeuroAI, and those names are still used in some places.

## Set Up Prerequisites

- Install [NodeJS](https://nodejs.org/) on your development machine. At time of writing Node 22 is the current LTS version.
    - Example on mac: `brew install node@22`
    - For Ubuntu, see this link: https://joshtronic.com/2024/05/26/ubuntu-nodejs-22-install/
    - Make sure that the node executable is in your path. You can do this by typing `node --version`.
- Install `yarn` on your development host. Instructions for all platforms are [here](https://classic.yarnpkg.com/lang/en/docs)
    - Example using current version on mac: `brew install yarn`
    - For Ubuntu, see this link: https://classic.yarnpkg.com/lang/en/docs/cli/self-update/
    - Make sure that the yarn executable is in your path. You can do this by typing `yarn --version`.
- Clone the repository:
    - `git clone git@github.com:leaf-ai/neuro-san-ui.git`
- Install all dependencies including dev dependencies
    - `yarn install`
- Generate the Neuro-san OpenAPI types for the UI. This is done by running the following commands in the project root
  directory:
    - `yarn generate`
        - `yarn generate` will generate the necessary files in the `generated` directory.
    - To view the files: `ls generated/neuro-san`. Sample response:

```bash
NeuroSanClient.ts  OpenAPITypes.ts
```

- In your project root directory, create a file named `.env` which contains the following keys.  
  Ask a current UI developer for the your_value values or get them self-serve from the leaf-team-vault server (see below).

```bash
# Determines which backend neuro-san server to access. This one is for the Dev environment -- change as necessary.
NEURO_SAN_SERVER_URL=https://neuro-san-dev.decisionai.ml

# Determines which backend Opportunity Finder Pipeline uses. This one is for the Dev environment -- change as necessary.
UNILEAF_AGENT_SERVER_URL=https://unileaf-agent-dev.evolution.ml

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your_value>

GITHUB_ID=<your_value>
GITHUB_SECRET=<your_value>

AUTH0_CLIENT_ID=<your_value>
AUTH0_CLIENT_SECRET=<your_value>
AUTH0_ISSUER=https://cognizant-ai.auth0.com/authorize
AUTH0_DOMAIN=cognizant-ai.auth0.com

# Can be anything
SUPPORT_EMAIL_ADDRESS=test@example.com
```

- Instructions for generating NEXTAUTH_SECRET are [here](https://next-auth.js.org/configuration/options#secret).
- Instructions on generating OPENAI_API_KEY are [here](https://platform.openai.com/account/api-keys).  
  You will need an active account with OpenAI to generate this key. This is only needed if you are working on the  
  LLM features of the UI.
- Be sure to chmod 600 this .env file to keep secret values secret

## Run the development server:

```bash
# By setting the NEURO_SAN_UI_VERSION value, the ui will display your current branch in the header after Build:
export NEURO_SAN_UI_VERSION=$(git branch --show-current) && yarn run dev
```

To run with verbose debugging:

```bash
DEBUG='*,-send,-compression,-babel,-next:*' NEURO_SAN_UI_VERSION=$(git branch --show-current) && yarn run dev
```

You can also set the `DEBUG` variable to a list of modules to only see output for those modules, for example:

```bash
export DEBUG="app,flow"
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Try making a simple change to the UI

Now you've made it this far, try a simple change within the UI. Here's an example:

1. Navigate to the MAUI page `http://localhost:3000/multiAgentAccelerator`
1. Open `./pages/multiAgentAccelerator/index.tsx`
1. Add a message, such as `Hello world!`, at the appropriate place in the tsx file (somewhere within the `<Grid>` in the last `return` statement).
1. Your change appears immediately in the UI for MAUI, without relaunching any services or recompiling,
   thanks to [Hot Module Replacement](https://webpack.js.org/guides/hot-module-replacement/) in Webpack which is used
   by NextJS. If you don't see your change, try holding down `Shift` and clicking the browser refresh button --
   this bypasses the browser cache.

### Congratulations, you are now a UI developer!
