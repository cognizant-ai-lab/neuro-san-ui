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

import {AgentInfo} from "../generated/neuro-san/NeuroSanClient"

/**
 * Zustand state store for temporary networks, such as vibe coded networks created by the user.
 */
export interface TempNetworksStore {
    readonly tempNetworks: AgentInfo[]
    setTempNetworks: (tempNetworks: AgentInfo[]) => void
}

/**
 * The hook that lets apps use the store.
 */
export const useTempNetworksStore = create<TempNetworksStore>()(
    persist(
        (set) => ({
            tempNetworks: [],
            setTempNetworks: (tempNetworks: AgentInfo[]) => set({tempNetworks}),
        }),
        {
            name: "temp-networks-storage",
        }
    )
)
