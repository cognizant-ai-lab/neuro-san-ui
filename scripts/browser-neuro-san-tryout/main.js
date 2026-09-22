const SHIM = "http://127.0.0.1:8080"

const statusEl = document.getElementById("status")
const outEl = document.getElementById("out")
const runBtn = document.getElementById("run")
const agentSelect = document.getElementById("agentSelect")
const promptInput = document.getElementById("prompt")
const sendBtn = document.getElementById("send")
const chatStatus = document.getElementById("chatStatus")
const chatLog = document.getElementById("chatLog")

function setStatus(msg, ok) {
  statusEl.textContent = msg
  statusEl.className = ok === true ? "ok" : ok === false ? "err" : ""
}

function setChatStatus(msg, ok) {
  chatStatus.textContent = msg
  chatStatus.className = ok === true ? "ok" : ok === false ? "err" : ""
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
    sendBtn.disabled = true
    return
  }
  for (const a of agents) {
    const opt = document.createElement("option")
    opt.value = a.agent_name
    const kind = isStubAgent(a) ? "stub" : "hocon"
    opt.textContent = `${a.agent_name} (${kind})`
    agentSelect.appendChild(opt)
  }
  const names = agents.map((a) => a.agent_name)
  if (names.includes("music_nerd")) agentSelect.value = "music_nerd"
  sendBtn.disabled = false
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
  setStatus("Loading registries + package…")
  outEl.textContent = ""
  try {
    setStatus(`GET ${SHIM}/api/v1/list …`)
    const health = await fetch(`${SHIM}/health`).then((response) => response.json()).catch(() => null)
    if (!health) {
      throw new Error(
        `Shim not reachable at ${SHIM}. Start it with:\n` +
          `node --preserve-symlinks scripts/local-neuro-san-from-ts-package.mjs`,
      )
    }
    const response = await fetch(`${SHIM}/api/v1/list`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
    const result = await response.json()
    outEl.textContent = JSON.stringify(result, null, 2)
    const agents = result?.agents || []
    fillAgentSelect(agents)
    const real = agents.filter((a) => !isStubAgent(a))
    const stubs = agents.filter((a) => isStubAgent(a))
    if (real.length > 0) {
      setStatus(
        `OK — Node shim list() returned ${agents.length} agents (${real.length} real HOCON` +
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
    setStatus("Failed — see stack below", false)
  }
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

  sendBtn.disabled = true
  chatLog.textContent = ""
  chatLog.textContent = `you: ${text}\n\nagent:\n`
  setChatStatus(`POST ${SHIM}/api/v1/${agentName}/streaming_chat …`)

  try {
    // Health check
    const health = await fetch(`${SHIM}/health`).then((r) => r.json()).catch(() => null)
    if (!health) {
      throw new Error(
        `Shim not reachable at ${SHIM}. Start it with:\n` +
          `node --preserve-symlinks scripts/local-neuro-san-from-ts-package.mjs`,
      )
    }

    const headers = { "Content-Type": "application/json" }

    const res = await fetch(`${SHIM}/api/v1/${encodeURIComponent(agentName)}/streaming_chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_message: { text },
        chat_filter: { chat_filter_type: "MAXIMAL" },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`HTTP ${res.status}: ${errBody}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""
    let assistant = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split("\n")
      buf = lines.pop() || ""
      for (const line of lines) {
        if (!line.trim()) continue
        let chunk
        try {
          chunk = JSON.parse(line)
        } catch {
          assistant += line + "\n"
          chatLog.textContent = `you: ${text}\n\nagent:\n${assistant}`
          continue
        }
        const piece = extractText(chunk)
        if (piece) {
          assistant += piece
          chatLog.textContent = `you: ${text}\n\nagent:\n${assistant}`
        } else {
          // keep raw for debugging if no text yet
          console.debug("chat chunk", chunk)
        }
        chatLog.scrollTop = chatLog.scrollHeight
      }
    }

    if (!assistant) {
      setChatStatus("Stream finished with no text (check console / shim logs)", false)
    } else {
      setChatStatus("Done (via local TS-package shim :8080)", true)
    }
  } catch (e) {
    console.error(e)
    chatLog.textContent += `\n\nerror: ${e && e.stack ? e.stack : e}`
    setChatStatus("streaming_chat failed — see log", false)
  } finally {
    sendBtn.disabled = !agentSelect.value
  }
}

runBtn.addEventListener("click", runList)
sendBtn.addEventListener("click", runChat)
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runChat()
})

runList()
