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

import {createTheme, ThemeProvider} from "@mui/material/styles"
import {render, screen} from "@testing-library/react"
import {atomOneDark, atomOneLight} from "react-syntax-highlighter/dist/esm/styles/hljs"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {Conversation, USER_BUBBLE_RADIUS} from "../../../../components/AgentChat/ChatCommon/Conversation"
import {ConversationTurn, MessageRole} from "../../../../components/AgentChat/ChatCommon/ConversationTurn"
import {SHEEN_DARK, SHEEN_LIGHT, SHEEN_RADIUS} from "../../../../Theme/sheen"

vi.mock("../../../../controller/agent/Agent")
vi.mock("../../../../components/Common/notification")

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

    it.each([
        {isStreaming: true, expected: true},
        {isStreaming: false, expected: false},
    ])("Marks the last response block as streaming: $isStreaming", async ({isStreaming, expected}) => {
        render(
            <Conversation
                id="test"
                includeAgentMessages={true}
                isStreaming={isStreaming}
                shouldWrapOutput={false}
                turns={TURNS}
            />
        )

        const lastBlock = (await screen.findByText(TURNS[1].text + TURNS[2].text)).closest(".formatted-markdown-block")
        if (expected) {
            expect(lastBlock).toHaveClass("is-streaming")
        } else {
            expect(lastBlock).not.toHaveClass("is-streaming")
        }
    })

    it("Doesn't show the streaming caret when the conversation ends with a user turn", async () => {
        render(
            <Conversation
                id="test"
                includeAgentMessages={true}
                isStreaming={true}
                shouldWrapOutput={false}
                turns={[...TURNS, {id: "3", role: MessageRole.User, text: "Follow-up"}]}
            />
        )

        await screen.findByText("Follow-up")
        expect(document.querySelector(".is-streaming")).toBeNull()
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

    it.each([
        {mode: "light", sheen: SHEEN_LIGHT.sheen},
        {mode: "dark", sheen: SHEEN_DARK.sheen},
    ] as const)("Renders user turns as tinted bubbles in $mode mode", ({mode, sheen}) => {
        render(
            <ThemeProvider theme={createTheme({palette: {mode, sheen}})}>
                <Conversation
                    id="test"
                    shouldWrapOutput={false}
                    turns={[TURNS[0]]}
                />
            </ThemeProvider>
        )

        const bubble = document.getElementById(TURNS[0].id)
        expect(bubble).toHaveStyle({backgroundColor: sheen.tint, borderRadius: USER_BUBBLE_RADIUS})
    })

    it.each([
        {mode: "light", hljsTheme: atomOneLight},
        {mode: "dark", hljsTheme: atomOneDark},
    ] as const)("Uses the cool Atom One code theme in $mode mode", async ({mode, hljsTheme}) => {
        render(
            <ThemeProvider theme={createTheme({palette: {mode}})}>
                <Conversation
                    id="test"
                    shouldWrapOutput={false}
                    turns={[{id: "code", role: MessageRole.FinalAnswer, text: "```python\nprint(42)\n```"}]}
                />
            </ThemeProvider>
        )

        const codeBlock = document.getElementById("syntax-highlighter-python")
        // Header bar is layered over the highlighter theme's own background color
        expect(codeBlock).toHaveStyle({
            backgroundColor: hljsTheme["hljs"].background,
            borderRadius: `${SHEEN_RADIUS}px`,
        })
        expect(codeBlock.style.backgroundImage).toContain("linear-gradient")
        // Language is exposed for the header bar label
        expect(codeBlock).toHaveAttribute("data-language", "python")
        // Final answer is wrapped in an assistant block
        expect(codeBlock.closest(".formatted-markdown-block")).not.toBeNull()
    })
})
