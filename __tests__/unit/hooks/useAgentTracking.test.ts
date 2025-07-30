import {act, renderHook} from "@testing-library/react"

import {chatMessageFromChunk} from "../../../components/AgentChat/Utils"
import {ChatMessageType} from "../../../generated/neuro-san/NeuroSanClient"
import {useAgentTracking} from "../../../hooks/useAgentTracking"
import {withStrictMocks} from "../../common/strictMocks"

// Mock the chatMessageFromChunk utility
jest.mock("../../../components/AgentChat/Utils", () => ({
    chatMessageFromChunk: jest.fn(),
}))

const mockChatMessageFromChunk = jest.mocked(chatMessageFromChunk)

describe("useAgentTracking", () => {
    withStrictMocks()

    it("should initialize with default state", () => {
        const {result} = renderHook(() => useAgentTracking())

        expect(result.current.includedAgentIds).toEqual([])
        expect(result.current.originInfo).toEqual([])
        expect(result.current.agentCounts).toBeInstanceOf(Map)
        expect(result.current.agentCounts.size).toBe(0)
        expect(result.current.isProcessing).toBe(false)
    })

    it("should reset tracking when resetTracking is called", () => {
        const {result} = renderHook(() => useAgentTracking())

        // Set some initial state
        act(() => {
            result.current.onStreamingStarted()
        })

        act(() => {
            result.current.resetTracking()
        })

        expect(result.current.includedAgentIds).toEqual([])
        expect(result.current.originInfo).toEqual([])
        expect(result.current.agentCounts.size).toBe(0)
        expect(result.current.isProcessing).toBe(false)
    })

    it("should handle chunk without origin info", () => {
        const {result} = renderHook(() => useAgentTracking())

        mockChatMessageFromChunk.mockReturnValue({
            origin: [],
        })

        let returnValue: boolean | undefined
        act(() => {
            returnValue = result.current.onChunkReceived("test chunk")
        })

        expect(returnValue).toBe(true)
        expect(result.current.includedAgentIds).toEqual([])
        expect(result.current.originInfo).toEqual([])
    })

    it("should process agent chunk with origin info", () => {
        const {result} = renderHook(() => useAgentTracking())

        const mockOrigin = [
            {tool: "agent1", instantiation_index: 0},
            {tool: "agent2", instantiation_index: 1},
        ]

        mockChatMessageFromChunk.mockReturnValue({
            type: ChatMessageType.AI,
            origin: mockOrigin,
            text: "Processing...",
        })

        act(() => {
            result.current.onChunkReceived("test chunk")
        })

        expect(result.current.includedAgentIds).toContain("agent1")
        expect(result.current.includedAgentIds).toContain("agent2")
        expect(result.current.originInfo).toEqual(mockOrigin)
        expect(result.current.agentCounts.get("agent1")).toBe(1)
        expect(result.current.agentCounts.get("agent2")).toBe(1)
    })

    it("should handle final agent response and remove from active list", () => {
        const {result} = renderHook(() => useAgentTracking())

        // First, add some agents to the active list
        const mockOriginStart = [
            {tool: "agent1", instantiation_index: 0},
            {tool: "agent2", instantiation_index: 1},
        ]

        mockChatMessageFromChunk.mockReturnValue({
            type: ChatMessageType.AI,
            origin: mockOriginStart,
            text: "Processing...",
        })

        act(() => {
            result.current.onChunkReceived("start chunk")
        })

        expect(result.current.includedAgentIds).toContain("agent1")
        expect(result.current.includedAgentIds).toContain("agent2")

        // Now send a final response for agent1
        const mockOriginFinal = [{tool: "agent1", instantiation_index: 0}]

        mockChatMessageFromChunk.mockReturnValue({
            type: ChatMessageType.AGENT,
            origin: mockOriginFinal,
            structure: {total_tokens: 100} as unknown as Record<string, never>,
            text: "Final response",
        })

        act(() => {
            result.current.onChunkReceived("final chunk")
        })

        expect(result.current.includedAgentIds).not.toContain("agent1")
        expect(result.current.includedAgentIds).toContain("agent2")
    })

    it("should handle streaming lifecycle", () => {
        const {result} = renderHook(() => useAgentTracking())

        // Start streaming
        act(() => {
            result.current.onStreamingStarted()
        })

        expect(result.current.isProcessing).toBe(true)
        expect(result.current.agentCounts.size).toBe(0)

        // Complete streaming
        act(() => {
            result.current.onStreamingComplete()
        })

        expect(result.current.isProcessing).toBe(false)
        expect(result.current.includedAgentIds).toEqual([])
        expect(result.current.originInfo).toEqual([])
    })

    it("should handle errors gracefully", () => {
        const {result} = renderHook(() => useAgentTracking())

        // Spy on console.error for this specific test
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)

        mockChatMessageFromChunk.mockImplementation(() => {
            throw new Error("Parsing error")
        })

        let returnValue: boolean | undefined
        act(() => {
            returnValue = result.current.onChunkReceived("invalid chunk")
        })

        expect(returnValue).toBe(false)
        expect(result.current.isProcessing).toBe(false)
        expect(consoleErrorSpy).toHaveBeenCalled()

        // Clean up the spy
        consoleErrorSpy.mockRestore()
    })

    it("should increment agent counts correctly", () => {
        const {result} = renderHook(() => useAgentTracking())

        const mockOrigin = [{tool: "agent1", instantiation_index: 0}]

        mockChatMessageFromChunk.mockReturnValue({
            type: ChatMessageType.AI,
            origin: mockOrigin,
            text: "Processing...",
        })

        // Process the same agent multiple times
        act(() => {
            result.current.onChunkReceived("chunk 1")
        })

        act(() => {
            result.current.onChunkReceived("chunk 2")
        })

        expect(result.current.agentCounts.get("agent1")).toBe(2)
    })
})
