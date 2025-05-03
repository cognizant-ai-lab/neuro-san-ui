import {render, screen} from "@testing-library/react"
import {UserEvent, default as userEvent} from "@testing-library/user-event"

import {cleanUpAgentName} from "../../../components/AgentChat/Utils"
import Sidebar from "../../../components/AgentNetwork/Sidebar"
import {withStrictMocks} from "../../common/strictMocks"

const TEST_AGENT_MATH_GUY = "Math Guy"
const TEST_AGENT_MUSIC_NERD = "Music Nerd"

describe("SideBar", () => {
    let user: UserEvent

    withStrictMocks()

    beforeEach(() => {
        user = userEvent.setup()
    })

    it("Should render correctly", async () => {
        const selectedNetworkMock = jest.fn()
        render(
            <Sidebar
                id="test-flow-id"
                networks={[TEST_AGENT_MATH_GUY, TEST_AGENT_MUSIC_NERD]}
                selectedNetwork={TEST_AGENT_MATH_GUY}
                setSelectedNetwork={selectedNetworkMock}
                isAwaitingLlm={false}
            />
        )

        // Make sure the heading is present
        expect(screen.getByText("Agent Networks")).toBeInTheDocument()

        // Clicking on a network should call the setSelectedNetwork function
        const network = screen.getByText(cleanUpAgentName(TEST_AGENT_MATH_GUY))
        await user.click(network)
        expect(selectedNetworkMock).toHaveBeenCalledTimes(1)
        expect(selectedNetworkMock).toHaveBeenCalledWith(TEST_AGENT_MATH_GUY)
    })
})
