import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {cleanup, fireEvent, render, screen, waitFor, waitForElementToBeRemoved} from "@testing-library/react"

import {DEMO_USER} from "../../const"
import * as listFetch from "../../controller/list/fetch"
import * as projectFetch from "../../controller/projects/fetch"
import {Projects} from "../../controller/projects/types"
import {AuthQuery} from "../../generated/auth"
import ProjectsPage from "../../pages/projects"
import {mockFetch} from "../testUtils"
const MOCK_USER = "mock-user"

const MOCK_PROJECT = {
    created_at: "2024-08-20T00:21:52.539586Z",
    updated_at: "2024-08-20T00:24:08.301003Z",
    id: Math.floor(Math.random() * 1000),
    name: "mock project",
    description: "mock project description",
    hidden: false,
    owner: MOCK_USER,
    lastEditedBy: MOCK_USER,
}

const DEMO_PROJECT = {
    created_at: "2024-08-23T10:38:59.676337Z",
    updated_at: "2024-08-26T08:12:16.627869Z",
    id: Math.floor(Math.random() * 1000),
    name: "demo project",
    description: "demo project description",
    hidden: false,
    owner: DEMO_USER,
    lastEditedBy: DEMO_USER,
}

const mockPush = jest.fn()

// Mock dependencies
jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/projects",
            pathname: "",
            asPath: "",
            push: mockPush,
            events: {
                on: jest.fn(),
                off: jest.fn(),
            },
            beforePopState: jest.fn(() => null),
            prefetch: jest.fn(() => null),
        }
    },
}))

jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: MOCK_USER}}})),
    }
})

jest.mock("../../state/features", () => ({
    ...jest.requireActual("../../state/features"),
    __esModule: true,
    default: jest.fn(() => ({enableProjectSharing: true})),
}))

jest.mock("../../controller/list/fetch", () => {
    return {
        __esModule: true,
        ...jest.requireActual("../../controller/list/fetch"),
    }
})

jest.mock("../../controller/projects/fetch", () => {
    return {
        __esModule: true,
        ...jest.requireActual("../../controller/projects/fetch"),
    }
})

jest.mock("../../controller/projects/update", () => ({
    ...jest.requireActual("../../controller/projects/update"),
    __esModule: true,
    default: jest.fn(() => []),
}))

jest.mock("../../components/internal/newproject", () => {
    return {
        __esModule: true,
        default: jest.fn(() => <div>Mock New Project</div>),
    }
})

jest.mock("../../components/notification", () => {
    return {
        __esModule: true,
        ...jest.requireActual("../../components/notification"),
    }
})

jest.mock("next/link", () => {
    return {
        __esModule: true,
        default: jest.fn(),
    }
})

// Mock the getShares functions
jest.mock("../../controller/authorize/share", () => ({
    getShares: jest.fn(),
}))

window.fetch = mockFetch({})
jest.spyOn(listFetch, "fetchResourceList").mockImplementation(
    () =>
        [
            {
                role: "OWNER",
                target: {
                    resourceType: "PROJECT",
                    id: MOCK_PROJECT.id,
                },
            },
            {
                role: "OWNER",
                target: {
                    resourceType: "PROJECT",
                    id: DEMO_PROJECT.id,
                },
            },
        ] as unknown as Promise<AuthQuery[]>
)

describe("Projects Page", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(projectFetch, "fetchProjects").mockImplementation(
            () => [MOCK_PROJECT, DEMO_PROJECT] as unknown as Promise<Projects>
        )
    })

    afterEach(() => {
        cleanup()
        localStorage.clear()
    })

    it("should display a project page with projects visible to user", async () => {
        render(<ProjectsPage />)

        // UI truncates description and adds an ellipsis
        const mockProject = await screen.findByText(`${MOCK_PROJECT.description}...`)
        const demoProject = await screen.findByText(`${DEMO_PROJECT.description}...`)

        expect(mockProject).toBeInTheDocument()
        expect(demoProject).toBeInTheDocument()
    })

    it("should show error page if project list returns falsy", async () => {
        jest.spyOn(projectFetch, "fetchProjects").mockReturnValue(null as unknown as Promise<Projects>)
        render(<ProjectsPage />)

        const errorText = await screen.findByText("Unable to retrieve projects")
        expect(errorText).toBeInTheDocument()
    })

    it("should be able to delete a project if user is the owner", async () => {
        render(<ProjectsPage />)

        jest.spyOn(console, "debug").mockImplementation()

        const deleteProjectBtn = await screen.findByTestId(`project-${MOCK_PROJECT.id}-delete-button`)
        fireEvent.click(deleteProjectBtn)

        const deleteConfirm = await screen.findByText("Delete")
        fireEvent.click(deleteConfirm)

        await waitForElementToBeRemoved(() => screen.queryByText("Delete"))

        // Check if the second element exists before waiting for its removal
        const descriptionElement = screen.queryByText(`${MOCK_PROJECT.description}...`)

        if (descriptionElement) {
            await waitForElementToBeRemoved(() => descriptionElement)
        }

        expect(console.debug).toHaveBeenCalledWith(
            `Notification: Message: "Project "${MOCK_PROJECT.name}" deleted" Description: ""`
        )
    })

    it("should show sharing icon if they are an owner", async () => {
        render(<ProjectsPage />)
        const sharingIconFound = await screen.findByTestId(`project-${MOCK_PROJECT.id}-tooltip-share`)
        expect(sharingIconFound).toBeInTheDocument()
    })

    it("should be able to toggle view between personal or other projects", async () => {
        render(<ProjectsPage />)
        const mockProject = await screen.findByText(`${MOCK_PROJECT.description}...`)
        const demoProject = await screen.findByText(`${DEMO_PROJECT.description}...`)

        const myProjectsToggle = await screen.findByText("My projects")
        const demoProjectsToggle = await screen.findByText("Demo projects")

        fireEvent.click(myProjectsToggle)
        expect(mockProject).toBeInTheDocument()
        expect(demoProject).not.toBeInTheDocument()

        fireEvent.click(demoProjectsToggle)
        expect(mockProject).not.toBeInTheDocument()
        expect(screen.getByText("demo project description...")).toBeInTheDocument()
    })

    it("should display share dialog when sharing icon clicked", async () => {
        const {container} = render(<ProjectsPage />)

        let sharingIcon: Element
        await waitFor(async () => {
            sharingIcon = container.querySelector(`#project-${MOCK_PROJECT.id}-share`)
            expect(sharingIcon).toBeInTheDocument()
        })

        fireEvent.click(sharingIcon)

        const shareModalTitleElement = await screen.findByText(`Share project "${MOCK_PROJECT.name}"`)
        expect(shareModalTitleElement).toBeInTheDocument()

        // Clicking the share icon should not navigate to the project details screen!
        await waitFor(() => {
            expect(mockPush).not.toHaveBeenCalled()
        })
    })

    const clickPoints = [
        {clientX: 0, clientY: 0},
        {clientX: 50, clientY: 50},
        {clientX: 100, clientY: 100},
    ]

    test.each(clickPoints)("should allow users to click at %s on the project card", async (clickPoint) => {
        render(<ProjectsPage />)

        const mockProject = await screen.findByText(`${MOCK_PROJECT.description}...`)
        expect(mockProject).toBeInTheDocument()

        fireEvent.click(mockProject, clickPoint)

        // assert that router.push was called
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith({
                pathname: "/projects/[projectID]",
                query: {projectID: MOCK_PROJECT.id},
            })
        })
    })
})
