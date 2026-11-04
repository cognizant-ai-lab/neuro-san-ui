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
    isPublishNameTaken,
    listPublishedNetworks,
    publishNetwork,
    unpublishNetwork,
} from "../../../controller/publish/Publish"
import {Published, PublishStatus, resolveNetworkId, usePublishStore} from "../../../state/Publish"
import {PublishedDeployment, useTempNetworksStore} from "../../../state/TemporaryNetworks"
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
const getPublishedDeployment = (networkId: string, {serverUrl, orgName}: PublishTarget): PublishedDeployment | null => {
    const published = useTempNetworksStore
        .getState()
        .tempNetworks.find((network) => network.agentInfo.agent_name === networkId)?.published
    const isSameTarget = published?.serverUrl === serverUrl && published.orgName.toLowerCase() === orgName.toLowerCase()
    return isSameTarget ? published : null
}

/**
 * Asks the server how the network this browser published is doing, for example after a reload, and remembers it.
 * Does nothing if we already know the network's publish state, or if this browser hasn't published it.
 */
export const checkIfPublished = async (network: PublishNetwork, target: PublishTarget): Promise<void> => {
    const {serverUrl} = target
    const {networks, publishedList, setPublishedList} = usePublishStore.getState()
    const deployment = getPublishedDeployment(network.id, target)
    if (networks[network.id] || !deployment) return

    // Every network on screen asks, so they share one request for the server's list
    let request = publishedList?.serverUrl === serverUrl ? publishedList.request : null
    if (!request) {
        request = listPublishedNetworks(serverUrl)
        setPublishedList({serverUrl, request})
    }

    try {
        const published = (await request).find((candidate) => candidate.id === deployment.deploymentId)

        // Don't overwrite a publish the user started while we were asking
        if (!published || usePublishStore.getState().networks[network.id]) return

        usePublishStore
            .getState()
            .setPublishState(
                network.id,
                published.url
                    ? {status: PublishStatus.Published, serverUrl, publishId: published.id, url: published.url}
                    : {status: PublishStatus.Unpublished}
            )
    } catch (e) {
        setPublishedList(null)
        console.warn(`Unable to check whether "${network.name}" is published:`, e)
    }
}

/**
 * A name to publish the network under for the first time: its own name, unless the org already has a network under
 * it. The server would replace that network, which may be someone else's, so then it ends in an id of its own.
 */
const makePublishName = async (networkName: string, {serverUrl, orgName}: PublishTarget): Promise<string> =>
    (await isPublishNameTaken(serverUrl, orgName, networkName)) ? `${networkName}_${uuid().slice(0, 8)}` : networkName

/**
 * Publishes the network's HOCON, the same file Download gives, waits for it to go live, then opens it in a new tab.
 * Republishing is the same, and replaces what this network published before. Tells the user how it went either
 * way.
 * @param refreshTheme Has the server make a new theme instead of keeping the one it made before
 */
export const publish = async (
    network: PublishNetwork,
    hocon: string,
    target: PublishTarget,
    refreshTheme: boolean
): Promise<void> => {
    const {clearPublishState, networks, setPublishState, setPublishedList} = usePublishStore.getState()
    const previousState = networks[network.id]
    setPublishState(network.id, {status: PublishStatus.Publishing})

    try {
        const {serverUrl, orgName} = target
        // Publishing again goes to the same deployment, under the name it was first published under
        const publishName =
            getPublishedDeployment(network.id, target)?.name ?? (await makePublishName(network.name, target))
        const ready = await publishNetwork({
            serverUrl,
            orgName,
            networkName: publishName,
            hocon,
            refreshTheme,
            // Remembered as soon as the server has it, so a publish that fails can still be published again. On the
            // network that's there now, in case it was edited while publishing.
            onAccepted: (deploymentId) =>
                useTempNetworksStore.getState().setTempNetworkPublished(resolveNetworkId(network.id), {
                    serverUrl,
                    orgName,
                    deploymentId,
                    name: publishName,
                }),
        })
        setPublishState(network.id, {status: PublishStatus.Published, serverUrl, publishId: ready.id, url: ready.url})

        const message = openInNewTab(ready.url) ? PUBLISHED_MESSAGE : PUBLISHED_TAB_BLOCKED_MESSAGE
        sendNotification(NotificationType.success, message, "", {vertical: "bottom", horizontal: "center"})
    } catch (e) {
        sendNotification(NotificationType.error, `Failed to publish "${network.name}".`, String(e))
        // A failed republish can leave it live, unpublished, or never published, so ask the server which
        clearPublishState(network.id)
        setPublishedList(null)
        await checkIfPublished({...network, id: resolveNetworkId(network.id)}, target)

        // If the server couldn't be asked either, it was published before, so keep offering to recreate its theme
        if (previousState && !usePublishStore.getState().networks[resolveNetworkId(network.id)]) {
            setPublishState(network.id, {status: PublishStatus.Unpublished})
        }
    }
}

/**
 * Stops a live network, which takes it off the map, on the server it was published to. The server keeps it, so it can
 * be published again.
 */
export const unpublish = async (network: PublishNetwork, published: Published): Promise<void> => {
    const {setPublishState, setPublishedList} = usePublishStore.getState()
    setPublishState(network.id, {...published, isUnpublishing: true})

    try {
        await unpublishNetwork(published.serverUrl, published.publishId)
        setPublishState(network.id, {status: PublishStatus.Unpublished})
        // The shared list still has it as live, so drop the list too
        setPublishedList(null)
    } catch (e) {
        setPublishState(network.id, {...published, isUnpublishing: false})
        sendNotification(NotificationType.error, `Failed to unpublish "${network.name}".`, String(e))
    }
}
