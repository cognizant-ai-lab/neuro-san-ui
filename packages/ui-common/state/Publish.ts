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

interface Publishing {
    readonly status: PublishStatus.Publishing
}

export interface Published {
    readonly status: PublishStatus.Published
    /** The publish server it's published on, so it's unpublished from the same one */
    readonly serverUrl: string
    /** The server's id for it, needed to unpublish */
    readonly publishId: string
    readonly url: string
    /** Set while it's being unpublished, when it can't be republished */
    readonly isUnpublishing?: boolean
}

/** Published before and since unpublished. The server keeps it stopped, so it can be republished. */
interface Unpublished {
    readonly status: PublishStatus.Unpublished
}

export type PublishState = Publishing | Published | Unpublished

/** The org's published networks on a server, as one request every network can share */
interface PublishedList {
    /** Which server and org the list is for */
    readonly key: string
    readonly request: Promise<PublishedNetwork[]>
}

/**
 * Zustand state store for networks that have been published, keyed by agent network name, which is how the server
 * knows them. Editing a network keeps its name, so the edited copy shares the state. Kept in memory only.
 */
interface PublishStore {
    readonly networks: Readonly<Record<string, PublishState>>
    readonly setPublishState: (networkName: string, publishState: PublishState) => void
    readonly clearPublishState: (networkName: string) => void
    readonly publishedList: PublishedList | null
    readonly setPublishedList: (publishedList: PublishedList | null) => void
}

export const usePublishStore = create<PublishStore>()((set) => ({
    networks: {},
    publishedList: null,
    setPublishedList: (publishedList) => set({publishedList}),
    setPublishState: (networkName, publishState) =>
        set(({networks}) => ({networks: {...networks, [networkName]: publishState}})),
    clearPublishState: (networkName) =>
        set(({networks}) => {
            const {[networkName]: _removed, ...rest} = networks
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
