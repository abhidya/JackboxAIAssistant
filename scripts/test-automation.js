const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs
  .readFileSync(path.join(root, "jackbox-ai-connector.user.js"), "utf8")
  .replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==/m, "");

class TestElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.id = options.id || "";
    this.name = options.name || "";
    this.placeholder = options.placeholder || "";
    this.textContent = options.textContent || "";
    this._value = options.value || "";
    this.style = {};
    this.children = [];
    this.clicked = false;
    this.listeners = {};
  }

  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  dispatchEvent(event) { this.lastEvent = event.type; return true; }
  click() { this.clicked = true; }
  getBoundingClientRect() { return { width: 100, height: 32 }; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get value() { return this._value || ""; }
  set value(value) { this._value = value; }
}

function createSandbox() {
  const prompt = new TestElement("h1", { id: "question-text", textContent: "A bad thing to say at a wedding" });
  const answer = new TestElement("input", { id: "quiplash-answer-input" });
  const submit = new TestElement("button", { id: "quiplash-submit-answer", textContent: "Submit" });
  const room = new TestElement("input", { id: "roomcode", name: "roomcode" });
  const name = new TestElement("input", { id: "username", name: "username" });
  const join = new TestElement("button", { id: "button-join", textContent: "Join" });
  const existingPanel = new TestElement("div", { id: "jackbox-ai-assistant-panel" });

  const byId = {
    "question-text": prompt,
    "quiplash-answer-input": answer,
    "quiplash-submit-answer": submit,
    roomcode: room,
    username: name,
    "button-join": join,
    "jackbox-ai-assistant-panel": existingPanel
  };

  const allButtons = [submit, join];
  const selectOne = (selector) => {
    for (const part of selector.split(",").map((item) => item.trim())) {
      if (part.startsWith("#") && byId[part.slice(1)]) return byId[part.slice(1)];
      if (part === "input[name='roomcode']") return room;
      if (part === "input[name='username']" || part === "input[name='name']") return name;
      if (part === "input[autocomplete='one-time-code']") return room;
      if (part === "input[autocomplete='username']") return name;
    }
    return null;
  };
  const selectAll = (selector) => {
    const parts = selector.split(",").map((item) => item.trim());
    const results = [];
    if (parts.includes("#quiplash-answer-input") || parts.includes("input[type='text']")) results.push(answer);
    if (parts.includes("textarea")) {}
    if (parts.includes("button") || parts.includes("[role='button']")) results.push(...allButtons);
    return [...new Set(results)];
  };

  const storage = {};
  const bridgeMessages = [];
  const listeners = {};
  const intervals = [];
  const windowListeners = {};
  const localStorageData = {};

  const sandbox = {
    console: { log() {}, warn() {} },
    location: { href: "https://jackbox.tv/", hostname: "jackbox.tv" },
    localStorage: {
      getItem: (key) => localStorageData[key] || null,
      setItem: (key, value) => { localStorageData[key] = String(value); }
    },
    document: {
      documentElement: new TestElement("html"),
      getElementById: (id) => byId[id] || null,
      createElement: (tagName) => new TestElement(tagName),
      querySelector: selectOne,
      querySelectorAll: selectAll
    },
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
    Event: class Event { constructor(type) { this.type = type; } },
    MouseEvent: class MouseEvent { constructor(type) { this.type = type; } },
    HTMLInputElement: function HTMLInputElement() {},
    HTMLTextAreaElement: function HTMLTextAreaElement() {},
    GM_getValue: (key, fallback) => storage[key] || fallback,
    GM_setValue: (key, value) => { storage[key] = value; bridgeMessages.push({ key, value }); },
    GM_addValueChangeListener: (key, handler) => { listeners[key] = handler; },
    window: {
      addEventListener: (type, handler) => { windowListeners[type] = handler; },
      setInterval: (handler, ms) => { intervals.push({ handler, ms }); return intervals.length; },
      postMessage() {},
      HTMLInputElement: null,
      HTMLTextAreaElement: null
    }
  };

  Object.defineProperty(sandbox.HTMLInputElement.prototype, "value", {
    get() { return this._value || ""; },
    set(value) { this._value = value; }
  });
  Object.defineProperty(sandbox.HTMLTextAreaElement.prototype, "value", {
    get() { return this._value || ""; },
    set(value) { this._value = value; }
  });
  Object.setPrototypeOf(sandbox.HTMLInputElement.prototype, TestElement.prototype);
  Object.setPrototypeOf(sandbox.HTMLTextAreaElement.prototype, TestElement.prototype);
  Object.setPrototypeOf(answer, sandbox.HTMLInputElement.prototype);
  Object.setPrototypeOf(room, sandbox.HTMLInputElement.prototype);
  Object.setPrototypeOf(name, sandbox.HTMLInputElement.prototype);
  sandbox.window.HTMLInputElement = sandbox.HTMLInputElement;
  sandbox.window.HTMLTextAreaElement = sandbox.HTMLTextAreaElement;
  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.location = sandbox.location;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.Event = sandbox.Event;
  sandbox.window.MouseEvent = sandbox.MouseEvent;

  return { sandbox, storage, bridgeMessages, listeners, intervals, elements: { prompt, answer, submit, room, name, join } };
}

function bridgePayload(raw) {
  assert.ok(raw, "expected a bridge message");
  const envelope = JSON.parse(raw);
  return envelope.payload;
}

function publishToJackbox(context, payload) {
  const raw = JSON.stringify({ id: `test:${Date.now()}`, from: "dashboard-test", payload });
  context.listeners["jba:bridge:to-jackbox"]("jba:bridge:to-jackbox", "", raw);
}

function runConnector() {
  const context = createSandbox();
  vm.runInNewContext(source, context.sandbox, { filename: "jackbox-ai-connector.user.js" });
  return context;
}

{
  const context = runConnector();
  const scan = context.intervals.find((entry) => entry.ms === 900);
  assert.ok(scan, "scan interval should be registered");

  scan.handler();
  const promptRecord = context.bridgeMessages.find((message) => bridgePayload(message.value).type === "JBA_PROMPT");
  assert.ok(promptRecord, "prompt should be published to the dashboard bridge");
  const promptMessage = bridgePayload(promptRecord.value);
  assert.equal(promptMessage.source, "jackbox-ai-connector");
  assert.equal(promptMessage.type, "JBA_PROMPT");
  assert.equal(promptMessage.prompt, "A bad thing to say at a wedding");

  publishToJackbox(context, {
    source: "jackbox-ai-dashboard",
    type: "JBA_ANSWER",
    promptId: promptMessage.promptId,
    answer: "seven tiny lawyers"
  });

  assert.equal(context.elements.answer.value, "seven tiny lawyers");
  assert.equal(context.elements.submit.clicked, true);
}

{
  const context = runConnector();
  publishToJackbox(context, {
    source: "jackbox-ai-dashboard",
    type: "JBA_JOIN",
    roomCode: "abcd",
    username: "ShrekBot"
  });

  assert.equal(context.elements.room.value, "ABCD");
  assert.equal(context.elements.name.value, "ShrekBot");
  assert.equal(context.elements.join.clicked, true);
}

console.log("Automation bridge business logic tests passed.");
