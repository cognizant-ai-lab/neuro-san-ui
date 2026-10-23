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
}

export interface Publishing {
    readonly status: PublishStatus.Publishing
    /** The network's name as people read it, for asking whether to keep waiting */
    readonly displayName: string
    /** Stops waiting for this publish */
    readonly waiting: AbortController
}

export interface Published {
    readonly status: PublishStatus.Published
    /** The publish server it's published on, so it's unpublished from the same one */
    readonly serverUrl: string
    /** The server's id for it, needed to unpublish */
    readonly publishId: string
    readonly url: string
}

export type PublishState = Publishing | Published

/** The org's published networks on a server, as one request every network can share */
interface PublishedList {
    /** Which server and org the list is for */
    readonly key: string
    readonly request: Promise<PublishedNetwork[]>
}

/**
 * Zustand state store for networks that are publishing or live, keyed by network id. Kept in memory only.
 */
interface PublishStore {
    readonly networks: Readonly<Record<string, PublishState>>
    readonly setPublishState: (networkId: string, publishState: PublishState) => void
    readonly clearPublishState: (networkId: string) => void
    readonly publishedList: PublishedList | null
    readonly setPublishedList: (publishedList: PublishedList | null) => void
}

export const usePublishStore = create<PublishStore>()((set) => ({
    networks: {},
    publishedList: null,
    setPublishedList: (publishedList) => set({publishedList}),
    setPublishState: (networkId, publishState) =>
        set(({networks}) => ({networks: {...networks, [networkId]: publishState}})),
    clearPublishState: (networkId) =>
        set(({networks}) => {
            const {[networkId]: _removed, ...rest} = networks
            return {networks: rest}
        }),
}))

/**
 * The publish server to use: the one set in Settings, otherwise the default from the environment.
 */
export const usePublishServerUrl = (): string | null => {
    const settingsServerUrl = useSettingsStore((state) => state.settings.publish.serverUrl)
    const defaultServerUrl = useEnvironmentStore((state) => state.publishServerUrl)
    return settingsServerUrl ?? defaultServerUrl
}
