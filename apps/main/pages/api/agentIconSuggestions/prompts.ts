import {ChatPromptTemplate} from "@langchain/core/prompts"

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
