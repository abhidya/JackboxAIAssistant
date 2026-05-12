(() => {
  const PERSONAS = [
    { name: "Scooby-Doo (Scooby-Doo)", traits: "hungry, cowardly, loyal mystery dog", style: "goofy R-speech, easily scared", catchphrase: "Ruh-roh", avatar: "Assets/avatars/scooby-doo.jpg" },
    { name: "Rickety Cricket (It's Always Sunny in Philadelphia)", traits: "street-hardened, desperate, unhinged", style: "manic over-sharing", catchphrase: "Hips and nips", avatar: "Assets/avatars/rickety-cricket.jpg" },
    { name: "Donald Trump (Real Life)", traits: "boastful, obsessed with ratings", style: "hyperbolic and repetitive", catchphrase: "tremendous", avatar: "Assets/avatars/donald-trump.jpg" },
    { name: "Hillary Clinton (Real Life)", traits: "over-prepared politician", style: "rehearsed, awkwardly modern", catchphrase: "Pokemon GO", avatar: "Assets/avatars/hillary-clinton.jpg" },
    { name: "Shaquille O'Neal (Real Life)", traits: "massive former NBA star", style: "mumbling product pitch energy", catchphrase: "BBQ chicken", avatar: "Assets/avatars/shaquille-oneal.jpg" },
    { name: "MrBeast (YouTube)", traits: "hyper-energetic challenge host", style: "clickbait philanthropy chaos", catchphrase: "I bought", avatar: "Assets/avatars/mrbeast.jpg" },
    { name: "Deadpool (Marvel Comics)", traits: "self-aware, chaotic, sarcastic", style: "fourth-wall pop-culture jokes", catchphrase: "Chimichangas", avatar: "Assets/avatars/deadpool.jpg" },
    { name: "Doraemon (Anime)", traits: "helpful robot cat", style: "earnest but exasperated", catchphrase: "4D pocket", avatar: "Assets/avatars/doraemon.jpg" },
    { name: "Minions (Despicable Me)", traits: "chaotic banana gremlins", style: "gibberish with random English", catchphrase: "Banana", avatar: "Assets/avatars/minions.jpg" },
    { name: "SpongeBob SquarePants (SpongeBob)", traits: "optimistic nautical fry cook", style: "innocent enthusiasm", catchphrase: "I'm ready", avatar: "Assets/avatars/spongebob.jpg" },
    { name: "Pikachu (Pokémon)", traits: "cute electric menace", style: "Pika with translation", catchphrase: "Pika pika", avatar: "Assets/avatars/pikachu.jpg" },
    { name: "Groot (Guardians of the Galaxy)", traits: "protective emotional tree", style: "I am Groot plus translation", catchphrase: "I am Groot", avatar: "Assets/avatars/groot.jpg" },
    { name: "Stitch (Lilo & Stitch)", traits: "destructive alien learning good", style: "broken English chaos", catchphrase: "Meega", avatar: "Assets/avatars/stitch.jpg" },
    { name: "Harley Quinn (DC Comics)", traits: "manic, violent, cheerful", style: "Brooklyn mayhem", catchphrase: "Hiya puddin'", avatar: "Assets/avatars/harley-quinn.jpg" },
    { name: "Shrek (Shrek)", traits: "grumpy private ogre", style: "Scottish swamp sarcasm", catchphrase: "my swamp", avatar: "Assets/avatars/shrek.jpg" },
    { name: "Genie (Aladdin)", traits: "theatrical magical impressionist", style: "fast loud showman", catchphrase: "cosmic powers", avatar: "Assets/avatars/genie.jpg" },
    { name: "Homer Simpson (The Simpsons)", traits: "lazy hungry suburban dad", style: "slow food-obsessed panic", catchphrase: "D'oh", avatar: "Assets/avatars/homer-simpson.jpg" },
    { name: "Jack Sparrow (Pirates of the Caribbean)", traits: "eccentric selfish pirate", style: "slurred elaborate confusion", catchphrase: "rum", avatar: "Assets/avatars/jack-sparrow.jpg" },
    { name: "Tony Stark (Marvel)", traits: "arrogant genius billionaire", style: "snarky fast-talking tech", catchphrase: "I am Iron Man", avatar: "Assets/avatars/tony-stark.jpg" },
    { name: "Ron Swanson (Parks and Recreation)", traits: "stoic meat libertarian", style: "deadpan and brief", catchphrase: "End of speech", avatar: "Assets/avatars/ron-swanson.jpg" },
    { name: "Michael Scott (The Office)", traits: "approval-hungry awkward boss", style: "inappropriate insecurity", catchphrase: "That's what she said", avatar: "Assets/avatars/michael-scott.jpg" },
    { name: "Hermione Granger (Harry Potter)", traits: "brilliant rule follower", style: "matter-of-fact correction", catchphrase: "Honestly", avatar: "Assets/avatars/hermione-granger.jpg" },
    { name: "Captain Jack Harkness (Doctor Who)", traits: "flirtatious immortal rogue", style: "confident adventure innuendo", catchphrase: "Never miss a good time", avatar: "Assets/avatars/jack-harkness.jpg" },
    { name: "The Joker (DC Comics)", traits: "chaotic clown menace", style: "dark theatrical irony", catchphrase: "Why so serious", avatar: "Assets/avatars/the-joker.jpg" },
    { name: "Rick Sanchez (Rick and Morty)", traits: "nihilistic universe genius", style: "burping cynical science", catchphrase: "*Burp*", avatar: "Assets/avatars/rick-sanchez.jpg" },
    { name: "Austin Powers (Austin Powers franchise)", traits: "retro absurd spy", style: "swinging British innuendo", catchphrase: "Yeah baby", avatar: "Assets/avatars/austin-powers.jpg" }
  ];
  const AVAILABLE_AVATARS = new Map([
    ["Deadpool (Marvel Comics)", "Assets/avatars/deadpool.jpg"],
    ["Rick Sanchez (Rick and Morty)", "Assets/avatars/ricksanchez.jpg"],
    ["Shrek (Shrek)", "Assets/avatars/shrek.jpg"],
    ["SpongeBob SquarePants (SpongeBob)", "Assets/avatars/spongebob.jpg"],
    ["Tony Stark (Marvel)", "Assets/avatars/tonystark.jpg"]
  ]);
  const DEFAULT_BOT_PERSONAS = [
    "Shrek (Shrek)",
    "SpongeBob SquarePants (SpongeBob)",
    "Deadpool (Marvel Comics)",
    "Tony Stark (Marvel)",
    "Rick Sanchez (Rick and Morty)"
  ];

  function defaultBotSlots(count = 5) {
    return Array.from({ length: count }, (_, index) => ({
      slotId: `bot-${index + 1}`,
      name: `Bot${index + 1}`,
      persona: DEFAULT_BOT_PERSONAS[index % DEFAULT_BOT_PERSONAS.length],
      connectorId: "",
      status: "waiting"
    }));
  }

  function loadBotSlots() {
    try {
      const saved = JSON.parse(localStorage.getItem("jba:botSlots") || "[]");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return defaultBotSlots(5);
  }

  const state = {
    persona: localStorage.getItem("jba:persona") || PERSONAS[14].name,
    style: localStorage.getItem("jba:style") || "balanced",
    engine: "webllm",
    modelId: localStorage.getItem("jba:modelId") || "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    roomCode: localStorage.getItem("jba:roomCode") || "",
    playerName: localStorage.getItem("jba:playerName") || "",
    autosubmit: localStorage.getItem("jba:autosubmit") !== "false",
    autovote: localStorage.getItem("jba:autovote") === "true",
    connected: false,
    bridgeReady: false,
    activeConnectorId: localStorage.getItem("jba:activeConnectorId") || "",
    connectors: new Map(),
    botSlots: loadBotSlots(),
    lastPromptId: "",
    webllmEngine: null,
    webllmLoadPromise: null,
    loadingModel: false
  };

  const $ = (id) => document.getElementById(id);
  const personaByName = (name) => PERSONAS.find((persona) => persona.name === name) || PERSONAS[0];
  const shortName = (name) => name.split("(")[0].trim();
  const personaAvatar = (persona) => AVAILABLE_AVATARS.get(persona.name) || "";

  function log(message, detail) {
    const box = $("log");
    if (!box) return;
    const entry = document.createElement("div");
    entry.className = "log-entry";
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}${detail ? ` — ${detail}` : ""}`;
    box.prepend(entry);
  }

  function saveState() {
    localStorage.setItem("jba:persona", state.persona);
    localStorage.setItem("jba:style", state.style);
    localStorage.setItem("jba:engine", state.engine);
    localStorage.setItem("jba:modelId", state.modelId);
    localStorage.setItem("jba:roomCode", state.roomCode);
    localStorage.setItem("jba:playerName", state.playerName);
    localStorage.setItem("jba:autosubmit", String(state.autosubmit));
    localStorage.setItem("jba:autovote", String(state.autovote));
    localStorage.setItem("jba:botSlots", JSON.stringify(state.botSlots));
  }

  function renderPersonas() {
    const select = $("persona-select");
    const grid = $("persona-grid");
    if (select) {
      select.innerHTML = PERSONAS.map((persona) => `<option value="${escapeHtml(persona.name)}">${escapeHtml(persona.name)}</option>`).join("");
      select.value = state.persona;
    }
    if (!grid) return;
    grid.innerHTML = "";
    for (const persona of PERSONAS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `persona-card ${persona.name === state.persona ? "active" : ""}`;
      const avatar = personaAvatar(persona);
      const fallback = `<span class="persona-avatar">${escapeHtml(shortName(persona.name)[0] || "?")}</span>`;
      card.innerHTML = `${avatar ? `<img class="persona-avatar" src="${avatar}" alt="">` : fallback}<div class="persona-name">${escapeHtml(shortName(persona.name))}</div><div class="persona-style">${escapeHtml(persona.style)}</div>`;
      card.addEventListener("click", () => {
        state.persona = persona.name;
        saveState();
        renderPersonas();
        syncControls();
        sendConfig();
      });
      grid.appendChild(card);
    }
  }

  function syncControls() {
    if ($("persona-select")) $("persona-select").value = state.persona;
    if ($("style-select")) $("style-select").value = state.style;
    if ($("model-id")) $("model-id").value = state.modelId;
    if ($("room-code")) $("room-code").value = state.roomCode;
    if ($("player-name")) $("player-name").value = state.playerName || `${shortName(state.persona).replace(/[^a-z0-9]/gi, "")}Bot`.slice(0, 16);
    syncConnectorSelect();
    renderBotSlots();
    if ($("autosubmit-toggle")) $("autosubmit-toggle").checked = state.autosubmit;
    if ($("autovote-toggle")) $("autovote-toggle").checked = state.autovote;
    const status = $("bridge-status");
    if (status) {
      status.className = `status ${state.connected ? "connected" : "disconnected"}`;
      status.textContent = state.connected
        ? `Connected to ${state.connectors.size} jackbox.tv tab${state.connectors.size === 1 ? "" : "s"}.`
        : state.bridgeReady
          ? "Dashboard userscript relay is active. Open jackbox.tv in another tab to connect automation."
          : "Dashboard mode. If this stays here, reinstall/update the userscript, then reload this page.";
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function escapeAttr(value) {
    return String(value).replace(/[\\'\n\r]/g, "");
  }

  function normalizeAnswer(answer) {
    const words = String(answer).replace(/["“”]/g, "").replace(/\s+/g, " ").trim().split(" ");
    return words.slice(0, 7).join(" ");
  }

  function setModelStatus(message, ok = false) {
    const status = $("model-status");
    if (!status) return;
    status.className = `status ${ok ? "connected" : "disconnected"}`;
    status.textContent = message;
  }

  async function ensureWebLLM() {
    if (state.webllmEngine) return state.webllmEngine;
    if (state.webllmLoadPromise) return state.webllmLoadPromise;
    if (!state.modelId.trim()) throw new Error("Choose a WebLLM model id before loading.");
    if (!("gpu" in navigator)) throw new Error("WebGPU is not available in this browser. Use Chrome or Edge with WebGPU enabled.");

    state.loadingModel = true;
    syncGenerationButtons();
    setModelStatus("Loading WebLLM runtime… first load can take a while.");
    state.webllmLoadPromise = (async () => {
      const webllm = await import("https://esm.run/@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine(state.modelId.trim(), {
        initProgressCallback: (progress) => {
          const text = progress?.text || progress?.message || "Downloading and initializing model…";
          setModelStatus(text);
        }
      });
      state.webllmEngine = engine;
      setModelStatus(`WebLLM ready: ${state.modelId}`, true);
      return engine;
    })();
    try {
      return await state.webllmLoadPromise;
    } finally {
      state.loadingModel = false;
      state.webllmLoadPromise = null;
      syncGenerationButtons();
    }
  }

  function quoteMessages(prompt, variant = 1) {
    const persona = personaByName(state.persona);
    const styleGuide = {
      balanced: "funny, direct, and playable",
      edgy: "sharp but not hateful or explicit",
      absurd: "surreal and unexpected",
      clean: "family-friendly and silly"
    }[state.style] || "funny, direct, and playable";
    return [
      { role: "system", content: `You are ${shortName(persona.name)} playing Quiplash. Traits: ${persona.traits}. Voice: ${persona.style}. Write one ${styleGuide} answer. Under 7 words. No quotes. No explanation.` },
      { role: "user", content: `Prompt: ${prompt}\nCandidate variant: ${variant}` }
    ];
  }

  async function generateWebLLMAnswer(prompt, variant = 1) {
    const engine = await ensureWebLLM();
    const reply = await engine.chat.completions.create({
      messages: quoteMessages(prompt, variant),
      temperature: 0.95,
      top_p: 0.9,
      max_tokens: 24
    });
    const answer = normalizeAnswer(reply?.choices?.[0]?.message?.content || "");
    if (!answer) throw new Error("WebLLM returned an empty answer.");
    return answer;
  }

  async function answerPrompt(prompt) {
    return generateWebLLMAnswer(prompt, 1);
  }

  async function generateCandidates(prompt, count = 3) {
    const candidates = new Set();
    let variant = 1;
    while (candidates.size < count && variant <= count + 3) {
      candidates.add(await generateWebLLMAnswer(prompt, variant));
      variant += 1;
    }
    return [...candidates];
  }

  function syncGenerationButtons() {
    if ($("load-model")) $("load-model").disabled = state.loadingModel;
    if ($("generate-button")) $("generate-button").disabled = state.loadingModel;
  }

  function botCount() {
    return Math.max(1, Math.min(8, Number($("bot-count")?.value || state.botSlots.length || 5)));
  }

  function botPrefix() {
    return ($("bot-prefix")?.value || "Bot").replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 12) || "Bot";
  }

  function ensureBotSlots(count = botCount()) {
    if (state.botSlots.length === count) return;
    const existing = new Map(state.botSlots.map((slot) => [slot.slotId, slot]));
    state.botSlots = defaultBotSlots(count).map((slot) => existing.get(slot.slotId) || slot);
    saveState();
    renderBotSlots();
  }

  function botSlotUrl(slotId) {
    return `https://jackbox.tv/?jbaSlot=${encodeURIComponent(slotId)}`;
  }

  function renderBotSlots() {
    const host = $("bot-slots");
    if (!host) return;
    host.innerHTML = state.botSlots.map((slot, index) => {
      const connected = Boolean(slot.connectorId);
      const persona = shortName(slot.persona);
      return `<div class="bot-slot" data-slot-id="${escapeHtml(slot.slotId)}"><strong>${escapeHtml(slot.name || `Bot${index + 1}`)}</strong><span><small>${escapeHtml(persona)} · ${escapeHtml(slot.connectorId ? slot.connectorId.slice(-8) : "waiting for tab")}</small></span><small class="${connected ? "connected" : "waiting"}">${connected ? "connected" : "waiting"}</small></div>`;
    }).join("");
  }

  function syncConnectorSelect() {
    const select = $("connector-select");
    if (!select) return;
    const connectors = [...state.connectors.values()].sort((a, b) => b.seenAt - a.seenAt);
    select.innerHTML = connectors.length
      ? connectors.map((connector) => `<option value="${escapeHtml(connector.connectorId)}">${escapeHtml(connector.label)}</option>`).join("")
      : '<option value="">No connected Jackbox tabs</option>';
    if (state.activeConnectorId && connectors.some((connector) => connector.connectorId === state.activeConnectorId)) {
      select.value = state.activeConnectorId;
    } else if (connectors[0]) {
      state.activeConnectorId = connectors[0].connectorId;
      localStorage.setItem("jba:activeConnectorId", state.activeConnectorId);
      select.value = state.activeConnectorId;
    }
  }

  function rememberConnector(data) {
    if (!data.connectorId) return;
    const existing = state.connectors.get(data.connectorId) || {};
    let urlLabel = "jackbox.tv";
    try {
      if (data.href) urlLabel = new URL(data.href).hostname;
    } catch {}
    const label = data.playerName ? `${data.playerName} (${urlLabel})` : `${urlLabel} ${data.connectorId.slice(-6)}`;
    state.connectors.set(data.connectorId, { ...existing, connectorId: data.connectorId, href: data.href || existing.href || "", label, seenAt: Date.now() });
    if (data.slotId) {
      const slot = state.botSlots.find((item) => item.slotId === data.slotId);
      if (slot) {
        slot.connectorId = data.connectorId;
        slot.status = "connected";
        if (data.playerName) slot.name = data.playerName;
        saveState();
      }
    }
    if (!state.activeConnectorId) {
      state.activeConnectorId = data.connectorId;
      localStorage.setItem("jba:activeConnectorId", state.activeConnectorId);
    }
    state.connected = true;
    syncConnectorSelect();
    renderBotSlots();
  }

  function isTrustedConnectorEvent(event) {
    return event.origin === location.origin || event.origin === "https://jackbox.tv";
  }

  function sendToConnector(payload, options = {}) {
    const targetConnectorId = options.targetConnectorId === undefined ? state.activeConnectorId : options.targetConnectorId;
    const message = { source: "jackbox-ai-dashboard", ...payload };
    if (targetConnectorId) message.targetConnectorId = targetConnectorId;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, "https://jackbox.tv");
    } else {
      window.postMessage(message, location.origin);
    }
  }

  function currentConfig() {
    return {
      persona: state.persona,
      style: state.style,
      engine: "webllm",
      modelId: state.modelId,
      roomCode: state.roomCode,
      playerName: state.playerName,
      autosubmit: state.autosubmit,
      autovote: state.autovote
    };
  }

  function sendConfig() {
    saveState();
    sendToConnector({ type: "JBA_CONFIG", config: currentConfig() });
    log("Sent config", `${shortName(state.persona)}, ${state.style}`);
  }

  function configForSlot(slot) {
    return { ...currentConfig(), persona: slot.persona || state.persona, playerName: slot.name || state.playerName };
  }

  function launchBotTabs() {
    ensureBotSlots(botCount());
    const prefix = botPrefix();
    state.botSlots = state.botSlots.map((slot, index) => ({ ...slot, name: `${prefix}${index + 1}` }));
    saveState();
    renderBotSlots();
    for (const slot of state.botSlots) {
      window.open(botSlotUrl(slot.slotId), `jba-${slot.slotId}`);
    }
    log("Launched bot tabs", `${state.botSlots.length} requested`);
  }

  function joinAllBots() {
    const roomCode = state.roomCode;
    if (!roomCode || roomCode.length !== 4) return log("Join all failed", "enter a 4-letter room code first");
    let sent = 0;
    for (const slot of state.botSlots) {
      if (!slot.connectorId) continue;
      sendToConnector({ type: "JBA_CONFIG", config: configForSlot(slot) }, { targetConnectorId: slot.connectorId });
      sendToConnector({ type: "JBA_JOIN", roomCode, username: slot.name }, { targetConnectorId: slot.connectorId });
      sent += 1;
    }
    log("Join all sent", `${sent}/${state.botSlots.length} connected bot tabs`);
  }

  function sendAllConfig() {
    let sent = 0;
    for (const slot of state.botSlots) {
      if (!slot.connectorId) continue;
      sendToConnector({ type: "JBA_CONFIG", config: configForSlot(slot) }, { targetConnectorId: slot.connectorId });
      sent += 1;
    }
    log("Config all sent", `${sent}/${state.botSlots.length} connected bot tabs`);
  }

  function pingConnector() {
    sendToConnector({ type: "JBA_DASHBOARD_PING", at: Date.now() }, { targetConnectorId: "" });
  }

  async function handleConnectorMessage(event) {
    const data = event.data || {};
    if (data.source !== "jackbox-ai-connector") return;
    if (!isTrustedConnectorEvent(event)) return;
    rememberConnector(data);

    if (data.type === "JBA_BRIDGE_READY") {
      state.bridgeReady = true;
      syncControls();
      log("Dashboard userscript relay ready", data.storage ? "storage bridge available" : "storage bridge unavailable");
      return;
    }

    state.connected = true;
    state.bridgeReady = true;
    syncControls();

    if (data.type === "JBA_READY") {
      log("Connector ready", data.href || "jackbox.tv");
      sendConfig();
      return;
    }

    if (data.type === "JBA_PROMPT") {
      const prompt = data.prompt || "";
      if (!prompt || data.promptId === state.lastPromptId) return;
      state.lastPromptId = data.promptId || "";
      log("Prompt detected", prompt);
      try {
        const answer = await answerPrompt(prompt);
        log("Generated WebLLM answer", answer);
        sendToConnector({ type: "JBA_ANSWER", promptId: data.promptId, answer, config: currentConfig() }, { targetConnectorId: data.connectorId || state.activeConnectorId });
      } catch (error) {
        setModelStatus(`WebLLM generation failed: ${error.message}`);
        log("WebLLM generation failed", error.message);
      }
      return;
    }

    if (data.type === "JBA_LOG") log(data.message || "Connector log", data.detail || "");
  }

  function wireControls() {
    const params = new URLSearchParams(location.search);
    if (params.get("embedded") === "1") document.body.classList.add("embedded");

    $("persona-select")?.addEventListener("change", (event) => { state.persona = event.target.value; saveState(); renderPersonas(); sendConfig(); });
    $("style-select")?.addEventListener("change", (event) => { state.style = event.target.value; saveState(); sendConfig(); });
    $("model-id")?.addEventListener("input", (event) => { state.modelId = event.target.value.trim(); state.webllmEngine = null; state.webllmLoadPromise = null; saveState(); });
    $("room-code")?.addEventListener("input", (event) => { state.roomCode = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); saveState(); syncControls(); });
    $("player-name")?.addEventListener("input", (event) => { state.playerName = event.target.value.trim(); saveState(); });
    $("connector-select")?.addEventListener("change", (event) => {
      state.activeConnectorId = event.target.value;
      localStorage.setItem("jba:activeConnectorId", state.activeConnectorId);
      sendConfig();
    });
    $("autosubmit-toggle")?.addEventListener("change", (event) => { state.autosubmit = event.target.checked; saveState(); sendConfig(); });
    $("autovote-toggle")?.addEventListener("change", (event) => { state.autovote = event.target.checked; saveState(); sendConfig(); });
    $("send-config")?.addEventListener("click", sendConfig);
    $("join-room")?.addEventListener("click", () => {
      const username = state.playerName || `${shortName(state.persona).replace(/[^a-z0-9]/gi, "")}Bot`.slice(0, 16);
      sendToConnector({ type: "JBA_JOIN", roomCode: state.roomCode, username });
      log("Join sent", `${state.roomCode || "no room"} ${username}`);
    });
    $("load-model")?.addEventListener("click", async () => {
      state.engine = "webllm";
      saveState();
      syncControls();
      try {
        await ensureWebLLM();
      } catch (error) {
        setModelStatus(`WebLLM unavailable: ${error.message}`);
      }
    });
    $("everyone-in")?.addEventListener("click", () => sendToConnector({ type: "JBA_EVERYONES_IN" }));
    $("bot-count")?.addEventListener("input", () => ensureBotSlots(botCount()));
    $("launch-bot-tabs")?.addEventListener("click", launchBotTabs);
    $("join-all-bots")?.addEventListener("click", joinAllBots);
    $("send-all-config")?.addEventListener("click", sendAllConfig);
    $("generate-button")?.addEventListener("click", async () => {
      const prompt = $("prompt-input")?.value || "";
      const list = $("candidate-list");
      if (!prompt.trim() || !list) return;
      list.innerHTML = "<li>Generating with WebLLM…</li>";
      try {
        const candidates = await generateCandidates(prompt, 3);
        list.innerHTML = candidates.map((candidate) => `<li>${escapeHtml(candidate)}</li>`).join("");
      } catch (error) {
        setModelStatus(`WebLLM generation failed: ${error.message}`);
        list.innerHTML = `<li>${escapeHtml(error.message)}</li>`;
      }
    });

    window.addEventListener("message", handleConnectorMessage);
    window.setInterval(pingConnector, 3000);
  }

  renderPersonas();
  wireControls();
  syncControls();
  syncGenerationButtons();
  pingConnector();
  if (window.parent && window.parent !== window) {
    sendToConnector({ type: "JBA_DASHBOARD_READY", config: currentConfig() });
  }
})();
