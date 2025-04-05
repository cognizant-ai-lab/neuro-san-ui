// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import DMS from "../../pages/projects/[projectID]/experiments/[experimentID]/runs/[runID]/prescriptors/[prescriptorID]"
import conoxFlow from "../fixtures/conoxFlow.json"
import conoxRuns from "../fixtures/conoxRuns.json"
import project from "../fixtures/project.json"
import {mockFetch} from "../testUtils"

// isSuperUser
jest.mock("../../controller/authorize/superuser", () => ({
    isSuperUser: jest.fn(),
}))

// Mock fetchProjects
jest.mock("../../controller/projects/fetch", () => {
    return {
        fetchProjects: jest.fn(() => Promise.resolve([project])),
    }
})

// Mock fetchRuns
jest.mock("../../controller/run/fetch", () => ({
    fetchRuns: jest.fn(() =>
        Promise.resolve([
            {
                created_at: "2024-08-20T00:21:52.539586Z",
                updated_at: "2024-08-20T00:24:08.301003Z",
                id: Math.floor(Math.random() * 1000),
                name: "mock project",
                description: "mock project description",
                hidden: false,
                owner: "mock_user",
                lastEditedBy: "mock_user",
                flow: JSON.stringify(conoxFlow),
                output_artifacts: JSON.stringify(conoxRuns),
            },
        ])
    ),
    fetchRunArtifact: jest.fn(),
}))

// Mock artifact retrieval
jest.mock("../../components/internal/artifacts/artifacts")

// mock next/router
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
            isReady: true,
            query: {
                projectID: "1",
                experimentID: "1",
                runID: "1",
                prescriptorID: "1_2",
            },
        }
    },
}))

// mock useSession
jest.mock("next-auth/react", () => {
    return {
        useSession: jest.fn(() => ({data: {user: {name: "testUser"}}})),
    }
})

// mock useAuthentication
jest.mock("../../utils/authentication", () => ({
    useAuthentication: jest.fn(() => ({data: {user: {name: "mock_user"}}})),
}))

// mock deployRun and checkIfDeploymentReady, but use the real implementation for getRunModelData
jest.mock("../../controller/model_serving/crud", () => {
    const originalModule = jest.requireActual("../../controller/model_serving/crud")
    return {
        ...originalModule,
        deployRun: jest.fn(() => Promise.resolve([true, ""])),
        checkIfDeploymentReady: jest.fn(() => Promise.resolve(true)),
        queryModel: jest.fn(() => Promise.resolve({})),
    }
})

window.fetch = mockFetch({})

describe("DMS", () => {
    it("should render correctly", async () => {
        // eslint-disable-next-line react/jsx-pascal-case
        render(<DMS />)

        // Title
        expect(await screen.findByText(`${project.name} Project - Decision Making System`)).toBeInTheDocument()

        // CAO sections

        // Context
        expect(await screen.findByText("Context")).toBeInTheDocument()
        ;["AT", "AP", "AH"].forEach((item) => {
            const contextInputDiv = document.querySelector("#dms-context-input-components")
            expect(contextInputDiv).toBeInTheDocument()

            const element = Array.from(contextInputDiv.querySelectorAll(".MuiInputBase-root")).find(
                (el) => el.textContent === item
            )

            expect(element).toBeInTheDocument()
        })

        // Actions
        expect(await screen.findByText("Actions")).toBeInTheDocument()
        ;["AFDP", "GTEP", "TIT", "TAT", "CDP"].forEach((item) => {
            const actionInputDiv = document.querySelector("#dms-action-input-components")
            const element = Array.from(actionInputDiv.querySelectorAll(".MuiInputBase-root")).find(
                (el) => el.textContent === item
            )

            expect(element).toBeInTheDocument()
        })

        // Outcomes
        const outcomes = await screen.findByText("Outcomes")
        expect(outcomes).toBeInTheDocument()
        await Promise.all(
            ["NOX:"].map(async (item) => {
                expect(await screen.findByText(item)).toBeInTheDocument()
            })
        )
    })

    it("Should access the prescriptor correctly", async () => {
        const user = userEvent.setup()

        // eslint-disable-next-line react/jsx-pascal-case
        render(<DMS />)

        // Find button with title "Prescribe Actions"
        const prescribeButton = await screen.findByRole("button", {name: "Prescribe Actions"})
        expect(prescribeButton).toBeInTheDocument()

        // Click the button
        await user.click(prescribeButton)
    })
})
