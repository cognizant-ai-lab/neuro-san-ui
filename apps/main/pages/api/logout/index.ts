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
