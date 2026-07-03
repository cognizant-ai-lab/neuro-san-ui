/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {fireEvent, render, screen, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"
// eslint-disable-next-line no-shadow
import {beforeEach, describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/vitest/strictMocks"
import {
    formatFileSize,
    IMPORT_MODAL_MAX_FILE_SIZE_BYTES,
    ImportFileValidation,
    importFileValidationMessage,
    ImportNetworkModal,
    ImportNetworkModalProps,
    jsonToNetworkDefinition,
    parseNetworkFileContent,
    summarizeNetworkDefinition,
    validateImportFile,
} from "../../../components/MultiAgentAccelerator/Sidebar/ImportNetworkModal"

const onCloseMock = vi.fn()
const onImportMock = vi.fn()

const DEFAULT_PROPS: ImportNetworkModalProps = {
    isOpen: true,
    onClose: onCloseMock,
}

// Names for the buttons exercised across the modal's three steps.
const DROP_ZONE = "Drop zone for network definition file"
const BROWSE_LINK = "browse your files"
const CANCEL_BUTTON = "Cancel"
const CLOSE_BUTTON = "close"
const CONTINUE_BUTTON = "Continue →"
const BACK_BUTTON = "Back"
const IMPORT_BUTTON = "Import network"
const IMPORT_AS_NEW_BUTTON = "Import as new"
const REPLACE_NETWORK_BUTTON = "Replace network"
const KEEP_BOTH_TOGGLE = "Keep both"
const REPLACE_EXISTING_TOGGLE = "Replace existing"

// Helper: create a mock File and simulate FileReader loading it
const dropFile = (dropZone: HTMLElement, filename: string, content: string, type = "application/octet-stream") => {
    const file = new File([content], filename, {type})
    fireEvent.drop(dropZone, {dataTransfer: {files: [file]}})
    return file
}

describe("ImportNetworkModal", () => {
    withStrictMocks()

    let user: UserEvent

    const renderModal = (overrides: Partial<ImportNetworkModalProps> = {}) => {
        render(
            <ImportNetworkModal
                {...DEFAULT_PROPS}
                {...overrides}
            />
        )
    }

    const getDropZone = () => screen.getByRole("button", {name: DROP_ZONE})

    // Drop a file onto the modal, synchronously advancing from the select-file step to the review step.
    const dropFileOnModal = (filename = "my_network.json", content = '{"agents": {}}') =>
        dropFile(getDropZone(), filename, content)

    // Drop a file then click Continue, advancing all the way to the confirm step.
    const advanceToConfirmStep = async (filename = "my_network.json", content = '{"agents": {}}') => {
        dropFileOnModal(filename, content)
        await user.click(await screen.findByRole("button", {name: CONTINUE_BUTTON}))
    }

    // Assert a network-summary stat. Each stat is a cell holding a label and its value as sibling
    // Typographies; scope the value assertion to the cell so a bare "2"/"1"/"0" elsewhere in the
    // summary can't satisfy it. Labels render uppercased via CSS but the DOM text is source-cased.
    const expectStat = (summaryEl: HTMLElement, label: string, value: string): void => {
        const cell = within(summaryEl).getByText(label).parentElement
        if (!cell) throw new Error(`Network summary cell for "${label}" was not found`)
        expect(within(cell).getByText(value)).toBeInTheDocument()
    }

    beforeEach(() => {
        user = userEvent.setup()
    })

    it("should not render content when isOpen is false", () => {
        renderModal({isOpen: false})
        expect(screen.queryByText("Import network definition")).not.toBeInTheDocument()
    })

    it("should render content when isOpen is true", () => {
        renderModal()
        expect(screen.getByText("Import network definition")).toBeInTheDocument()
    })

    it("should render the three-step stepper", () => {
        renderModal()
        const stepper = screen.getByRole("list")
        const steps = stepper.querySelectorAll('[class*="MuiStep-root"]')
        expect(steps.length).toBe(3)
    })

    it.each([
        {name: "the Cancel button", button: CANCEL_BUTTON},
        {name: "the close (×) button", button: CLOSE_BUTTON},
    ])("should call onClose when $name is clicked", async ({button}) => {
        renderModal()
        await user.click(screen.getByRole("button", {name: button}))
        expect(onCloseMock).toHaveBeenCalledTimes(1)
    })

    it.each([
        {name: "the drop zone is clicked", button: DROP_ZONE},
        {name: "the browse link is clicked", button: BROWSE_LINK},
    ])("should trigger file input click when $name", async ({button}) => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const clickSpy = vi.spyOn(fileInput, "click")

        await user.click(screen.getByRole("button", {name: button}))

        expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it.each([{key: "Enter"}, {key: " "}])(
        "should trigger file input click when the drop zone receives a $key keydown",
        ({key}) => {
            renderModal()
            const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
            const clickSpy = vi.spyOn(fileInput, "click")

            fireEvent.keyDown(getDropZone(), {key})

            expect(clickSpy).toHaveBeenCalledTimes(1)
        }
    )

    it("should not trigger file input click on an unrelated key", () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const clickSpy = vi.spyOn(fileInput, "click")

        fireEvent.keyDown(getDropZone(), {key: "a"})

        expect(clickSpy).not.toHaveBeenCalled()
    })

    it.each([
        {name: "should keep the drop zone mounted on drag-over", events: ["dragOver"] as const},
        {
            name: "should keep the drop zone mounted after drag-over then drag-leave",
            events: ["dragOver", "dragLeave"] as const,
        },
    ])("$name", ({events}) => {
        renderModal()
        const dropZone = getDropZone()
        // The styled drop zone re-renders on these events; we only assert it survives without crashing.
        events.forEach((event) => fireEvent[event](dropZone, {preventDefault: vi.fn()}))
        expect(dropZone).toBeInTheDocument()
    })

    it("should handle a drop event with no files without throwing", () => {
        renderModal()
        const dropZone = getDropZone()
        expect(() => fireEvent.drop(dropZone, {dataTransfer: {files: []}})).not.toThrow()
    })

    it("should have the file input configured with correct accepted types", () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        expect(fileInput.accept).toBe(".json")
    })

    it("should process a file chosen via the hidden file input", async () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        await user.upload(fileInput, new File(['{"agents": {}}'], "picked_network.json", {type: "application/json"}))

        // Should advance to the review step and parse successfully
        await screen.findByTestId("CheckCircleOutlinedIcon")
        // The input value is reset so the same file can be re-selected
        expect(fileInput.value).toBe("")
    })

    // Review step
    it("should show a loading spinner after a file is dropped", async () => {
        renderModal()
        dropFileOnModal()
        await screen.findByRole("progressbar")
    })

    it("should advance to the review step after a file is dropped", () => {
        renderModal()
        const dropZone = getDropZone()
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // The drop synchronously advances to the review step, unmounting the drop zone.
        expect(dropZone).not.toBeInTheDocument()
    })

    it("should show success banner and a Continue button after a valid JSON file is dropped", async () => {
        renderModal()
        dropFileOnModal()
        // CheckCircleOutlinedIcon appears in the success alert banner
        await screen.findByTestId("CheckCircleOutlinedIcon")
        await screen.findByRole("button", {name: CONTINUE_BUTTON})
    })

    it("should show the network summary (counts + frontman) on the review step", async () => {
        renderModal()
        const definition = JSON.stringify([
            {origin: "lead", display_as: "llm_agent", tools: ["worker", "search"]},
            {origin: "worker", display_as: "llm_agent", tools: []},
            {origin: "search", display_as: "coded_tool", tools: []},
        ])
        dropFileOnModal("my_network.json", definition)

        await screen.findByTestId("CheckCircleOutlinedIcon")
        const summaryEl = document.querySelector<HTMLElement>("#import-network-modal-summary")
        if (!summaryEl) throw new Error("Network summary was not rendered")
        // 2 llm_agents, 1 coded_tool, 0 external_agents, frontman = lead
        expectStat(summaryEl, "Agents", "2")
        expectStat(summaryEl, "Coded tools", "1")
        expectStat(summaryEl, "External agents", "0")
        expectStat(summaryEl, "Front man", "lead")
    })

    it("should show a parse error banner when the file content is unparseable", async () => {
        renderModal()
        // Empty content is treated as a parse error (an empty file is not a valid network).
        dropFileOnModal("bad.json", "")
        // The error banner appears and there is no Continue button to advance.
        await screen.findByText(/Parse error:/u)
        expect(screen.queryByRole("button", {name: CONTINUE_BUTTON})).not.toBeInTheDocument()
    })

    it("should go back to the select-file step from review when Back is clicked", async () => {
        renderModal()
        dropFileOnModal()
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: DROP_ZONE})
    })

    it("should show an error when the file cannot be read", async () => {
        vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
            // Mimicking readAsText behavior: it receives FileReader as "this".
            // eslint-disable-next-line unicorn/no-this-outside-of-class
            this.dispatchEvent(new Event("error"))
        })
        renderModal()
        dropFileOnModal("unreadable.json", '{"agents": {}}')
        await screen.findByText(/Failed to read the file\./u)
    })

    it.each([
        {
            name: "an unsupported extension",
            makeFile: () => new File(["not a network"], "diagram.png", {type: "application/octet-stream"}),
            error: /Unsupported file type ".png"/u,
        },
        {
            name: "a size that exceeds the max",
            makeFile: () => {
                const oversized = new File(['{"agents": {}}'], "huge.json", {type: "application/json"})
                Object.defineProperty(oversized, "size", {value: 6 * 1024 * 1024})
                return oversized
            },
            error: /File is too large/u,
        },
    ])("should reject a dropped file with $name before reading it", async ({makeFile, error}) => {
        const readSpy = vi.spyOn(FileReader.prototype, "readAsText")
        renderModal()
        fireEvent.drop(getDropZone(), {dataTransfer: {files: [makeFile()]}})
        await screen.findByText(error)
        // No Continue button, and the file was never read/parsed
        expect(screen.queryByRole("button", {name: CONTINUE_BUTTON})).not.toBeInTheDocument()
        expect(readSpy).not.toHaveBeenCalled()
    })

    // Confirm step
    it("should advance to the confirm step on Continue and pre-fill the network name from the filename", async () => {
        renderModal()
        await advanceToConfirmStep("ecommerce_support.json")
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it("should pre-fill the raw filename stem when useNativeNames is on", async () => {
        renderModal({useNativeNames: true})
        await advanceToConfirmStep("ecommerce_support.json")
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("ecommerce_support")
    })

    it("should navigate from confirm all the way back to select-file via Back", async () => {
        renderModal()
        await advanceToConfirmStep()
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        // Confirm -> Review
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: CONTINUE_BUTTON})
        // Review -> Select file
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: DROP_ZONE})
    })

    it("should re-advance to confirm after going back to review", async () => {
        renderModal()
        await advanceToConfirmStep("ecommerce_support.json")
        // Confirm -> Review
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        // Review -> Confirm again
        await user.click(await screen.findByRole("button", {name: CONTINUE_BUTTON}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it("keep both: pre-fills the next free indexed name so the import is valid without renaming", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"], onImport: onImportMock})
        await advanceToConfirmStep("ecommerce_support.json")
        // Conflict prompt shows, defaulting to "Keep both" with the next free indexed name pre-filled
        // (the base name collides, so it starts at " (2)"), which is available and ready to import.
        await screen.findByText(/already exists\./u)
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support (2)")
        expect(screen.getByText(/Name is available\./u)).toBeInTheDocument()
        const importAsNew = screen.getByRole("button", {name: IMPORT_AS_NEW_BUTTON})
        expect(importAsNew).toBeEnabled()
        await user.click(importAsNew)
        expect(onImportMock).toHaveBeenCalledWith("Ecommerce_Support_2", expect.stringContaining('"agents"'))
    })

    it("keep both: skips an index that is already taken when pre-filling the name", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support", "ecommerce_support_2"]})
        await advanceToConfirmStep("ecommerce_support.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support (3)")
        expect(screen.getByText(/Name is available\./u)).toBeInTheDocument()
    })

    it("keep both: still warns and disables import when the pre-filled name is edited into a conflict", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        await advanceToConfirmStep("ecommerce_support.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        await user.clear(nameInput)
        await user.type(nameInput, "Ecommerce Support")
        expect(screen.getByText(/That name is taken\. Choose a new name to keep both networks\./u)).toBeInTheDocument()
        expect(screen.getByRole("button", {name: IMPORT_AS_NEW_BUTTON})).toBeDisabled()
    })

    it("should overwrite with the original name when Replace existing is chosen", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"], onImport: onImportMock})
        await advanceToConfirmStep("ecommerce_support.json")
        await user.click(screen.getByRole("button", {name: REPLACE_EXISTING_TOGGLE}))
        // Destructive warning is shown and the action is enabled.
        expect(screen.getByText(/permanently overwritten/u)).toBeInTheDocument()
        const replaceNetwork = screen.getByRole("button", {name: REPLACE_NETWORK_BUTTON})
        expect(replaceNetwork).toBeEnabled()
        await user.click(replaceNetwork)
        // Replace targets the original colliding name regardless of any earlier edits.
        expect(onImportMock).toHaveBeenCalledWith("Ecommerce_Support", expect.stringContaining('"agents"'))
    })

    it("should reset a typed name back to the original when switching to Replace existing", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"], onImport: onImportMock})
        await advanceToConfirmStep("ecommerce_support.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        await user.clear(nameInput)
        await user.type(nameInput, "Something Else")
        await user.click(screen.getByRole("button", {name: REPLACE_EXISTING_TOGGLE}))
        await user.click(screen.getByRole("button", {name: REPLACE_NETWORK_BUTTON}))
        expect(onImportMock).toHaveBeenCalledWith("Ecommerce_Support", expect.stringContaining('"agents"'))
    })

    it("should return to the rename field with the indexed name when toggling back to Keep both", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        await advanceToConfirmStep("ecommerce_support.json")
        await user.click(screen.getByRole("button", {name: REPLACE_EXISTING_TOGGLE}))
        expect(screen.getByText(/permanently overwritten/u)).toBeInTheDocument()
        await user.click(screen.getByRole("button", {name: KEEP_BOTH_TOGGLE}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support (2)")
    })

    it("should not show the conflict prompt when the imported name is unique", async () => {
        renderModal({existingNetworkNames: ["some_other_network"]})
        await advanceToConfirmStep("ecommerce_support.json")
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        expect(screen.queryByText(/How would you like to handle it\?/u)).not.toBeInTheDocument()
    })

    it("should keep the edited name when re-clicking the already-active Keep both toggle", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        await advanceToConfirmStep("ecommerce_support.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        await user.clear(nameInput)
        await user.type(nameInput, "Ecommerce Support Revamp")
        // Re-clicking the active toggle deselects it (exclusive group), which is a no-op here.
        await user.click(screen.getByRole("button", {name: KEEP_BOTH_TOGGLE}))
        expect(screen.getByRole<HTMLInputElement>("textbox")).toHaveValue("Ecommerce Support Revamp")
    })

    it("should warn and disable import when a unique imported name is edited into an existing one", async () => {
        renderModal({existingNetworkNames: ["taken_network"]})
        // Imported name is unique, so the simple field (not the conflict toggle) is shown.
        await advanceToConfirmStep("my_network.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(screen.getByRole("button", {name: IMPORT_BUTTON})).toBeEnabled()

        await user.clear(nameInput)
        await user.type(nameInput, "Taken Network")
        expect(screen.getByText(/That name is taken\. Pick another to continue\./u)).toBeInTheDocument()
        expect(screen.getByRole("button", {name: IMPORT_BUTTON})).toBeDisabled()
    })

    it.each([
        {
            name: "calls onImport with the network name and content",
            verify: () => expect(onImportMock).toHaveBeenCalledWith("My_Network", expect.stringContaining('"agents"')),
        },
        {name: "calls onClose", verify: () => expect(onCloseMock).toHaveBeenCalled()},
    ])("when Import network is clicked, it $name", async ({verify}) => {
        renderModal({onImport: onImportMock})
        await advanceToConfirmStep("my_network.json")
        await user.click(await screen.findByRole("button", {name: IMPORT_BUTTON}))
        verify()
    })

    it("should let the user edit the network name on the confirm step", async () => {
        renderModal()
        await advanceToConfirmStep("ecommerce_support.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")

        await user.clear(nameInput)
        await user.type(nameInput, "Renamed Network")
        expect(nameInput).toHaveValue("Renamed Network")
    })

    it("should send the edited name (underscored) to onImport", async () => {
        renderModal({onImport: onImportMock})
        await advanceToConfirmStep("my_network.json")
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        await user.clear(nameInput)
        await user.type(nameInput, "Custom Name")
        await user.click(await screen.findByRole("button", {name: IMPORT_BUTTON}))
        expect(onImportMock).toHaveBeenCalledWith("Custom_Name", expect.stringContaining('"agents"'))
    })
})

//#region: Utility function unit tests

describe("parseNetworkFileContent", () => {
    it.each([
        {name: "a JSON object", content: '{"agents": {}}', parsed: {agents: {}}},
        {
            name: "a top-level JSON array (Temporary network export shape)",
            content: '[{"origin": "frontman"}]',
            parsed: [{origin: "frontman"}],
        },
    ])("should parse $name", ({content, parsed}) => {
        const result = parseNetworkFileContent(content)
        expect(result.success).toBe(true)
        if (result.success === false) {
            throw new Error(`Expected parse success, got error: ${result.error}`)
        }
        expect(result.data).toEqual(parsed)
    })

    it.each([
        {name: "non-JSON content", content: "::::: not json :::::"},
        // HOCON is no longer supported — an include statement is not valid JSON.
        {name: "a HOCON include statement", content: 'include "llm_config.hocon"\n{"agents": {}}'},
    ])("should return a failure result for $name", ({content}) => {
        expect(parseNetworkFileContent(content).success).toBe(false)
    })

    it.each([
        {name: "empty content", content: ""},
        {name: "whitespace-only content", content: "   \n\t  \n"},
    ])("should fail with an 'empty' error on $name", ({content}) => {
        const result = parseNetworkFileContent(content)
        expect(result.success).toBe(false)
        expect((result as {success: false; error: string}).error).toMatch(/empty/iu)
    })
})

describe("validateImportFile", () => {
    const fileWithSize = (fileName: string, size: number): File => {
        const file = new File(["x"], fileName, {type: "application/octet-stream"})
        Object.defineProperty(file, "size", {value: size})
        return file
    }

    it.each([
        {name: "a supported extension within the size limit", fileName: "net.json", size: 1024},
        {name: "a supported extension case-insensitively", fileName: "NET.JSON", size: 1024},
        {name: "a file exactly at the size limit", fileName: "net.json", size: IMPORT_MODAL_MAX_FILE_SIZE_BYTES},
    ])("should accept $name", ({fileName, size}) => {
        const file = fileWithSize(fileName, size)
        expect(validateImportFile(file)).toBe("valid")
        expect(importFileValidationMessage("valid", file)).toBeNull()
    })

    it.each<{name: string; fileName: string; size: number; expectedValidation: ImportFileValidation; error: RegExp}>([
        // HOCON is no longer accepted — only JSON.
        {
            name: "an unsupported .hocon extension",
            fileName: "net.hocon",
            size: 1024,
            expectedValidation: "unsupported_type",
            error: /Unsupported file type ".hocon"/u,
        },
        {
            name: "an unsupported .png extension",
            fileName: "image.png",
            size: 1024,
            expectedValidation: "unsupported_type",
            error: /Unsupported file type ".png"/u,
        },
        {
            name: "a dotfile whose name is entirely an unsupported extension",
            fileName: ".env",
            size: 1024,
            expectedValidation: "unsupported_type",
            error: /Unsupported file type ".env"/u,
        },
        {
            name: "a file with no extension",
            fileName: "noextension",
            size: 1024,
            expectedValidation: "unsupported_type",
            error: /Unsupported file type\./u,
        },
        {
            name: "a file larger than the max size",
            fileName: "net.json",
            size: IMPORT_MODAL_MAX_FILE_SIZE_BYTES + 1,
            expectedValidation: "too_large",
            error: /File is too large/u,
        },
    ])("should reject $name", ({fileName, size, expectedValidation, error}) => {
        const file = fileWithSize(fileName, size)
        expect(validateImportFile(file)).toBe(expectedValidation)
        expect(importFileValidationMessage(expectedValidation, file)).toMatch(error)
    })
})

describe("jsonToNetworkDefinition", () => {
    it("should pass through a top-level array of entries, dropping those without a string origin", () => {
        const parsed = [
            {
                origin: "frontman",
                tools: ["helper"],
                display_as: "llm_agent",
                instructions: "Lead the team",
                description: "The boss",
            },
            {origin: "helper", tools: [] as string[], display_as: "coded_tool"},
            {instructions: "no origin"},
            null,
        ]
        expect(jsonToNetworkDefinition(parsed)).toEqual([
            {
                origin: "frontman",
                tools: ["helper"],
                display_as: "llm_agent",
                instructions: "Lead the team",
                description: "The boss",
            },
            {origin: "helper", tools: [], display_as: "coded_tool"},
        ])
    })

    it.each([
        {name: "an object with agents", parsed: {agents: {}}},
        {name: "an object with a tools array", parsed: {tools: [{name: "frontman"}]}},
        {name: "an arbitrary object", parsed: {something: "else"}},
        {name: "an empty array", parsed: []},
        {name: "a non-object value", parsed: "just a string"},
    ])("should return an empty array for $name", ({parsed}) => {
        expect(jsonToNetworkDefinition(parsed)).toEqual([])
    })

    it("should trim leading/trailing whitespace from instructions and description", () => {
        const parsed = [
            {
                origin: "frontman",
                tools: [] as string[],
                display_as: "llm_agent",
                instructions: "\n  Lead the team  \n",
                description: "  The boss\n",
            },
        ]
        expect(jsonToNetworkDefinition(parsed)).toEqual([
            {
                origin: "frontman",
                tools: [],
                display_as: "llm_agent",
                instructions: "Lead the team",
                description: "The boss",
            },
        ])
    })

    it("should leave entries without instructions or description untouched", () => {
        const parsed = [{origin: "helper", tools: [] as string[], display_as: "coded_tool"}]
        expect(jsonToNetworkDefinition(parsed)).toEqual([{origin: "helper", tools: [], display_as: "coded_tool"}])
    })
})

describe("summarizeNetworkDefinition", () => {
    it.each([
        {
            name: "count agents by display_as and resolve the frontman",
            networkDef: [
                {origin: "lead", display_as: "llm_agent", tools: ["manager", "search", "external"]},
                {origin: "manager", display_as: "llm_agent", tools: []},
                {origin: "search", display_as: "coded_tool", tools: []},
                {origin: "fetch", display_as: "coded_tool", tools: []},
                {origin: "external", display_as: "external_agent", tools: []},
            ],
            expected: {agents: 2, codedTools: 2, externalAgents: 1, frontman: "lead"},
        },
        {
            name: "report zero counts and a dash frontman for an empty definition",
            networkDef: [],
            expected: {agents: 0, codedTools: 0, externalAgents: 0, frontman: "—"},
        },
        {
            name: "fall back to the first entry as frontman when the network is fully cyclic",
            networkDef: [
                {origin: "alpha", display_as: "llm_agent", tools: ["beta"]},
                {origin: "beta", display_as: "llm_agent", tools: ["alpha"]},
            ],
            expected: {agents: 2, codedTools: 0, externalAgents: 0, frontman: "alpha"},
        },
    ])("should $name", ({networkDef, expected}) => {
        expect(summarizeNetworkDefinition(networkDef)).toEqual(expected)
    })
})

describe("formatFileSize", () => {
    it.each([
        {name: "bytes", bytes: 512, expected: "512 B"},
        {name: "kilobytes", bytes: 4300, expected: "4.2 KB"},
        {name: "megabytes", bytes: 2 * 1024 * 1024, expected: "2.0 MB"},
    ])("should format $name", ({bytes, expected}) => {
        expect(formatFileSize(bytes)).toBe(expected)
    })
})

//#endregion: Utility function unit tests
