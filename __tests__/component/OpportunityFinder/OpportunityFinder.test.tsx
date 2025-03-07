// eslint-disable-next-line no-shadow
import {render, screen, waitFor} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {LegacyAgentType} from "../../../components/AgentChat/Types"
import {experimentGeneratedMessage, OpportunityFinder} from "../../../components/OpportunityFinder/OpportunityFinder"
import {ChatMessageChatMessageType} from "../../../generated/neuro_san/api/grpc/chat"

// mock useSession
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: "testUser"}}})),
    }
})

let onChunkReceived
let setPreviousResponse

jest.mock("../../../components/AgentChat/ChatCommon", () => {
    return {
        __esModule: true,
        ChatCommon: jest.fn((props) => {
            // Capture the onChunkReceived function
            onChunkReceived = props.onChunkReceived
            setPreviousResponse = props.setPreviousResponse
            return <div>Mocked ChatCommon</div>
        }),
    }
})

describe("OpportunityFinder", () => {
    let user: UserEvent
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
        await user.click(scopingAgentButton)

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

    it("should handle chunk received correctly", async () => {
        const {rerender} = render(<OpportunityFinder />)

        // Select Orchestrator agent
        const orchestratorButton = screen.getByText("Orchestrator")
        expect(orchestratorButton).toBeInTheDocument()

        // Have to feed it a data generator response to enable the orchestrator
        setPreviousResponse(LegacyAgentType.DataGenerator, "testResponse")
        rerender(<OpportunityFinder />)

        await user.click(orchestratorButton)

        // Call the captured onChunkReceived function
        const mockChunk = JSON.stringify({
            result: {
                response: {
                    type: ChatMessageChatMessageType.AI,
                    text: JSON.stringify({
                        project_id: "mockProjectId",
                        experiment_id: "mockExperimentId",
                    }),
                },
            },
        })

        const result = onChunkReceived(mockChunk)
        expect(result).toBe(true)

        // Re-render to pick up "experiment complete" message
        rerender(<OpportunityFinder />)

        // Check the experiment text
        const experimentText = await screen.findByText(/Your new experiment has been generated/u)
        expect(experimentText).toBeInTheDocument()
    })

    it("should return false for invalid chunk", async () => {
        const {rerender} = render(<OpportunityFinder />)

        // Select Orchestrator agent
        const orchestratorButton = screen.getByText("Orchestrator")
        expect(orchestratorButton).toBeInTheDocument()

        // Have to feed it a data generator response to enable the orchestrator
        setPreviousResponse(LegacyAgentType.DataGenerator, "testResponse")
        rerender(<OpportunityFinder />)

        await user.click(orchestratorButton)

        // Call the captured onChunkReceived function
        const invalidChunk = "invalid json"
        const result = onChunkReceived(invalidChunk)
        expect(result).toBe(false)
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
