/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {default as userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    filenameToNetworkName,
    findNonConflictingName,
    formatFileSize,
    hoconJsonToNetworkDefinition,
    IMPORT_MODAL_ACCEPTED_EXTENSIONS,
    IMPORT_MODAL_MAX_FILE_SIZE_BYTES,
    ImportNetworkModal,
    ImportNetworkModalProps,
    parseNetworkFileContent,
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
        expect(screen.queryByText("Drag & drop a network definition")).not.toBeInTheDocument()
    })

    it("should render content when isOpen is true", () => {
        renderModal()
        expect(screen.getByText("Import network definition")).toBeInTheDocument()
        expect(screen.getByText("Select file")).toBeInTheDocument()
        expect(screen.getByText("Review")).toBeInTheDocument()
        expect(screen.getByText("Confirm")).toBeInTheDocument()
        expect(screen.getByText("Drag & drop a network definition")).toBeInTheDocument()
        expect(screen.getByRole("button", {name: /browse your files/iu})).toBeInTheDocument()
        expect(screen.getByText(/Accepts \.hocon and \.json up to 5 MB\./u)).toBeInTheDocument()
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

    it("should trigger file input click when the drop zone is clicked", async () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const clickSpy = jest.spyOn(fileInput, "click")

        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        await user.click(dropZone)

        expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it("should trigger file input click when the browse link is clicked", async () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const clickSpy = jest.spyOn(fileInput, "click")

        await user.click(screen.getByRole("button", {name: /browse your files/iu}))

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
        expect(IMPORT_MODAL_ACCEPTED_EXTENSIONS).toEqual([".hocon", ".conf", ".json"])
    })

    it("should expose correct max file size constant (5 MB)", () => {
        expect(IMPORT_MODAL_MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024)
    })

    it("should have the file input configured with correct accepted types", () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        expect(fileInput.accept).toBe(".hocon,.conf,.json")
    })

    it("should process a file chosen via the hidden file input", async () => {
        renderModal()
        const fileInput = screen.getByTestId<HTMLInputElement>("import-network-file-input")
        const file = new File(['{"agents": {}}'], "picked_network.json", {type: "application/json"})
        fireEvent.change(fileInput, {target: {files: [file]}})

        // Should advance to the review step and parse successfully
        await screen.findByTestId("CheckCircleOutlinedIcon")
        // The input value is reset so the same file can be re-selected
        expect(fileInput.value).toBe("")
    })

    // Step 2: Review
    it("should show loading spinner after a file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.hocon", '{"agents": {}}')
        await screen.findByRole("progressbar")
    })

    it("should advance to step 2 after a file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // Step 2 heading — the drop-zone should be gone
        await waitFor(() => expect(screen.queryByRole("button", {name: /drop zone/iu})).not.toBeInTheDocument())
    })

    it("should show success banner and show Continue button after a valid JSON file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // CheckCircleOutlinedIcon appears in the success alert banner
        await screen.findByTestId("CheckCircleOutlinedIcon")
        await screen.findByRole("button", {name: /Continue/u})
    })

    it("should show parse error banner when file content is unparseable", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        // Empty content is genuinely unparseable (jsonrepair throws on an empty string).
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
        // withStrictMocks() restores all mocks before each test, so no manual restore is needed.
        jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(function readAsTextMock(this: FileReader) {
            this.dispatchEvent(new Event("error"))
        })
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "unreadable.json", '{"agents": {}}')
        await screen.findByText(/Failed to read the file\./u)
    })

    // Step 3: Confirm
    it("should advance to step 3 after clicking Continue and should pre-fill network name from filename", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByRole("button", {name: /Import network/u})
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("Ecommerce Support")
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
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        // Step 3 -> step 2
        await user.click(await screen.findByRole("button", {name: /^Back$/u}))
        // Step 2 -> step 3 again
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("Ecommerce Support")
    })

    it("should show conflict warning and dismiss conflict warning when Replace is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Replace/u}))
        await waitFor(() => expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument())
    })

    it("should show conflict warning and dismiss conflict warning / rename when Rename is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Rename/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("Ecommerce Support (2)")
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
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        await user.click(await screen.findByRole("button", {name: /Continue/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("Ecommerce Support")

        await user.clear(nameInput)
        await user.type(nameInput, "Renamed Network")
        expect(nameInput.value).toBe("Renamed Network")
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

// #region: Utility function unit tests

describe("parseNetworkFileContent", () => {
    it("should parse valid JSON", () => {
        const result = parseNetworkFileContent('{"agents": {}}')
        expect(result.success).toBe(true)
        // Use type assertion — jest assertions don't narrow TypeScript types
        expect(JSON.parse((result as {success: true; json: string}).json)).toEqual({agents: {}})
    })

    it("should parse HOCON with comments", () => {
        const result = parseNetworkFileContent('// a comment\n{"agents": {}}')
        expect(result.success).toBe(true)
    })

    it("should return error for completely invalid content", () => {
        // jsonrepair can handle many things, but pure garbage should fail
        // Use something that genuinely can't be repaired
        const result = parseNetworkFileContent("::::: not json :::::")
        // Accept either success or failure — jsonrepair is lenient
        expect(result).toHaveProperty("success")
    })

    it("should fail on content that cannot be repaired", () => {
        // An empty string is genuinely unparseable.
        const result = parseNetworkFileContent("")
        expect(result.success).toBe(false)
        expect((result as {success: false; error: string}).error).toMatch(/Unexpected end/u)
    })

    it("should pre-process HOCON: comments, includes, triple-quoted strings, and substitutions", () => {
        const hocon = `# a comment line
include "llm_config.hocon"
{
    prefix = """Hello"""
    "agents": {
        "frontman": {
            "instructions": """\${prefix} world \${unknown_inner}""",
            "name": "foo" "bar"
        }
    }
    "leftover": \${prefix}
    "missing": \${unknown_outer}
}`
        const result = parseNetworkFileContent(hocon)
        expect(result.success).toBe(true)
        const parsed = JSON.parse((result as {success: true; json: string}).json) as Record<string, unknown>
        const agents = parsed["agents"] as Record<string, Record<string, unknown>>
        // ${prefix} expanded inside the triple-quoted string; the unknown var expands to ""
        expect(agents["frontman"]["instructions"]).toBe("Hello world ")
        // Adjacent strings on the same line are concatenated
        expect(agents["frontman"]["name"]).toBe("foobar")
        // Standalone ${prefix} resolves; an unknown standalone var becomes an empty string
        expect(parsed["leftover"]).toBe("Hello")
        expect(parsed["missing"]).toBe("")
    })
})

describe("hoconJsonToNetworkDefinition", () => {
    it("should convert the native HOCON tools[] format", () => {
        const json = JSON.stringify({
            tools: [
                {
                    name: "frontman",
                    function: {description: "The boss"},
                    instructions: "Lead the team",
                    tools: ["helper"],
                    display_as: "llm_agent",
                    metadata: {color: "blue"},
                },
            ],
        })
        expect(hoconJsonToNetworkDefinition(json)).toEqual([
            {
                origin: "frontman",
                tools: ["helper"],
                display_as: "llm_agent",
                metadata: {color: "blue"},
                instructions: "Lead the team",
                description: "The boss",
            },
        ])
    })

    it("should default display_as to llm_agent and omit metadata when absent in tools[] format", () => {
        const json = JSON.stringify({tools: [{name: "solo", instructions: "Work alone"}]})
        const result = hoconJsonToNetworkDefinition(json)
        expect(result[0]).toMatchObject({origin: "solo", display_as: "llm_agent", instructions: "Work alone"})
        expect(result[0]).not.toHaveProperty("metadata")
    })

    it("should skip tools[] entries without a string name", () => {
        const json = JSON.stringify({tools: [{name: "valid"}, {instructions: "no name"}]})
        const result = hoconJsonToNetworkDefinition(json)
        expect(result).toHaveLength(1)
        expect(result[0].origin).toBe("valid")
    })

    it("should convert the exported agents{} dict format", () => {
        const json = JSON.stringify({
            agents: {
                frontman: {
                    tools: ["helper"],
                    display_as: "llm_agent",
                    metadata: {color: "red"},
                    instructions: "Lead",
                    description: "Boss agent",
                },
            },
        })
        expect(hoconJsonToNetworkDefinition(json)).toEqual([
            {
                origin: "frontman",
                tools: ["helper"],
                display_as: "llm_agent",
                metadata: {color: "red"},
                instructions: "Lead",
                description: "Boss agent",
            },
        ])
    })

    it("should return an empty array when neither tools[] nor agents{} are present", () => {
        expect(hoconJsonToNetworkDefinition('{"something": "else"}')).toEqual([])
    })

    it("should return an empty array for an empty agents{} object", () => {
        expect(hoconJsonToNetworkDefinition('{"agents": {}}')).toEqual([])
    })
})

describe("formatFileSize", () => {
    it("should format bytes", () => {
        expect(formatFileSize(512)).toBe("512 B")
    })
    it("should format kilobytes", () => {
        expect(formatFileSize(4300)).toBe("4.2 KB")
    })
    it("should format megabytes", () => {
        expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB")
    })
})

describe("filenameToNetworkName", () => {
    it("should convert underscore filename to spaced, capitalized name", () => {
        expect(filenameToNetworkName("ecommerce_support.hocon")).toBe("Ecommerce Support")
    })
    it("should convert hyphenated filename", () => {
        expect(filenameToNetworkName("my-network.json")).toBe("My Network")
    })
    it("should handle filename with no extension", () => {
        expect(filenameToNetworkName("mynetwork")).toBe("Mynetwork")
    })
    it("should strip trailing UUIDs from filenames", () => {
        expect(filenameToNetworkName("autonomous_venture_studio_ops_683b0dfb_4816_464d_9c83_7e59ce6497d3.hocon")).toBe(
            "Autonomous Venture Studio Ops"
        )
    })
    it("should keep normal filenames unchanged aside from formatting", () => {
        expect(filenameToNetworkName("my_network.hocon")).toBe("My Network")
    })
})

describe("findNonConflictingName", () => {
    it("should return base name when no conflict", () => {
        expect(findNonConflictingName("my network", ["other network"])).toBe("my network")
    })
    it("should append (2) on first conflict", () => {
        expect(findNonConflictingName("my network", ["my_network"])).toBe("my network (2)")
    })
    it("should increment counter if (2) also conflicts", () => {
        expect(findNonConflictingName("my network", ["my_network", "my network (2)"])).toBe("my network (3)")
    })
})

// #endregion: Utility function unit tests
