import httpStatus from "http-status"
import {createMocks} from "node-mocks-http"

import handler from "../../../pages/api/userInfo"

const AWS_OIDC_HEADER = "x-amzn-oidc-data"

describe("UserInfo API handler", () => {
    it("returns user info when OIDC header is valid for Github provider", async () => {
        const userInfo = {nickname: "testUser", picture: "https://example.com/avatar.png"}

        const {req, res} = createMocks({
            headers: {
                [AWS_OIDC_HEADER]: "header.payload.signature",
            },
        })

        jest.spyOn(Buffer, "from").mockImplementationOnce(() => Buffer.from(JSON.stringify(userInfo)))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({
            username: userInfo.nickname,
            picture: userInfo.picture,
            oidcHeaderFound: true,
            oidcHeaderValid: true,
            oidcProvider: "Github",
        })
    })

    it("returns ok when OIDC header is missing (NextAuth case)", async () => {
        const {req, res} = createMocks()

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({oidcHeaderFound: false})
    })

    it("returns unauthorized when OIDC header is invalid", async () => {
        const {req, res} = createMocks({
            headers: {
                [AWS_OIDC_HEADER]: "invalid-header",
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.UNAUTHORIZED)
        expect(res._getJSONData()).toEqual({oidcHeaderFound: true, oidcHeaderValid: false})
    })

    it("returns unauthorized when OIDC header has incorrect format", async () => {
        const {req, res} = createMocks({
            headers: {
                [AWS_OIDC_HEADER]: "header.payload",
            },
        })

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.UNAUTHORIZED)
        expect(res._getJSONData()).toEqual({oidcHeaderFound: true, oidcHeaderValid: false})
    })

    it("handles AD user info correctly", async () => {
        const userInfo = {email: "testuser@example.com"}

        const {req, res} = createMocks({
            headers: {
                [AWS_OIDC_HEADER]: "header.payload.signature",
            },
        })

        jest.spyOn(Buffer, "from").mockImplementationOnce(() => Buffer.from(JSON.stringify(userInfo)))

        await handler(req, res)

        expect(res._getStatusCode()).toBe(httpStatus.OK)
        expect(res._getJSONData()).toEqual({
            username: userInfo.email,
            picture: null,
            oidcHeaderFound: true,
            oidcHeaderValid: true,
            oidcProvider: "AD",
        })
    })
})
