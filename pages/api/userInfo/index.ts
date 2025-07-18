import debugModule from "debug"
import httpStatus from "http-status"
import {NextApiRequest, NextApiResponse} from "next"

import {OidcProvider, UserInfoResponse} from "./types"

const debug = debugModule("userInfo")

const EXPECTED_NUMBER_OF_JWT_HEADERS = 3

// ts-prune-ignore-next  (has to be exported for NextJS to hook into it)
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
    debug("Headers:", req.headers)

    const oidcDataHeader = req.headers[AWS_OIDC_HEADER] as string

    if (!oidcDataHeader) {
        debug("OIDC header not found")
        return {
            oidcHeaderFound: false,
        }
    }

    // We expect the OIDC data header to be two parts, separated by a period
    if (!oidcDataHeader.includes(".")) {
        debug("OIDC header does not contain a period")
        return {oidcHeaderFound: true, oidcHeaderValid: false}
    }

    // Split the header into two parts
    const jwtHeaders = oidcDataHeader.split(".")
    if (!jwtHeaders || jwtHeaders.length !== EXPECTED_NUMBER_OF_JWT_HEADERS) {
        debug("OIDC header is not in the expected format", jwtHeaders)
        return {oidcHeaderFound: true, oidcHeaderValid: false}
    }

    // now base64 decode jwtheader
    const buff = Buffer.from(jwtHeaders[1], "base64")
    const decoded = buff.toString("utf8")
    debug("Decoded JWT Header:", decoded)

    const userInfo = JSON.parse(decoded)

    debug("User Info:", userInfo)

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
