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

import type {Mock} from "vitest"

import {createNeuroSanBrowserSession} from "../../packages/ui-common/controller/agent/NeuroSanBrowserSession"
import {ChatResponse} from "../../packages/ui-common/generated/neuro-san/NeuroSanClient"
import {useSettingsStore} from "../../packages/ui-common/state/Settings"

export const TEST_OPENAI_API_KEY = "test-openai-key"

/**
 * Stands in for an agent network session run in the browser by the neuro-san package, streaming the given chat
 * responses. Tests that use this must mock the NeuroSanBrowserSession module with
 * `vi.mock(".../controller/agent/NeuroSanBrowserSession")`.
 *
 * @param responses The chat responses the session streams back
 * @returns The mock session's streaming_chat function, for assertions
 */
export const mockNeuroSanBrowserSession = (responses: readonly ChatResponse[]): Mock => {
    const streamingChat = vi.fn(async function* streamResponses() {
        yield* responses
    })
    vi.mocked(createNeuroSanBrowserSession).mockReturnValue({
        streaming_chat: streamingChat,
    } as unknown as ReturnType<typeof createNeuroSanBrowserSession>)
    return streamingChat
}

/**
 * Saves the user's own OpenAI API key, which makes LLM suggestions come from agent networks run in the browser.
 * Callers should reset the settings store between tests.
 */
export const saveOpenAiApiKey = (): void => {
    useSettingsStore.getState().updateSettings({
        apiKeys: {OpenAI: {expiresAt: Number.MAX_SAFE_INTEGER, value: TEST_OPENAI_API_KEY}},
    })
}
