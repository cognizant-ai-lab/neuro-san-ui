import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"

// Possible values returned by this API. Note that not all will necessarily be set
interface EnvironmentResponse {
    readonly auth0ClientId: string
    readonly auth0Domain: string
    readonly backendApiUrl: string
    readonly backendNeuroSanApiUrl: string
    readonly unileafAgentServerUrl?: string
    readonly buildTarget: string
    readonly enableAuthorizeAPI: boolean
    readonly enableProjectSharing: boolean
    readonly supportEmailAddress: string
    readonly error?: string
}

/**
 * This function is a handler for the /api/gpt/environment endpoint. It retrieves environment settings from the
 * node server and returns them to the client. This way, the UI can be configured to point to the correct backend.
 * @param _req Request -- not used
 * @param res Response -- the response object. It is used to send the environment settings to the client.
 */
// ts-prune-ignore-next  (has to be exported for NextJS to hook into it)
export default function handler(_req: NextApiRequest, res: NextApiResponse<Partial<EnvironmentResponse>>) {
    res.setHeader("Content-Type", "application/json")

    const backendApiUrl = process.env.MD_SERVER_URL
    const backendNeuroSanApiUrl = process.env.NEURO_SAN_SERVER_URL
    const unileafAgentServerUrl = process.env.UNILEAF_AGENT_SERVER_URL
    const auth0ClientId = process.env.AUTH0_CLIENT_ID
    const auth0Domain = process.env.AUTH0_DOMAIN
    const supportEmailAddress = process.env.SUPPORT_EMAIL_ADDRESS
    const enableProjectSharing = Boolean(process.env.ENABLE_PROJECT_SHARING || false)

    res.status(httpStatus.OK).json({
        backendApiUrl,
        backendNeuroSanApiUrl,
        unileafAgentServerUrl,
        auth0ClientId,
        auth0Domain,
        enableProjectSharing,
        supportEmailAddress,
        enableAuthorizeAPI: Boolean(process.env.ENABLE_AUTHORIZE_API),
    })
}
