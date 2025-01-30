# UI Developer Start Guide

This README is intended to help a new UI developer get up to speed toward making changes to the NeuroAI️ UI code.
By following these instructions, you will be able to run the UI locally on your development machine and make changes
to the code locally, without deploying anything to the hosted services.

You will configure your local environment to connect to the NeuroAI️ backend services.

Note: Previously the project was known as UniLEAF and that name is still used in some places.

## Set Up Prerequisites

-   Install [NodeJS](https://nodejs.org/) on your development machine. At time of writing Node 18 is the current LTS version.
    -   Example on mac: `brew install node@18`
    -   For Ubuntu, see this link: https://joshtronic.com/2022/04/24/how-to-install-nodejs-18-on-ubuntu-2004-lts/
    -   Make sure that the node executable is in your path. You can do this by typing `node --version`.
-   Install the protobuf compiler. This is needed to generate the protocol buffer files for the UI.
    Instructions for various platforms are [here](https://grpc.io/docs/protoc-installation/).
-   Install `yarn` on your development host. Instructions for all platforms are [here](https://classic.yarnpkg.com/lang/en/docs)
    -   Example using current version on mac: `brew install yarn`
    -   For Ubuntu, see this link: https://classic.yarnpkg.com/lang/en/docs/cli/self-update/
    -   Make sure that the yarn executable is in your path. You can do this by typing `yarn --version`.
-   Clone the repository:
    -   `git clone git@github.com:leaf-ai/unileaf.git`
-   Install app dependencies.
    -   `cd unileaf/nextfront && yarn install && cd ..`
-   Generate the protocol buffer files for the UI. This is done by running the following command in the `nextfront` directory:
    -   `yarn generate`
    -   This command will generate the necessary files in the `nextfront/generated` directory.
    -   To view the files: `ls nextfront/generated`
-   In your `nextfront` directory, create a file named `.env` which contains the following keys.  
    Ask a current UI developer for the redacted values or get them self-serve from the leaf-team-vault server (see below).

```bash
# Determines which backend API server to access. This one is for the Dev environment -- change as necessary.
MD_SERVER_URL=https://neuro-ai-dev.evolution.ml

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<redacted>

GITHUB_ID=<redacted>
GITHUB_SECRET=<redacted>

AUTH0_CLIENT_ID=<redacted>
AUTH0_CLIENT_SECRET=<redacted>
AUTH0_ISSUER=https://cognizant-ai.auth0.com/authorize
AUTH0_DOMAIN=cognizant-ai.auth0.com

# Next items are only needed if you're working on the LLM features of the UI such as the ChatBot or DMS assistant.
OPENAI_API_KEY=<redacted>

# Model names for the LLM features of the UI. Different models can be used for different features.
DMS_CHAT_MODEL_NAME=gpt-4o
OF_MODEL_NAME=gpt-4o
OPEN_AI_MODEL_NAME=gpt-4o

# Next items are for tracing langchain calls via langsmith: https://smith.langchain.com/
LANGCHAIN_API_KEY=<your langsmith API key>
LANGCHAIN_TRACING_V2=<set to true to enable>
LANGCHAIN_PROJECT=<choose any project name you want>

PINECONE_API_KEY=<redacted>
PINECONE_INDEX=prod
PINECONE_ENVIRONMENT=us-east-1-aws

SUPPORT_EMAIL_ADDRESS=test@example.com

# Next item is if you want to use Bing search in Opportunity Finder
BingApiKey=<redacted>

```

-   Instructions for generating NEXTAUTH_SECRET are [here](https://next-auth.js.org/configuration/options#secret).
-   Values for most of the redacted items can be obtained from the `leaf-team-vault` server with these commands. Note:
    this assumes you have the vault cli installed and configured to talk to the `leaf-team-vault` server.

    ```bash
    vault kv get /secret/auth0/unileaf-dev
    vault kv get /secret/github-app/authorize-unileaf-dev
    vault kv get /secret/nextauth/unileaf-dev
    ```

-   Instructions on generating OPENAI_API_KEY are [here](https://platform.openai.com/account/api-keys).  
    You will need an active account with OpenAI to generate this key. This is only needed if you are working on the  
    LLM features of the UI.
-   Instructions on generating PINECONE_API_KEY are [here](https://docs.pinecone.io/docs/authentication).  
    You will need an active account with Pinecone to generate this key. This is only needed if you are working on the  
    LLM features of the UI.
-   Be sure to chmod 600 this .env file to keep secret values secret

## Run the development server:

```bash
# By setting the UNILEAF_VERSION value, the ui will display your current branch in the header after Build:
export UNILEAF_VERSION=$(git branch --show-current) && yarn run dev
```

To run with verbose debugging:

```bash
DEBUG='*,-send,-compression,-babel,-next:*' UNILEAF_VERSION=$(git branch --show-current) && yarn run dev
```

You can also set the `DEBUG` variable to a list of modules to only see output for those modules, for example:

```bash
export DEBUG="new_project,flow"
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Try making a simple change to the UI

Now you've made it this far, try a simple change within the UI. Here's an example:

1. Navigate to the page for any Project within Neuro AI, using the `http://localhost:3000` URL mentioned above.
1. Open `nextfront/pages/projects/[projectID]/index.tsx`
1. Add a message at the appropriate place in the tsx file (somewhere within the `return` statement, inside the `<>`  
   fragment).
    ```typescript
    {
        ;`Hello world! The current project ID is ${projectId}`
    }
    ```
1. Your change appears immediately in the UI for the Project page, without relaunching any services or recompiling, thanks to
   [Hot Module Replacement](https://webpack.js.org/guides/hot-module-replacement/) in Webpack which is used by NextJS. If you don't see your change, try holding down `Shift` and clicking the browser refresh button -- this bypasses the browser cache.

### Congratulations, you are now a UI developer!
