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

import {create} from "zustand"
import {persist} from "zustand/middleware"

import {AgentNetworkDefinitionEntry} from "../components/MultiAgentAccelerator/const"
import {AgentInfo} from "../generated/neuro-san/NeuroSanClient"

type AgentReservation = {
    readonly reservation_id: string
    readonly lifetime_in_seconds: number
    readonly expiration_time_in_seconds: number
}

export type TemporaryNetwork = {
    readonly reservation: AgentReservation
    readonly agentInfo: AgentInfo
    /** The agent_network_name as sent by the backend — used when bouncing sly_data back to the backend. */
    readonly agentNetworkName: string
    readonly networkHocon?: string | null
    readonly agentNetworkDefinition?: AgentNetworkDefinitionEntry[]
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
     * matches an existing one, the existing entry is replaced. Returns the final list of upserted
     * networks (those that were added or replaced).
     */
    readonly upsertTempNetworks: (incomingNetworks: TemporaryNetwork[]) => TemporaryNetwork[]
    readonly updateTempNetworkDefinition: (
        networkName: string,
        agentNetworkDefinition: AgentNetworkDefinitionEntry[]
    ) => void
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
                    const updated = [...state.tempNetworks]
                    for (const incomingNetwork of incomingNetworks) {
                        const existingIndex = updated.findIndex(
                            (network) => network.agentNetworkName === incomingNetwork.agentNetworkName
                        )
                        if (existingIndex >= 0) {
                            updated[existingIndex] = incomingNetwork // replace the existing entry in-place
                        } else {
                            updated.push(incomingNetwork) // no existing entry — add as new
                        }
                    }
                    return {tempNetworks: updated}
                })
                return incomingNetworks
            },
            updateTempNetworkDefinition: (networkName: string, agentNetworkDefinition: AgentNetworkDefinitionEntry[]) =>
                set((state) => {
                    const updated = [...state.tempNetworks]
                    const existingIndex = updated.findIndex((network) => network.agentInfo.agent_name === networkName)
                    if (existingIndex >= 0) {
                        updated[existingIndex] = {...updated[existingIndex], agentNetworkDefinition}
                    }
                    return {tempNetworks: updated}
                }),
        }),
        {
            name: "temp-networks",
        }
    )
)
