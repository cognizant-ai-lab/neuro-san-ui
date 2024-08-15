import httpStatus from "http-status"

/**
 * This function is a handler for the /api/gpt/environment endpoint. It retrieves environment settings from the
 * node server and returns them to the client. This way, the UI can be configured to point to the correct backend.
 * @param _req Request -- not used
 * @param res Response -- the response object. It is used to send the environment settings to the client.
 */
// ts-prune-ignore-next  (has to be exported for NextJS to hook into it)
export default async function handler(_req, res) {
    res.setHeader("Content-Type", "application/json")
    const backendApiUrl = process.env.MD_SERVER_URL
    if (!backendApiUrl) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: "MD_SERVER_URL not set in environment",
        })
        return
    }

    // These are now optional depending on which authentication method we are using
    const auth0ClientId = process.env.AUTH0_CLIENT_ID
    const auth0Domain = process.env.AUTH0_DOMAIN

    res.status(httpStatus.OK).json({
        backendApiUrl: backendApiUrl,
        auth0ClientId: auth0ClientId,
        auth0Domain: auth0Domain,
    })
}
