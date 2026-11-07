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

import {create} from "zustand"

import {useEnvironmentStore} from "./Environment"
import {useSettingsStore} from "./Settings"
import {PublishedNetwork} from "../controller/publish/Publish"

export enum PublishStatus {
    Publishing = "Publishing",
    Published = "Published",
    Unpublished = "Unpublished",
}

export interface Published {
    readonly status: PublishStatus.Published
    /** The publishing server the network is published on, so it's unpublished from the same server */
    readonly serverUrl: string
    /** The server's id for the deployment, needed to unpublish */
    readonly publishId: string
    readonly url: string
    /** Set while the network is being unpublished, when it can't be republished */
    readonly isUnpublishing?: boolean
}

export type PublishState =
    | {readonly status: PublishStatus.Publishing}
    | Published
    // Published before and now unpublished, or the publish failed. The server keeps the network, so it can be published
    // again.
    | {readonly status: PublishStatus.Unpublished}

/** A server's published networks, as one request every network can share */
interface PublishedList {
    readonly serverUrl: string
    readonly request: Promise<PublishedNetwork[]>
}

/**
 * Zustand state store for networks that have been published, keyed by network id. Kept in memory only, since each
 * network asks the server for it by the id of its deployment.
 */
interface PublishStore {
    readonly networks: Readonly<Record<string, PublishState>>
    readonly setPublishState: (networkId: string, publishState: PublishState) => void
    readonly clearPublishState: (networkId: string) => void
    /** Which network an edit replaced each one with, so a publish still finishing reaches the one there now */
    readonly replacedBy: Readonly<Record<string, string>>
    /** Moves a network's publish state to the network an edit replaced it with */
    readonly replaceNetwork: (fromId: string, toId: string) => void
    readonly publishedList: PublishedList | null
    readonly setPublishedList: (publishedList: PublishedList | null) => void
}

// Follows a network through any edits that replaced it
const followReplacements = (replacedBy: PublishStore["replacedBy"], networkId: string): string => {
    let currentId = networkId
    while (replacedBy[currentId]) currentId = replacedBy[currentId]
    return currentId
}

export const usePublishStore = create<PublishStore>()((set) => ({
    networks: {},
    publishedList: null,
    replacedBy: {},
    setPublishedList: (publishedList) => set({publishedList}),
    setPublishState: (networkId, publishState) =>
        set(({networks, replacedBy}) => ({
            networks: {...networks, [followReplacements(replacedBy, networkId)]: publishState},
        })),
    clearPublishState: (networkId) =>
        set(({networks, replacedBy}) => {
            const {[followReplacements(replacedBy, networkId)]: _removed, ...rest} = networks
            return {networks: rest}
        }),
    replaceNetwork: (fromId, toId) =>
        set(({networks, replacedBy}) => {
            // A save that kept the id replaced nothing, and recording it would point the network at itself
            if (fromId === toId) return {}

            const {[fromId]: publishState, ...rest} = networks
            return {
                networks: publishState ? {...rest, [toId]: publishState} : rest,
                replacedBy: {...replacedBy, [fromId]: toId},
            }
        }),
}))

/**
 * Follows a network id through any edits that replaced the network, to the id of the network the user has now
 */
export const resolveNetworkId = (networkId: string): string =>
    followReplacements(usePublishStore.getState().replacedBy, networkId)

// What we know about published networks is for the publish server and org in Settings, so forget it when either
// changes and let each network ask the server again. Networks that are publishing keep their state until they finish.
useSettingsStore.subscribe(({settings: {publish}}, {settings: {publish: previous}}) => {
    if (publish.serverUrl === previous.serverUrl && publish.orgName === previous.orgName) return

    usePublishStore.setState(({networks}) => ({
        networks: Object.fromEntries(
            Object.entries(networks).filter(([, publishState]) => publishState.status === PublishStatus.Publishing)
        ),
        publishedList: null,
    }))
})

/**
 * The publish server to use: the one set in Settings, otherwise the default from the environment.
 */
export const usePublishServerUrl = (): string | null => {
    const settingsServerUrl = useSettingsStore((state) => state.settings.publish.serverUrl)
    const defaultServerUrl = useEnvironmentStore((state) => state.publishServerUrl)
    return settingsServerUrl ?? defaultServerUrl
}
