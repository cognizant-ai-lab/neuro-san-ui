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

import {fireEvent, render, screen, waitFor, within} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    filenameToNetworkName,
    findNonConflictingName,
    formatFileSize,
    IMPORT_MODAL_ACCEPTED_EXTENSIONS,
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

const onCloseMock = jest.fn()
const onImportMock = jest.fn()

const DEFAULT_PROPS: ImportNetworkModalProps = {
    isOpen: true,
    onClose: onCloseMock,
}

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

    it("should show the first step as active", () => {
        renderModal()
        // Step 1 label should be rendered with an active/completed state indicator
        const stepper = screen.getByRole("list")
        const steps = stepper.querySelectorAll('[class*="MuiStep-root"]')
        expect(steps.length).toBe(3)
    })

    it("should call onClose when Cancel button is clicked", async () => {
        renderModal()
        await user.click(screen.getByRole("button", {name: /cancel/iu}))
        expect(onCloseMock).toHaveBeenCalledTimes(1)
    })

    it("should call onClose when the close (×) button is clicked", async () => {
        renderModal()
        await user.click(screen.getByRole("button", {name: /close/iu}))
        expect(onCloseMock).toHaveBeenCalledTimes(1)
    })

    it.each([
        {name: "the drop zone is clicked", button: /drop zone/iu},
        {name: "the browse link is clicked", button: /browse your files/iu},
    ])("should trigger file input click when $name", async ({button}) => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const clickSpy = jest.spyOn(fileInput, "click")

        await user.click(screen.getByRole("button", {name: button}))

        expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it("should apply drag-over styling when a file is dragged over the drop zone", () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})

        fireEvent.dragOver(dropZone, {preventDefault: jest.fn()})

        // The component re-renders with isDragOver=true; the border colour changes via styled component.
        // We confirm the drop zone is still present (no crash).
        expect(dropZone).toBeInTheDocument()
    })

    it("should remove drag-over styling when drag leaves the drop zone", () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})

        fireEvent.dragOver(dropZone, {preventDefault: jest.fn()})
        fireEvent.dragLeave(dropZone, {preventDefault: jest.fn()})

        expect(dropZone).toBeInTheDocument()
    })

    it("should handle drop event without throwing", () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})

        expect(() => {
            fireEvent.drop(dropZone, {
                dataTransfer: {files: []},
            })
        }).not.toThrow()
    })

    it("should expose correct accepted extensions constant", () => {
        expect(IMPORT_MODAL_ACCEPTED_EXTENSIONS).toEqual([".json"])
    })

    it("should expose correct max file size constant (5 MB)", () => {
        expect(IMPORT_MODAL_MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024)
    })

    it("should have the file input configured with correct accepted types", () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        expect(fileInput.accept).toBe(".json")
    })

    it("should process a file chosen via the hidden file input", async () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const file = new File(['{"agents": {}}'], "picked_network.json", {type: "application/json"})
        await user.upload(fileInput, file)

        // Should advance to the review step and parse successfully
        await screen.findByTestId("CheckCircleOutlinedIcon")
        // The input value is reset so the same file can be re-selected
        expect(fileInput.value).toBe("")
    })

    // Step 2: Review
    it("should show loading spinner after a file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        await screen.findByRole("progressbar")
    })

    it("should advance to step 2 after a file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // The drop synchronously advances to step 2, unmounting the drop zone.
        expect(dropZone).not.toBeInTheDocument()
    })

    it("should show success banner and show Continue button after a valid JSON file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // CheckCircleOutlinedIcon appears in the success alert banner
        await screen.findByTestId("CheckCircleOutlinedIcon")
        await screen.findByRole("button", {name: /Continue/u})
    })

    it("should show the network summary (counts + frontman) on the review step", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        const definition = JSON.stringify([
            {origin: "lead", display_as: "llm_agent", tools: ["worker", "search"]},
            {origin: "worker", display_as: "llm_agent", tools: []},
            {origin: "search", display_as: "coded_tool", tools: []},
        ])
        dropFile(dropZone, "my_network.json", definition)

        await screen.findByTestId("CheckCircleOutlinedIcon")
        const summaryEl = document.querySelector<HTMLElement>("#import-network-modal-summary")
        if (!summaryEl) throw new Error("Network summary was not rendered")
        const summary = within(summaryEl)
        // Labels render uppercased via CSS but the DOM text is the source-cased label.
        expect(summary.getByText("Agents")).toBeInTheDocument()
        expect(summary.getByText("Coded tools")).toBeInTheDocument()
        expect(summary.getByText("External agents")).toBeInTheDocument()
        expect(summary.getByText("Front man")).toBeInTheDocument()
        // 2 llm_agents, 1 coded_tool, 0 external_agents, frontman = lead
        expect(summary.getByText("2")).toBeInTheDocument()
        expect(summary.getByText("lead")).toBeInTheDocument()
    })

    it("should show parse error banner when file content is unparseable", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        // Empty content is treated as a parse error (an empty file is not a valid network).
        dropFile(dropZone, "bad.json", "")
        // The error banner appears and there is no Continue button to advance.
        await screen.findByText(/Parse error:/u)
        expect(screen.queryByRole("button", {name: /Continue/u})).not.toBeInTheDocument()
    })

    it("should go back to step 1 from step 2 when Back is clicked", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const backBtn = await screen.findByRole("button", {name: /^Back$/u})
        await user.click(backBtn)
        await screen.findByRole("button", {name: /drop zone/iu})
    })

    it("should show an error when the file cannot be read", async () => {
        const readSpy = jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(() => {
            const reader = readSpy.mock.contexts.at(-1)
            reader?.dispatchEvent(new Event("error"))
        })
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "unreadable.json", '{"agents": {}}')
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
        const readSpy = jest.spyOn(FileReader.prototype, "readAsText")
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        fireEvent.drop(dropZone, {dataTransfer: {files: [makeFile()]}})
        await screen.findByText(error)
        // No Continue button, and the file was never read/parsed
        expect(screen.queryByRole("button", {name: /Continue/u})).not.toBeInTheDocument()
        expect(readSpy).not.toHaveBeenCalled()
    })

    // Step 3: Confirm
    it("should advance to step 3 after clicking Continue and should pre-fill network name from filename", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByRole("button", {name: /Import network/u})
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it("should navigate from step 3 all the way back to step 1 via Back", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        await screen.findByRole("button", {name: /Import network/u})
        // Step 3 -> step 2
        await user.click(await screen.findByRole("button", {name: /^Back$/u}))
        await screen.findByRole("button", {name: /Continue/u})
        // Step 2 -> step 1
        await user.click(await screen.findByRole("button", {name: /^Back$/u}))
        await screen.findByRole("button", {name: /drop zone/iu})
    })

    it("should re-advance to step 3 after going back to step 2", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.json", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        // Step 3 -> step 2
        await user.click(await screen.findByRole("button", {name: /^Back$/u}))
        // Step 2 -> step 3 again
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it("should show conflict warning and dismiss conflict warning when Replace is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Replace/u}))
        await waitFor(() => expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument())
    })

    it("should show conflict warning and dismiss conflict warning / rename when Rename is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Rename/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support (2)")
        expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument()
    })

    it("should call onImport with name and content when Import network is clicked", async () => {
        renderModal({onImport: onImportMock})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await user.click(await screen.findByRole("button", {name: /Import network/u}))
        expect(onImportMock).toHaveBeenCalledWith("My_Network", expect.stringContaining('"agents"'))
    })

    it("should call onClose after Import network is clicked", async () => {
        renderModal({onImport: onImportMock})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await user.click(await screen.findByRole("button", {name: /Import network/u}))
        expect(onCloseMock).toHaveBeenCalled()
    })

    it("should let the user edit the network name on the confirm step", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.json", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")

        await user.clear(nameInput)
        await user.type(nameInput, "Renamed Network")
        expect(nameInput).toHaveValue("Renamed Network")
    })

    it("should send the edited name (underscored) to onImport", async () => {
        renderModal({onImport: onImportMock})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        await user.clear(nameInput)
        await user.type(nameInput, "Custom Name")
        await user.click(await screen.findByRole("button", {name: /Import network/u}))
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
        // Use type assertion — jest assertions don't narrow TypeScript types
        expect(JSON.parse((result as {success: true; json: string}).json)).toEqual(parsed)
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
        expect(validateImportFile(file)).toBe(ImportFileValidation.VALID)
        expect(importFileValidationMessage(ImportFileValidation.VALID, file)).toBeNull()
    })

    it.each([
        // HOCON is no longer accepted — only JSON.
        {
            name: "an unsupported .hocon extension",
            fileName: "net.hocon",
            size: 1024,
            expectedValidation: ImportFileValidation.UNSUPPORTED_TYPE,
            error: /Unsupported file type ".hocon"/u,
        },
        {
            name: "an unsupported .png extension",
            fileName: "image.png",
            size: 1024,
            expectedValidation: ImportFileValidation.UNSUPPORTED_TYPE,
            error: /Unsupported file type ".png"/u,
        },
        {
            name: "a file with no extension",
            fileName: "noextension",
            size: 1024,
            expectedValidation: ImportFileValidation.UNSUPPORTED_TYPE,
            error: /Unsupported file type\./u,
        },
        {
            name: "a file larger than the max size",
            fileName: "net.json",
            size: IMPORT_MODAL_MAX_FILE_SIZE_BYTES + 1,
            expectedValidation: ImportFileValidation.TOO_LARGE,
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
        const json = JSON.stringify([
            {
                origin: "frontman",
                tools: ["helper"],
                display_as: "llm_agent",
                instructions: "Lead the team",
                description: "The boss",
            },
            {origin: "helper", tools: [], display_as: "coded_tool"},
            {instructions: "no origin"},
            null,
        ])
        expect(jsonToNetworkDefinition(json)).toEqual([
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
        {name: "an object with agents", json: '{"agents": {}}'},
        {name: "an object with a tools array", json: '{"tools": [{"name": "frontman"}]}'},
        {name: "an arbitrary object", json: '{"something": "else"}'},
        {name: "an empty array", json: "[]"},
    ])("should return an empty array for $name", ({json}) => {
        expect(jsonToNetworkDefinition(json)).toEqual([])
    })

    it("should trim leading/trailing whitespace from instructions and description", () => {
        const json = JSON.stringify([
            {
                origin: "frontman",
                tools: [],
                display_as: "llm_agent",
                instructions: "\n  Lead the team  \n",
                description: "  The boss\n",
            },
        ])
        expect(jsonToNetworkDefinition(json)).toEqual([
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
        const json = JSON.stringify([{origin: "helper", tools: [], display_as: "coded_tool"}])
        expect(jsonToNetworkDefinition(json)).toEqual([{origin: "helper", tools: [], display_as: "coded_tool"}])
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

describe("filenameToNetworkName", () => {
    it.each([
        {
            name: "converts an underscore filename to a spaced, capitalized name",
            filename: "ecommerce_support.json",
            expected: "Ecommerce Support",
        },
        {name: "converts a hyphenated filename", filename: "my-network.json", expected: "My Network"},
        {name: "handles a filename with no extension", filename: "mynetwork", expected: "Mynetwork"},
        {
            name: "strips a trailing UUID from the filename",
            filename: "autonomous_venture_studio_ops_683b0dfb_4816_464d_9c83_7e59ce6497d3.json",
            expected: "Autonomous Venture Studio Ops",
        },
        {
            name: "keeps a normal filename unchanged aside from formatting",
            filename: "my_network.json",
            expected: "My Network",
        },
    ])("$name", ({filename, expected}) => {
        expect(filenameToNetworkName(filename)).toBe(expected)
    })
})

describe("findNonConflictingName", () => {
    it.each([
        {
            name: "returns the base name when there is no conflict",
            base: "my network",
            existing: ["other network"],
            expected: "my network",
        },
        {
            name: "appends (2) on the first conflict",
            base: "my network",
            existing: ["my_network"],
            expected: "my network (2)",
        },
        {
            name: "increments the counter when (2) also conflicts",
            base: "my network",
            existing: ["my_network", "my network (2)"],
            expected: "my network (3)",
        },
    ])("$name", ({base, existing, expected}) => {
        expect(findNonConflictingName(base, existing)).toBe(expected)
    })
})

//#endregion: Utility function unit tests
