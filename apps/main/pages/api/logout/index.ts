import {NextApiRequest, NextApiResponse} from "next"

// Well-known ALB cookies. These need to be cleared to fully sign the user out.
const ALB_COOKIES = ["AWSALBAuthNonce", "AWSELBAuthSessionCookie-0", "AWSELBAuthSessionCookie-1"]

/**
 * Handler for the logout API route. Used to clear the ALB cookies and log the user out.
 * @param _req Not used
 * @param res Response object for signalling success
 */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    res.setHeader(
        "Set-Cookie",
        ALB_COOKIES.map((cookie) => `${cookie}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure`)
    )

    // Send a JSON response indicating successful logout
    res.status(200).json({message: "Successfully logged out"})
}
