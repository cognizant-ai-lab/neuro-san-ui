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

import {render, screen} from "@testing-library/react"
import {useSession} from "next-auth/react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {MultiAgentAcceleratorProps} from "../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {default as MultiAgentAcceleratorPage} from "../../pages/multiAgentAccelerator"

const MOCK_USER = "mock-user"
const MOCK_IMAGE = "https://example.com/mock-image.png"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

const MAA_TEXT = "Mock MultiAgentAccelerator component."

// Mock dependencies
jest.mock("next-auth/react")

jest.mock("../../../../packages/ui-common/controller/agent/Agent")

const mockMultiAgentAcceleratorSpy = jest.fn()

jest.mock("../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator", () => ({
    __esModule: true,
    MultiAgentAccelerator: (props: MultiAgentAcceleratorProps) => {
        mockMultiAgentAcceleratorSpy(props)
        return <div>{MAA_TEXT}</div>
    },
}))

const renderMultiAgentAcceleratorPage = () => render(<MultiAgentAcceleratorPage />)

describe("Multi Agent Accelerator Page", () => {
    withStrictMocks()

    beforeEach(() => {
        ;(useSession as jest.Mock).mockReturnValue({data: {user: {name: MOCK_USER, image: MOCK_IMAGE}}})
    })

    it("Should render correctly", async () => {
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(NEURO_SAN_SERVER_URL)

        renderMultiAgentAcceleratorPage()
        await screen.findByText(MAA_TEXT)

        expect(mockMultiAgentAcceleratorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userInfo: {userName: MOCK_USER, userImage: MOCK_IMAGE},
                backendNeuroSanApiUrl: NEURO_SAN_SERVER_URL,
            })
        )
    })
})
