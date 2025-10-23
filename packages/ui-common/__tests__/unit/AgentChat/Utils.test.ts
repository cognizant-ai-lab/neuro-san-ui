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
import {AgentErrorProps} from "../../../components/AgentChat/Types"
import {
    chatMessageFromChunk,
    checkError,
    KNOWN_MESSAGE_TYPES,
    KNOWN_MESSAGE_TYPES_FOR_PLASMA,
} from "../../../components/AgentChat/Utils"
import {ChatMessageType, ChatResponse} from "../../../generated/neuro-san/NeuroSanClient"

describe("AgentChat/Utils/chatMessageFromChunk", () => {
    withStrictMocks()

    it("Should reject unknown message types", () => {
        const chunk: ChatResponse = {
            response: {
                type: ChatMessageType.UNKNOWN,
            },
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).toBeNull()
    })

    it.each(KNOWN_MESSAGE_TYPES)("Should correctly handle known message type %s", (t: ChatMessageType) => {
        const chunk: ChatResponse = {
            response: {
                type: t,
                text: `test for type ${t}`,
            },
        }

        const chatMessage = chatMessageFromChunk(JSON.stringify(chunk))
        expect(chatMessage).not.toBeNull()
        expect(chatMessage.type).toEqual(t)
        expect(chatMessage.text).toEqual(`test for type ${t}`)
    })
})

describe("AgentChat/Utils/checkError", () => {
    withStrictMocks()

    it("Should return detect an error block", () => {
        const errorText = "This is a test error"
        const traceText = "This is a test trace"
        const toolText = "This is a test tool"
        const result = checkError({
            error: errorText,
            traceback: traceText,
            tool: toolText,
        } as AgentErrorProps)

        expect(typeof result).toBe("string")
        expect(result).toContain("Error occurred")
        expect(result).toContain(errorText)
        expect(result).toContain(traceText)
        expect(result).toContain(toolText)
    })

    it("Should return null for non-errors", () => {
        const result = checkError({
            text: "no errors here",
        })

        expect(result).toBeNull()
    })
})

describe("AgentChat/Utils/KNOWN_MESSAGE_TYPES_FOR_PLASMA", () => {
    withStrictMocks()

    it("Should be a subset of KNOWN_MESSAGE_TYPES", () => {
        KNOWN_MESSAGE_TYPES_FOR_PLASMA.forEach((t) => {
            expect(KNOWN_MESSAGE_TYPES).toContain(t)
        })
    })

    it("Should not include HUMAN (omitted for plasma)", () => {
        expect(KNOWN_MESSAGE_TYPES_FOR_PLASMA).not.toContain(ChatMessageType.HUMAN)
    })
})
