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

export const PUBLISH_SETTINGS_REQUIRED_MESSAGE =
    "Add a publish server and org name in Settings > External Services to publish"
export const PUBLISHED_MESSAGE = "Published and opened in a new tab"
export const PUBLISHED_TAB_BLOCKED_MESSAGE = "Published. Click View live to open it."

/** Where networks are published, from Settings */
export interface PublishTarget {
    readonly serverUrl: string
    readonly orgName: string
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
 * Asks the server whether the network has been published, for example after a reload, and remembers it if so. Does
 * nothing if we already know the network's publish state.
 */
export const checkIfPublished = async (networkName: string, {serverUrl, orgName}: PublishTarget): Promise<void> => {
    const {networks, publishedList, setPublishedList} = usePublishStore.getState()
    if (networks[networkName]) return

    // Every network on screen asks, so they share one request for the org's list
    const key = `${serverUrl} ${orgName}`
    let request = publishedList?.key === key ? publishedList.request : null
    if (!request) {
        request = listPublishedNetworks(serverUrl, orgName)
        setPublishedList({key, request})
    }

    try {
        const candidates = (await request).filter((candidate) => candidate.name === networkName)
        const published = candidates.find((candidate) => candidate.url) ?? candidates[0]

        // Don't overwrite a publish the user started while we were asking
        if (!published || usePublishStore.getState().networks[networkName]) return

        usePublishStore
            .getState()
            .setPublishState(
                networkName,
                published.url
                    ? {status: PublishStatus.Published, serverUrl, publishId: published.id, url: published.url}
                    : {status: PublishStatus.Unpublished}
            )
    } catch (e) {
        setPublishedList(null)
        console.warn(`Unable to check whether "${networkName}" is published:`, e)
    }
}

/**
 * Publishes the network's HOCON, the same file Download gives, waits for it to go live, then opens it in a new tab.
 * Republishing is the same, and replaces what's published under the network's name. Tells the user how it went either
 * way.
 * @param refreshTheme Has the server make a new theme instead of keeping the one it made before
 */
export const publish = async (
    networkName: string,
    hocon: string,
    target: PublishTarget,
    refreshTheme = false
): Promise<void> => {
    const {clearPublishState, networks, setPublishState, setPublishedList} = usePublishStore.getState()
    const previousState = networks[networkName]
    setPublishState(networkName, {status: PublishStatus.Publishing})

    try {
        const {serverUrl, orgName} = target
        const ready = await publishNetwork({serverUrl, orgName, networkName, hocon, refreshTheme})
        setPublishState(networkName, {status: PublishStatus.Published, serverUrl, publishId: ready.id, url: ready.url})

        const message = openInNewTab(ready.url) ? PUBLISHED_MESSAGE : PUBLISHED_TAB_BLOCKED_MESSAGE
        sendNotification(NotificationType.success, message, "", {vertical: "bottom", horizontal: "center"})
    } catch (e) {
        sendNotification(NotificationType.error, `Failed to publish "${networkName}".`, String(e))
        // A failed republish can leave it live, unpublished, or never published, so ask the server which
        clearPublishState(networkName)
        setPublishedList(null)
        await checkIfPublished(networkName, target)

        // If the server couldn't be asked either, it was still published before, so keep offering Republish
        if (previousState && !usePublishStore.getState().networks[networkName]) {
            setPublishState(networkName, {status: PublishStatus.Unpublished})
        }
    }
}

/**
 * Takes a live network offline, on the server it was published to. The server keeps it, so it can be republished.
 */
export const unpublish = async (networkName: string, published: Published): Promise<void> => {
    const {setPublishState, setPublishedList} = usePublishStore.getState()
    setPublishState(networkName, {...published, isUnpublishing: true})

    try {
        await unpublishNetwork(published.serverUrl, published.publishId)
        setPublishState(networkName, {status: PublishStatus.Unpublished})
        // The shared list still has it as live, so drop the list too
        setPublishedList(null)
    } catch (e) {
        setPublishState(networkName, {...published, isUnpublishing: false})
        sendNotification(NotificationType.error, `Failed to unpublish "${networkName}".`, String(e))
    }
}
