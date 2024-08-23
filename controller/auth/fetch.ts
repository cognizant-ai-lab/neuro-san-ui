import {NotificationType, sendNotification} from "../../components/notification"
import {AuthorizeRequest, AuthorizeResponse, PermissionType, ResourceType} from "../../generated/auth"
import {DataSource, DataTag} from "../../generated/metadata"
import useEnvironmentStore from "../../state/environment"
import {Experiment} from "../experiments/types"
import {Project} from "../projects/types"
import {Run} from "../run/types"

export type AuthorizeRequestData = Project | Experiment | Run | DataSource | DataTag

export async function fetchAuthorization(
    requestUser: string,
    resourceType: ResourceType,
    permissionType: PermissionType,
    requestData: AuthorizeRequestData[]
) {
    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const projectURL = `${baseUrl}/api/v1/auth/authorize`

    const authQueries = requestData.map((data) => ({
        permission: permissionType,
        target: {
            resourceType,
            id: data.id,
        },
    }))

    const authRequest: AuthorizeRequest = AuthorizeRequest.fromPartial({
        user: {
            login: requestUser,
        },
        authQueries,
    })

    const rawResponse = await fetch(projectURL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(AuthorizeRequest.toJSON(authRequest)),
    })
    const response: AuthorizeResponse = await rawResponse.json()

    if (!rawResponse.ok) {
        sendNotification(NotificationType.error, "Internal error: failed to get authorization policies")
        return null
    }

    return AuthorizeResponse.fromJSON(response).authInfos
}
