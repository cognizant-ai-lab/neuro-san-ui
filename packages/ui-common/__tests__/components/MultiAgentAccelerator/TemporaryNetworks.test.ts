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
import {TEMPORARY_NETWORK_FOLDER} from "../../../components/MultiAgentAccelerator/const"
import {
    AgentReservation,
    convertReservationsToNetworks,
    extractNetworkNameFromReservationId,
} from "../../../components/MultiAgentAccelerator/TemporaryNetworks"

const makeReservation = (id: string): AgentReservation => ({
    reservation_id: id,
    lifetime_in_seconds: 300,
    expiration_time_in_seconds: Date.now() / 1000 + 300,
})

describe("convertReservationsToNetworks", () => {
    withStrictMocks()

    it("maps a single reservation to a TemporaryNetwork", () => {
        const res = makeReservation("abc-123")
        const [network] = convertReservationsToNetworks([res], null)

        expect(network.reservation).toBe(res)
        expect(network.agentInfo.agent_name).toBe(`${TEMPORARY_NETWORK_FOLDER}/abc-123`)
        expect(network.networkHocon).toBeNull()
        expect(network.agentNetworkName).toBeUndefined()
        expect(network.agentNetworkDefinition).toBeUndefined()
    })

    it("preserves the agentNetworkName on the resulting network", () => {
        const res = makeReservation("res-xyz")
        const [network] = convertReservationsToNetworks([res], null, undefined, "my_network")

        expect(network.agentNetworkName).toBe("my_network")
    })

    it("propagates the networkHocon to all resulting networks", () => {
        const reservations = [makeReservation("r1"), makeReservation("r2")]
        const hocon = 'include required(classpath("base.conf"))'

        const networks = convertReservationsToNetworks(reservations, hocon)

        expect(networks).toHaveLength(2)
        networks.forEach((n) => expect(n.networkHocon).toBe(hocon))
    })

    it("handles multiple reservations in one call", () => {
        const reservations = [makeReservation("r1"), makeReservation("r2"), makeReservation("r3")]

        const networks = convertReservationsToNetworks(reservations, null)

        expect(networks).toHaveLength(3)
        expect(networks.map((n) => n.agentInfo.agent_name)).toEqual(["temporary/r1", "temporary/r2", "temporary/r3"])
    })

    it("returns an empty array for an empty input", () => {
        expect(convertReservationsToNetworks([], null)).toEqual([])
    })

    it("forwards the agentNetworkDefinition to each network", () => {
        const res = makeReservation("r1")
        const definition = [{origin: "agent1", tools: [] as string[]}]

        const [network] = convertReservationsToNetworks([res], null, definition)

        expect(network.agentNetworkDefinition).toBe(definition)
    })

    it("derives agentNetworkName from reservation_id when no explicit name is given", () => {
        const res = makeReservation("travel_agency_ops-7876642e-fe75-4d44-a61e-300688a1a6c5")
        const [network] = convertReservationsToNetworks([res], null)

        expect(network.agentNetworkName).toBe("travel_agency_ops")
    })

    it("prefers the explicit agentNetworkName over the derived one", () => {
        const res = makeReservation("travel_agency_ops-7876642e-fe75-4d44-a61e-300688a1a6c5")
        const [network] = convertReservationsToNetworks([res], null, undefined, "override_name")

        expect(network.agentNetworkName).toBe("override_name")
    })
})

describe("extractNetworkNameFromReservationId", () => {
    withStrictMocks()

    it("strips the UUID suffix and returns the network name", () => {
        expect(extractNetworkNameFromReservationId("travel_agency_ops-7876642e-fe75-4d44-a61e-300688a1a6c5")).toBe(
            "travel_agency_ops"
        )
    })

    it("handles reservation_ids with multiple underscores in the name", () => {
        expect(
            extractNetworkNameFromReservationId(
                "santas_workshop_fulfillment_network-196a4e92-f802-406a-b87b-2bc05dfefc1e"
            )
        ).toBe("santas_workshop_fulfillment_network")
    })

    it("returns undefined when the reservation_id has no UUID suffix", () => {
        expect(extractNetworkNameFromReservationId("abc-123")).toBeUndefined()
        expect(extractNetworkNameFromReservationId("no-uuid-here")).toBeUndefined()
    })

    it("returns undefined for an empty string", () => {
        expect(extractNetworkNameFromReservationId("")).toBeUndefined()
    })
})
