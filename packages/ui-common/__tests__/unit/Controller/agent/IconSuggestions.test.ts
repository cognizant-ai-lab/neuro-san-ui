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

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {getAgentIconSuggestions, getNetworkIconSuggestions} from "../../../../controller/agent/IconSuggestions"
import {AgentInfo, ConnectivityResponse} from "../../../../generated/neuro-san/NeuroSanClient"
import {useIconSuggestionsStore} from "../../../../state/IconSuggestions"

describe("Controller/Agent/getNetworkIconSuggestions", () => {
    withStrictMocks()

    beforeEach(() => {
        // Clear the icon suggestions cache before each test
        useIconSuggestionsStore.setState({
            networkIconSuggestions: {},
            agentIconSuggestions: {},
        })
    })

    it("should retrieve network icon suggestions from the server and cache them", async () => {
        const mockSuggestions = {test_agent: "home", other_agent: "settings"}
        global.fetch = mockFetch(mockSuggestions)

        const agentInfo: AgentInfo[] = [
            {
                agent_name: "test_agent",
            },
            {
                agent_name: "other_agent",
            },
        ]
        const result = await getNetworkIconSuggestions(agentInfo)

        expect(result).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(1)

        // Second time should be cached
        const cachedResult = await getNetworkIconSuggestions(agentInfo)
        expect(cachedResult).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(1) // No additional fetch calls
    })

    it("should retrieve agent icon suggestions from the server and cache them", async () => {
        const mockSuggestions = {test_agent: "home", other_agent: "settings"}
        global.fetch = mockFetch(mockSuggestions)

        const connectivityInfo: ConnectivityResponse = {
            connectivity_info: [
                {
                    origin: "test_agent",
                },
                {
                    origin: "other_agent",
                },
            ],
        }
        const result = await getAgentIconSuggestions(connectivityInfo)

        expect(result).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(1)

        // Second time should be cached
        const cachedResult = await getAgentIconSuggestions(connectivityInfo)
        expect(cachedResult).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(1) // No additional fetch calls
    })

    it("Should throw on errors from fetch", async () => {
        // Simulate failed fetch
        const error = "Expected error"
        global.fetch = mockFetch({error}, false)
        await expect(
            getAgentIconSuggestions({
                connectivity_info: [{origin: "test_agent"}],
            })
        ).rejects.toThrow(error)

        // Now with a bad response from the service with an "error" block
        const badRequestText = "Bad Request"
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                statusText: badRequestText,
                json: () => Promise.resolve({}),
            } as unknown as Response)
        )

        await expect(
            getAgentIconSuggestions({
                connectivity_info: [{origin: "test_agent"}],
            })
        ).rejects.toThrow(badRequestText)
    })
})
