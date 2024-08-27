import "@testing-library/jest-dom"
// eslint-disable-next-line no-shadow
import {render, screen, waitFor} from "@testing-library/react"

import * as authFetch from "../../controller/authorize/fetch"
import * as projectFetch from "../../controller/projects/fetch"
import {Projects} from "../../controller/projects/types"
import {AuthInfo} from "../../generated/auth"
import ProjectsPage from "../../pages/projects"
import {mockFetch} from "../testUtils"

// Mock dependencies
jest.mock("next/router", () => ({
    useRouter() {
        return {
            route: "/projects",
            pathname: "",
            asPath: "",
            push: jest.fn(),
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
        useSession: jest.fn(() => ({data: {user: {name: "mock-user"}}})),
    }
})

jest.mock("../../controller/authorize/fetch", () => {
    return {
        __esModule: true,
        ...jest.requireActual("../../controller/authorize/fetch"),
    }
})

jest.mock("../../controller/projects/fetch", () => {
    return {
        __esModule: true,
        ...jest.requireActual("../../controller/projects/fetch"),
    }
})

jest.mock("../../components/internal/newproject", () => {
    return {
        __esModule: true,
        default: jest.fn(() => <div>Mock New Project</div>),
    }
})

jest.mock("next/link", () => {
    return {
        __esModule: true,
        default: jest.fn(),
    }
})

describe("Projects Page", () => {
    // Mock API calls
    beforeEach(() => {
        window.fetch = mockFetch({})
        jest.spyOn(authFetch, "fetchAuthorization").mockImplementation(
            () =>
                [
                    {
                        authQuery: {
                            permission: "DELETE",
                            target: {
                                resourceType: "PROJECT",
                                id: "1",
                            },
                        },
                        isAuthorized: true,
                    },
                    {
                        authQuery: {
                            permission: "DELETE",
                            target: {
                                resourceType: "PROJECT",
                                id: "2",
                            },
                        },
                    },
                ] as unknown as Promise<AuthInfo[]>
        )

        jest.spyOn(projectFetch, "fetchProjects").mockImplementation(
            () =>
                [
                    {
                        created_at: "2024-08-20T00:21:52.539586Z",
                        updated_at: "2024-08-20T00:24:08.301003Z",
                        id: "1",
                        name: "mock project",
                        description: "mock project description",
                        hidden: false,
                        owner: "mock-user",
                        lastEditedBy: "mock-user",
                    },
                    {
                        created_at: "2024-08-23T10:38:59.676337Z",
                        updated_at: "2024-08-26T08:12:16.627869Z",
                        id: "2",
                        name: "demo project",
                        description: "demo project description",
                        hidden: false,
                        owner: "demo-user",
                        lastEditedBy: "demo-user",
                    },
                ] as unknown as Promise<Projects>
        )
    })

    it("should display a project page with projects visible to user", async () => {
        render(<ProjectsPage />)

        const mockProject = await screen.findByText("mock project description...")
        const demoProject = await screen.findByText("demo project description...")

        expect(mockProject).toBeInTheDocument()
        expect(demoProject).toBeInTheDocument()
    })

    it("should show delete button if they have delete authorization", async () => {
        render(<ProjectsPage />)
        let demoProjectDeleteBtnFound

        await waitFor(async () => {
            const deleteProjectBtn = await screen.findByTestId("project-1-delete-button")
            expect(deleteProjectBtn).toBeInTheDocument()
        })

        try {
            await screen.findByTestId("project-2-delete-button")
            demoProjectDeleteBtnFound = true
        } catch (e) {
            demoProjectDeleteBtnFound = false
        }

        expect(demoProjectDeleteBtnFound).toEqual(false)
    })
})
