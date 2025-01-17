// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {userEvent} from "@testing-library/user-event"

import {UIMockupGenerator} from "../../components/internal/uiMockupGenerator/UIMockupGenerator"
import {mockFetch} from "../testUtils"

jest.mock("next/image", () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => {
        return (
            <img
                alt="Test alt"
                {...props}
            />
        )
    },
}))

describe("UIMockupGenerator", () => {
    const actionFields = ["Test 1", "Test 2", "Test 3"]
    const contextFields = ["Test 1", "Test 2", "Test 3"]
    const isOpen = true
    const onClose = jest.fn()
    const outcomeFields = ["Test 1", "Test 2", "Test 3"]
    const projectDescription = "Project description"
    const projectName = "Project name"

    const UIMockupGeneratorComponent = (
        <UIMockupGenerator
            actionFields={actionFields}
            contextFields={contextFields}
            isOpen={isOpen}
            onClose={onClose}
            outcomeFields={outcomeFields}
            projectDescription={projectDescription}
            projectName={projectName}
        />
    )

    it("should initially render component with Generate button but no mockup image", async () => {
        render(UIMockupGeneratorComponent)

        expect(screen.getByText("Generate")).toBeInTheDocument()
        expect(screen.getByText(/Click "Generate" to render a sample user interface./iu)).toBeInTheDocument()
    })

    it("should render mockup UI on click of Generate button", async () => {
        const user = userEvent.setup()
        const oldFetch = window.fetch
        window.fetch = mockFetch({response: {generatedCode: "<h1>Hello, world</h1>"}})

        render(UIMockupGeneratorComponent)

        await user.click(screen.getByText("Generate"))
        expect(await screen.findByText(/Sample user interface for "Project name"/iu)).toBeInTheDocument()
        expect(screen.queryByText(/Click "Generate" to render a sample user interface./iu)).not.toBeInTheDocument()

        // eslint-disable-next-line require-atomic-updates
        window.fetch = oldFetch
    })
})
