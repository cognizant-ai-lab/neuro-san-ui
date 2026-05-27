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

import {render, screen, waitFor} from "@testing-library/react"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {Conversation} from "../../../../components/AgentChat/ChatCommon/Conversation"
import {ConversationTurn, MessageRole} from "../../../../components/AgentChat/ChatCommon/ConversationTurn"

jest.mock("../../../../controller/agent/Agent")
jest.mock("../../../../components/Common/notification")

describe("Conversation", () => {
    withStrictMocks()

    it("Renders correctly", async () => {
        const turns: ConversationTurn[] = [
            {
                id: "1",
                role: MessageRole.User,
                text: "Hello from user",
            },
            {
                id: "2",
                role: MessageRole.AgentHeader,
                text: "Hello from agent",
            },
            {
                agentDisplayName: "Agent Display Name",
                agentName: "Agent Name",
                alwaysShow: true,
                id: "3",
                role: MessageRole.Agent,
                text: '"Hello from other agent"',
            },
        ]
        render(
            <Conversation
                id=""
                currentUser=""
                showThinking={false}
                shouldWrapOutput={false}
                turns={turns}
            />
        )

        await screen.findByText(turns[0].text)
        // item 1 should not have the text rendered because it's an AgentHeader
        await waitFor(() => {
            expect(screen.queryByText(turns[1].text)).not.toBeInTheDocument()
        })

        await screen.findByText(turns[2].text)
    })
})
