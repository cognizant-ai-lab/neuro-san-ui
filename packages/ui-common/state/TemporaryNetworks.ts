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
    /**
     * Upsert new networks into the store. Networks are matched by the UUID-stripped portion of
     * their `reservation_id` (e.g. `"travel_agency_ops"` from `"travel_agency_ops-{uuid}"`), falling
     * back to `agentNetworkName` when the reservation_id has no UUID suffix. If an incoming network
     * matches an existing one, the existing entry is replaced. Returns the final list of upserted
     * networks (those that were added or replaced).
     */
    readonly upsertTempNetworks: (newNetworks: TemporaryNetwork[]) => TemporaryNetwork[]
    readonly updateTempNetworkDefinition: (networkName: string, definition: AgentNetworkDefinitionEntry[]) => void
}

// UUID v4 suffix pattern used to derive the canonical network name from a reservation_id.
// Mirrors the regex in components/MultiAgentAccelerator/TemporaryNetworks.ts — kept here so the
// state layer has no dependency on the component layer.
const UUID_SUFFIX_RE = /-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu

/**
 * Returns the best available canonical name for a network: the explicit `agentNetworkName` when
 * present, or the name derived by stripping the UUID suffix from the reservation_id.
 * Returns the best available canonical name for a network, used as the dedup key in upsert.
 * The UUID-stripped reservation_id is preferred because it is always consistent regardless of
 * what prefix the backend may place in `agentNetworkName` (e.g. `"generated/travel_agency_ops"`
 * vs `"travel_agency_ops"`). Falls back to `agentNetworkName` when the reservation_id has no
 * UUID suffix (legacy reservations with static IDs).
 */
const effectiveNetworkName = (n: TemporaryNetwork): string | undefined => {
    const stripped = n.reservation.reservation_id.replace(UUID_SUFFIX_RE, "")
    if (stripped !== n.reservation.reservation_id) return stripped
    return n.agentNetworkName
}

/**
 * The hook that lets apps use the store.
 */
export const useTempNetworksStore = create<TempNetworksStore>()(
    persist(
        (set) => ({
            tempNetworks: [] as TemporaryNetwork[],
            setTempNetworks: (tempNetworks: TemporaryNetwork[]) => set({tempNetworks}),
            upsertTempNetworks: (newNetworks: TemporaryNetwork[]): TemporaryNetwork[] => {
                const upserted: TemporaryNetwork[] = []
                set((state) => {
                    const updated = [...state.tempNetworks]
                    for (const newNetwork of newNetworks) {
                        const newName = effectiveNetworkName(newNetwork)
                        if (newName) {
                            const existingIdx = updated.findIndex((n) => effectiveNetworkName(n) === newName)
                            if (existingIdx >= 0) {
                                updated[existingIdx] = newNetwork
                            } else {
                                updated.push(newNetwork)
                            }
                        } else {
                            updated.push(newNetwork)
                        }
                        upserted.push(newNetwork)
                    }
                    return {tempNetworks: updated}
                })
                return upserted
            },
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
