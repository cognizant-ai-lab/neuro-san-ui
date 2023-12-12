import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {act, render, screen, waitFor} from "@testing-library/react"
import user from "@testing-library/user-event"
import uuid from "react-uuid"

import Flow from "../../components/internal/flow/flow"
import {NodeType} from "../../components/internal/flow/nodes/types"
import loadDataTags from "../../controller/fetchdatataglist"
import {NotificationType, sendNotification} from "../../controller/notification"

// Generate some random values to use in tests
const testUser = uuid()
const testProjectId = Math.floor(Math.random() * 100_000)

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
jest.mock("../../controller/notification")

jest.mock("../../controller/fetchdatataglist")

function createFlow(
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
    let setParentState: jest.Mock

    beforeEach(() => {
        setParentState = jest.fn()
    })
    afterEach(() => {
        jest.resetModules()
    })

    it("Renders without errors", () => {
        const {container} = render(createFlow())
        expect(container).toBeTruthy()
    })

    it("Generates a single data node for empty flow", () => {
        render(createFlow(false, true, setParentState))

        // Get all the nodes
        const nodes = screen.getAllByText("Data Source")

        // Should be a data node only
        expect(nodes.length).toBe(1)

        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])
    })

    it("Doesn't show 'add' buttons when ElementsSelectable is false", () => {
        const {container} = render(createFlow(false, false))

        // Look for buttons
        const buttons = container.getElementsByClassName("btn")

        // Should be no buttons since we're in read-only mode
        expect(buttons.length).toBe(0)
    })

    it("Shows all expected buttons when ElementsSelectable is true", () => {
        const {container} = render(createFlow())

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
        const {container} = render(createFlow(true, true))

        // Look for buttons
        const buttons = container.getElementsByClassName("btn")

        // Should be four buttons for demo user
        expect(buttons.length).toBe(4)

        const titles = new Set([...buttons].map((button) => button.textContent))
        expect(titles).toStrictEqual(new Set(["Add Predictor", "Add Uncertainty Model", "Add Prescriptor", "Add LLM"]))

        // Make sure LLM options shown to demo users
        expect(container.querySelector("#add-llm-dropdown")).not.toBeNull()
    })

    it("Refuses to add a prescriptor node if there is no predictor node", () => {
        render(createFlow(false, true, setParentState))

        // Get the add prescriptor button
        const addPrescriptorButton = screen.getByText("Add Prescriptor")

        // Click the button
        addPrescriptorButton.click()

        // Should have refused to add the prescriptor node
        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])

        // Should have got a notification
        expect(sendNotification).toHaveBeenCalledWith(NotificationType.warning, expect.any(String))
    })

    it("Refuses to add an uncertainty node if there is no predictor node", () => {
        render(createFlow(false, true, setParentState))

        // Get the add prescriptor button
        const addUncertaintyNodeButton = screen.getByText("Add Uncertainty Model")

        // Click the button
        addUncertaintyNodeButton.click()

        // Should have refused to add the prescriptor node
        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])

        // Should have got a notification
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.warning,
            "Please add at least one predictor before adding uncertainty model nodes."
        )
    })

    it("Refuses to add an activation node if there's no prescriptor node", async () => {
        const mockLoadDataTags = loadDataTags as jest.Mock
        const dataTags = [
            {
                DataSource: {id: "test-datasource", name: "test-datasource"},
                LatestDataTag: "test-tag",
            },
        ]
        mockLoadDataTags.mockImplementation(() => {
            return dataTags
        })

        render(createFlow(true, true, setParentState, []))

        // Get the add add LLMs button
        const addLlmButton = screen.getByText("Add LLM")
        expect(addLlmButton).toBeInTheDocument()

        // Click the button
        await user.click(addLlmButton)

        const addActivationButton = await screen.findByText("Activation")
        expect(addActivationButton).toBeInTheDocument()
        await user.click(addActivationButton)

        // Should have refused to add the Activation node
        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])

        // Should have got a notification
        expect(sendNotification).toHaveBeenCalledWith(
            NotificationType.warning,
            "Cannot add activation LLM node",
            expect.any(String)
        )
    })

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip("Adds a predictor node when the add predictor button is clicked", async () => {
        const mockLoadDataTags = loadDataTags as jest.Mock
        const testDataSourceName = "test-datasource"

        const dataTags = [
            {
                DataSource: {id: "test-data-source-id", name: testDataSourceName},
                LatestDataTag: "test tag",
            },
        ]
        mockLoadDataTags.mockImplementation(() => {
            return dataTags
        })

        const flow = createFlow(false, true, setParentState)

        const {container, rerender} = render(flow)

        await waitFor(() => {
            expect(screen.getByText(testDataSourceName)).toBeInTheDocument()
        })

        // Get the add predictor button
        const addPredictorButton = screen.getByText("Add Predictor")
        expect(addPredictorButton).toBeInTheDocument()

        // Without this act() an ugly warning is issued by React. React testing library is supposed to auto
        // wrap things in act() but it doesn't seem to be working here.
        act(() => {
            addPredictorButton.click()
        })
        expect(sendNotification).not.toHaveBeenCalled()

        // Should have added the predictor node. The setter would have been called multiple times for re-renders,
        // so we look for one that has the three elements we expect -- the data node, the predictor node, and the edge
        const calls = setParentState.mock.calls
        expect(calls.length).toBeGreaterThan(0)

        // Find a call with three elements
        const callWithThreeElements = calls.find((call) => call[0].length === 3)?.[0]
        expect(callWithThreeElements).not.toBeUndefined()

        expect(callWithThreeElements).toEqual([
            expect.objectContaining({type: "datanode"}),
            expect.objectContaining({type: "predictornode"}),
            expect.objectContaining({type: "predictoredge"}),
        ])

        // This part doesn't work -- why?!
        rerender(flow)
        const nodes = container.getElementsByClassName("react-flow__node")
        expect(nodes.length).toBe(2)
        expect(await screen.findByText("Random Forest")).toBeInTheDocument()

        expect(mockLoadDataTags).toHaveBeenCalled()
    })
})
