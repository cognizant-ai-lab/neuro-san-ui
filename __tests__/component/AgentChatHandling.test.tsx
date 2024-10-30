// eslint-disable-next-line no-shadow
import {fireEvent, render, screen} from "@testing-library/react"

import {pollForLogs, processNewLogs} from "../../components/internal/opportunity_finder/AgentChatHandling"
import {retry} from "../../components/internal/opportunity_finder/common"
import {getLogs} from "../../controller/agent/agent"
import {AgentStatus, LogsResponse} from "../../generated/agent"

const mockSyntaxHighlighter = jest.fn(({children}) => <div>{children}</div>)

jest.mock("react-syntax-highlighter", () => {
    const actual = jest.requireActual("react-syntax-highlighter")
    return {
        __esModule: true,
        ...actual,
        default: (children) => mockSyntaxHighlighter(children),
    }
})

jest.mock("../../controller/agent/agent", () => ({
    __esModule: true,
    ...jest.requireActual("../../controller/agent/agent"),
    getLogs: jest.fn(),
}))

jest.mock("../../components/internal/opportunity_finder/common", () => ({
    __esModule: true,
    ...jest.requireActual("../../components/internal/opportunity_finder/common"),
    retry: jest.fn(),
}))

describe("processNewLogs", () => {
    const mockSetLastLogIndex = jest.fn()
    const mockSetLastLogTime = jest.fn()
    const logHandling = {
        lastLogIndex: -1,
        setLastLogIndex: mockSetLastLogIndex,
        lastLogTime: Date.now(),
        setLastLogTime: mockSetLastLogTime,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("Should process and display new logs correctly", async () => {
        const response: LogsResponse = LogsResponse.fromPartial({logs: ["summary1>>>details1", "summary2>>>details2"]})

        const newOutputItems = processNewLogs(response, logHandling, {})
        render(newOutputItems[0])

        // Panel is initially collapsed so we shouldn't see the body
        expect(screen.queryByText("details1")).not.toBeInTheDocument()

        // Now click on the Collapse header to expand it
        const collapseHeader = await screen.findByText("Summary1")
        expect(collapseHeader).toBeInTheDocument()

        fireEvent.click(collapseHeader)

        // Now we should see the body
        expect(await screen.findByText('"details1"')).toBeInTheDocument()

        expect(mockSetLastLogTime).toHaveBeenCalled()
        expect(mockSetLastLogIndex).toHaveBeenCalledWith(response.logs.length - 1)
        expect(newOutputItems.length).toBe(2)
    })

    it("Should handle logs without details", () => {
        const response = LogsResponse.fromPartial({logs: ["summary>>>"]})

        const newOutputItems = processNewLogs(response, logHandling, {})
        expect(newOutputItems.length).toBe(1)
    })

    it("Should handle logs with invalid JSON details", async () => {
        // Make sure we repair misbehaved JSON, eg. missing quotes, wrong quotes, escapes, ...
        const response = LogsResponse.fromPartial({logs: ['summary>>>/* comment */{\\"key\\": value']})

        const newOutputItems = processNewLogs(response, logHandling, {})

        expect(newOutputItems.length).toBe(1)

        render(newOutputItems[0])

        const collapseHeader = await screen.findByText("Summary")
        expect(collapseHeader).toBeInTheDocument()

        fireEvent.click(collapseHeader)

        // We should have been able to repair the JSON and attempt to syntax highlight it
        expect(mockSyntaxHighlighter).toHaveBeenCalled()
    })

    it("Should handle logs with valid JSON details", async () => {
        const response = LogsResponse.fromPartial({logs: ['summary>>>{"name": "John"}']})

        const newOutputItems = processNewLogs(response, logHandling, {})
        expect(newOutputItems.length).toBe(1)

        render(newOutputItems[0])

        const collapseHeader = await screen.findByText("Summary")
        expect(collapseHeader).toBeInTheDocument()
        fireEvent.click(collapseHeader)
        expect(mockSyntaxHighlighter).toHaveBeenCalledWith(expect.objectContaining({children: '{"name": "John"}'}))
    })

    it("Should only process new logs", async () => {
        const response = LogsResponse.fromPartial({
            logs: ["summary1>>>details1", "summary2>>>details2", "summary3>>>details3"],
        })

        const newOutputItems = processNewLogs(response, {...logHandling, lastLogIndex: 1}, {})

        // lastLogIndex (zero-based) is 1, so we should skip the first two logs and only process the last one
        expect(newOutputItems.length).toBe(1)

        render(newOutputItems[0])
        const collapseHeader = await screen.findByText("Summary3")
        expect(collapseHeader).toBeInTheDocument()

        fireEvent.click(collapseHeader)
        expect(await screen.findByText('"details3"')).toBeInTheDocument()
    })

    it("Should handle empty logs", () => {
        const response = LogsResponse.fromPartial({logs: []})

        const newOutputItems = processNewLogs(response, logHandling, {})
        expect(newOutputItems.length).toBe(0)
    })
})

describe("pollForLogs", () => {
    it("Should bail if LLM interaction is already in progress", async () => {
        await pollForLogs(
            null,
            null,
            null,
            null,
            {
                isAwaitingLlm: true,
                setIsAwaitingLlm: null,
                signal: null,
            },
            null,
            null,
            null
        )

        expect(getLogs).not.toHaveBeenCalled()
    })

    it("Should call retry if agents return error", async () => {
        const mockLogsResponse: LogsResponse = LogsResponse.fromPartial({
            status: AgentStatus.NOT_FOUND,
        })

        ;(getLogs as jest.Mock).mockResolvedValue(mockLogsResponse)

        await pollForLogs(
            null,
            null,
            null,
            null,
            {
                isAwaitingLlm: false,
                setIsAwaitingLlm: jest.fn(),
                signal: null,
            },
            null,
            null,
            null
        )

        expect(retry).toHaveBeenCalled()
    })
})
