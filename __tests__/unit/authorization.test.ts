/*
Unit tests for the authorization utility module
 */

import * as authFetch from "../../controller/auth/fetch"
import {AuthInfo, PermissionType, ResourceType} from "../../generated/auth"
import {condenseAuthorizationInfo, getAllPermissionsByResourceType} from "../../utils/authorization"

describe("getAllPermissionsByResourceType", () => {
    it("should return the authorization policies in a formatted response", async () => {
        jest.spyOn(authFetch, "fetchAuthorization")
            .mockImplementationOnce(
                () =>
                    [
                        {
                            authQuery: {
                                permission: "UPDATE",
                                target: {
                                    resourceType: "PROJECT",
                                    id: "2539",
                                },
                            },
                            isAuthorized: true,
                        },
                    ] as unknown as Promise<AuthInfo[]>
            )
            .mockImplementationOnce(
                () =>
                    [
                        {
                            authQuery: {
                                permission: "DELETE",
                                target: {
                                    resourceType: "PROJECT",
                                    id: "2539",
                                },
                            },
                            isAuthorized: true,
                        },
                    ] as unknown as Promise<AuthInfo[]>
            )

        const response = await getAllPermissionsByResourceType("mockUser", ResourceType.PROJECT, [{id: 2539}])

        expect(response).toEqual([
            {
                id: "2539",
                update: true,
                delete: true,
            },
        ])
    })
})

describe("condenseAuthorizationInfo", () => {
    it("should return condensed authorizationInfo by permission type", () => {
        const info = condenseAuthorizationInfo([
            {
                authQuery: {
                    permission: PermissionType.UPDATE,
                    target: {
                        resourceType: ResourceType.PROJECT,
                        id: 2539,
                    },
                },
                isAuthorized: true,
            },
            {
                authQuery: {
                    permission: PermissionType.UPDATE,
                    target: {
                        resourceType: ResourceType.PROJECT,
                        id: 123,
                    },
                },
                isAuthorized: false,
            },
        ])

        expect(info).toEqual([
            {id: "2539", update: true},
            {id: "123", update: false},
        ])
    })
})
