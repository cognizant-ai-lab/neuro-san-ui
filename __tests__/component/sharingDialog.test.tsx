/**
 * Component tests for the project sharing dialog.
 */

// eslint-disable-next-line no-shadow
import {fireEvent, render, screen, waitFor} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import SharingDialog from "../../components/internal/sharingDialog"
import {getShares, share} from "../../controller/authorize/share"

// Mock the share and getShares functions
jest.mock("../../controller/authorize/share", () => ({
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
    const shareWithGithubUserTooltipText = "Please share with a user's GitHub username, not their email address."

    beforeEach(() => {
        jest.clearAllMocks()
        ;(getShares as jest.Mock).mockResolvedValue(mockCurrentShares)
    })

    test("Renders the component correctly", async () => {
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

    test("Handles sharing a project", async () => {
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

    test("Handles removing a share", async () => {
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
            const removeShareDialog = document.getElementById("remove-share-dialog-confirm-content")
            expect(removeShareDialog).toBeInTheDocument()
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

    test("Requires a user to share with", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        // Locate input for user to share with
        const userToShareWith = await screen.findByPlaceholderText("User to share with")
        expect(userToShareWith).toBeInTheDocument()
        expect(userToShareWith).toBeEmptyDOMElement()

        // Locate OK button and make sure it's disabled
        const okButton = await screen.findByRole("button", {name: /Ok/u})
        expect(okButton).toBeInTheDocument()
        expect(okButton).toBeDisabled()

        // Now input a user to share with and make sure button is enabled
        fireEvent.change(userToShareWith, {target: {value: "newUser"}})
        expect(okButton).toBeEnabled()
    })

    test("Does not allow sharing with oneself", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        // Locate input for user to share with
        const userToShareWith = await screen.findByPlaceholderText("User to share with")
        expect(userToShareWith).toBeInTheDocument()
        expect(userToShareWith).toBeEmptyDOMElement()

        // Now input a user to share with and make sure button is enabled
        fireEvent.change(userToShareWith, {target: {value: mockCurrentUser}})

        // Locate OK button and make sure it's disabled
        const okButton = await screen.findByRole("button", {name: /Ok/u})
        expect(okButton).toBeInTheDocument()
        expect(okButton).toBeDisabled()

        // Change the user to share with to not be same as current user
        fireEvent.change(userToShareWith, {target: {value: "someOtherUser"}})

        // OK button should now be enabled
        expect(okButton).toBeEnabled()
    })

    test("Does not allowing removing owner from shares", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        // Get owner share
        const ownerShare = await screen.findByText("user2 - Owner")
        expect(ownerShare).toBeInTheDocument()

        const removeOwnerShareButton = ownerShare.children[0]
        expect(removeOwnerShareButton).toBeInTheDocument()

        // Attempt to remove owner -- should not be allowed
        fireEvent.click(removeOwnerShareButton)
        expect(screen.queryByText("Remove share")).not.toBeInTheDocument()

        // Get regular user share
        const userShare = await screen.findByText("user1 - Tourist")
        expect(userShare).toBeInTheDocument()

        // Attempt to remove regular user -- should be allowed
        const removeUserShareButton = userShare.children[0]
        expect(removeUserShareButton).toBeInTheDocument()

        fireEvent.click(removeUserShareButton)
        expect(await screen.findByText("Remove share")).toBeInTheDocument()
    })

    test("Does not allow sharing again with the same user", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        // Locate input for user to share with
        const userToShareWith = await screen.findByPlaceholderText("User to share with")
        expect(userToShareWith).toBeInTheDocument()
        expect(userToShareWith).toBeEmptyDOMElement()

        // Enter the ID of a user we're already sharing with
        fireEvent.change(userToShareWith, {target: {value: "user1"}})

        const okButton = await screen.findByRole("button", {name: /Ok/u})
        expect(okButton).toBeInTheDocument()
        expect(okButton).toBeDisabled()
    })

    it("should render github user sharing info icon and tooltip", async () => {
        render(
            <SharingDialog
                project={mockProject}
                currentUser={mockCurrentUser}
                closeModal={jest.fn()}
                title="Share Project"
                visible={true}
            />
        )

        expect(screen.queryByText(shareWithGithubUserTooltipText)).not.toBeInTheDocument()

        const infoIcon = screen.queryByTestId(`sharing-dialog-share-with-info-icon-${mockProject?.id}`)
        await userEvent.hover(infoIcon)
        await waitFor(() => {
            expect(screen.getByText(shareWithGithubUserTooltipText)).toBeInTheDocument()
        })
    })
})
