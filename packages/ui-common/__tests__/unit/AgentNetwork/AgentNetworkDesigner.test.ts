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
import {
    AgentNetworkDefinitionEntry,
    readAgentNetworkDefinition,
} from "../../../components/MultiAgentAccelerator/AgentNetworkDesigner"
import {AGENT_NETWORK_DEFINITION_KEY} from "../../../components/MultiAgentAccelerator/const"

const SAMPLE_DEFINITION: AgentNetworkDefinitionEntry[] = [
    {
        origin: "north_pole_operations_director",
        tools: ["planning_and_assessment_manager", "manufacturing_and_supply_chain_manager"],
        display_as: "llm_agent",
        instructions: "Own end-to-end North Pole operations.",
    },
    {
        origin: "planning_and_assessment_manager",
        tools: [],
        display_as: "llm_agent",
        instructions: "Own upstream planning for Santa's Workshop.",
    },
]

describe("AgentNetworkDesigner localStorage helpers", () => {
    withStrictMocks()

    beforeEach(() => {
        localStorage.clear()
    })

    describe("readAgentNetworkDefinition", () => {
        it("returns an empty array when localStorage has no entry", () => {
            expect(readAgentNetworkDefinition()).toEqual([])
        })

        it("returns the stored definition when one exists", () => {
            localStorage.setItem(AGENT_NETWORK_DEFINITION_KEY, JSON.stringify(SAMPLE_DEFINITION))
            expect(readAgentNetworkDefinition()).toEqual(SAMPLE_DEFINITION)
        })

        it("returns an empty array when the stored value is invalid JSON", () => {
            localStorage.setItem(AGENT_NETWORK_DEFINITION_KEY, "not-valid-json{{{")
            expect(readAgentNetworkDefinition()).toEqual([])
        })
    })
})
