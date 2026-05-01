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
    readonly agentNetworkName?: string
    readonly networkHocon?: string | null
    readonly agentNetworkDefinition?: AgentNetworkDefinitionEntry[]
}

/**
 * Zustand state store for temporary networks, such as vibe coded networks created by the user.
 */
interface TempNetworksStore {
    readonly tempNetworks: TemporaryNetwork[]
    readonly setTempNetworks: (tempNetworks: TemporaryNetwork[]) => void
    readonly updateTempNetworkDefinition: (networkName: string, definition: AgentNetworkDefinitionEntry[]) => void
}

/**
 * The hook that lets apps use the store.
 */
export const useTempNetworksStore = create<TempNetworksStore>()(
    persist(
        (set) => ({
            tempNetworks: [] as TemporaryNetwork[],
            setTempNetworks: (tempNetworks: TemporaryNetwork[]) => set({tempNetworks}),
            updateTempNetworkDefinition: (networkName: string, definition: AgentNetworkDefinitionEntry[]) =>
                set((state) => ({
                    tempNetworks: state.tempNetworks.map((n) =>
                        n.agentInfo.agent_name === networkName ? {...n, agentNetworkDefinition: definition} : n
                    ),
                })),
        }),
        {
            name: "temp-networks",
        }
    )
)
