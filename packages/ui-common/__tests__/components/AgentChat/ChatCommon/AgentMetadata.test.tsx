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

import {render, screen} from "@testing-library/react"

import {
    MOCK_CONNECTIVITY_INFO,
    TEST_AGENT_MATH_GUY,
    TEST_AGENT_MUSIC_NERD,
    TEST_TOOL_LAST_FM,
    TEST_TOOL_SPOTIFY,
} from "../../../../../../__tests__/common/NetworksListMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {AgentMetadata} from "../../../../components/AgentChat/ChatCommon/AgentMetadata"
import {LegacyAgentType} from "../../../../components/AgentChat/Common/Types"
import {getAgentFunction, getConnectivity} from "../../../../controller/agent/Agent"

jest.mock("../../../../controller/agent/Agent")
jest.mock("../../../../components/Common/notification")

describe("AgentMetadata", () => {
    withStrictMocks()

    beforeEach(() => {
        ;(getAgentFunction as jest.Mock).mockResolvedValue({
            function: {
                description: "Test description",
            },
        })
        ;(getConnectivity as jest.Mock).mockResolvedValue(MOCK_CONNECTIVITY_INFO)
    })

    it("Renders correctly", async () => {
        render(
            <AgentMetadata
                currentUser="testUser"
                disableQueries={false}
                handleSend={jest.fn()}
                id=""
                neuroSanURL=""
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        await screen.findByText("Network Details")
        await screen.findByText(MOCK_CONNECTIVITY_INFO.metadata.sample_queries[0])
        await screen.findByText(TEST_AGENT_MUSIC_NERD)
        await screen.findByText(TEST_TOOL_SPOTIFY)
        await screen.findByText(TEST_TOOL_LAST_FM)
    })

    it("Handles errors from getAgentFunction gracefully", async () => {
        ;(getAgentFunction as jest.Mock).mockRejectedValue(new Error("Failed to fetch agent function"))
        render(
            <AgentMetadata
                currentUser="testUser"
                disableQueries={false}
                handleSend={jest.fn()}
                id=""
                neuroSanURL=""
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        await screen.findByText("Network Details")
    })

    it("Handles errors from getConnectivity gracefully", async () => {
        ;(getConnectivity as jest.Mock).mockRejectedValue(new Error("Failed to fetch connectivity"))
        render(
            <AgentMetadata
                currentUser="testUser"
                disableQueries={false}
                handleSend={jest.fn()}
                id=""
                neuroSanURL=""
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        await screen.findByText("Network Details")
    })

    it("Handles legacy agents", async () => {
        render(
            <AgentMetadata
                currentUser="testUser"
                disableQueries={false}
                handleSend={jest.fn()}
                id=""
                neuroSanURL=""
                targetAgent={LegacyAgentType.ChatBot}
            />
        )

        await screen.findByText("Network Details")
    })

    it("Handles missing items", async () => {
        ;(getAgentFunction as jest.Mock).mockResolvedValue({
            function: {
                description: "",
            },
        })
        ;(getConnectivity as jest.Mock).mockResolvedValue({
            ...MOCK_CONNECTIVITY_INFO,
            metadata: {sample_queries: undefined},
        })
        render(
            <AgentMetadata
                currentUser="testUser"
                disableQueries={false}
                handleSend={jest.fn()}
                id=""
                neuroSanURL=""
                targetAgent={TEST_AGENT_MATH_GUY}
            />
        )

        await screen.findByText("Network Details")
    })
})
