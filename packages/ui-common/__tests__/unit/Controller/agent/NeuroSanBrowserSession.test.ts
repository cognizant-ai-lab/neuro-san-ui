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

import {DirectAgentSession} from "@cognizant-ai-lab/neuro-san"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import AGENT_ICON_SUGGESTER_NETWORK from "../../../../controller/agent/networks/agent_icon_suggester.json"
import BRANDING_SUGGESTER_NETWORK from "../../../../controller/agent/networks/branding_suggester.json"
import NETWORK_ICON_SUGGESTER_NETWORK from "../../../../controller/agent/networks/network_icon_suggester.json"
import {createNeuroSanBrowserSession} from "../../../../controller/agent/NeuroSanBrowser/Session"

describe("Controller/Agent/createNeuroSanBrowserSession", () => {
    withStrictMocks()

    it.each([
        {networkName: "agent_icon_suggester", network: AGENT_ICON_SUGGESTER_NETWORK},
        {networkName: "network_icon_suggester", network: NETWORK_ICON_SUGGESTER_NETWORK},
        {networkName: "branding_suggester", network: BRANDING_SUGGESTER_NETWORK},
    ])("creates a session for the $networkName network", ({networkName, network}) => {
        expect(createNeuroSanBrowserSession(network, networkName)).toBeInstanceOf(DirectAgentSession)
    })

    it("rejects a network whose front man calls a tool that is not defined", () => {
        const network = {
            tools: [
                {
                    name: "front_man",
                    function: {description: "Answers questions"},
                    instructions: "Answer the question.",
                    tools: ["missing_tool"],
                },
            ],
        }

        expect(() => createNeuroSanBrowserSession(network, "broken_network")).toThrow(
            /Agent network broken_network is not valid: .*missing_tool/u
        )
    })
})
