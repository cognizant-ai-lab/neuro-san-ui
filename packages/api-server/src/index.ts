import {ChatPromptTemplate} from "@langchain/core/prompts"
import {ChatOpenAI} from "@langchain/openai"
import cors from "cors"
import express from "express"

const app = express()
const PORT = process.env["PORT"] || 3001

app.use(cors())
app.use(express.json())

// Initialize LangChain LLM
const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.7,
    openAIApiKey: process.env["OPENAI_API_KEY"],
})

const iconsForNetworksPrompt = ChatPromptTemplate.fromTemplate(`
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
"AAOSA",
"telecommunications",
"network-orchestration",
"monitoring",
"fault-detection",
"resource-allocation",
"simulation"
]
}}

For each agent in the list, suggest a suitable icon selected from the MUI icons to represent the agent in
a visualization UI, using the context of the agent description. Only give the name of the MUI Icon, not the suffix
"Icon", so for example "FlightTakeOff" not "FlightTakeOffIcon". Try to avoid using the same icon for multiple networks
where possible.

Give your answer as pure JSON, no markdown, no extra formatting, no commentary. Example answer format:
{{
  "industry/telco_network_orchestration": "Accessibility",
  "other_network": "AdminPanelSettings"
}}

Network list:
{network_list}
`)

const iconsForAgentsPrompt = ChatPromptTemplate.fromTemplate(`
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

app.get("/api/health", (_req, res) => {
    res.json({status: "ok"})
})

app.post("/api/suggestIconsForNetworks", async (req, res) => {
    console.debug("Received suggestIconsForNetworks request", req.body)
    try {
        const variables = {
            network_list: typeof req.body === "object" ? JSON.stringify(req.body, null, 2) : req.body,
        }

        const formattedPrompt = await iconsForNetworksPrompt.formatMessages(variables)
        const response = await llm.invoke(formattedPrompt)

        res.json(response.content)
    } catch (error) {
        console.error("Error:", error)
        res.status(500).json({error: "Failed to get LLM response"})
    }
})

app.post("/api/suggestIconsForAgents", async (req, res) => {
    console.debug("Received suggestIconsForAgents request", req.body)
    try {
        const variables = {
            connectivity_info: req.body.connectivity_info,
            metadata: req.body.metadata,
        }

        const formattedPrompt = await iconsForAgentsPrompt.formatMessages(variables)
        const response = await llm.invoke(formattedPrompt)

        res.json(response.content)
    } catch (error) {
        console.error("Error:", error)
        res.status(500).json({error: "Failed to get LLM response"})
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
