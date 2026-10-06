import { ConciergeSessionFactory, DirectAgentSessionFactory, environ } from "@cognizant-ai-lab/neuro-san-ts-package"

// The package reads its LLM key from its environ, like python's os.environ. OpenAI
// allows calls from a page, so they go straight to it.

const statusEl = document.getElementById("status")
const outEl = document.getElementById("out")
const runBtn = document.getElementById("run")
const agentSelect = document.getElementById("agentSelect")
const promptInput = document.getElementById("prompt")
const sendBtn = document.getElementById("send")
const chatStatus = document.getElementById("chatStatus")
const chatLog = document.getElementById("chatLog")
const apiKeyInput = document.getElementById("apiKey")

function setStatus(msg, ok) {
  statusEl.textContent = msg
  statusEl.className = ok === true ? "ok" : ok === false ? "err" : ""
}

function setChatStatus(msg, ok) {
  chatStatus.textContent = msg
  chatStatus.className = ok === true ? "ok" : ok === false ? "err" : ""
}

function syncSendEnabled() {
  sendBtn.disabled = !agentSelect.value
}

function isStubAgent(agent) {
  const d = agent?.description || ""
  const tags = agent?.tags || []
  return d.startsWith("(local tryout)") || tags.includes("local-ts-package")
}

function fillAgentSelect(agents) {
  agentSelect.innerHTML = ""
  if (!agents.length) {
    agentSelect.innerHTML = '<option value="">(no agents)</option>'
    syncSendEnabled()
    return
  }
  const placeholder = document.createElement("option")
  placeholder.value = ""
  placeholder.textContent = "(pick an agent)"
  agentSelect.appendChild(placeholder)
  for (const a of agents) {
    const opt = document.createElement("option")
    opt.value = a.agent_name
    const kind = isStubAgent(a) ? "stub" : "hocon"
    opt.textContent = `${a.agent_name} (${kind})`
    agentSelect.appendChild(opt)
  }
  agentSelect.value = ""
  syncSendEnabled()
}

function extractText(chunk) {
  if (chunk == null) return ""
  if (typeof chunk === "string") return chunk
  try {
    const t =
      chunk?.response?.text ??
      chunk?.chat_message?.text ??
      chunk?.message?.text ??
      chunk?.text ??
      null
    if (typeof t === "string" && t.length) return t
    return ""
  } catch {
    return ""
  }
}

async function runList() {
  setStatus("Running list()…")
  outEl.textContent = ""
  try {
    const concierge = new ConciergeSessionFactory().create_session("direct", null, null, null, null)
    const result = await concierge.list({})
    outEl.textContent = JSON.stringify(result, null, 2)
    const agents = result?.agents || []
    fillAgentSelect(agents)
    const real = agents.filter((a) => !isStubAgent(a))
    const stubs = agents.filter((a) => isStubAgent(a))
    if (real.length > 0) {
      setStatus(
        `OK: list() returned ${agents.length} agents (${real.length} real HOCON` +
          (stubs.length ? `, ${stubs.length} stubs` : "") +
          `)`,
        true,
      )
    } else if (agents.length > 0) {
      setStatus(`list() returned ${agents.length} stub agents only`, false)
    } else {
      setStatus("list() returned 0 agents", false)
    }
  } catch (e) {
    console.error(e)
    outEl.textContent = String(e && e.stack ? e.stack : e)
    setStatus("Failed, see stack below", false)
  }
}

let activeChat = null

function onAgentChange() {
  activeChat?.abort()
  promptInput.value = ""
  chatLog.textContent = ""
  setChatStatus("")
  syncSendEnabled()
}

async function runChat() {
  const agentName = agentSelect.value
  const text = (promptInput.value || "").trim()
  if (!agentName) {
    setChatStatus("Pick an agent (run list first)", false)
    return
  }
  if (!text) {
    setChatStatus("Enter a message", false)
    return
  }
  const apiKey = (apiKeyInput.value || "").trim()
  if (!apiKey) {
    setChatStatus("Enter an OpenAI key first", false)
    return
  }

  activeChat?.abort()
  const controller = new AbortController()
  activeChat = controller

  sendBtn.disabled = true
  chatLog.textContent = `you: ${text}\n\nagent:\n`
  setChatStatus(`streaming_chat on ${agentName}…`)

  try {
    environ.OPENAI_API_KEY = apiKey
    const session = new DirectAgentSessionFactory().create_session(agentName, false, null, null)
    const request = {
      user_message: { text },
      chat_filter: { chat_filter_type: "MAXIMAL" },
    }
    let assistant = ""
    for await (const chunk of session.streaming_chat(request)) {
      if (controller.signal.aborted) return
      const piece = extractText(chunk)
      if (piece) {
        assistant += assistant ? `\n\n${piece}` : piece
        chatLog.textContent = `you: ${text}\n\nagent:\n${assistant}`
        // Don't make taking the next message wait on the stream closing: a run
        // that answers and then stalls should not leave the page stuck.
        syncSendEnabled()
      } else {
        console.debug("chat chunk", chunk)
      }
      chatLog.scrollTop = chatLog.scrollHeight
    }

    if (!assistant) {
      setChatStatus("Stream finished with no text (check console)", false)
    } else {
      setChatStatus("Done (in-browser neuro-san package)", true)
    }
  } catch (e) {
    if (controller.signal.aborted) return
    console.error(e)
    chatLog.textContent += `\n\nerror: ${e && e.stack ? e.stack : e}`
    setChatStatus("streaming_chat failed, see log", false)
  } finally {
    if (activeChat === controller) {
      activeChat = null
      syncSendEnabled()
    }
  }
}

runBtn.addEventListener("click", runList)
agentSelect.addEventListener("change", onAgentChange)
sendBtn.addEventListener("click", runChat)
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runChat()
})

runList()
