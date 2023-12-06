import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"

import Flow from "../../components/internal/flow/flow"
import {NodeType} from "../../components/internal/flow/nodes/types"
import loadDataTags from "../../controller/fetchdatataglist"

// Values to use in tests
const testUser = "test-user"
const testProjectId = Math.floor(Math.random() * 100000)

jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/",
            pathname: "",
            query: ["demo"],
            asPath: "",
            push: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
            beforePopState: jest.fn(() => null),
            prefetch: jest.fn(() => null),
        }
    },
}))

// Mock this to disable auth stuff during tests
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: testUser}}})),
    }
})

// Don't want to send user notifications during tests so mock this
jest.mock("../../controller/notification", () => ({
    sendNotification: jest.fn(),
    NotificationType: {
        success: jest.fn(),
        info: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
    },
}))

// Mock this so as not to reach out to DB to get data tags
jest.mock("../../controller/fetchdatataglist.ts", () => ({
    __esModule: true, // needed to avoid "...is not a function" errors
    default: jest.fn(),
}))

function getFlow(
    demoUser: boolean = false,
    elementsSelectable: boolean = true,
    setParentState: jest.Mock = jest.fn(),
    initialFlow: NodeType[] = []
) {
    return (
        <Flow
            id="test-flow"
            ProjectID={testProjectId}
            SetParentState={setParentState}
            Flow={initialFlow}
            ElementsSelectable={elementsSelectable}
            isDemoUser={demoUser}
        />
    )
}

describe("Flow Test", () => {
    // Mock loadDataTags to avoid hitting server
    const mockLoadDataTags = loadDataTags as jest.Mock

    it("Renders without errors", () => {
        const {container} = render(getFlow())
        expect(container).toBeTruthy()
    })

    it("Generates a single data node for empty flow", () => {
        const setParentState = jest.fn()
        render(getFlow(false, true, setParentState, []))

        // Get all the nodes
        const nodes = screen.getAllByText("Data Source")

        // Should be a data node only
        expect(nodes.length).toBe(1)

        expect(mockLoadDataTags).toHaveBeenCalledWith(testUser, testProjectId)
        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])
    })

    it("Doesn't show 'add' buttons when ElementsSelectable is false", () => {
        const {container} = render(getFlow(false, false, jest.fn(), []))

        // Look for buttons
        const buttons = container.getElementsByClassName("btn")

        // Should be no buttons since we're in read-only mode
        expect(buttons.length).toBe(0)
    })

    it("Shows all expected buttons when ElementsSelectable is true", () => {
        const {container} = render(getFlow())

        // Look for buttons
        const buttons = container.getElementsByClassName("btn")

        // Should be three buttons for non-demo user
        expect(buttons.length).toBe(3)

        const titles = new Set([...buttons].map((button) => button.textContent))
        expect(titles).toStrictEqual(new Set(["Add Predictor", "Add Uncertainty Model", "Add Prescriptor"]))

        // Make sure LLM options not shown to non-demo users
        expect(container.querySelector("#add-llm-dropdown")).toBeNull()
    })

    it("Shows extra button for demo user", () => {
        const {container} = render(getFlow(true, true, jest.fn(), []))

        // Look for buttons
        const buttons = container.getElementsByClassName("btn")

        // Should be four buttons for demo user
        expect(buttons.length).toBe(4)

        const titles = new Set([...buttons].map((button) => button.textContent))
        expect(titles).toStrictEqual(new Set(["Add Predictor", "Add Uncertainty Model", "Add Prescriptor", "Add LLM"]))

        // Make sure LLM options shown to demo users
        expect(container.querySelector("#add-llm-dropdown")).not.toBeNull()
    })
})
