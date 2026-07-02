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

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {
    getFrontman,
    getParentAgents,
    getParents,
} from "../../../../components/MultiAgentAccelerator/AgentFlow/GraphStructure"
import {ConnectivityInfo} from "../../../../generated/neuro-san/NeuroSanClient"

describe("getFrontman", () => {
    withStrictMocks()

    it("should return the agent not referenced as a tool by any other agent", () => {
        const agents = [
            {origin: "boss", tools: ["worker"]},
            {origin: "worker", tools: []},
        ]
        expect(getFrontman(agents)?.origin).toBe("boss")
    })

    it("should treat a lone single-agent network as its own frontman (even with no tools key)", () => {
        expect(getFrontman([{origin: "solo"}])?.origin).toBe("solo")
    })

    it("should ignore tool-less leaf agents and pick the parent that has no parent", () => {
        // worker is declared before boss but has no tools, so it is not a frontman candidate.
        const agents = [
            {origin: "worker", tools: []},
            {origin: "boss", tools: ["worker"]},
        ]
        expect(getFrontman(agents)?.origin).toBe("boss")
    })

    it("should return undefined when every agent is referenced as a tool (fully cyclic)", () => {
        const agents = [
            {origin: "alpha", tools: ["beta"]},
            {origin: "beta", tools: ["alpha"]},
        ]
        expect(getFrontman(agents)).toBeUndefined()
    })

    it("should return undefined for an empty network", () => {
        expect(getFrontman([])).toBeUndefined()
    })

    it("should tolerate agents with no tools key", () => {
        const agents = [{origin: "boss", tools: ["worker"]}, {origin: "worker"}]
        expect(getFrontman(agents)?.origin).toBe("boss")
    })

    it("should skip a candidate that has no origin", () => {
        // The only unreferenced parent has no origin, so there is no valid frontman.
        const agents: ConnectivityInfo[] = [{tools: ["worker"]}, {origin: "worker", tools: []}]
        expect(getFrontman(agents)).toBeUndefined()
    })
})

describe("getParentAgents", () => {
    withStrictMocks()

    it("should return only agents that have at least one tool", () => {
        const agents = [
            {origin: "boss", tools: ["worker"]},
            {origin: "worker", tools: []},
        ]
        expect(getParentAgents(agents).map((agent) => agent.origin)).toEqual(["boss"])
    })

    it("should treat a lone single-agent network as its own parent (even with no tools)", () => {
        const agents: ConnectivityInfo[] = [{origin: "solo", tools: []}]
        expect(getParentAgents(agents)).toEqual(agents)
    })

    it("should tolerate agents with no tools key", () => {
        const agents = [{origin: "boss", tools: ["worker"]}, {origin: "worker"}]
        expect(getParentAgents(agents).map((agent) => agent.origin)).toEqual(["boss"])
    })

    it("should return an empty array when no agent has tools", () => {
        const agents: ConnectivityInfo[] = [
            {origin: "a", tools: []},
            {origin: "b", tools: []},
        ]
        expect(getParentAgents(agents)).toEqual([])
    })
})

describe("getParents", () => {
    withStrictMocks()

    it("should return the origins of the immediate parents of a node", () => {
        const parentAgents = [
            {origin: "boss", tools: ["worker", "helper"]},
            {origin: "lead", tools: ["worker"]},
        ]
        expect(getParents("worker", parentAgents)).toEqual(["boss", "lead"])
    })

    it("should return an empty array for a node with no parents (frontman)", () => {
        const parentAgents = [{origin: "boss", tools: ["worker"]}]
        expect(getParents("boss", parentAgents)).toEqual([])
    })
})
