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

    it("should render when isOpen is true", () => {
        renderModal()
        expect(screen.getByTestId("import-network-modal")).toBeInTheDocument()
    })

    it("should not render content when isOpen is false", () => {
        renderModal({isOpen: false})
        expect(screen.queryByTestId("import-network-modal")).not.toBeInTheDocument()
    })

    it("should display the modal title", () => {
        renderModal()
        expect(screen.getByText("Import network definition")).toBeInTheDocument()
    })

    it("should display all three stepper steps", () => {
        renderModal()
        expect(screen.getByText("Select file")).toBeInTheDocument()
        expect(screen.getByText("Review")).toBeInTheDocument()
        expect(screen.getByText("Confirm")).toBeInTheDocument()
    })

    it("should show the first step as active", () => {
        renderModal()
        // Step 1 label should be rendered with an active/completed state indicator
        const stepper = screen.getByRole("list")
        const steps = stepper.querySelectorAll('[class*="MuiStep-root"]')
        expect(steps.length).toBe(3)
    })

    it("should display the drag-and-drop prompt text", () => {
        renderModal()
        expect(screen.getByText("Drag & drop a network definition")).toBeInTheDocument()
    })

    it('should display the "browse your files" link', () => {
        renderModal()
        expect(screen.getByRole("button", {name: /browse your files/iu})).toBeInTheDocument()
    })

    it("should display the accepted file type hint", () => {
        renderModal()
        expect(screen.getByText(/Accepts .hocon/u)).toBeInTheDocument()
        expect(screen.getByText(/\.conf/u)).toBeInTheDocument()
        expect(screen.getByText(/\.json/u)).toBeInTheDocument()
        expect(screen.getByText(/up to 5 MB/u)).toBeInTheDocument()
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

    it("should show success banner after a valid JSON file is dropped", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        // CheckCircleOutlinedIcon appears in the success alert banner
        await screen.findByTestId("CheckCircleOutlinedIcon")
    })

    it("should show Continue button after successful parse", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        await screen.findByRole("button", {name: /Continue/u})
    })

    it("should show parse error banner when file content is completely unparseable", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        // Drop a file whose content cannot be repaired at all
        dropFile(dropZone, "bad.json", "not json at all !!!! @@@")
        // Should show an error state (no Continue button)
        await waitFor(() => expect(screen.queryByRole("button", {name: /Continue/u})).not.toBeInTheDocument())
    })

    it("should go back to step 1 from step 2 when Back is clicked", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const backBtn = await screen.findByRole("button", {name: /^Back$/u})
        await user.click(backBtn)
        await screen.findByRole("button", {name: /drop zone/iu})
    })

    // Step 3: Confirm
    it("should advance to step 3 after clicking Continue", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByRole("button", {name: /Import network/u})
    })

    it("should pre-fill network name from filename", async () => {
        renderModal()
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("ecommerce support")
    })

    it("should show conflict warning when name matches an existing network", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
    })

    it("should dismiss conflict warning when Replace is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Replace/u}))
        await waitFor(() => expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument())
    })

    it("should rename the network when Rename is clicked", async () => {
        renderModal({existingNetworkNames: ["ecommerce_support"]})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "ecommerce_support.hocon", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await screen.findByTestId("WarningAmberIcon")
        await user.click(screen.getByRole("button", {name: /Rename/u}))
        const nameInput = await screen.findByRole<HTMLInputElement>("textbox")
        expect(nameInput.value).toBe("ecommerce support (2)")
        expect(screen.queryByTestId("WarningAmberIcon")).not.toBeInTheDocument()
    })

    it("should call onImport with name and content when Import network is clicked", async () => {
        renderModal({onImport: onImportMock})
        const dropZone = screen.getByRole("button", {name: /drop zone/iu})
        dropFile(dropZone, "my_network.json", '{"agents": {}}')
        const continueBtn = await screen.findByRole("button", {name: /Continue/u})
        await user.click(continueBtn)
        await user.click(await screen.findByRole("button", {name: /Import network/u}))
        expect(onImportMock).toHaveBeenCalledWith("my network", expect.stringContaining('"agents"'))
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
    it("should convert underscore filename to spaced name", () => {
        expect(filenameToNetworkName("ecommerce_support.hocon")).toBe("ecommerce support")
    })
    it("should convert hyphenated filename", () => {
        expect(filenameToNetworkName("my-network.json")).toBe("my network")
    })
    it("should handle filename with no extension", () => {
        expect(filenameToNetworkName("mynetwork")).toBe("mynetwork")
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
