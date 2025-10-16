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

import {OidcProvider, UserInfoResponse} from "../../../../../packages/ui-common/utils/types"

const EXPECTED_NUMBER_OF_JWT_HEADERS = 3

export default async function handler(req: NextApiRequest, res: NextApiResponse<UserInfoResponse>) {
    // Fetch user info from ALB or your backend service
    const userInfo = fetchUserInfoFromALB(req)
    if (userInfo.oidcHeaderFound && !userInfo.oidcHeaderValid) {
        // We found the header, but couldn't parse it
        res.status(httpStatus.UNAUTHORIZED).json({oidcHeaderFound: true, oidcHeaderValid: false})
        return
    }

    // We either didn't find the header at all, or we found it and parsed it
    res.status(httpStatus.OK).json(userInfo)
}

// Expected header from ALB
const AWS_OIDC_HEADER = "x-amzn-oidc-data"

function fetchUserInfoFromALB(req: NextApiRequest): UserInfoResponse {
    const oidcDataHeader = req.headers[AWS_OIDC_HEADER] as string

    if (!oidcDataHeader) {
        return {
            oidcHeaderFound: false,
        }
    }

    // We expect the OIDC data header to be two parts, separated by a period
    if (!oidcDataHeader.includes(".")) {
        return {oidcHeaderFound: true, oidcHeaderValid: false}
    }

    // Split the header into two parts
    const jwtHeaders = oidcDataHeader.split(".")
    if (!jwtHeaders || jwtHeaders.length !== EXPECTED_NUMBER_OF_JWT_HEADERS) {
        return {oidcHeaderFound: true, oidcHeaderValid: false}
    }

    // now base64 decode jwtheader
    const buff = Buffer.from(jwtHeaders[1], "base64")
    const decoded = buff.toString("utf8")

    const userInfo = JSON.parse(decoded)

    // Determine the OIDC provider
    let picture: string = null
    let oidcProvider: OidcProvider = null
    let username: string = null

    // Look for "well-known" fields in the OIDC headers to figure out if we're using Github or AD
    if (userInfo.nickname) {
        oidcProvider = "Github"
        picture = userInfo.picture
        username = userInfo.nickname
    } else if (userInfo.email) {
        oidcProvider = "AD"
        username = userInfo.email

        // We don't have a picture for AD users yet. Requires investigation.
    }

    // Return the OIDC provider and user info to the UI
    return {
        username,
        picture,
        oidcHeaderFound: true,
        oidcHeaderValid: true,
        oidcProvider,
    }
}
