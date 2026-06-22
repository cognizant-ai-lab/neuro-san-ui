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

// Accessible-name matchers for the buttons exercised across the modal's three steps.
const DROP_ZONE = /drop zone/iu
const BROWSE_LINK = /browse your files/iu
const CANCEL_BUTTON = /cancel/iu
const CLOSE_BUTTON = /close/iu
const CONTINUE_BUTTON = /continue/iu
const BACK_BUTTON = /^back$/iu
const IMPORT_BUTTON = /import network/iu
const REPLACE_BUTTON = /replace/iu
const RENAME_BUTTON = /rename/iu

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

    // Drop a file onto the modal, synchronously advancing from step 1 to the review step (step 2).
    const dropFileOnModal = (filename = "my_network.json", content = '{"agents": {}}') =>
        dropFile(getDropZone(), filename, content)

    // Drop a file then click Continue, advancing all the way to the confirm step (step 3).
    const advanceToConfirmStep = async (filename = "my_network.json", content = '{"agents": {}}') => {
        dropFileOnModal(filename, content)
        await user.click(await screen.findByRole("button", {name: CONTINUE_BUTTON}))
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
        const clickSpy = jest.spyOn(fileInput, "click")

        await user.click(screen.getByRole("button", {name: button}))

        expect(clickSpy).toHaveBeenCalledTimes(1)
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
        events.forEach((event) => fireEvent[event](dropZone, {preventDefault: jest.fn()}))
        expect(dropZone).toBeInTheDocument()
    })

    it("should handle a drop event with no files without throwing", () => {
        renderModal()
        const dropZone = getDropZone()
        expect(() => fireEvent.drop(dropZone, {dataTransfer: {files: []}})).not.toThrow()
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
        await user.upload(fileInput, new File(['{"agents": {}}'], "picked_network.json", {type: "application/json"}))

        // Should advance to the review step and parse successfully
        await screen.findByTestId("CheckCircleOutlinedIcon")
        // The input value is reset so the same file can be re-selected
        expect(fileInput.value).toBe("")
    })

    // Step 2: Review
    it("should show a loading spinner after a file is dropped", async () => {
        renderModal()
        dropFileOnModal()
        await screen.findByRole("progressbar")
    })

    it("should advance to step 2 after a file is dropped", () => {
        renderModal()
        const dropZone = getDropZone()
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // The drop synchronously advances to step 2, unmounting the drop zone.
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

    it("should show a parse error banner when the file content is unparseable", async () => {
        renderModal()
        // Empty content is treated as a parse error (an empty file is not a valid network).
        dropFileOnModal("bad.json", "")
        // The error banner appears and there is no Continue button to advance.
        await screen.findByText(/Parse error:/u)
        expect(screen.queryByRole("button", {name: CONTINUE_BUTTON})).not.toBeInTheDocument()
    })

    it("should go back to step 1 from step 2 when Back is clicked", async () => {
        renderModal()
        dropFileOnModal()
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: DROP_ZONE})
    })

    it("should show an error when the file cannot be read", async () => {
        const readSpy = jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(() => {
            const reader = readSpy.mock.contexts.at(-1)
            reader?.dispatchEvent(new Event("error"))
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
        const readSpy = jest.spyOn(FileReader.prototype, "readAsText")
        renderModal()
        fireEvent.drop(getDropZone(), {dataTransfer: {files: [makeFile()]}})
        await screen.findByText(error)
        // No Continue button, and the file was never read/parsed
        expect(screen.queryByRole("button", {name: CONTINUE_BUTTON})).not.toBeInTheDocument()
        expect(readSpy).not.toHaveBeenCalled()
    })

    // Step 3: Confirm
    it("should advance to step 3 on Continue and pre-fill the network name from the filename", async () => {
        renderModal()
        await advanceToConfirmStep("ecommerce_support.json")
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it("should navigate from step 3 all the way back to step 1 via Back", async () => {
        renderModal()
        await advanceToConfirmStep()
        await screen.findByRole("button", {name: IMPORT_BUTTON})
        // Step 3 -> step 2
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: CONTINUE_BUTTON})
        // Step 2 -> step 1
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        await screen.findByRole("button", {name: DROP_ZONE})
    })

    it("should re-advance to step 3 after going back to step 2", async () => {
        renderModal()
        await advanceToConfirmStep("ecommerce_support.json")
        // Step 3 -> step 2
        await user.click(await screen.findByRole("button", {name: BACK_BUTTON}))
        // Step 2 -> step 3 again
        await user.click(await screen.findByRole("button", {name: CONTINUE_BUTTON}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput).toHaveValue("Ecommerce Support")
    })

    it.each([
        {
            name: "Replace",
            button: REPLACE_BUTTON,
            verify: async () => {
                await waitFor(() => expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument())
            },
        },
        {
            name: "Rename",
            button: RENAME_BUTTON,
            verify: async () => {
                const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
                expect(nameInput).toHaveValue("Ecommerce Support (2)")
                expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument()
            },
        },
    ])("should dismiss the name-conflict warning when $name is clicked", async ({button, verify}) => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        await advanceToConfirmStep("ecommerce_support.json")
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: button}))
        await verify()
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
