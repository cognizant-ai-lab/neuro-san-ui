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

import {v4 as uuid} from "uuid"

import {
    fetchBundle,
    isPublishNameTaken,
    listPublishedNetworks,
    PublishedNetwork,
    publishNetwork,
    unpublishNetwork,
} from "../../../controller/publish/Publish"
import {Published, PublishState, PublishStatus, resolveNetworkId, usePublishStore} from "../../../state/Publish"
import {PublishedDeployment, useTempNetworksStore} from "../../../state/TemporaryNetworks"
import {downloadFile} from "../../../utils/File"
import {NotificationType, sendNotification} from "../../Common/notification"

export const PUBLISH_SETTINGS_REQUIRED_MESSAGE =
    "Add a publishing server and org name in Settings > External Services to publish"
export const PUBLISHED_MESSAGE = "Published and opened in a new tab"
export const PUBLISHED_TAB_BLOCKED_MESSAGE = "Published. Click View live to open it."

/** Where networks are published, from Settings */
export interface PublishTarget {
    readonly serverUrl: string
    readonly orgName: string
}

export interface PublishNetwork {
    /** The network's id in the app, which the publish store is keyed by */
    readonly id: string
    /** The agent network name, which it's published under */
    readonly name: string
}

/**
 * Opens a URL in a new tab, cut off from this page.
 * @returns Whether the tab opened. False when the browser blocked it as a popup.
 * @note Sets `opener` by hand because the "noopener" feature makes window.open always return null, which would hide
 * whether the tab opened.
 */
export const openInNewTab = (url: string): boolean => {
    const tab = window.open(url, "_blank")
    if (!tab) return false

    tab.opener = null
    return true
}

/**
 * The deployment this browser published the network to, unless Settings has since changed the publishing server or
 * org, since its id only means something there
 */
const getPublishedDeployment = (networkId: string, {serverUrl, orgName}: PublishTarget): PublishedDeployment | null =>
    useTempNetworksStore
        .getState()
        .tempNetworks.find(
            ({agentInfo, deployment}) =>
                agentInfo.agent_name === networkId &&
                deployment?.serverUrl === serverUrl &&
                deployment.orgName.toLowerCase() === orgName.toLowerCase()
        )?.deployment ?? null

/**
 * Lists the server's published networks. Every network on screen checks its publish state, so they share one request.
 */
const listPublishedNetworksShared = (serverUrl: string): Promise<PublishedNetwork[]> => {
    const {publishedList, setPublishedList} = usePublishStore.getState()
    if (publishedList?.serverUrl === serverUrl) return publishedList.request

    const request = listPublishedNetworks(serverUrl)
    setPublishedList({serverUrl, request})
    // Drop a failed request, so the next check asks the server again
    request.catch(() => setPublishedList(null))
    return request
}

/**
 * Asks the server for the publish state of the deployment this browser saved for the network, for example after a
 * reload.
 * @returns The publish state, or null if this browser hasn't published the network or the server doesn't list it
 */
export const fetchPublishState = async (networkId: string, target: PublishTarget): Promise<PublishState | null> => {
    const deployment = getPublishedDeployment(networkId, target)
    if (!deployment) return null

    const publishedNetworks = await listPublishedNetworksShared(target.serverUrl)
    const publishedNetwork = publishedNetworks.find((candidate) => candidate.id === deployment.deploymentId)
    if (!publishedNetwork) return null

    return publishedNetwork.url
        ? {
              status: PublishStatus.Published,
              serverUrl: target.serverUrl,
              publishId: publishedNetwork.id,
              url: publishedNetwork.url,
          }
        : {status: PublishStatus.Unpublished}
}

/**
 * Asks the server for the network's publish state after a failed publish, and shows it unless the user has started
 * publishing again since
 */
const showServerPublishState = async (networkId: string, target: PublishTarget): Promise<void> => {
    const serverState = await fetchPublishState(resolveNetworkId(networkId), target).catch((): null => null)
    const {networks, setPublishState} = usePublishStore.getState()
    if (serverState && networks[resolveNetworkId(networkId)]?.status !== PublishStatus.Publishing) {
        setPublishState(networkId, serverState)
    }
}

/**
 * A name to publish the network under for the first time: its own name, unless the org already has a network under
 * it. The server would replace that network, which may be someone else's, so then it ends in an id of its own.
 */
const makePublishName = async (networkName: string, {serverUrl, orgName}: PublishTarget): Promise<string> =>
    (await isPublishNameTaken(serverUrl, orgName, networkName)) ? `${networkName}_${uuid().slice(0, 8)}` : networkName

/** How a publish went: live at the URL, failed with an error, or neither when the user stopped waiting */
export interface PublishResult {
    readonly url?: string
    readonly error?: string
}

/** How an unpublish went: an error if it failed */
export interface UnpublishResult {
    readonly error?: string
}

/**
 * Publishes the network's HOCON, the same file Download gives, and waits for the network to go live. Republishing is
 * the same, and replaces what this network published before.
 * @param refreshTheme Has the server make a new theme instead of keeping the theme it made before
 */
export const publish = async (
    network: PublishNetwork,
    displayName: string,
    hocon: string,
    target: PublishTarget,
    refreshTheme: boolean
): Promise<PublishResult> => {
    const {clearPublishState, networks, setPublishState, setPublishedList} = usePublishStore.getState()
    const previousState = networks[network.id]
    const waiting = new AbortController()
    setPublishState(network.id, {status: PublishStatus.Publishing, displayName, waiting})

    try {
        const {serverUrl, orgName} = target
        // Publishing again goes to the same deployment, under the name it was first published under
        const publishName =
            getPublishedDeployment(network.id, target)?.name ?? (await makePublishName(network.name, target))
        const liveNetwork = await publishNetwork({
            serverUrl,
            orgName,
            networkName: publishName,
            hocon,
            refreshTheme,
            signal: waiting.signal,
            // Save the deployment id as soon as the server accepts the publish, so MAUI can still find the deployment
            // if the build fails. Saved on the current network, since the user may have edited the network while
            // publishing.
            onAccepted: (deploymentId) =>
                useTempNetworksStore.getState().updateTempNetwork(resolveNetworkId(network.id), {
                    deployment: {serverUrl, orgName, deploymentId, name: publishName},
                }),
        })
        setPublishState(network.id, {
            status: PublishStatus.Published,
            serverUrl,
            publishId: liveNetwork.id,
            url: liveNetwork.url,
        })
        return {url: liveNetwork.url}
    } catch (e) {
        // A failed republish can leave the network live, unpublished, or never published. Until the server says which,
        // a network that was published before shows as unpublished, so it still offers to recreate its theme.
        if (previousState) {
            setPublishState(network.id, {status: PublishStatus.Unpublished})
        } else {
            clearPublishState(network.id)
        }
        setPublishedList(null)
        void showServerPublishState(network.id, target)
        // Stopping the wait isn't an error. The server may still finish, which the check above picks up.
        if (waiting.signal.aborted) return {}
        return {error: e instanceof Error ? e.message : String(e)}
    }
}

/**
 * Opens a network that was just published in a new tab, and tells the user how publishing went.
 */
export const showPublishResult = (networkName: string, result: PublishResult): void => {
    if (result.error) {
        sendNotification(NotificationType.error, `Failed to publish "${networkName}".`, result.error)
        return
    }
    if (!result.url) return

    const message = openInNewTab(result.url) ? PUBLISHED_MESSAGE : PUBLISHED_TAB_BLOCKED_MESSAGE
    sendNotification(NotificationType.success, message, "", {vertical: "bottom", horizontal: "center"})
}

/**
 * Stops a live network, which takes the network off the map, on the server it was published to. The server keeps the
 * network, so it can be published again.
 */
export const unpublish = async (network: PublishNetwork, published: Published): Promise<UnpublishResult> => {
    const {setPublishState, setPublishedList} = usePublishStore.getState()
    setPublishState(network.id, {...published, isUnpublishing: true})

    try {
        await unpublishNetwork(published.serverUrl, published.publishId)
        setPublishState(network.id, {status: PublishStatus.Unpublished})
        // The shared list still has the network as live, so drop the list too
        setPublishedList(null)
        return {}
    } catch (e) {
        setPublishState(network.id, {...published, isUnpublishing: false})
        return {error: e instanceof Error ? e.message : String(e)}
    }
}

/**
 * Downloads a static bundle of a live network, which can be hosted without the publish server.
 */
export const downloadBundle = async (network: PublishNetwork, published: Published): Promise<void> => {
    const {setPublishState} = usePublishStore.getState()
    setPublishState(network.id, {...published, isDownloadingBundle: true})

    try {
        const {archive, fileName} = await fetchBundle(published.serverUrl, published.publishId)
        downloadFile(archive, fileName, "application/gzip")
    } catch (e) {
        sendNotification(
            NotificationType.error,
            `Failed to download a bundle of "${network.name}".`,
            e instanceof Error ? e.message : String(e)
        )
    }

    // It can be republished while the bundle builds, so this only clears the flag if it's still live
    const current = usePublishStore.getState().networks[resolveNetworkId(network.id)]
    if (current?.status === PublishStatus.Published) {
        setPublishState(network.id, {...current, isDownloadingBundle: false})
    }
}
