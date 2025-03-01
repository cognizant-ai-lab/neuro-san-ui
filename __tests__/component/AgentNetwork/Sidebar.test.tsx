// eslint-disable-next-line no-shadow
import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import Sidebar, {BLOCK_AGENT_TYPES} from "../../../components/AgentNetwork/Sidebar"
import {AgentType} from "../../../generated/metadata"

describe("SideBar", () => {
    let user: UserEvent
    beforeEach(() => {
        jest.clearAllMocks()
        user = userEvent.setup()
    })

    it("Should render correctly", async () => {
        const selectedNetworkMock = jest.fn()
        render(
            <Sidebar
                id="test-flow-id"
                selectedNetwork={AgentType.HELLO_WORLD}
                setSelectedNetwork={selectedNetworkMock}
                isAwaitingLlm={false}
            />
        )

        // Make sure all networks appear on screen
        Object.values(AgentType)
            .filter((agent) => !BLOCK_AGENT_TYPES.includes(agent))
            .forEach((network) => {
                expect(screen.getByText(cleanUpAgentName(network))).toBeInTheDocument()
            })

        // Make sure the heading is present
        expect(screen.getByText("Agent Networks")).toBeInTheDocument()

        // Clicking on a network should call the setSelectedNetwork function
        const network = screen.getByText(cleanUpAgentName(AgentType.HELLO_WORLD))
        await user.click(network)
        expect(selectedNetworkMock).toHaveBeenCalledTimes(1)
        expect(selectedNetworkMock).toHaveBeenCalledWith(AgentType.HELLO_WORLD)
    })
})
