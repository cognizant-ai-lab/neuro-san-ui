import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react"
import user from "@testing-library/user-event"
import {Position} from "reactflow"

import {EdgeType} from "../../components/internal/flow/edges/types"
import Flow from "../../components/internal/flow/flow"
import NodeTypes, {NodeType} from "../../components/internal/flow/nodes/types"
import {NotificationType, sendNotification} from "../../components/notification"
import loadDataTags from "../../controller/datatag/fetchdatataglist"
import {DataTagFieldCAOType, DataTagFieldDataType, DataTagFieldValued} from "../../generated/metadata"
import {AuthorizationInfo} from "../../utils/authorization"

// Generate some random values to use in tests
const testUser = crypto.randomUUID()
const testProjectId = Math.floor(Math.random() * 100_000)
const testDataSourceName = crypto.randomUUID()

// Flow with a data node and a predictor node
const FLOW_WITH_PREDICTOR: (NodeType | EdgeType)[] = [
    {
        id: "root",
        type: "datanode",
        data: {
            ProjectID: 42548,
            readOnlyNode: false,
            DataSource: {
                id: 1234,
                name: testDataSourceName,
                options: {},
                requestUser: testUser,
                createdAt: undefined,
                updatedAt: undefined,
                type: undefined,
                s3Url: undefined,
                s3Version: undefined,
                dataTags: undefined,
                headers: undefined,
                numRows: undefined,
                numCols: undefined,
                hidden: undefined,
                ProjectId: undefined,
                mask: undefined,
                s3Key: undefined,
                owner: undefined,
                lastEditedBy: undefined,
                rejectedColumnsBlob: undefined,
                rejectedColumns: undefined,
                dataReferenceId: undefined,
            },
            DataTag: {
                id: 1,
                DataSourceId: 1234,
                description: "Test Data Tag",
                fields: {
                    field1: {
                        dataType: DataTagFieldDataType.INT,
                        espType: DataTagFieldCAOType.CONTEXT,
                        sum: 100,
                        stdDev: 10,
                        range: [1, 10],
                        discreteCategoricalValues: ["value1", "value2"],
                        hasNan: false,
                        valued: DataTagFieldValued.CATEGORICAL,
                        mean: 5,
                        isOrdered: false,
                    },
                },
                createdAt: undefined,
                updatedAt: undefined,
                hidden: undefined,
                owner: undefined,
                lastEditedBy: undefined,
                requestUser: undefined,
            },
            SelfStateUpdateHandler: jest.fn(),
        },
        position: {
            x: 0,
            y: 0,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
    },
    {
        id: "81e04790-f085-6645-c06a-1013b0259dfb",
        type: "predictornode",
        data: {
            readOnlyNode: false,
            NodeID: "81e04790-f085-6645-c06a-1013b0259dfb",
            SelectedDataSourceId: 1234,
            ParentNodeState: {
                selectedPredictorType: "regressor",
                selectedPredictor: "",
                selectedMetric: "",
                params: {},
                caoState: {
                    context: {},
                    action: {},
                    outcome: {},
                },
                trainSliderValue: 80,
                testSliderValue: 20,
                rngSeedValue: null,
            },
            SetParentNodeState: jest.fn(),
            DeleteNode: jest.fn(),
            GetElementIndex: jest.fn(),
        },
        position: {
            x: 300,
            y: 0,
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
    },
    {
        id: "d7e202a9-b177-2660-e3e1-8e74f5a6c991",
        source: "root",
        target: "81e04790-f085-6645-c06a-1013b0259dfb",
        animated: false,
        type: "predictoredge",
    },
]

jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/",
            pathname: "",
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
jest.mock("../../components/notification")

// Mock this so we don't have to deal with the actual API during tests
jest.mock("../../controller/datatag/fetchdatataglist", () => {
    return {
        __esModule: true,
        default: jest.fn(() => {
            return [
                {
                    DataSource: {id: "test-data-source-id", name: testDataSourceName},
                    LatestDataTag: "test tag",
                },
            ]
        }),
    }
})

// For detecting MUI buttons
const MUI_BUTTON_CLASS = "MuiButton-root"

describe("Flow Test", () => {
    let setParentState: jest.Mock

    function createFlow(
        elementsSelectable: boolean = true,
        initialFlow: (NodeType | EdgeType)[] = [],
        projectPermissions: AuthorizationInfo = {id: testProjectId, update: true, delete: true}
    ) {
        return (
            <Flow
                id="test-flow"
                ProjectID={testProjectId}
                SetParentState={setParentState}
                Flow={initialFlow}
                ElementsSelectable={elementsSelectable}
                projectPermissions={projectPermissions}
            />
        )
    }

    async function clickToAddNode(
        expectedNodesAfterAdd: string[],
        expectedNewNodeClassName: string,
        addNodeButton: HTMLElement,
        newNodeType: keyof typeof NodeTypes
    ) {
        setParentState.mockReset()

        // Click the button to add the node
        fireEvent.click(addNodeButton)

        // Should be no popup warnings or errors
        expect(sendNotification).not.toHaveBeenCalled()

        await waitFor(() => {
            expect(loadDataTags).toHaveBeenCalled()
        })

        // Make sure setParentState() was called to add the new node
        const calls = setParentState.mock.calls
        expect(calls.length).toBeGreaterThan(0)

        // Find the call that added the node. `setParentState` gets called a bunch of times so we have to search for
        // any call that attempted to add the new node type.
        const nodeAddCall = calls.find((call) =>
            call.some((nodeList) => nodeList.some((node) => node.type === newNodeType))
        )?.[0]

        expect(nodeAddCall).toBeTruthy()

        // Make sure call to setParentState() has the correct elements
        const elementTypes = nodeAddCall.map((call) => call.type)
        expect(elementTypes).toHaveLength(expectedNodesAfterAdd.length)
        expect(new Set(elementTypes)).toStrictEqual(new Set(expectedNodesAfterAdd))

        // Fake re-rendering the flow with the new node. Here we are acting as the container for the Flow,
        // so it's on us to "remember" the state of the flow and pass it back in when we re-render.
        // Clean up the old flow rendering
        cleanup()

        // Render the modified flow
        const flowWithNewNode = createFlow(true, nodeAddCall)
        const {container: newContainer} = render(flowWithNewNode)

        // Make sure new node was rendered
        await waitFor(() => {
            const nodes = newContainer.getElementsByClassName(expectedNewNodeClassName)
            expect(nodes.length).toBe(1)
        })
    }

    async function addPrescriptorNode() {
        const flow = createFlow(true, FLOW_WITH_PREDICTOR)
        render(flow)

        expect(await screen.findByText(testDataSourceName)).toBeInTheDocument()

        // Get the add node button
        const addNodeButton = screen.getByText("Add Prescriptor")
        expect(addNodeButton).toBeInTheDocument()

        await clickToAddNode(
            ["datanode", "predictornode", "predictoredge", "prescriptornode", "prescriptoredge"],
            "react-flow__node-prescriptornode",
            addNodeButton,
            "prescriptornode"
        )
    }

    beforeEach(() => {
        setParentState = jest.fn()
        ;(sendNotification as jest.Mock).mockReset()
    })
    afterEach(() => {
        jest.resetModules()
    })

    it("Renders without errors", async () => {
        const {container} = render(createFlow())
        await waitFor(() => {
            expect(container).toBeTruthy()
        })
    })

    it("Generates a single data node for empty flow", async () => {
        render(createFlow(true))

        // Should be no popup warnings or errors
        expect(sendNotification).not.toHaveBeenCalled()

        await waitFor(() => {
            // Get all the nodes
            const nodes = screen.getAllByText("Data Source")

            // Should be a data node only
            expect(nodes.length).toBe(1)
        })

        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])
    })

    it("Doesn't show 'add' buttons when ElementsSelectable is false", async () => {
        const {container} = render(createFlow(false))

        // Should be no popup warnings or errors
        expect(sendNotification).not.toHaveBeenCalled()

        await waitFor(() => {
            expect(screen.queryByText("Add Predictor")).not.toBeInTheDocument()
        })

        // Look for buttons
        const buttons = container.getElementsByClassName(MUI_BUTTON_CLASS)

        // Should be no buttons since we're in read-only mode
        expect(buttons.length).toBe(0)
    })

    it("Shows all expected buttons when ElementsSelectable is true", async () => {
        const {container} = render(createFlow())

        await waitFor(() => {
            expect(screen.getByText("Add Predictor")).toBeInTheDocument()
        })

        // Look for buttons
        const buttons = container.getElementsByClassName(MUI_BUTTON_CLASS)

        // Should be four buttons
        expect(buttons.length).toBe(4)

        const titles = new Set([...buttons].map((button) => button.textContent))
        expect(titles).toStrictEqual(
            new Set(["Add Predictor", "Add Uncertainty Model", "Add Prescriptor", "Add LLM ▼"])
        )
    })

    it("Shows extra button for all users", async () => {
        const {container} = render(createFlow(true))

        await waitFor(() => {
            expect(screen.getByText("Add Predictor")).toBeInTheDocument()
        })

        // Look for buttons
        const buttons = container.getElementsByClassName(MUI_BUTTON_CLASS)

        // Should be four buttons for all users
        expect(buttons.length).toBe(4)

        const titles = new Set([...buttons].map((button) => button.textContent))
        expect(titles).toStrictEqual(
            new Set(["Add Predictor", "Add Uncertainty Model", "Add Prescriptor", "Add LLM ▼"])
        )

        // Make sure LLM options shown
        expect(container.querySelector("#add-llm-dropdown")).not.toBeNull()
    })

    it("Refuses to add a prescriptor node if there is no predictor node", async () => {
        render(createFlow(true))

        await waitFor(() => {
            expect(screen.getByText("Data Source")).toBeInTheDocument()
        })

        // Get the add prescriptor button
        const addPrescriptorButton = screen.getByText("Add Prescriptor")

        // Click the button
        addPrescriptorButton.click()

        // Should have refused to add the prescriptor node
        expect(setParentState).toHaveBeenLastCalledWith([expect.objectContaining({type: "datanode"})])

        // Should have got a notification
        expect(sendNotification).toHaveBeenCalledWith(NotificationType.warning, expect.any(String))
    })

    it("Refuses to add an uncertainty node if there is no predictor node", async () => {
        render(createFlow(true))

        await waitFor(() => {
            expect(screen.getByText("Data Source")).toBeInTheDocument()
        })

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
        render(createFlow(true, []))

        let addLLmButton: Element
        await waitFor(() => {
            addLLmButton = screen.getByText("Add LLM ▼")
            expect(addLLmButton).toBeInTheDocument()
        })

        // Click the button
        await user.click(addLLmButton)

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

    it("Adds a predictor node when the add predictor button is clicked", async () => {
        const flow = createFlow(true)

        render(flow)

        expect(sendNotification).not.toHaveBeenCalled()

        await waitFor(() => {
            expect(screen.getByText("Data Source")).toBeInTheDocument()
        })

        const addPredictorButton = screen.getByText("Add Predictor")
        expect(addPredictorButton).toBeInTheDocument()

        // Without this act() an ugly warning is issued by React. React testing library is supposed to auto
        // wrap things in act() but it doesn't seem to be working here.
        act(() => {
            addPredictorButton.click()
        })
        expect(sendNotification).not.toHaveBeenCalled()

        await waitFor(() => {
            expect(loadDataTags).toHaveBeenCalled()
        })

        await waitFor(() => {
            expect(setParentState).toHaveBeenCalled()
        })

        // Should have added the predictor node. The setter would have been called multiple times for re-renders,
        // so we look for one that has the three elements we expect -- the data node, the predictor node, and the edge
        const calls = setParentState.mock.calls
        expect(calls.length).toBeGreaterThan(0)

        // Find a call with three elements
        const callWithThreeElements = calls.find((call) => call[0].length === 3)?.[0]
        expect(callWithThreeElements).toBeTruthy()
        expect(new Set(callWithThreeElements)).toEqual(
            new Set([
                expect.objectContaining({type: "datanode"}),
                expect.objectContaining({type: "predictornode"}),
                expect.objectContaining({type: "predictoredge"}),
            ])
        )

        // Fake re-rendering the flow with the new predictor node. Here we are acting as the container for the Flow,
        // so it's on us to "remember" the state of the flow and pass it back in when we re-render.
        render(createFlow(true, callWithThreeElements))

        await waitFor(() => {
            expect(screen.getByText("Predictor")).toBeInTheDocument()
        })
    })

    // eslint-disable-next-line jest/expect-expect
    it("Adds a prescriptor node when the add prescriptor button is clicked", async () => {
        await addPrescriptorNode()
    })

    it("Adds an Analytics node when the add Analytics node button is clicked", async () => {
        const flow = createFlow(true)
        render(flow)

        // Get the add LLM button
        const llmMenuButton = screen.getByText("Add LLM ▼")
        expect(llmMenuButton).toBeInTheDocument()

        // click it
        fireEvent.click(llmMenuButton)

        // Get the add Analytics node button
        const addAnalyticsButton = screen.getByText("Analytics")
        expect(addAnalyticsButton).toBeInTheDocument()

        await clickToAddNode(
            ["datanode", "predictoredge", "analytics_node"],
            "react-flow__node-analytics_node",
            addAnalyticsButton,
            "analytics_node"
        )
    })

    it("Adds an Activation node when the add Activation node button is clicked", async () => {
        // Need to add a Prescriptor first since the Activation node wants to connect to it
        await addPrescriptorNode()

        // Get the add LLM button
        const llmMenuButton = screen.getByText("Add LLM ▼")
        expect(llmMenuButton).toBeInTheDocument()

        // click it
        fireEvent.click(llmMenuButton)

        // Get the add Activation node button
        const addAnalyticsButton = screen.getByText("Activation")
        expect(addAnalyticsButton).toBeInTheDocument()

        await clickToAddNode(
            [
                "datanode",
                "predictornode",
                "prescriptornode",
                "activation_node",
                "predictoredge",
                "prescriptoredge",
                "predictoredge",
            ],
            "react-flow__node-activation_node",
            addAnalyticsButton,
            "activation_node"
        )
    })

    it("should show un-authorized message if insufficient authorization is passed to flow", async () => {
        const mockLoadDataTags = loadDataTags as jest.Mock
        const dataTags = [
            {
                DataSource: {id: "test-data-source-id", name: testDataSourceName},
                LatestDataTag: "test tag",
            },
        ]
        mockLoadDataTags.mockImplementation(() => {
            return dataTags
        })

        const flow = createFlow(true, FLOW_WITH_PREDICTOR, {
            id: testProjectId,
            update: false,
            delete: false,
        })

        const {container} = render(flow)
        await waitFor(() => {
            const alertSpan = container.querySelector("#no-permissions-alert")
            expect(alertSpan).toHaveTextContent(
                "You do not have the required permissions to make changes to this experiment."
            )
        })
    })
})
