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
import {ConversationTurn, MessageRole} from "../../../../components/AgentChat/ChatCommon/ConversationTurn"
import {Thinking} from "../../../../components/AgentChat/ChatCommon/Thinking"
import {ChatMessageType} from "../../../../generated/neuro-san/NeuroSanClient"

const TURNS: ConversationTurn[] = [
    {
        id: "0",
        messageType: ChatMessageType.HUMAN,
        role: MessageRole.User,
        text: "Human message",
    },
    {
        agentDisplayName: "Agent Display Name",
        agentName: "Agent Name",
        id: "1",
        messageType: ChatMessageType.AGENT,
        role: MessageRole.Agent,
        text: "Agent message",
    },
    {
        agentDisplayName: "Agent Display Name",
        id: "2",
        messageType: ChatMessageType.AGENT,
        role: MessageRole.Agent,
        structure: {key: "value"},
        text: null,
    },
]

describe("Thinking", () => {
    withStrictMocks()

    it("Renders correctly", async () => {
        render(
            <Thinking
                id="test-thinking"
                turns={TURNS}
            />
        )

        // Item of type User should not show up in "Thinking"
        expect(screen.queryByText(new RegExp(TURNS[0].text, "u"))).not.toBeInTheDocument()

        // Make sure thinking items show up
        const paragraphs = document.querySelectorAll("p")
        expect(paragraphs).toHaveLength(2)
        expect(paragraphs[0]).toHaveTextContent(`${TURNS[1].agentName}: ${TURNS[1].text}`)
        expect(paragraphs[1]).toHaveTextContent("Agent: ")

        // Should be a separate "code" block with the JSON structure
        const codeBlock = paragraphs[1].querySelector("code")
        expect(codeBlock).toBeInTheDocument()
        expect(JSON.parse(codeBlock.textContent)).toEqual(TURNS[2].structure)
    })
})
