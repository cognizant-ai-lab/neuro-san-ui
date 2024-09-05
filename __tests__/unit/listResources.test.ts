/*
Unit tests for the list utility module
 */

import * as listResourceFetch from "../../controller/list/fetch"
import {AuthQuery, ResourceType, RoleType} from "../../generated/auth"
import {getResourceListIds} from "../../utils/listResources"

const MOCK_LIST_RESOURCE_RESPONSE = [
    {
        role: "OWNER",
        target: {
            resourceType: "PROJECT",
            id: 1,
        },
    },
    {
        role: "OWNER",
        target: {
            resourceType: "PROJECT",
            id: 2,
        },
    },
    {
        role: "OWNER",
        target: {
            resourceType: "PROJECT",
            id: 3,
        },
    },
] as unknown as Promise<AuthQuery[]>

describe("getResourceListIds", () => {
    let listFetchSpy

    beforeEach(() => {
        listFetchSpy = jest
            .spyOn(listResourceFetch, "fetchResourceList")
            .mockImplementationOnce(() => MOCK_LIST_RESOURCE_RESPONSE)
    })

    it("should return a list of unique ids", async () => {
        const resourceIds = await getResourceListIds("mock-user", ResourceType.PROJECT, RoleType.OWNER)

        expect(listFetchSpy).toHaveBeenCalled()
        expect(resourceIds).toEqual(new Set([1, 2, 3]))
    })
})
