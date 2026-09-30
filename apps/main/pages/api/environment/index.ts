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

import {EnvironmentResponse} from "./Types"
import {ENABLE_AUTHENTICATION_ENV_VAR, ENABLE_GOOGLE_ANALYTICS_ENV_VAR, GA_MEASUREMENT_ID_ENV_VAR} from "../../../Const"

/**
 * This function is a handler for the .../environment endpoint. It retrieves environment settings from the
 * node server and returns them to the client. This allows for environment variable settings on the server
 * to be passed to the client, which is useful for settings that are not known at build time.
 * @param _req Request -- not used
 * @param res Response -- the response object. It is used to send the environment settings to the client.
 */
const handler = (_req: NextApiRequest, res: NextApiResponse<EnvironmentResponse>) => {
    res.setHeader("Content-Type", "application/json")

    const auth0ClientId = process.env["AUTH0_CLIENT_ID"]
    const auth0Domain = process.env["AUTH0_DOMAIN"]
    const backendNeuroSanApiUrl = process.env["NEURO_SAN_SERVER_URL"]
    const enableAuthentication = process.env[ENABLE_AUTHENTICATION_ENV_VAR] !== "false"
    const enableGoogleAnalytics = process.env[ENABLE_GOOGLE_ANALYTICS_ENV_VAR] === "true"
    const gaMeasurementID = process.env[GA_MEASUREMENT_ID_ENV_VAR]
    const logoServiceToken = process.env["LOGO_SERVICE_TOKEN"]
    const supportEmailAddress = process.env["SUPPORT_EMAIL_ADDRESS"]

    res.status(httpStatus.OK).json({
        auth0ClientId,
        auth0Domain,
        backendNeuroSanApiUrl,
        enableAuthentication,
        enableGoogleAnalytics,
        gaMeasurementID,
        logoServiceToken,
        supportEmailAddress,
    } satisfies EnvironmentResponse)
}

export default handler
