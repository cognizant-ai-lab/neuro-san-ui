/**
 * Component tests for the project sharing dialog.
 */

// eslint-disable-next-line no-shadow
import {fireEvent, render, screen, waitFor} from "@testing-library/react"

import SharingDialog from "../../components/internal/sharingDialog"
import {getShares, share} from "../../controller/authorization/share"

// Mock the share and getShares functions
jest.mock("../../controller/authorization/share", () => ({
    share: jest.fn(),
    getShares: jest.fn(),
}))

const mockProject = {id: 1, name: "Test Project"}
const mockCurrentUser = "currentUser"
const mockCurrentShares = [
    ["user1", "TOURIST"],
    ["user2", "OWNER"],
]

describe("Project sharing Component", () => {
    beforeEach(() => {
        ;(getShares as jest.Mock).mockResolvedValue(mockCurrentShares)
    })

    test("renders the component correctly", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title={`Share Project ${mockProject.name}`}
                visible={true}
            />
        )

        await waitFor(() => {
            expect(screen.getByText(`Share Project ${mockProject.name}`)).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByPlaceholderText("User to share with")).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("People with access")).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("user1 - Tourist")).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("People with access")).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("user1 - Tourist")).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("user2 - Owner")).toBeInTheDocument()
        })
    })

    test("handles sharing a project", async () => {
        ;(share as jest.Mock).mockResolvedValue(undefined)

        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        let input
        await waitFor(() => {
            input = screen.getByPlaceholderText("User to share with")
            expect(input).toBeInTheDocument()
        })

        fireEvent.change(input, {target: {value: "newUser"}})

        // locate OK button and click
        let okButton
        await waitFor(() => {
            okButton = screen.getByRole("button", {name: "Ok"})
            expect(okButton).toBeInTheDocument()
        })

        fireEvent.click(okButton)

        await waitFor(() => {
            expect(share).toHaveBeenCalledWith(mockProject.id, mockCurrentUser, "newUser")
        })

        await waitFor(() => {
            expect(screen.getByText('Project shared with "newUser"')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText("newUser - Tourist")).toBeInTheDocument()
        })
    })

    test("handles removing a share", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        await waitFor(() => {
            expect(screen.getByText("user1 - Tourist")).toBeInTheDocument()
        })

        let removeButton
        await waitFor(() => {
            // get removeButton svg by id
            removeButton = document.getElementById("close-icon-0")
            expect(removeButton).toBeInTheDocument()
        })

        fireEvent.click(removeButton)

        // handle confirmation modal
        await waitFor(() => {
            const confirmationModal = document.getElementsByClassName("ant-modal-confirm-content")[0]
            expect(confirmationModal).toBeInTheDocument()
        })

        let removeConfirmButton
        await waitFor(() => {
            removeConfirmButton = screen.getByRole("button", {name: "Remove"})
            expect(removeButton).toBeInTheDocument()
        })

        fireEvent.click(removeConfirmButton)

        // make sure share was deleted
        await waitFor(() => {
            expect(screen.queryByText("user1 - Tourist")).not.toBeInTheDocument()
        })
    })
})
