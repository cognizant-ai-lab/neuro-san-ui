import httpStatus from "http-status"

/**
 * This function is a handler for the /api/gpt/environment endpoint. It retrieves environment settings from the
 * node server and returns them to the client. This way, the UI can be configured to point to the correct backend.
 * @param _req Request -- not used
 * @param res Response -- the response object. It is used to send the environment settings to the client.
 */
export default async function handler(_req, res) {
    res.setHeader("Content-Type", "application/json")
    const backendApiUrl = process.env.MD_SERVER_URL
    if (!backendApiUrl) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: "MD_SERVER_URL not set in environment",
        })
        return
    }

    res.status(httpStatus.OK).json({
        backendApiUrl: backendApiUrl,
    })
}
