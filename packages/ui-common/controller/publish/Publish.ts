/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

/**
 * Client for the publish server. Requests go through our `/api/publish` route because the server doesn't allow
 * requests from browsers.
 */

import httpStatus from "http-status"

//#region Types

export interface PublishedNetwork {
    readonly id: string
    readonly name: string
    /** Null once it's unpublished, since the server keeps it stopped */
    readonly url: string | null
}

interface PublishNetworkRequest {
    readonly serverUrl: string
    readonly orgName: string
    readonly networkName: string
    readonly hocon: string
    /** Has the server make a new theme instead of keeping the one it made before */
    readonly refreshTheme?: boolean
}

/** The subset of the server's view of a published network (its DeploymentView) that we use */
interface ServerNetwork {
    readonly id: string
    readonly name: string
    readonly org_name: string
    readonly status: "queued" | "building" | "ready" | "failed" | "stopped"
    /** Set once status is ready */
    readonly url?: string | null
    readonly error?: string | null
}

type LiveNetwork = PublishedNetwork & {readonly url: string}

//#endregion Types

//#region Constants

// How long the Settings test waits for the server to answer
const HEALTH_TIMEOUT_MS = 5_000

// How long each /wait request holds open waiting for the build to finish
export const WAIT_TIMEOUT_SECONDS = 60

//#endregion Constants

const publishRouteUrl = (serverUrl: string, path: string, query: Record<string, string> = {}): string =>
    `/api/publish/${path}?${new URLSearchParams({server: serverUrl, ...query})}`

/**
 * Throws with the server's explanation if the response isn't OK.
 * @param action What we were doing, for the error message
 */
const throwIfNotOk = async (response: Response, action: string): Promise<void> => {
    if (response.ok) return

    let reason = response.statusText
    try {
        // The server is FastAPI, which explains errors in `detail`
        const {detail} = await response.json()
        reason = typeof detail === "string" ? detail : JSON.stringify(detail)
    } catch {
        // Not JSON, so keep the status text
    }
    throw new Error(`${action} failed (${response.status}): ${reason}`)
}

/**
 * Checks that a publishing server is up and accepts our token.
 * @returns Whether it's a healthy publishing server that accepts the token. False if it couldn't be reached, didn't
 * answer in time, isn't a publishing server, isn't OK, or turned the token down.
 */
export const checkHealth = async (serverUrl: string): Promise<boolean> => {
    try {
        const signal = AbortSignal.timeout(HEALTH_TIMEOUT_MS)

        const healthResponse = await fetch(publishRouteUrl(serverUrl, "health"), {signal})
        if (!healthResponse.ok) return false

        // Other servers can answer "ok" too, but only a publishing server reports its port pool
        const health: {status?: string; port_pool?: unknown} = await healthResponse.json()
        if (health.status !== "ok" || !health.port_pool) return false

        // /health doesn't need the token, so also ask for something that does
        const listResponse = await fetch(publishRouteUrl(serverUrl, "deployments"), {signal})
        return listResponse.ok
    } catch {
        return false
    }
}

/**
 * Lists the org's published networks, live or unpublished.
 */
export const listPublishedNetworks = async (serverUrl: string, orgName: string): Promise<PublishedNetwork[]> => {
    const response = await fetch(publishRouteUrl(serverUrl, "deployments"))
    await throwIfNotOk(response, "Listing published networks")
    const {deployments: networks}: {deployments: ServerNetwork[]} = await response.json()

    // Unpublishing only stops it, and a failed publish leaves it failed. Either can be republished.
    // Compared in lowercase: the server files a publish under an existing org whose name differs only in case, and
    // lists it with that org's spelling, so "darren" can come back as "Darren"
    const isOurOrg = (network: ServerNetwork) => network.org_name.toLowerCase() === orgName.toLowerCase()
    const isListed = (network: ServerNetwork) =>
        (network.status === "ready" && Boolean(network.url)) ||
        network.status === "stopped" ||
        network.status === "failed"

    return networks
        .filter((network) => isOurOrg(network) && isListed(network))
        .map((network) => ({id: network.id, name: network.name, url: network.status === "ready" ? network.url : null}))
}

/**
 * Uploads the HOCON and waits until the network is live.
 */
export const publishNetwork = async ({
    serverUrl,
    orgName,
    networkName,
    hocon,
    refreshTheme = false,
}: PublishNetworkRequest): Promise<LiveNetwork> => {
    const form = new FormData()
    form.append("file", new Blob([hocon], {type: "text/plain"}), `${networkName}.hocon`)
    form.append("name", networkName)
    // Lowercase, like the org names we look for when listing
    form.append("org_name", orgName.toLowerCase())
    // Without theme the server makes a plain page. theme_refresh=false keeps a theme it already made for this network.
    form.append("theme", "true")
    form.append("theme_refresh", String(refreshTheme))

    const createResponse = await fetch(publishRouteUrl(serverUrl, "deployments"), {method: "POST", body: form})
    await throwIfNotOk(createResponse, "Publishing")
    let network: ServerNetwork = await createResponse.json()

    while (network.status === "queued" || network.status === "building") {
        const waitResponse = await fetch(
            publishRouteUrl(serverUrl, `deployments/${network.id}/wait`, {timeout: String(WAIT_TIMEOUT_SECONDS)})
        )
        // A timeout means it's still building, so ask again
        if (waitResponse.status !== httpStatus.GATEWAY_TIMEOUT) {
            await throwIfNotOk(waitResponse, "Waiting for it to go live")
            network = await waitResponse.json()
        }
    }

    if (network.status !== "ready" || !network.url) {
        throw new Error(network.error || `Publishing ended as ${network.status}`)
    }

    return {id: network.id, name: network.name, url: network.url}
}

/**
 * Takes a published network offline.
 */
export const unpublishNetwork = async (serverUrl: string, publishId: string): Promise<void> => {
    const response = await fetch(publishRouteUrl(serverUrl, `deployments/${publishId}`), {method: "DELETE"})
    await throwIfNotOk(response, "Unpublishing")
}
