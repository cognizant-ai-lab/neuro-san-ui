# UI Developer Start Guide
This README is intended to help a new UI developer get up to speed toward making changes to the Unileaf UI.

## Set Up Prerequisites

- Install `yarn` on your development host.
  - Example using current version on mac: `brew install yarn@1.22.19`
  - For Ubuntu, see this link: https://classic.yarnpkg.com/lang/en/docs/cli/self-update/
- Install `node` on your development host. 
  - Example using current version on mac: `brew install node@16`
  - For Ubuntu, see this link: https://joshtronic.com/2021/05/09/how-to-install-nodejs-16-on-ubuntu-2004-lts/
- Install app dependencies. 
  - Assuming you've cloned the unileaf repo: `cd unileaf/nextfront && yarn install`
- Set env variable to specify the gateway. 
  - Most likely you'll want the dev namespace: `export MD_SERVER_URL=https://gateway-dev.unileaf.evolution.ml:30002`
- In your nextfront directory, create a file named `.env` which contains the following keys. Ask a current UI developer for the values.
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<redacted>
GITHUB_ID=<redacted>
GITHUB_SECRET=<redacted>
AUTH0_CLIENT_ID=<redacted>
AUTH0_CLIENT_SECRET=<redacted>
AUTH0_ISSUER=https://cognizant-ai.auth0.com/authorize
AUTH0_DOMAIN=cognizant-ai.auth0.com
```
- Values for the redacted can be obtained from the leaf-team vault server with these commands:
-- vault kv get /secret/auth0/unileaf-dev
-- vault kv get /secret/github-app/authorize-unileaf-dev
- Be sure to chmod 600 this .env file to keep secret values secret

## Run the development server:

```bash
npm run dev
# or
yarn dev
# or, by setting the UNILEAF_VERSION value, the ui will display your current branch
export UNILEAF_VERSION=$(git branch --show-current) && yarn run dev
```

To run with verbose debugging:

```bash
DEBUG='*,-send,-compression,-babel' npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Try making a simple change to the UI
If you've made this far, you may try a simple change within the UI.
Here's an example:
- Modify `nextfront/pages/projects/[projectID]/index.tsx`
  - add a logging message at the appropriate place in the tsx file
    - ```console.log(`Loaded project: ${projectId}`)```
- You should notice that the code is compiled automatically and your change appears in the console output of the ui when loading a project.

## Learn More About Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
