// eslint-disable-next-line no-shadow
import {fireEvent, render, screen} from "@testing-library/react"

import Prescriptornode from "../../../../../components/internal/flow/nodes/prescriptornode"
import {DataTag} from "../../../../../generated/metadata"

// Mock the Handle component since we don't want to invite react-flow to this party
jest.mock("reactflow", () => ({
    ...jest.requireActual("reactflow"),
    Handle: jest.fn((id) => <div data-testid={id.id} />),
}))

describe("PrescriptorNode", () => {
    const taggedData: DataTag = DataTag.fromPartial({fields: {}})

    const prescriptorNode = (
        <Prescriptornode
            id=""
            data={{
                ...DataTag.fromPartial({}),
                SetParentPrescriptorState: jest.fn(),
                DeleteNode: jest.fn(),
                GetElementIndex: () => 0,
                readOnlyNode: false,
                NodeID: "test-node-id",
                ParentPrescriptorState: {
                    evolution: {fitness: []},
                    network: {hidden_layers: [{layer_params: {units: 1}}]},
                    LEAF: {representation: ""},
                    caoState: {
                        context: {},
                        action: {},
                    },
                },
                SelectedDataSourceId: 1,
                taggedData: taggedData,
            }}
            selected={false}
            type=""
            zIndex={0}
            isConnectable={false}
            xPos={0}
            yPos={0}
            dragging={false}
        />
    )

    it("Should render correctly", async () => {
        render(prescriptorNode)

        // Make sure handles are present
        expect(screen.getByTestId("prescriptor-1-source-handle")).toBeInTheDocument()
        expect(screen.getByTestId("prescriptor-1-target-handle")).toBeInTheDocument()

        // Title
        expect(screen.getByText("Prescriptor")).toBeInTheDocument()

        // Context and Action buttons
        expect(screen.getByText("C")).toBeInTheDocument()
        expect(screen.getByText("A")).toBeInTheDocument()
    })

    it("Should pop up the config when the gear is clicked", async () => {
        render(prescriptorNode)

        // find settings button
        const gearButton = document.getElementById("prescriptor-1-gr-settings-button")
        expect(gearButton).toBeInTheDocument()

        // click it
        fireEvent.click(gearButton)

        // Make sure the settings dialog is present
        expect(document.getElementById("prescriptor-1-gr-settings-popper")).toBeInTheDocument()
    })
})
