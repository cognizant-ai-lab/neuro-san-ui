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
    AgentNetwork,
    AsyncDirectAgentSession,
    AsyncioExecutorPool,
    DirectAgentReservationist,
    ExpiringAgentNetworkStorage,
    ExternalAgentSessionFactory,
    KeywordNetworkValidator,
    MasterLlmFactory,
    MasterToolboxFactory,
    MissingNodesNetworkValidator,
    NetworkConfigFilterChain,
    SessionInvocationContext,
    ToolNameNetworkValidator,
    ToolsShapeValidator,
    UnreachableNodesNetworkValidator,
    UrlNetworkValidator,
} from "@cognizant-ai-lab/neuro-san"

/**
 * Applies neuro-san's config filter chain (commondefs substitution, defaults, name correction) to an agent network
 * config, then runs neuro-san's network validators over the result.
 *
 * @param config The agent network config, as parsed from its HOCON.
 * @param networkName The network name, used in validation messages.
 * @returns The filtered config.
 * @throws An error listing every validation problem, if there are any.
 */
const prepareNetworkConfig = (config: Record<string, unknown>, networkName: string): Record<string, unknown> => {
    const filtered = new NetworkConfigFilterChain().filter_config(structuredClone(config))

    // The validators neuro-san's ManifestNetworkValidator runs. The package does not export that class itself.
    const validators = [
        new ToolsShapeValidator(networkName),
        new KeywordNetworkValidator(undefined, networkName),
        new MissingNodesNetworkValidator(),
        new UnreachableNodesNetworkValidator(networkName),
        new ToolNameNetworkValidator(),
        new UrlNetworkValidator(undefined, undefined, networkName),
    ]
    const errors = validators.flatMap((validator) => validator.validate(filtered))
    if (errors.length > 0) {
        throw new Error(`Agent network ${networkName} is not valid: ${errors.join("; ")}`)
    }
    return filtered
}

/**
 * Creates a neuro-san session that runs an agent network in this browser, straight from its config. The network is
 * not looked up by name, so it does not need to be in the neuro-san package's bundled manifest.
 *
 * Mirrors the body of the package's DirectAgentSessionFactory.create_session, without the name lookup. External
 * agents a network calls are reached over HTTP, since there is no local storage of other networks to run them from.
 *
 * @param config The agent network config, as parsed from its HOCON with includes resolved.
 * @param networkName The name to run the network under.
 * @returns A session whose streaming_chat runs the network.
 * @throws An error if the config fails neuro-san's network validation.
 */
export const createNeuroSanBrowserSession = (
    config: Record<string, unknown>,
    networkName: string
): AsyncDirectAgentSession => {
    const networkConfig = prepareNetworkConfig(config, networkName)
    const network = new AgentNetwork(networkConfig, networkName)

    const llmFactory = MasterLlmFactory.create_llm_factory(networkConfig)
    llmFactory.load()
    const toolboxFactory = MasterToolboxFactory.create_toolbox_factory(networkConfig)
    toolboxFactory.load()

    const invocationContext = new SessionInvocationContext(
        networkName,
        new ExternalAgentSessionFactory(false),
        // No executor reuse: the pool lives only as long as this session, and reuse mode starts a background
        // garbage-collection thread, which JavaScript cannot run.
        new AsyncioExecutorPool(false),
        llmFactory,
        toolboxFactory,
        undefined,
        new DirectAgentReservationist(new Set([new ExpiringAgentNetworkStorage()]))
    )
    invocationContext.start()

    return new AsyncDirectAgentSession(network, invocationContext)
}
