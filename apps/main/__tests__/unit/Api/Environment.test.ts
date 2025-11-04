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
import {createMocks} from "node-mocks-http"

import handler from "../../../pages/api/environment"

describe("Environment API handler", () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Reset environment variables before each test
        process.env = {...originalEnv}
    })

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv
    })

    it("returns environment variables when all are set", async () => {
        // Set up environment variables
        process.env["NEURO_SAN_SERVER_URL"] = "https://api.example.com"
        process.env["AUTH0_CLIENT_ID"] = "test-client-id"
        process.env["AUTH0_DOMAIN"] = "test-domain.auth0.com"
        process.env["SUPPORT_EMAIL_ADDRESS"] = "support@example.com"

        const {req, res} = createMocks()

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getHeaders()["content-type"]).toBe("application/json")
        expect(res._getJSONData()).toEqual({
            backendNeuroSanApiUrl: "https://api.example.com",
            auth0ClientId: "test-client-id",
            auth0Domain: "test-domain.auth0.com",
            supportEmailAddress: "support@example.com",
        })
    })

    it("returns undefined for unset environment variables", async () => {
        // Only set some environment variables
        process.env["NEURO_SAN_SERVER_URL"] = "https://api.example.com"
        // Leave others undefined
        delete process.env["AUTH0_CLIENT_ID"]
        delete process.env["AUTH0_DOMAIN"]
        delete process.env["SUPPORT_EMAIL_ADDRESS"]

        const {req, res} = createMocks()

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({
            backendNeuroSanApiUrl: "https://api.example.com",
            auth0ClientId: undefined,
            auth0Domain: undefined,
            supportEmailAddress: undefined,
        })
    })

    it("handles empty environment variables", async () => {
        // Set empty string values
        process.env["NEURO_SAN_SERVER_URL"] = ""
        process.env["AUTH0_CLIENT_ID"] = ""
        process.env["AUTH0_DOMAIN"] = ""
        process.env["SUPPORT_EMAIL_ADDRESS"] = ""

        const {req, res} = createMocks()

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({
            backendNeuroSanApiUrl: "",
            auth0ClientId: "",
            auth0Domain: "",
            supportEmailAddress: "",
        })
    })

    it("ignores request method and body", async () => {
        // Set up environment variables
        process.env["NEURO_SAN_SERVER_URL"] = "https://api.example.com"

        const {req, res} = createMocks({
            method: "POST",
            body: {someData: "test"},
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({
            backendNeuroSanApiUrl: "https://api.example.com",
            auth0ClientId: undefined,
            auth0Domain: undefined,
            supportEmailAddress: undefined,
        })
    })
})
