// eslint-disable-next-line no-shadow
import {fireEvent, render, screen, waitFor} from "@testing-library/react"

import LLMDropdownMenu from "../../components/internal/flow/LLMDropdownMenu"
import {DataTagFieldValued} from "../../generated/metadata"

describe("Add LLMDropdownMenu", () => {
    const renderMockLLMDropdownMenu = ({readOnly, dataTagFields}) => (
        <LLMDropdownMenu
            deleteNodeById={jest.fn()}
            getPrescriptorEdge={jest.fn()}
            getGeneralEdge={jest.fn()}
            setNodes={jest.fn()}
            setEdges={jest.fn()}
            setParentState={jest.fn()}
            addElementUuid={jest.fn()}
            ParentNodeSetStateHandler={jest.fn()}
            nodes={[]}
            getElementIndex={jest.fn()}
            idExtension="mockIdExtension"
            readOnlyNode={readOnly}
            edges={[]}
            dataTagfields={dataTagFields}
        />
    )

    it("should render add llm drop down with all options", async () => {
        const view = renderMockLLMDropdownMenu({
            readOnly: false,
            // add categorical and has_nan field
            dataTagFields: {
                hasNanField: {
                    has_nan: true,
                },
                hasCategoricalValueField: {
                    valued: DataTagFieldValued.CATEGORICAL,
                },
            },
        })

        render(view)

        const addLLMButton = await screen.findByText("Add LLM ▼")

        fireEvent.click(addLLMButton)
        await waitFor(() => {
            expect(screen.getByText("Activation")).toBeInTheDocument()
        })

        expect(screen.getByText("Analytics")).toBeInTheDocument()
        expect(screen.getByText("Confabulator")).toBeInTheDocument()
        expect(screen.getByText("Category reducer")).toBeInTheDocument()
    })

    it("should render add llm drop down without category reducer", async () => {
        const view = renderMockLLMDropdownMenu({
            readOnly: false,
            dataTagFields: {hasNanField: {has_nan: true}},
        })

        render(view)

        const addLLMButton = await screen.findByText("Add LLM ▼")

        fireEvent.click(addLLMButton)
        await waitFor(() => {
            expect(screen.getByText("Activation")).toBeInTheDocument()
        })

        expect(screen.getByText("Analytics")).toBeInTheDocument()
        expect(screen.getByText("Confabulator")).toBeInTheDocument()
        expect(screen.queryByText("Category reducer")).not.toBeInTheDocument()
    })

    it("should render add llm drop down without confabulator option", async () => {
        const view = renderMockLLMDropdownMenu({
            readOnly: false,
            dataTagFields: {hasCategoricalValueField: {valued: DataTagFieldValued.CATEGORICAL}},
        })

        render(view)

        const addLLMButton = await screen.findByText("Add LLM ▼")

        fireEvent.click(addLLMButton)
        await waitFor(() => {
            expect(screen.getByText("Activation")).toBeInTheDocument()
        })

        expect(screen.getByText("Analytics")).toBeInTheDocument()
        expect(screen.getByText("Category reducer")).toBeInTheDocument()
        expect(screen.queryByText("Confabulator")).not.toBeInTheDocument()
    })
})
