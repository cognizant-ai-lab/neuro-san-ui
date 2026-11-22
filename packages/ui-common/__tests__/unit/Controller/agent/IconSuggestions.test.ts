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

import {environ} from "@cognizant-ai-lab/neuro-san"
import type {DirectAgentSession} from "@cognizant-ai-lab/neuro-san"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {createAgentNetworkSession} from "../../../../controller/agent/AgentNetworkSession"
import {getAgentIconSuggestions, getNetworkIconSuggestions} from "../../../../controller/agent/IconSuggestions"
import AGENT_ICON_SUGGESTER_NETWORK from "../../../../controller/agent/networks/agent_icon_suggester.json"
import NETWORK_ICON_SUGGESTER_NETWORK from "../../../../controller/agent/networks/network_icon_suggester.json"
import {AgentInfo, ChatResponse, ConnectivityResponse} from "../../../../generated/neuro-san/NeuroSanClient"
import {useIconSuggestionsStore} from "../../../../state/IconSuggestions"
import {useSettingsStore} from "../../../../state/Settings"

vi.mock("@cognizant-ai-lab/neuro-san", () => ({environ: {}}))
vi.mock("../../../../controller/agent/AgentNetworkSession")

const TEST_OPENAI_API_KEY = "test-openai-key"

const AGENT_CONNECTIVITY: ConnectivityResponse = {
    connectivity_info: [{origin: "test_agent", tools: ["other_agent"]}, {origin: "other_agent"}],
    metadata: {description: "Test network"},
}

const NETWORKS: AgentInfo[] = [{agent_name: "test_agent", description: "Test network"}, {agent_name: "other_agent"}]

/**
 * Stands in for the in-browser neuro-san session, streaming the given chat responses.
 * @param responses The chat responses the session streams back
 * @returns The mock session's streaming_chat function, for assertions
 */
const mockAgentNetworkSession = (responses: readonly ChatResponse[]) => {
    const streamingChat = vi.fn(async function* streamResponses() {
        yield* responses
    })
    vi.mocked(createAgentNetworkSession).mockReturnValue({
        streaming_chat: streamingChat,
    } as unknown as DirectAgentSession)
    return streamingChat
}

/**
 * Saves the user's own OpenAI API key, which makes icon suggestions run in the browser.
 */
const saveOpenAiApiKey = () => {
    useSettingsStore.getState().updateSettings({
        apiKeys: {OpenAI: {expiresAt: Number.MAX_SAFE_INTEGER, value: TEST_OPENAI_API_KEY}},
    })
}

// Each kind of icon suggestion, with the network that suggests it and the input that network is sent
const LOCAL_SUGGESTION_CASES = [
    {
        kind: "agent",
        getIconSuggestions: () => getAgentIconSuggestions(AGENT_CONNECTIVITY),
        network: AGENT_ICON_SUGGESTER_NETWORK,
        networkName: "agent_icon_suggester",
        input: {connectivity_info: AGENT_CONNECTIVITY.connectivity_info, metadata: AGENT_CONNECTIVITY.metadata},
    },
    {
        kind: "network",
        getIconSuggestions: () => getNetworkIconSuggestions(NETWORKS),
        network: NETWORK_ICON_SUGGESTER_NETWORK,
        networkName: "network_icon_suggester",
        input: {networks: NETWORKS},
    },
]

describe("Controller/Agent/getNetworkIconSuggestions", () => {
    withStrictMocks()

    beforeEach(() => {
        // Clear the icon suggestions cache before each test
        useIconSuggestionsStore.setState({
            networkIconSuggestions: {},
            agentIconSuggestions: {},
        })
        useSettingsStore.getState().resetSettings()
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
        expect(global.fetch).toHaveBeenCalledExactlyOnceWith(
            "/api/networkIconSuggestions",
            expect.objectContaining({
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({networks: agentInfo}),
            })
        )

        vi.mocked(global.fetch).mockClear()

        // Second time should be cached
        const cachedResult = await getNetworkIconSuggestions(agentInfo)
        expect(cachedResult).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(0) // No additional fetch calls
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
            metadata: {foo: "bar"},
        }
        const result = await getAgentIconSuggestions(connectivityInfo)

        expect(result).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledExactlyOnceWith(
            "/api/agentIconSuggestions",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    connectivity_info: connectivityInfo.connectivity_info,
                    metadata: connectivityInfo.metadata,
                }),
            })
        )

        vi.mocked(global.fetch).mockClear()

        // Second time should be cached
        const cachedResult = await getAgentIconSuggestions(connectivityInfo)
        expect(cachedResult).toEqual(mockSuggestions)
        expect(global.fetch).toHaveBeenCalledTimes(0) // No additional fetch calls
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
        global.fetch = vi.fn(() =>
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

    it.each(LOCAL_SUGGESTION_CASES)(
        "suggests $kind icons in the browser when the user has an OpenAI key",
        async ({getIconSuggestions, network, networkName, input}) => {
            const suggestions = {test_agent: "Home", other_agent: "Settings"}
            global.fetch = vi.fn()
            // A chunk without a response, such as a progress message, must not replace the answer
            const streamingChat = mockAgentNetworkSession([{response: {text: JSON.stringify(suggestions)}}, {}])
            saveOpenAiApiKey()

            await expect(getIconSuggestions()).resolves.toEqual(suggestions)

            expect(environ["OPENAI_API_KEY"]).toBe(TEST_OPENAI_API_KEY)
            expect(createAgentNetworkSession).toHaveBeenCalledExactlyOnceWith(network, networkName)
            expect(streamingChat).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({user_message: expect.objectContaining({text: JSON.stringify(input)})})
            )
            expect(global.fetch).not.toHaveBeenCalled()

            // Second time should be cached
            await expect(getIconSuggestions()).resolves.toEqual(suggestions)
            expect(createAgentNetworkSession).toHaveBeenCalledTimes(1)
        }
    )

    it.each(LOCAL_SUGGESTION_CASES)(
        "fails to suggest $kind icons when the in-browser network gives no answer",
        async ({getIconSuggestions, networkName}) => {
            mockAgentNetworkSession([])
            saveOpenAiApiKey()

            await expect(getIconSuggestions()).rejects.toThrow(`${networkName} returned no answer`)
        }
    )
})
