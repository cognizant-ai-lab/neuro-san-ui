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

import {listPublishedNetworks, publishNetwork, unpublishNetwork} from "../../../controller/publish/Publish"
import {Published, PublishStatus, usePublishStore} from "../../../state/Publish"
import {NotificationType, sendNotification} from "../../Common/notification"

// How long to wait on a publish before asking whether to keep waiting, and again after each "Keep waiting"
export const ASK_TO_KEEP_WAITING_MS = 3 * 60_000
export const PUBLISH_SETTINGS_REQUIRED_MESSAGE =
    "Add a publish server and org name in Settings > External Services to publish"
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
 * Asks the server whether the network is already live, for example after a reload, and remembers it if so. Does
 * nothing if we already know the network's publish state.
 */
export const checkIfPublished = async (network: PublishNetwork, {serverUrl, orgName}: PublishTarget): Promise<void> => {
    const {networks, publishedList, setPublishedList} = usePublishStore.getState()
    if (networks[network.id]) return

    // Every network on screen asks, so they share one request for the org's list
    const key = `${serverUrl} ${orgName}`
    let request = publishedList?.key === key ? publishedList.request : null
    if (!request) {
        request = listPublishedNetworks(serverUrl, orgName)
        setPublishedList({key, request})
    }

    try {
        const published = (await request).find((candidate) => candidate.name === network.name)

        // Don't overwrite a publish the user started while we were asking
        if (!published || usePublishStore.getState().networks[network.id]) return

        usePublishStore.getState().setPublishState(network.id, {
            status: PublishStatus.Published,
            serverUrl,
            publishId: published.id,
            url: published.url,
        })
    } catch (e) {
        setPublishedList(null)
        console.warn(`Unable to check whether "${network.name}" is published:`, e)
    }
}

/**
 * Publishes the network's HOCON, the same file Download gives, waits for it to go live, then opens it in a new tab.
 * Tells the user how it went either way.
 * @param signal Stops waiting, which puts the button back on Publish without an error
 */
export const publish = async (
    network: PublishNetwork,
    hocon: string,
    {serverUrl, orgName}: PublishTarget,
    signal?: AbortSignal
): Promise<void> => {
    const {clearPublishState, setPublishState, setPublishedList} = usePublishStore.getState()
    setPublishState(network.id, {status: PublishStatus.Publishing})

    try {
        const ready = await publishNetwork({serverUrl, orgName, networkName: network.name, hocon, signal})
        setPublishState(network.id, {status: PublishStatus.Published, serverUrl, publishId: ready.id, url: ready.url})

        const message = openInNewTab(ready.url) ? PUBLISHED_MESSAGE : PUBLISHED_TAB_BLOCKED_MESSAGE
        sendNotification(NotificationType.success, message, "", {vertical: "bottom", horizontal: "center"})
    } catch (e) {
        clearPublishState(network.id)
        if (signal?.aborted) {
            // The server may still finish, so the next check should ask it again
            setPublishedList(null)
            return
        }
        sendNotification(NotificationType.error, `Failed to publish "${network.name}".`, String(e))
    }
}

/**
 * Takes a live network offline, on the server it was published to.
 */
export const unpublish = async (network: PublishNetwork, published: Published): Promise<void> => {
    try {
        await unpublishNetwork(published.serverUrl, published.publishId)
        // The shared list still has it as live, so drop the list too
        const {clearPublishState, setPublishedList} = usePublishStore.getState()
        clearPublishState(network.id)
        setPublishedList(null)
    } catch (e) {
        sendNotification(NotificationType.error, `Failed to unpublish "${network.name}".`, String(e))
    }
}
