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

import {createNeuroSanBrowserSession} from "./NeuroSanBrowserSession"
import {
    // eslint-disable-next-line camelcase
    ChatFilterChat_filter_type,
    ChatMessageType,
    ChatRequest,
    ChatResponse,
} from "../../generated/neuro-san/NeuroSanClient"

// The agent network's LLM settings: either a single LLM config or a list of fallback LLM configs
interface NetworkLlmConfig {
    fallbacks?: Record<string, unknown>[]
    [key: string]: unknown
}

/**
 * Returns a copy of the agent network config that carries the OpenAI API key in its LLM config. Keeping the key in the
 * config scopes it to the one session built from that copy, instead of the package-global environment, so nothing
 * holds on to the key once the query is done.
 */
const withOpenAiApiKey = (networkConfig: Record<string, unknown>, openAiApiKey: string): Record<string, unknown> => {
    const llmConfig = (networkConfig["llm_config"] ?? {}) as NetworkLlmConfig
    const keyedLlmConfig: NetworkLlmConfig = llmConfig.fallbacks
        ? {
              ...llmConfig,
              fallbacks: llmConfig.fallbacks.map((fallback) => ({...fallback, openai_api_key: openAiApiKey})),
          }
        : {...llmConfig, openai_api_key: openAiApiKey}
    return {...networkConfig, llm_config: keyedLlmConfig}
}

/**
 * Asks an agent network, run in the browser by the neuro-san package, for an answer in JSON.
 *
 * @param networkConfig The agent network's config.
 * @param networkName The name to run the network under.
 * @param input The data for the network to work on. It is sent to the network as JSON in the user message.
 * @param openAiApiKey The user's own OpenAI API key, which the agent network uses for its LLM calls.
 * @returns A promise that resolves to the network's answer, parsed from JSON.
 * @throws An error if the agent network gives no answer or its answer is not JSON.
 */
export const queryNeuroSanInBrowser = async <T>(
    networkConfig: Record<string, unknown>,
    networkName: string,
    input: Record<string, unknown>,
    openAiApiKey: string
): Promise<T> => {
    const session = createNeuroSanBrowserSession(withOpenAiApiKey(networkConfig, openAiApiKey), networkName)
    const request: ChatRequest = {
        user_message: {
            type: ChatMessageType.HUMAN,
            text: JSON.stringify(input),
        },
        // MINIMAL leaves out the agents' internal messages, so the last text is the final answer.
        // eslint-disable-next-line camelcase
        chat_filter: {chat_filter_type: ChatFilterChat_filter_type.MINIMAL},
    }

    let answer = ""
    for await (const chunk of session.streaming_chat(request) as AsyncGenerator<ChatResponse>) {
        answer = chunk.response?.text || answer
    }

    if (!answer) {
        throw new Error(`${networkName} returned no answer`)
    }
    return JSON.parse(answer) as T
}
