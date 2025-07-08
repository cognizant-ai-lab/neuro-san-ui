import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"

import {ALL_BUILD_TARGET} from "../../../const"

// Possible values returned by this API. Note that not all will necessarily be set
interface EnvironmentResponse {
    readonly auth0ClientId: string
    readonly auth0Domain: string
    readonly backendApiUrl: string
    readonly backendNeuroSanApiUrl: string
    readonly oppFinderAgentUrl?: string
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
    const oppFinderAgentUrl = process.env.OPPORTUNITY_FINDER_AGENT_URL
    const auth0ClientId = process.env.AUTH0_CLIENT_ID
    const auth0Domain = process.env.AUTH0_DOMAIN
    const supportEmailAddress = process.env.SUPPORT_EMAIL_ADDRESS
    const enableProjectSharing = Boolean(process.env.ENABLE_PROJECT_SHARING || false)
    const buildTarget = process.env.BUILD_TARGET || ALL_BUILD_TARGET

    res.status(httpStatus.OK).json({
        backendApiUrl,
        backendNeuroSanApiUrl,
        oppFinderAgentUrl,
        auth0ClientId,
        auth0Domain,
        enableProjectSharing,
        supportEmailAddress,
        enableAuthorizeAPI: Boolean(process.env.ENABLE_AUTHORIZE_API),
        buildTarget,
    })
}
