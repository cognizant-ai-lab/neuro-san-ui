/* eslint-disable max-len */
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

export const SUGGEST_AGENT_ICONS_PROMPT = ChatPromptTemplate.fromTemplate(`
You are given a list of agents and associated connectivity information for each agent including agent name aka "origin",
and for each agent, a list of other agents or tools that it can connect to. These are agentic AI agents. You are also
provided with metadata about the overall network the agents belong to.

For each agent in the list, suggest a suitable icon selected from the MUI icons to represent the agent in
a visualization UI, using the context of the agent description. Only give the name of the MUI Icon, not the suffix
"Icon", so for example "FlightTakeOff" not "FlightTakeOffIcon". Try to avoid using the same icon for multiple agents 
where possible.

Example format: 
{{
connectivity_info: [array of agents with tools they can connect to. Agent name is "origin" field.],
metadata: description: (description of the network as a whole), tags: [array of tags associated with the network],
sample_queries: [array of sample queries that can be asked to the network]
}}

Give your answer as pure JSON, no markdown, no extra formatting, no commentary. Example answer format:
{{
  "agent1": "Something",
  "agent2": "SomeOtherThing"
}}

Agent info:
{connectivity_info}

Metadata:
{metadata}
`)

export const SUGGEST_BRANDING_COLORS_PROMPT = ChatPromptTemplate.fromTemplate(`
Given a company or organization name, suggest colors in hex format that match the company's branding.
Return your response as JSON in the following format with no markdown, text or other comments:
{{
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "background": "#hexcode",
    "plasma": "#hexcode",
    "nodeColor": "#hexcode",
    "rangePalette": ["#hexcode1", "#hexcode2", "#hexcode3", "#hexcode4", "#hexcode5", "#hexcode6", "#hexcode7", "#hexcode8", "#hexcode9", "#hexcode10"]
}}

These colors will be used in a MUI theme for a web application, so ensure they work well together and that there is
adequate contrast between primary and background colors.
"primary" is used for primary UI elements like buttons and highlights, "background" is used for the main
background of the app,
"secondary" is used for secondary UI elements like borders and accents,
"background" is used for the main background of the app, Avoid boring white or black for better aesthetics and 
try to choose vibrant colors (not too saturated) that fit the company branding and contrast well with each other. 
The goal is for a full application make-over using the branding colors.
"plasma" is used for displaying animated plasma effects in the UI, "nodeColor" is used for coloring agent nodes in
the network visualization, and "rangePalette" is a graduated color palette with 10 items used for depth/heatmap 
coloring. It doesn't have to be a strict gradient, but it should be a set of colors that work well together and fit the
company branding.

Company: {company}
`)
