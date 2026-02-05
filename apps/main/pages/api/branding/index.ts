/**
 * API server to provide branding colors and icon suggestions using LangChain and OpenAI.
 */

import {ChatOpenAI} from "@langchain/openai"
import cors from "cors"
import express from "express"

import {SUGGEST_AGENT_ICONS_PROMPT, SUGGEST_BRANDING_COLORS_PROMPT, SUGGEST_NETWORK_ICONS_PROMPT} from "./prompts"

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

app.get("/api/health", (_req, res) => {
    res.json({status: "ok"})
})

app.get("/api/branding", async (req, res) => {
    try {
        const company = req.query["company"] as string

        const formattedPrompt = await SUGGEST_BRANDING_COLORS_PROMPT.formatMessages({
            company,
        })
        const response = await llm.invoke(formattedPrompt)

        res.json(response.content)
    } catch (error) {
        console.error("Error:", error)
        res.status(500).json({error: "Failed to get LLM response"})
    }
})

app.post("/api/suggestIconsForNetworks", async (req, res) => {
    console.debug("Received suggestIconsForNetworks request", req.body)
    try {
        const variables = {
            network_list: typeof req.body === "object" ? JSON.stringify(req.body, null, 2) : req.body,
        }

        const formattedPrompt = await SUGGEST_NETWORK_ICONS_PROMPT.formatMessages(variables)
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

        const formattedPrompt = await SUGGEST_AGENT_ICONS_PROMPT.formatMessages(variables)
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
