/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {keyBy} from "lodash-es"
import {create} from "zustand"
import {persist} from "zustand/middleware"

import {AgentNetworkDefinitionEntry} from "../components/MultiAgentAccelerator/const"
import {AgentInfo} from "../generated/neuro-san/NeuroSanClient"

type AgentReservation = {
    readonly reservation_id: string
    readonly lifetime_in_seconds: number
    readonly expiration_time_in_seconds: number
}

/** Where a network was published from this browser, so it's found on the publishing server by its id */
export type PublishedDeployment = {
    readonly serverUrl: string
    readonly orgName: string
    /** The publishing server's id for it */
    readonly deploymentId: string
    /** What it's published under. The server replaces by name and org, so no other network in the org had it. */
    readonly name: string
}

export type TemporaryNetwork = {
    readonly reservation: AgentReservation
    readonly agentInfo: AgentInfo
    /** The agent_network_name as sent by the backend — used when bouncing sly_data back to the backend. */
    readonly agentNetworkName: string
    readonly networkHocon?: string | null
    readonly agentNetworkDefinition?: AgentNetworkDefinitionEntry[]
    readonly deployment?: PublishedDeployment
}

/**
 * Zustand state store for temporary networks, such as vibe coded networks created by the user.
 */
interface TempNetworksStore {
    readonly tempNetworks: TemporaryNetwork[]
    readonly setTempNetworks: (tempNetworks: TemporaryNetwork[]) => void
    /**
     * Upsert new networks into the store. Networks are matched by the UUID-stripped portion of
     * their `reservation_id` (e.g. `"travel_agency_ops"` from `"travel_agency_ops-{uuid}"`), or, just
     * `agentNetworkName` which is the same as having the UUID-stripped. If an incoming network
     * matches an existing one, the incoming fields replace the existing ones. Returns the final list of upserted
     * networks (those that were added or replaced).
     */
    readonly upsertTempNetworks: (incomingNetworks: TemporaryNetwork[]) => TemporaryNetwork[]
    readonly updateTempNetworkDefinition: (
        networkName: string,
        agentNetworkDefinition: AgentNetworkDefinitionEntry[]
    ) => void
    readonly updateTempNetwork: (networkId: string, changes: Partial<TemporaryNetwork>) => void
}

/**
 * The hook that lets apps use the store.
 */
export const useTempNetworksStore = create<TempNetworksStore>()(
    persist(
        (set) => ({
            tempNetworks: [] as TemporaryNetwork[],
            setTempNetworks: (tempNetworks: TemporaryNetwork[]) => set({tempNetworks}),
            upsertTempNetworks: (incomingNetworks: TemporaryNetwork[]): TemporaryNetwork[] => {
                set((state) => {
                    const existing = keyBy(state.tempNetworks, "agentNetworkName")
                    const incoming = incomingNetworks.map((network) => ({
                        ...existing[network.agentNetworkName],
                        ...network,
                    }))
                    return {
                        // Key both sides by name and let incoming win; existing entries keep their position,
                        // new ones are appended.
                        tempNetworks: Object.values({...existing, ...keyBy(incoming, "agentNetworkName")}),
                    }
                })
                return incomingNetworks
            },
            updateTempNetworkDefinition: (networkName: string, agentNetworkDefinition: AgentNetworkDefinitionEntry[]) =>
                set(({tempNetworks}) => ({
                    tempNetworks: tempNetworks.map((network) =>
                        network.agentInfo.agent_name === networkName ? {...network, agentNetworkDefinition} : network
                    ),
                })),
            updateTempNetwork: (networkId: string, changes: Partial<TemporaryNetwork>) =>
                set(({tempNetworks}) => ({
                    tempNetworks: tempNetworks.map((network) =>
                        network.agentInfo.agent_name === networkId ? {...network, ...changes} : network
                    ),
                })),
        }),
        {
            name: "temp-networks",
        }
    )
)
