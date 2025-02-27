// eslint-disable-next-line no-shadow
import {render, screen, waitFor} from "@testing-library/react"
import {default as userEvent} from "@testing-library/user-event"
import {ReactNode} from "react"

import {
    experimentGeneratedMessage,
    invokeOrchestrationAgent,
    OpportunityFinder,
} from "../../../components/OpportunityFinder/OpportunityFinder"
import {sendChatQuery} from "../../../controller/agent/agent"
import {ChatResponse} from "../../../generated/neuro_san/api/grpc/agent"
import {ChatMessage, ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

// mock useSession
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: "testUser"}}})),
    }
})

jest.mock("../../../components/AgentChat/AgentChatCommon", () => ({
    AgentChatCommon: jest.fn(),
}))

jest.mock("../../../controller/opportunity_finder/fetch")

// Mock sendChatQuery
jest.mock("../../../controller/agent/agent", () => ({
    sendChatQuery: jest.fn(),
}))

describe("OpportunityFinder", () => {
    let user
    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("Should render correctly", () => {
        render(<OpportunityFinder />)

        // Agent buttons
        expect(screen.getByText("Opportunity Finder")).toBeInTheDocument()
        expect(screen.getByText("Scoping Agent")).toBeInTheDocument()
        expect(screen.getByText("Data Generator")).toBeInTheDocument()
        expect(screen.getByText("Orchestrator")).toBeInTheDocument()
    })

    it("Should allow selecting enabled agents", async () => {
        render(<OpportunityFinder />)

        // Locate buttons
        const opportunityFinderButton = screen.getByText("Opportunity Finder")
        const scopingAgentButton = screen.getByText("Scoping Agent")
        const dataGeneratorButton = screen.getByText("Data Generator")
        const orchestratorButton = screen.getByText("Orchestrator")

        // Click on the Scoping Agent button
        user.click(scopingAgentButton)

        // Check that the Scoping Agent button is selected
        await waitFor(() => {
            expect(scopingAgentButton).toHaveStyle({
                backgroundColor: "var(--bs-secondary-blue)",
                borderColor: "var(--bs-primary)",
            })
        })

        // Other agents should be unselected
        ;[dataGeneratorButton, opportunityFinderButton, orchestratorButton].forEach((button) => {
            expect(button).toHaveStyle({
                backgroundColor: null,
                borderColor: null,
            })
        })
    })

    it("Should detect an 'orchestration complete' message", async () => {
        const mockController = {current: new AbortController()}
        const mockProjectRef = {current: null}

        // mock sendChatQuery function implementation to invoke the supplied callback
        ;(sendChatQuery as jest.Mock).mockImplementation(async (_, __, ___, ____, callback) => {
            const successMessage: ChatMessage = {
                type: ChatMessageChatMessageType.AI,
                text: JSON.stringify({project_id: "mockProjectId", experiment_id: "mockExperimentId"}),
                structure: null,
                mimeData: [],
                origin: [],
                chatContext: null,
                toolResultOrigin: [],
            }

            const chatResponse: ChatResponse = ChatResponse.fromPartial({
                response: successMessage,
            })

            callback(JSON.stringify({result: chatResponse}))
        })

        const updateOutputMock = (node: ReactNode) => {
            render(<>{node}</>)
        }
        await invokeOrchestrationAgent("query", updateOutputMock, mockController, mockProjectRef, "currentUser")

        expect(await screen.findByText("Experiment generation complete")).toBeInTheDocument()
    })
})

describe("experimentGeneratedMessage", () => {
    it("Should generate a valid experiment complete item", () => {
        const projectUrl = new URL("https://example.com")
        const experimentGeneratedItem = experimentGeneratedMessage(projectUrl)

        // make sure it contains a link
        expect(experimentGeneratedItem.props.children).toContainEqual(expect.objectContaining({type: "a"}))

        // retrieve the link
        const link = experimentGeneratedItem.props.children.find((child) => child.type === "a")
        expect(link.props.href).toContain(projectUrl.toString())
    })
})
