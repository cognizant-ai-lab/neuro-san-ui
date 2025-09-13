import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"

// Possible values returned by this API. Note that not all will necessarily be set
interface EnvironmentResponse {
    readonly auth0ClientId: string
    readonly auth0Domain: string
    readonly backendNeuroSanApiUrl: string
    readonly supportEmailAddress: string
    readonly error?: string
}

/**
 * This function is a handler for the /api/gpt/environment endpoint. It retrieves environment settings from the
 * node server and returns them to the client. This way, the UI can be configured to point to the correct backend.
 * @param _req Request -- not used
 * @param res Response -- the response object. It is used to send the environment settings to the client.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse<Partial<EnvironmentResponse>>) {
    res.setHeader("Content-Type", "application/json")

    const backendNeuroSanApiUrl = process.env["NEURO_SAN_SERVER_URL"]
    const auth0ClientId = process.env["AUTH0_CLIENT_ID"]
    const auth0Domain = process.env["AUTH0_DOMAIN"]
    const supportEmailAddress = process.env["SUPPORT_EMAIL_ADDRESS"]

    res.status(httpStatus.OK).json({
        backendNeuroSanApiUrl,
        auth0ClientId,
        auth0Domain,
        supportEmailAddress,
    })
}
