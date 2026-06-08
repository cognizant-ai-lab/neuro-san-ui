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

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {Conversation} from "../../../../components/AgentChat/ChatCommon/Conversation"
import {ConversationTurn, MessageRole} from "../../../../components/AgentChat/ChatCommon/ConversationTurn"

jest.mock("../../../../controller/agent/Agent")
jest.mock("../../../../components/Common/notification")

const TURNS: ConversationTurn[] = [
    {
        id: "0",
        role: MessageRole.User,
        text: "User message",
    },
    {
        agentDisplayName: "Agent Display Name",
        agentName: "Agent Name",
        id: "1",
        role: MessageRole.Agent,
        text: "Agent message",
    },
    {
        id: "2",
        role: MessageRole.Agent,
        text: "Agent message with no agent name or display name",
    },
]

describe("Conversation", () => {
    withStrictMocks()

    it("Renders correctly", async () => {
        render(
            <Conversation
                id="test"
                shouldWrapOutput={false}
                includeAgentMessages={true}
                turns={TURNS}
            />
        )

        await screen.findByText(TURNS[0].text)
        await screen.findByText(TURNS[1].text + TURNS[2].text)
    })

    it("Handles turn with neither text nor structure", async () => {
        render(
            <Conversation
                id="test"
                shouldWrapOutput={false}
                includeAgentMessages={true}
                turns={[
                    {
                        id: "42",
                        role: MessageRole.Agent,
                        text: null,
                    },
                ]}
            />
        )

        const conversationNode = document.querySelector("#test-conversation")
        expect(conversationNode?.textContent).toBe("")
    })
})
