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
