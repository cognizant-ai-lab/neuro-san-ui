/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {
    mockNeuroSanBrowserSession,
    networkWithTestOpenAiApiKey,
    saveOpenAiApiKey,
} from "../../../../../../__tests__/common/NeuroSanBrowserSessionMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {getBrandingSuggestions} from "../../../../controller/agent/BrandingSuggestions"
import BRANDING_SUGGESTER_NETWORK from "../../../../controller/agent/networks/branding_suggester.json"
import {createNeuroSanBrowserSession} from "../../../../controller/agent/NeuroSanBrowser/Session"
import {BrandingSuggestions} from "../../../../controller/Types/Branding"
import {useSettingsStore} from "../../../../state/Settings"

vi.mock("../../../../controller/agent/NeuroSanBrowserSession")

const COMPANY = "Acme"

const SUGGESTIONS: BrandingSuggestions = {
    primary: "#123456",
    secondary: "#234567",
    background: "#345678",
    plasma: "#456789",
    nodeColor: "#56789a",
    rangePalette: ["#000001", "#000002"],
    iconSuggestion: "Rocket",
}

describe("Controller/Agent/getBrandingSuggestions", () => {
    withStrictMocks()

    beforeEach(() => {
        useSettingsStore.getState().resetSettings()
    })

    it("gets branding suggestions from the server when the user has no OpenAI key", async () => {
        global.fetch = mockFetch(SUGGESTIONS)

        await expect(getBrandingSuggestions(COMPANY)).resolves.toEqual(SUGGESTIONS)

        expect(global.fetch).toHaveBeenCalledExactlyOnceWith(
            "/api/branding",
            expect.objectContaining({method: "POST", body: JSON.stringify({company: COMPANY})})
        )
        expect(createNeuroSanBrowserSession).not.toHaveBeenCalled()
    })

    it("gets branding suggestions in the browser when the user has an OpenAI key", async () => {
        global.fetch = vi.fn()
        const streamingChat = mockNeuroSanBrowserSession([{response: {text: JSON.stringify(SUGGESTIONS)}}])
        saveOpenAiApiKey()

        await expect(getBrandingSuggestions(COMPANY)).resolves.toEqual(SUGGESTIONS)

        expect(createNeuroSanBrowserSession).toHaveBeenCalledExactlyOnceWith(
            networkWithTestOpenAiApiKey(BRANDING_SUGGESTER_NETWORK),
            "branding_suggester"
        )
        expect(streamingChat).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                user_message: expect.objectContaining({text: JSON.stringify({company: COMPANY})}),
            })
        )
        expect(global.fetch).not.toHaveBeenCalled()
    })
})
