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
    TEST_OPENAI_API_KEY,
} from "../../../../../../__tests__/common/NeuroSanBrowserSessionMock"
import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {queryNeuroSanInBrowser} from "../../../../controller/agent/NeuroSanBrowser/Query"
import {createNeuroSanBrowserSession} from "../../../../controller/agent/NeuroSanBrowser/Session"

vi.mock("../../../../controller/agent/NeuroSanBrowserSession")

const NETWORK_NAME = "test_network"
const TOOLS = [{name: "front_man", instructions: "Answer in JSON."}]
const LLM = {class: "openai", model_name: "gpt-5.4-mini"}

interface LlmConfigCase {
    shape: string
    llmConfig?: Record<string, unknown>
    keyedLlmConfig: Record<string, unknown>
}

// Each shape of LLM config a network can have, and where the session's config must carry the API key
const LLM_CONFIG_CASES: LlmConfigCase[] = [
    {
        shape: "fallback LLM configs",
        llmConfig: {fallbacks: [LLM, {...LLM, model_name: "gpt-5.4"}]},
        keyedLlmConfig: {
            fallbacks: [
                {...LLM, openai_api_key: TEST_OPENAI_API_KEY},
                {...LLM, model_name: "gpt-5.4", openai_api_key: TEST_OPENAI_API_KEY},
            ],
        },
    },
    {
        shape: "a single LLM config",
        llmConfig: LLM,
        keyedLlmConfig: {...LLM, openai_api_key: TEST_OPENAI_API_KEY},
    },
    {
        shape: "no LLM config",
        keyedLlmConfig: {openai_api_key: TEST_OPENAI_API_KEY},
    },
]

describe("Controller/Agent/queryNeuroSanInBrowser", () => {
    withStrictMocks()

    it.each(LLM_CONFIG_CASES)(
        "gives the API key only to the session it builds, for a network with $shape",
        async ({llmConfig, keyedLlmConfig}) => {
            mockNeuroSanBrowserSession([{response: {text: JSON.stringify({answer: 42})}}])
            const networkConfig = {llm_config: llmConfig, tools: TOOLS}
            const originalNetworkConfig = structuredClone(networkConfig)

            await expect(
                queryNeuroSanInBrowser(networkConfig, NETWORK_NAME, {question: "?"}, TEST_OPENAI_API_KEY)
            ).resolves.toEqual({answer: 42})

            expect(createNeuroSanBrowserSession).toHaveBeenCalledExactlyOnceWith(
                {llm_config: keyedLlmConfig, tools: TOOLS},
                NETWORK_NAME
            )
            // The network definition itself never holds the key
            expect(networkConfig).toEqual(originalNetworkConfig)
        }
    )
})
