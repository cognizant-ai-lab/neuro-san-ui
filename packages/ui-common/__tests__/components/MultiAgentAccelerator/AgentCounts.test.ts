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
import {getUpdatedAgentCounts} from "../../../components/MultiAgentAccelerator/AgentCounts"

jest.mock("../../../components/Common/notification")

describe("AgentCounts", () => {
    withStrictMocks()

    describe("getUpdatedAgentCounts", () => {
        it("should update agent counts correctly", () => {
            const existingCounts = new Map([["agent1", 1]])
            const origins = [
                {tool: "agent1", instantiation_index: 0},
                {tool: "agent2", instantiation_index: 1},
            ]

            const updatedCounts = getUpdatedAgentCounts(existingCounts, origins)

            expect(updatedCounts.get("agent1")).toBe(2)
            expect(updatedCounts.get("agent2")).toBe(1)
        })

        it("should return existing counts when no origins provided", () => {
            const existingCounts = new Map([["agent1", 1]])

            const updatedCounts = getUpdatedAgentCounts(existingCounts, [])

            expect(updatedCounts).toEqual(existingCounts)
        })
    })
})
