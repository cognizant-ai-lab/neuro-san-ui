import {ChatPromptTemplate} from "@langchain/core/prompts"

export const SUGGEST_NETWORK_ICONS_PROMPT = ChatPromptTemplate.fromTemplate(`
You are given a list of agent networks and associated information for each network including network name, 
description and any associated tags assigned by the network designer. These are agentic AI networks.
Example format:
{{
"agent_name": "industry/telco_network_orchestration",
"description": "Simulates a large-scale telecommunication network orchestration system, including monitoring,
fault detection and resource allocation, for a telco company in Australia. The network is organized into regions
(NSW: New South Wales, VIC: Victoria, QLD: Queensland), each with a site manager and a set of nodes.
The agents are NOT grounded and will simulate access to the network's systems instead.",
"tags": [
"telecommunications",
"network-orchestration",
]
}}

For each agent in the list, suggest a suitable icon selected from the MUI icons to represent the agent in
a visualization UI, using the context of the agent description. Only give the name of the MUI Icon, not the suffix
"Icon", so for example "FlightTakeOff" not "FlightTakeOffIcon". Try to avoid using the same icon for multiple networks
where possible.

Network list:
{network_list}

Give your answer as pure JSON, no markdown, no extra formatting, no commentary. Example answer format:
{{
  "industry/telco_network_orchestration": "Accessibility",
  "other_network": "AdminPanelSettings"
}}
`)
