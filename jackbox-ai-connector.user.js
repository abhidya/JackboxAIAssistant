// ==UserScript==
// @name         Jackbox AI Assistant Connector
// @namespace    https://github.com/pages/jackbox-ai-assistant
// @version      1.2.0
// @description  Bridges the GitHub Pages dashboard to a Jackbox tab and runs the autonomous Jackbox assistant panel.
// @match        https://jackbox.tv/*
// @match        http://localhost:4173/*
// @match        http://127.0.0.1:4173/*
// @match        https://abhidya.github.io/JackboxAIAssistant
// @match        https://abhidya.github.io/JackboxAIAssistant/
// @match        https://abhidya.github.io/JackboxAIAssistant/*
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const SOURCE = "jackbox-ai-connector";
  const DASHBOARD_SOURCE = "jackbox-ai-dashboard";
  const TO_DASHBOARD_KEY = "jba:bridge:to-dashboard";
  const TO_JACKBOX_KEY = "jba:bridge:to-jackbox";
  const HEARTBEAT_KEY = "jba:bridge:jackbox-heartbeat";
  const CONTEXT_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const CONNECTOR_ID = localStorage.getItem("jba:connector-id") || `jackbox-${CONTEXT_ID}`;
  localStorage.setItem("jba:connector-id", CONNECTOR_ID);
  const SLOT_ID = new URLSearchParams(location.search).get("jbaSlot") || localStorage.getItem("jba:slot-id") || "";
  if (SLOT_ID) localStorage.setItem("jba:slot-id", SLOT_ID);
  const DASHBOARD_URL_PATTERN = /^(https:\/\/abhidya\.github\.io\/JackboxAIAssistant(?:\/|$)|https?:\/\/(?:localhost|127\.0\.0\.1):4173(?:\/|$))/;
  const isDashboardPage = DASHBOARD_URL_PATTERN.test(location.href);
  const isJackboxPage = location.hostname === "jackbox.tv";
  const PERSONAS = [
    ["Scooby-Doo (Scooby-Doo)", "Ruh-roh"], ["Rickety Cricket (It's Always Sunny in Philadelphia)", "Hips and nips"], ["Donald Trump (Real Life)", "tremendous"], ["Hillary Clinton (Real Life)", "Pokemon GO"], ["Shaquille O'Neal (Real Life)", "BBQ chicken"], ["MrBeast (YouTube)", "I bought"], ["Deadpool (Marvel Comics)", "Chimichangas"], ["Doraemon (Anime)", "4D pocket"], ["Minions (Despicable Me)", "Banana"], ["SpongeBob SquarePants (SpongeBob)", "I'm ready"], ["Pikachu (Pokémon)", "Pika pika"], ["Groot (Guardians of the Galaxy)", "I am Groot"], ["Stitch (Lilo & Stitch)", "Meega"], ["Harley Quinn (DC Comics)", "Hiya puddin'"], ["Shrek (Shrek)", "my swamp"], ["Genie (Aladdin)", "cosmic powers"], ["Homer Simpson (The Simpsons)", "D'oh"], ["Jack Sparrow (Pirates of the Caribbean)", "rum"], ["Tony Stark (Marvel)", "I am Iron Man"], ["Ron Swanson (Parks and Recreation)", "End of speech"], ["Michael Scott (The Office)", "That's what she said"], ["Hermione Granger (Harry Potter)", "Honestly"], ["Captain Jack Harkness (Doctor Who)", "Never miss a good time"], ["The Joker (DC Comics)", "Why so serious"], ["Rick Sanchez (Rick and Morty)", "*Burp*"], ["Austin Powers (Austin Powers franchise)", "Yeah baby"]
  ];
  const DEFAULT_CONFIG = { persona: "Scooby-Doo (Scooby-Doo)", style: "balanced", autosubmit: true, autovote: false, roomCode: "", playerName: "ScoobyDooBot" };
  const state = {
    iframe: null,
    config: loadConfig(),
    lastPromptId: "",
    lastVoteSignature: "",
    submittedPrompts: new Set(),
    pendingPrompt: null,
    panelOpen: true,
    statusNode: null,
    logNode: null
  };

  function loadConfig() {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem("jba:connector-config") || "{}") }; }
    catch { return { ...DEFAULT_CONFIG }; }
  }

  function saveConfig() {
    localStorage.setItem("jba:connector-config", JSON.stringify(state.config));
  }

  function hasUserscriptStorageBridge() {
    return (typeof GM_setValue === "function" && typeof GM_getValue === "function") || (typeof GM === "object" && typeof GM.setValue === "function" && typeof GM.getValue === "function");
  }

  function getBridgeValue(key, fallback = "") {
    if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    if (typeof GM === "object" && typeof GM.getValue === "function") return GM.getValue(key, fallback);
    return fallback;
  }

  function setBridgeValue(key, value) {
    if (typeof GM_setValue === "function") return GM_setValue(key, value);
    if (typeof GM === "object" && typeof GM.setValue === "function") return GM.setValue(key, value);
    return undefined;
  }

  function publishBridgeMessage(key, payload) {
    if (!hasUserscriptStorageBridge()) return;
    try {
      setBridgeValue(key, JSON.stringify({ id: `${CONTEXT_ID}:${Date.now()}:${Math.random()}`, from: CONTEXT_ID, payload }));
    } catch (error) {
      console.warn("[Jackbox AI] Bridge publish failed", error);
    }
  }

  function parseBridgeEnvelope(raw) {
    if (!raw) return null;
    try {
      const message = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!message || message.from === CONTEXT_ID || !message.payload) return null;
      return message.payload;
    } catch {
      return null;
    }
  }

  function subscribeToBridge(key, handler) {
    if (!hasUserscriptStorageBridge()) return;
    if (typeof GM_addValueChangeListener === "function") {
      GM_addValueChangeListener(key, (_name, _oldValue, newValue) => {
        const payload = parseBridgeEnvelope(newValue);
        if (payload) handler(payload);
      });
      return;
    }
    let lastValue = "";
    Promise.resolve(getBridgeValue(key, "")).then((value) => { lastValue = value; });
    window.setInterval(() => {
      Promise.resolve(getBridgeValue(key, "")).then((nextValue) => {
        if (nextValue === lastValue) return;
        lastValue = nextValue;
        const payload = parseBridgeEnvelope(nextValue);
        if (payload) handler(payload);
      });
    }, 500);
  }

  function assistantUrl() {
    try {
      const raw = typeof GM_info !== "undefined" && GM_info.script && (GM_info.script.downloadURL || GM_info.script.updateURL || GM_info.script.homepageURL);
      if (raw && /^https?:/.test(raw)) return new URL("index.html?embedded=1", raw).href;
    } catch {}
    return "";
  }

  function shortName(name) { return String(name || "Bot").split("(")[0].trim(); }
  function personaCatchphrase(name) { return (PERSONAS.find((item) => item[0] === name) || PERSONAS[0])[1]; }
  function wordsFromPrompt(prompt) { return String(prompt).toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((word) => word.length > 3).slice(0, 4); }
  function normalizeAnswer(answer) { return String(answer).replace(/["“”]/g, "").replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" "); }

  function heuristicAnswer(prompt) {
    const noun = wordsFromPrompt(prompt)[0] || "chaos";
    const catchphrase = personaCatchphrase(state.config.persona);
    const name = shortName(state.config.persona);
    const templates = {
      balanced: [`${catchphrase}: ${noun} got cancelled`, `${name} blames ${noun}`, `${noun}? absolutely not today`, `legally, that's ${catchphrase}`, `${noun} with extra consequences`],
      edgy: [`${noun} walked into HR`, `${catchphrase}, but taxable`, `${noun} owes me bail`, `crime, but make it ${noun}`, `${noun} ate the evidence`],
      absurd: [`haunted ${noun} speedrun`, `${catchphrase} in a trenchcoat`, `three raccoons named ${noun}`, `${noun} flavored moon lawsuit`, `grandma's illegal ${noun} cannon`],
      clean: [`surprise ${noun} meeting`, `${catchphrase} before breakfast`, `${noun} needs adult supervision`, `professionally confused by ${noun}`, `${noun} forgot its pants`]
    };
    const list = templates[state.config.style] || templates.balanced;
    return normalizeAnswer(list[Math.floor(Math.random() * list.length)]);
  }

  function log(message, detail = "") {
    postToDashboard({ type: "JBA_LOG", message, detail });
    console.log(`[Jackbox AI] ${message}`, detail);
    if (state.statusNode) state.statusNode.textContent = detail ? `${message}: ${detail}` : message;
    if (state.logNode) {
      const entry = document.createElement("div");
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}${detail ? ` — ${detail}` : ""}`;
      entry.style.cssText = "border-top:1px solid rgba(148,163,184,.18);padding:6px 0;color:#cbd5e1";
      state.logNode.prepend(entry);
    }
  }

  function postToDashboard(payload) {
    const message = { source: SOURCE, connectorId: CONNECTOR_ID, slotId: SLOT_ID, ...payload };
    if (state.iframe && state.iframe.contentWindow) {
      state.iframe.contentWindow.postMessage(message, new URL(state.iframe.src).origin);
    }
    publishBridgeMessage(TO_DASHBOARD_KEY, message);
  }

  function isTrustedDashboardOrigin(origin) {
    return origin === "https://abhidya.github.io" || origin === "http://localhost:4173" || origin === "http://127.0.0.1:4173";
  }

  function startDashboardBridge() {
    // Cross-origin pages cannot share DOM access, so the userscript relays through its own storage.
    subscribeToBridge(TO_DASHBOARD_KEY, (payload) => {
      if (payload?.source !== SOURCE) return;
      window.postMessage(payload, location.origin);
    });
    window.addEventListener("message", (event) => {
      const data = event.data || {};
      if (event.source !== window || event.origin !== location.origin) return;
      if (data.source !== DASHBOARD_SOURCE) return;
      publishBridgeMessage(TO_JACKBOX_KEY, data);
    });
    window.postMessage({
      source: SOURCE,
      type: "JBA_BRIDGE_READY",
      href: location.href,
      connectorId: CONNECTOR_ID,
      slotId: SLOT_ID,
      storage: hasUserscriptStorageBridge()
    }, location.origin);
    if (hasUserscriptStorageBridge()) {
      Promise.resolve(getBridgeValue(HEARTBEAT_KEY, "")).then((raw) => {
        const heartbeat = parseBridgeEnvelope(raw);
        if (heartbeat?.type === "JBA_READY") window.postMessage(heartbeat, location.origin);
      });
    }
  }

  function styles() {
    const style = document.createElement("style");
    style.textContent = `
      #jackbox-ai-assistant-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(390px,calc(100vw - 32px));max-height:78vh;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.45);border:1px solid rgba(148,163,184,.35);background:#0f172a;color:#e5e7eb;font:14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #jackbox-ai-assistant-panel button,#jackbox-ai-assistant-panel input,#jackbox-ai-assistant-panel select{font:inherit;border-radius:10px;border:1px solid #475569;background:#111827;color:#e5e7eb;padding:8px;width:100%}
      #jackbox-ai-assistant-panel button{cursor:pointer;font-weight:800;background:linear-gradient(135deg,#2563eb,#7c3aed);border:0}
      #jackbox-ai-assistant-panel label{display:grid;gap:4px;color:#bfdbfe;font-weight:700;font-size:12px}
      #jackbox-ai-assistant-panel .jba-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
      #jackbox-ai-assistant-panel .jba-check{display:flex;align-items:center;gap:8px;color:#e5e7eb}.jba-check input{width:auto}
    `;
    document.documentElement.appendChild(style);
  }

  function injectPanel() {
    if (document.getElementById("jackbox-ai-assistant-panel")) return;
    styles();
    const host = document.createElement("div");
    host.id = "jackbox-ai-assistant-panel";
    const toolbar = document.createElement("div");
    toolbar.style.cssText = "height:34px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#111827;color:#e5e7eb;font-weight:800;font-size:12px";
    toolbar.innerHTML = `<span>Jackbox AI Assistant</span><button type="button" data-jba-toggle style="width:auto;padding:4px 8px;background:#374151;font-size:11px">hide</button>`;

    const body = document.createElement("div");
    body.style.cssText = "padding:10px;max-height:calc(78vh - 34px);overflow:auto";
    body.innerHTML = fallbackPanelHtml();

    host.append(toolbar, body);
    document.documentElement.appendChild(host);
    state.statusNode = host.querySelector("[data-jba-status]");
    state.logNode = host.querySelector("[data-jba-log]");
    wireFallbackPanel(host, body);

    const url = assistantUrl();
    if (url) addOptionalIframe(body, url);
    log("Connector ready", "Use this panel on jackbox.tv");
  }

  function fallbackPanelHtml() {
    const personaOptions = PERSONAS.map(([name]) => `<option value="${escapeHtml(name)}" ${name === state.config.persona ? "selected" : ""}>${escapeHtml(name)}</option>`).join("");
    return `
      <div data-jba-local>
        <div data-jba-status style="margin-bottom:8px;color:#bbf7d0">Connector ready on jackbox.tv</div>
        <div class="jba-row"><label>Room code<input data-jba-room maxlength="4" value="${escapeHtml(state.config.roomCode)}" placeholder="ABCD"></label><label>Player name<input data-jba-name value="${escapeHtml(state.config.playerName)}" placeholder="ScoobyDooBot"></label></div>
        <label style="margin-bottom:8px">Persona<select data-jba-persona>${personaOptions}</select></label>
        <div class="jba-row"><label>Style<select data-jba-style><option value="balanced">Balanced</option><option value="edgy">Edgy</option><option value="absurd">Absurd</option><option value="clean">Clean</option></select></label><button type="button" data-jba-join style="align-self:end">Fill/join</button></div>
        <div class="jba-row"><label class="jba-check"><input data-jba-autosubmit type="checkbox" ${state.config.autosubmit ? "checked" : ""}> Auto-submit</label><label class="jba-check"><input data-jba-autovote type="checkbox" ${state.config.autovote ? "checked" : ""}> Auto-vote</label></div>
        <div class="jba-row"><button type="button" data-jba-answer>Answer now</button><button type="button" data-jba-everyone>Everyone's In</button></div>
        <div data-jba-log style="max-height:120px;overflow:auto;font-size:12px;margin-top:8px"></div>
      </div>`;
  }

  function addOptionalIframe(body, url) {
    const details = document.createElement("details");
    details.style.cssText = "margin-top:10px";
    details.innerHTML = `<summary style="cursor:pointer;color:#bfdbfe;font-weight:800">Advanced Pages dashboard</summary>`;
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.title = "Jackbox AI Assistant dashboard";
    frame.allow = "clipboard-write";
    frame.style.cssText = "width:100%;height:410px;border:0;background:#08101f;margin-top:8px;border-radius:12px";
    frame.addEventListener("load", () => postToDashboard({ type: "JBA_READY", href: location.href }));
    details.appendChild(frame);
    body.appendChild(details);
    state.iframe = frame;
  }

  function wireFallbackPanel(host, body) {
    const $ = (sel) => host.querySelector(sel);
    $("[data-jba-toggle]").addEventListener("click", (event) => {
      state.panelOpen = !state.panelOpen;
      body.style.display = state.panelOpen ? "block" : "none";
      event.target.textContent = state.panelOpen ? "hide" : "show";
    });
    const update = () => {
      state.config.roomCode = $("[data-jba-room]").value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
      $("[data-jba-room]").value = state.config.roomCode;
      state.config.playerName = $("[data-jba-name]").value.trim();
      state.config.persona = $("[data-jba-persona]").value;
      state.config.style = $("[data-jba-style]").value;
      state.config.autosubmit = $("[data-jba-autosubmit]").checked;
      state.config.autovote = $("[data-jba-autovote]").checked;
      saveConfig();
    };
    $("[data-jba-style]").value = state.config.style;
    host.querySelectorAll("input,select").forEach((node) => node.addEventListener("input", update));
    host.querySelectorAll("select,input[type='checkbox']").forEach((node) => node.addEventListener("change", update));
    $("[data-jba-join]").addEventListener("click", () => { update(); joinRoom(state.config.roomCode, state.config.playerName); });
    $("[data-jba-everyone]").addEventListener("click", clickEveryonesIn);
    $("[data-jba-answer]").addEventListener("click", () => {
      const current = findPromptState();
      if (!current) return log("No prompt found", "wait until the answer box is visible");
      submitAnswer(heuristicAnswer(current.prompt), current.promptId);
    });
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function textOf(selector) { const node = document.querySelector(selector); return node && node.textContent ? node.textContent.trim() : ""; }
  function visible(element) { if (!element) return false; const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"; }
  function hash(value) { let h = 0; for (let i = 0; i < value.length; i += 1) h = Math.imul(31, h) + value.charCodeAt(i) | 0; return String(h >>> 0); }

  function findPromptState() {
    const input = [...document.querySelectorAll("#quiplash-answer-input, textarea, input[type='text']")].find((el) => visible(el) && !/room|code|name|user/i.test(el.id + " " + el.name + " " + (el.placeholder || "")));
    const submit = document.querySelector("#quiplash-submit-answer") || [...document.querySelectorAll("button")].find((button) => /submit|send|enter/i.test(button.textContent || "") && visible(button));
    const prompt = textOf("#question-text") || textOf("[data-testid='question-text']") || textOf(".question-text") || textOf("h1") || textOf("h2");
    if (!prompt || !input || !visible(input)) return null;
    return { prompt, input, submit, promptId: hash(`${prompt}|${location.href}`) };
  }

  function setNativeValue(element, value) {
    const proto = element.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(element, value); else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clickElement(element) {
    try {
      element.click();
    } catch {
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  }

  function submitAnswer(answer, promptId) {
    const current = findPromptState();
    if (!current) return log("Could not submit", "answer input not found");
    if (promptId && current.promptId !== promptId) return log("Skipped stale answer", answer);
    if (state.submittedPrompts.has(current.promptId)) return;
    setNativeValue(current.input, answer);
    if (current.submit) clickElement(current.submit);
    state.submittedPrompts.add(current.promptId);
    if (state.pendingPrompt?.promptId === current.promptId) state.pendingPrompt = null;
    log("Submitted answer", answer);
  }

  function clickEveryonesIn() {
    const candidates = [document.querySelector("#quiplash-startgame"), ...document.querySelectorAll("button, [role='button']")].filter(Boolean);
    const button = candidates.find((el) => /everyone'?s in|everybody'?s in/i.test(el.textContent || "") && visible(el));
    if (!button) return log("Everyone's In not found");
    clickElement(button);
    log("Clicked Everyone's In");
  }

  function randomVoteIfNeeded() {
    if (!state.config.autovote) return;
    const buttons = [...document.querySelectorAll(".quiplash-vote-button, button")].filter((button) => visible(button) && /vote|^[AB]$|^[12]$/.test((button.textContent || "").trim()));
    if (buttons.length < 2) return;
    const signature = buttons.map((button) => button.textContent.trim()).join("|");
    if (!signature || signature === state.lastVoteSignature) return;
    clickElement(buttons[Math.floor(Math.random() * buttons.length)]);
    state.lastVoteSignature = signature;
    log("Auto-voted", signature);
  }

  function joinRoom(roomCode, username) {
    const room = document.querySelector("#roomcode, input[name='roomcode'], input[autocomplete='one-time-code']");
    const name = document.querySelector("#username, input[name='username'], input[name='name'], input[autocomplete='username']");
    if (roomCode && room) setNativeValue(room, String(roomCode).toUpperCase());
    if (username && name) setNativeValue(name, username);
    const join = document.querySelector("#button-join") || [...document.querySelectorAll("button, [role='button']")].find((button) => /join|play|reconnect|connect|continue|start/i.test(button.textContent || "") && visible(button));
    if (join) { clickElement(join); log("Join requested", `${roomCode || ""} ${username || ""}`.trim()); }
    else log("Join button not found");
  }

  function scan() {
    const promptState = findPromptState();
    if (promptState && promptState.promptId !== state.lastPromptId && !state.submittedPrompts.has(promptState.promptId)) {
      state.lastPromptId = promptState.promptId;
      if (state.iframe || hasUserscriptStorageBridge()) {
        state.pendingPrompt = { prompt: promptState.prompt, promptId: promptState.promptId, at: Date.now() };
        postToDashboard({ type: "JBA_PROMPT", prompt: promptState.prompt, promptId: promptState.promptId });
      } else if (state.config.autosubmit !== false) {
        submitAnswer(heuristicAnswer(promptState.prompt), promptState.promptId);
      }
      log("Prompt detected", promptState.prompt);
    }
    if (state.pendingPrompt && state.config.autosubmit !== false && !state.submittedPrompts.has(state.pendingPrompt.promptId)) {
      const waitMs = state.config.engine === "webllm" ? 30000 : 2500;
      if (Date.now() - state.pendingPrompt.at > waitMs) {
        log("Dashboard answer timed out", "using connector fallback");
        submitAnswer(heuristicAnswer(state.pendingPrompt.prompt), state.pendingPrompt.promptId);
      }
    }
    randomVoteIfNeeded();
  }

  function handleDashboardMessage(data) {
    if (data.source !== DASHBOARD_SOURCE) return;
    if (data.targetConnectorId && data.targetConnectorId !== CONNECTOR_ID) return;
    if (data.type === "JBA_DASHBOARD_PING") { if (data.config) state.config = { ...state.config, ...data.config }; saveConfig(); return; }
    if (data.type === "JBA_CONFIG") { state.config = { ...state.config, ...(data.config || {}) }; saveConfig(); log("Config updated", `${state.config.persona || "persona"}, ${state.config.style || "style"}`); return; }
    if (data.type === "JBA_ANSWER") { if (data.config) state.config = { ...state.config, ...data.config }; saveConfig(); if (state.config.autosubmit !== false) submitAnswer(data.answer, data.promptId); else log("Answer ready", data.answer || ""); return; }
    if (data.type === "JBA_EVERYONES_IN") clickEveryonesIn();
    if (data.type === "JBA_JOIN") joinRoom(data.roomCode, data.username);
  }

  function startJackboxAutomation() {
    subscribeToBridge(TO_JACKBOX_KEY, handleDashboardMessage);
    window.addEventListener("message", (event) => {
      if (event.origin && !isTrustedDashboardOrigin(event.origin)) return;
      handleDashboardMessage(event.data || {});
    });
    const publishReady = () => {
      const ready = { source: SOURCE, type: "JBA_READY", href: location.href, connectorId: CONNECTOR_ID, slotId: SLOT_ID, playerName: state.config.playerName };
      publishBridgeMessage(HEARTBEAT_KEY, ready);
      publishBridgeMessage(TO_DASHBOARD_KEY, ready);
    };
    publishReady();
    window.setInterval(publishReady, 3000);
    injectPanel();
    window.setInterval(scan, 900);
  }

  if (isDashboardPage) startDashboardBridge();
  if (isJackboxPage) startJackboxAutomation();
})();
