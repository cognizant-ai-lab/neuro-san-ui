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

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import {MultiAgentAcceleratorProps} from "../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {setSessionAdapter} from "../../../../packages/ui-common/utils/SessionAdapter"
import {MultiAgentAcceleratorPage} from "../../pages/multiAgentAccelerator"

const MOCK_USER = "mock-user"
const MOCK_IMAGE = "https://example.com/mock-image.png"

// Backend neuro-san API server to use
const NEURO_SAN_SERVER_URL = "https://default.example.com"

const MAA_TEXT = "Mock MultiAgentAccelerator component."

// Mock dependencies

vi.mock("../../../../packages/ui-common/controller/agent/Agent")

const mockMultiAgentAcceleratorSpy = vi.fn()

vi.mock("../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator", () => ({
    MultiAgentAccelerator: (props: MultiAgentAcceleratorProps) => {
        mockMultiAgentAcceleratorSpy(props)
        return <div>{MAA_TEXT}</div>
    },
}))

describe("Multi Agent Accelerator Page", () => {
    withStrictMocks()

    beforeEach(() => {
        setSessionAdapter({
            useSession: () => ({data: {user: {name: MOCK_USER, image: MOCK_IMAGE}}}),
            useSessionStatus: () => "authenticated",
            signIn: vi.fn(),
            signOut: vi.fn(),
        })
    })

    it("Should render correctly", async () => {
        useEnvironmentStore.getState().setBackendNeuroSanApiUrl(NEURO_SAN_SERVER_URL)
        useEnvironmentStore.getState().setEnableAuthentication(true)

        render(<MultiAgentAcceleratorPage />)
        await screen.findByText(MAA_TEXT)

        expect(mockMultiAgentAcceleratorSpy).toHaveBeenCalledWith(
            expect.objectContaining<MultiAgentAcceleratorProps>({
                username: MOCK_USER,
                defaultNeuroSanUrl: NEURO_SAN_SERVER_URL,
            })
        )
    })
})
