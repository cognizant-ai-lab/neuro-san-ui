import {createMocks} from "node-mocks-http"

import handler from "../../../pages/api/logout"

describe("Logout API handler", () => {
    it("clears ALB cookies and responds with success", async () => {
        const {req, res} = createMocks()

        await handler(req, res)

        const expiredDate = new Date(0).toUTCString()
        const cookieNames = ["AWSALBAuthNonce", "AWSELBAuthSessionCookie-0", "AWSELBAuthSessionCookie-1"]

        expect(res._getHeaders()["set-cookie"]).toEqual(
            cookieNames.map((cookieName) => `${cookieName}=; Path=/; Expires=${expiredDate}; HttpOnly; Secure`)
        )

        expect(res._getStatusCode()).toBe(200)
        expect(res._getJSONData()).toEqual({message: "Successfully logged out"})
    })
})
