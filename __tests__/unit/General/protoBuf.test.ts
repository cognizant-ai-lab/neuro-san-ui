/*
Demo unit test for protobuf to TS machinery
 */

import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/chat"

describe("Make sure protobuf files generated", () => {
    it("should have generated protobuf types for chat.proto", () => {
        const imageData = {mimeType: "image/png", imageBytes: new Uint8Array([1, 2, 3])}
        const message: ChatMessage = {
            type: ChatMessageChatMessageType.HUMAN,
            text: "Hello, World!",
            imageData: imageData,
        }

        expect(message).toBeDefined()
        expect(message.type).toBe(ChatMessageChatMessageType.HUMAN)
        expect(message.text).toBe("Hello, World!")
        expect(message.imageData).toBe(imageData)
    })
})
