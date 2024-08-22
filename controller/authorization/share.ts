import {RelationType, ResourceType, Status} from "../../generated/auth"
import {ShareRequest, ShareResponse} from "../../generated/sharing"
import {User} from "../../generated/user"
import useEnvironmentStore from "../../state/environment"
const SHARE_API_PATH = "api/v1/share/grant"

export async function share(projectId: number, requester: string, targetUser: string) {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl

    // Construct the URL
    const shareUrl = `${baseUrl}/${SHARE_API_PATH}`

    const user: User = {
        login: requester,
    }
    const shareRequest: ShareRequest = {
        user: user,
        isGranted: true,
        shareInfo: {
            beneficiary: {
                user: {
                    login: targetUser,
                },
            },
            relation: RelationType.TOURIST,
            shareTarget: {
                id: projectId,
                resourceType: ResourceType.PROJECT,
            },
        },
    }

    const shareRequestAsJson = ShareRequest.toJSON(shareRequest)

    const res = await fetch(shareUrl, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(shareRequestAsJson),
    })

    // Check if the request was successful
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText} error code ${res.status}`)
    }

    const response = ShareResponse.fromJSON(await res.json())
    if (!response || response.status !== Status.SUCCESS) {
        console.debug("response", response)
        throw new Error(`Failed to share: ${response.status}`)
    }
}
