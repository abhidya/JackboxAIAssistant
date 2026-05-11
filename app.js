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

  const state = {
    persona: localStorage.getItem("jba:persona") || PERSONAS[14].name,
    style: localStorage.getItem("jba:style") || "balanced",
    engine: localStorage.getItem("jba:engine") || "builtin",
    modelId: localStorage.getItem("jba:modelId") || "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    roomCode: localStorage.getItem("jba:roomCode") || "",
    playerName: localStorage.getItem("jba:playerName") || "",
    autosubmit: localStorage.getItem("jba:autosubmit") !== "false",
    autovote: localStorage.getItem("jba:autovote") === "true",
    connected: false,
    lastPrompt: "",
    webllmEngine: null,
    loadingModel: false
  };

  const $ = (id) => document.getElementById(id);
  const personaByName = (name) => PERSONAS.find((persona) => persona.name === name) || PERSONAS[0];
  const shortName = (name) => name.split("(")[0].trim();

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
      card.innerHTML = `<img class="persona-avatar" src="${persona.avatar}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'persona-avatar',textContent:'${escapeAttr(shortName(persona.name)[0] || "?")}' }))"><div class="persona-name">${escapeHtml(shortName(persona.name))}</div><div class="persona-style">${escapeHtml(persona.style)}</div>`;
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
    if ($("engine-select")) $("engine-select").value = state.engine;
    if ($("model-id")) $("model-id").value = state.modelId;
    if ($("room-code")) $("room-code").value = state.roomCode;
    if ($("player-name")) $("player-name").value = state.playerName || `${shortName(state.persona).replace(/[^a-z0-9]/gi, "")}Bot`.slice(0, 16);
    if ($("autosubmit-toggle")) $("autosubmit-toggle").checked = state.autosubmit;
    if ($("autovote-toggle")) $("autovote-toggle").checked = state.autovote;
    const status = $("bridge-status");
    if (status) {
      status.className = `status ${state.connected ? "connected" : "disconnected"}`;
      status.textContent = state.connected
        ? "Connected inside the jackbox.tv userscript panel."
        : "Installer/dashboard mode. To automate Jackbox, open jackbox.tv after installing the userscript and use the injected panel there.";
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function escapeAttr(value) {
    return String(value).replace(/[\\'\n\r]/g, "");
  }

  function wordsFromPrompt(prompt) {
    return String(prompt).toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((word) => word.length > 3).slice(0, 4);
  }

  function buildPrompt(persona, prompt) {
    return `You are ${shortName(persona.name)} playing Quiplash. Traits: ${persona.traits}. Style: ${persona.style}. Prompt: ${prompt}. Answer in under 7 words.`;
  }

  function heuristicAnswer(prompt, personaName = state.persona, style = state.style) {
    const persona = personaByName(personaName);
    const keys = wordsFromPrompt(prompt);
    const noun = keys[0] || "chaos";
    const templates = {
      balanced: [`${persona.catchphrase}: ${noun} got cancelled`, `${shortName(persona.name)} blames ${noun}`, `${noun}? absolutely not today`, `legally, that's ${persona.catchphrase}`, `${noun} with extra consequences`],
      edgy: [`${noun} walked into HR`, `${persona.catchphrase}, but taxable`, `${noun} owes me bail`, `crime, but make it ${noun}`, `${noun} ate the evidence`],
      absurd: [`haunted ${noun} speedrun`, `${persona.catchphrase} in a trenchcoat`, `three raccoons named ${noun}`, `${noun} flavored moon lawsuit`, `grandma's illegal ${noun} cannon`],
      clean: [`surprise ${noun} meeting`, `${persona.catchphrase} before breakfast`, `${noun} needs adult supervision`, `professionally confused by ${noun}`, `${noun} forgot its pants`]
    };
    const list = templates[style] || templates.balanced;
    return normalizeAnswer(list[Math.floor(Math.random() * list.length)]);
  }

  function normalizeAnswer(answer) {
    const words = String(answer).replace(/["“”]/g, "").replace(/\s+/g, " ").trim().split(" ");
    return words.slice(0, 7).join(" ");
  }

  async function generateCandidates(prompt, count = 3) {
    const candidates = new Set();
    let guard = 0;
    while (candidates.size < count && guard < 20) {
      guard += 1;
      candidates.add(heuristicAnswer(prompt));
    }
    return [...candidates];
  }

  function setModelStatus(message, ok = false) {
    const status = $("model-status");
    if (!status) return;
    status.className = `status ${ok ? "connected" : "disconnected"}`;
    status.textContent = message;
  }

  async function ensureWebLLM() {
    if (state.webllmEngine) return state.webllmEngine;
    if (state.loadingModel) throw new Error("Model is still loading.");
    if (!("gpu" in navigator)) throw new Error("WebGPU is not available in this browser. Use Chrome/Edge with WebGPU or switch to the built-in generator.");

    state.loadingModel = true;
    setModelStatus("Loading WebLLM runtime… first load can take a while.");
    try {
      const webllm = await import("https://esm.run/@mlc-ai/web-llm");
      state.webllmEngine = await webllm.CreateMLCEngine(state.modelId, {
        initProgressCallback: (progress) => {
          const text = progress?.text || progress?.message || "Downloading and initializing model…";
          setModelStatus(text);
        }
      });
      setModelStatus(`WebLLM ready: ${state.modelId}`, true);
      return state.webllmEngine;
    } finally {
      state.loadingModel = false;
    }
  }

  async function answerPrompt(prompt) {
    if (state.engine === "webllm") {
      try {
        const persona = personaByName(state.persona);
        const engine = await ensureWebLLM();
        const reply = await engine.chat.completions.create({
          messages: [
            { role: "system", content: `You are ${shortName(persona.name)} playing Quiplash. Traits: ${persona.traits}. Style: ${persona.style}. Stay in character. Answer in under 7 words. Do not explain.` },
            { role: "user", content: prompt }
          ],
          temperature: 0.9,
          max_tokens: 24
        });
        const answer = reply?.choices?.[0]?.message?.content || "";
        return normalizeAnswer(answer) || heuristicAnswer(prompt);
      } catch (error) {
        setModelStatus(`WebLLM unavailable: ${error.message}. Falling back to built-in generator.`);
        log("WebLLM fallback", error.message);
      }
    }
    const [answer] = await generateCandidates(prompt, 1);
    return answer;
  }

  function sendToConnector(payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: "jackbox-ai-dashboard", ...payload }, "*");
    }
  }

  function currentConfig() {
    return {
      persona: state.persona,
      style: state.style,
      engine: state.engine,
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

  async function handleConnectorMessage(event) {
    const data = event.data || {};
    if (data.source !== "jackbox-ai-connector") return;
    state.connected = true;
    syncControls();

    if (data.type === "JBA_READY") {
      log("Connector ready", data.href || "jackbox.tv");
      sendConfig();
      return;
    }

    if (data.type === "JBA_PROMPT") {
      const prompt = data.prompt || "";
      if (!prompt || prompt === state.lastPrompt) return;
      state.lastPrompt = prompt;
      log("Prompt detected", prompt);
      const answer = await answerPrompt(prompt);
      log("Generated answer", answer);
      sendToConnector({ type: "JBA_ANSWER", promptId: data.promptId, answer, config: currentConfig() });
      return;
    }

    if (data.type === "JBA_LOG") log(data.message || "Connector log", data.detail || "");
  }

  function wireControls() {
    const params = new URLSearchParams(location.search);
    if (params.get("embedded") === "1") document.body.classList.add("embedded");

    $("persona-select")?.addEventListener("change", (event) => { state.persona = event.target.value; saveState(); renderPersonas(); sendConfig(); });
    $("style-select")?.addEventListener("change", (event) => { state.style = event.target.value; saveState(); sendConfig(); });
    $("engine-select")?.addEventListener("change", (event) => { state.engine = event.target.value; saveState(); sendConfig(); });
    $("model-id")?.addEventListener("input", (event) => { state.modelId = event.target.value.trim(); state.webllmEngine = null; saveState(); });
    $("room-code")?.addEventListener("input", (event) => { state.roomCode = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); saveState(); syncControls(); });
    $("player-name")?.addEventListener("input", (event) => { state.playerName = event.target.value.trim(); saveState(); });
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
    $("generate-button")?.addEventListener("click", async () => {
      const prompt = $("prompt-input")?.value || "";
      const list = $("candidate-list");
      if (!prompt.trim() || !list) return;
      const candidates = await generateCandidates(prompt, 3);
      list.innerHTML = candidates.map((candidate) => `<li>${escapeHtml(candidate)}</li>`).join("");
    });

    window.addEventListener("message", handleConnectorMessage);
  }

  renderPersonas();
  wireControls();
  syncControls();
  if (window.parent && window.parent !== window) {
    sendToConnector({ type: "JBA_DASHBOARD_READY", config: currentConfig() });
  }
})();
