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

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {TemporaryNetwork, useTempNetworksStore} from "../../../state/TemporaryNetworks"

const makeNetwork = (reservationId: string, agentNetworkName?: string): TemporaryNetwork => ({
    reservation: {
        reservation_id: reservationId,
        lifetime_in_seconds: 300,
        expiration_time_in_seconds: Date.now() / 1000 + 300,
    },
    agentInfo: {
        agent_name: `temporary/${reservationId}`,
    },
    agentNetworkName,
    networkHocon: null,
    agentNetworkDefinition: [],
})

describe("useTempNetworksStore / upsertTempNetworks", () => {
    withStrictMocks()

    beforeEach(() => {
        useTempNetworksStore.getState().setTempNetworks([])
    })

    it("appends new networks when no existing network shares the same agentNetworkName", () => {
        const net1 = makeNetwork("res-1", "network_alpha")
        const net2 = makeNetwork("res-2", "network_beta")

        useTempNetworksStore.getState().upsertTempNetworks([net1])
        useTempNetworksStore.getState().upsertTempNetworks([net2])

        const stored = useTempNetworksStore.getState().tempNetworks
        expect(stored).toHaveLength(2)
        expect(stored[0].agentInfo.agent_name).toBe("temporary/res-1")
        expect(stored[1].agentInfo.agent_name).toBe("temporary/res-2")
    })

    it("replaces an existing network when a new one has the same agentNetworkName", () => {
        const original = makeNetwork("res-1", "network_alpha")
        useTempNetworksStore.getState().upsertTempNetworks([original])

        const replacement = makeNetwork("res-2", "network_alpha")
        useTempNetworksStore.getState().upsertTempNetworks([replacement])

        const stored = useTempNetworksStore.getState().tempNetworks
        // Should still have only one network
        expect(stored).toHaveLength(1)
        // Should be the replacement, not the original
        expect(stored[0].agentInfo.agent_name).toBe("temporary/res-2")
    })

    it("replaces the correct network among multiple networks", () => {
        const netAlpha = makeNetwork("res-alpha", "network_alpha")
        const netBeta = makeNetwork("res-beta", "network_beta")
        useTempNetworksStore.getState().upsertTempNetworks([netAlpha, netBeta])

        const replacementBeta = makeNetwork("res-beta-v2", "network_beta")
        useTempNetworksStore.getState().upsertTempNetworks([replacementBeta])

        const stored = useTempNetworksStore.getState().tempNetworks
        expect(stored).toHaveLength(2)
        // Alpha should be unchanged
        expect(stored.find((n) => n.agentNetworkName === "network_alpha")?.agentInfo.agent_name).toBe(
            "temporary/res-alpha"
        )
        // Beta should be replaced
        expect(stored.find((n) => n.agentNetworkName === "network_beta")?.agentInfo.agent_name).toBe(
            "temporary/res-beta-v2"
        )
    })

    it("replaces an old network that has no agentNetworkName by deriving the name from its reservation_id", () => {
        // Simulates a network stored before the agentNetworkName field was introduced —
        // the reservation_id follows the {name}-{uuid} format so dedup can still work.
        const oldReservationId = "travel_agency_ops-40161f92-e539-4160-b4c3-7e8f957c2cfe"
        const oldNetwork = makeNetwork(oldReservationId, undefined) // no agentNetworkName

        useTempNetworksStore.getState().upsertTempNetworks([oldNetwork])

        const newReservationId = "travel_agency_ops-fdef1360-fe1b-46e4-8b6a-b63117cd1312"
        const newNetwork = makeNetwork(newReservationId, "travel_agency_ops")

        useTempNetworksStore.getState().upsertTempNetworks([newNetwork])

        const stored = useTempNetworksStore.getState().tempNetworks
        // Old network should be gone, replaced by the new one
        expect(stored).toHaveLength(1)
        expect(stored[0].agentInfo.agent_name).toBe(`temporary/${newReservationId}`)
    })

    it("replaces an old network via reservation_id fallback even when new network also has no agentNetworkName", () => {
        const oldReservationId = "my_network-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        const oldNetwork = makeNetwork(oldReservationId, undefined)

        useTempNetworksStore.getState().upsertTempNetworks([oldNetwork])

        const newReservationId = "my_network-11111111-2222-3333-4444-555555555555"
        const newNetwork = makeNetwork(newReservationId, undefined)

        useTempNetworksStore.getState().upsertTempNetworks([newNetwork])

        const stored = useTempNetworksStore.getState().tempNetworks
        expect(stored).toHaveLength(1)
        expect(stored[0].agentInfo.agent_name).toBe(`temporary/${newReservationId}`)
    })

    it("replaces an old network even when agentNetworkName has a backend-added prefix (e.g. 'generated/')", () => {
        // Real-world case: the old network was stored with agentNetworkName "generated/travel_agency_ops"
        // but the popup-save designer returns agentNetworkName "travel_agency_ops" (no prefix).
        // Without UUID-primary matching, effectiveNetworkName would return different strings → no match → append.
        const oldReservationId = "travel_agency_ops-40161f92-e539-4160-b4c3-7e8f957c2cfe"
        const oldNetwork = makeNetwork(oldReservationId, "generated/travel_agency_ops")

        useTempNetworksStore.getState().upsertTempNetworks([oldNetwork])

        const newReservationId = "travel_agency_ops-cf8307e6-aee9-4d09-86e1-c6c36e9aeeda"
        const newNetwork = makeNetwork(newReservationId, "travel_agency_ops")

        useTempNetworksStore.getState().upsertTempNetworks([newNetwork])

        const stored = useTempNetworksStore.getState().tempNetworks
        // Old network must be replaced; two entries would make both appear in the sidebar after refresh
        expect(stored).toHaveLength(1)
        expect(stored[0].agentInfo.agent_name).toBe(`temporary/${newReservationId}`)
    })

    it("returns the list of upserted networks", () => {
        const net1 = makeNetwork("res-1", "network_alpha")
        const net2 = makeNetwork("res-2", "network_beta")

        const upserted = useTempNetworksStore.getState().upsertTempNetworks([net1, net2])

        expect(upserted).toHaveLength(2)
        expect(upserted[0].agentInfo.agent_name).toBe("temporary/res-1")
        expect(upserted[1].agentInfo.agent_name).toBe("temporary/res-2")
    })

    it("handles an empty input array without changing the store", () => {
        const existing = makeNetwork("res-1", "network_alpha")
        useTempNetworksStore.getState().upsertTempNetworks([existing])

        useTempNetworksStore.getState().upsertTempNetworks([])

        const stored = useTempNetworksStore.getState().tempNetworks
        expect(stored).toHaveLength(1)
    })

    it("upserts multiple networks in a single call, including mixed replacements and additions", () => {
        const existing = makeNetwork("res-old", "shared_name")
        useTempNetworksStore.getState().upsertTempNetworks([existing])

        const replacement = makeNetwork("res-new", "shared_name")
        const brandNew = makeNetwork("res-brand-new", "brand_new_name")
        useTempNetworksStore.getState().upsertTempNetworks([replacement, brandNew])

        const stored = useTempNetworksStore.getState().tempNetworks
        expect(stored).toHaveLength(2)
        expect(stored.find((n) => n.agentNetworkName === "shared_name")?.agentInfo.agent_name).toBe("temporary/res-new")
        expect(stored.find((n) => n.agentNetworkName === "brand_new_name")?.agentInfo.agent_name).toBe(
            "temporary/res-brand-new"
        )
    })
})
