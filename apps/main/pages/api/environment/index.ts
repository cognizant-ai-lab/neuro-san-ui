/*
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
*/

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
