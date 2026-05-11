# Jackbox AI Assistant — GitHub Pages Edition

This repository is now **GitHub Pages-first**. The main app is a static website (`index.html`, `app.js`, `styles.css`) with an installable Tampermonkey/Greasemonkey connector (`jackbox-ai-connector.user.js`). No Flask server, Ollama daemon, Selenium process, or hosted backend is required for the default workflow.

## What this version does

- Hosts a static assistant dashboard on GitHub Pages.
- Lets users install a userscript connector for `https://jackbox.tv/*`.
- Injects a compact assistant panel into Jackbox.
- Detects visible Quiplash-style prompts in the Jackbox page.
- Generates short persona answers in the browser with either the built-in static generator or an optional WebLLM in-browser model.
- Fills and submits answers through the real Jackbox page DOM.
- Can optionally click random votes and the visible **Everyone's In** control.

## What changed from the old local app

| Old local app | Pages edition |
| --- | --- |
| Flask routes and Jinja templates | Static `index.html` + `app.js` |
| Python in-memory sessions | Browser `localStorage` state |
| Selenium-controlled Chrome | Userscript DOM automation in the user's Jackbox tab |
| Ollama / cloud provider calls | Browser-local generator contract; optional WebLLM runtime |
| Local dependency telemetry | Connector event log in the dashboard |

The old Python files are kept in the repo as reference/migration history, but the deployable product is the static app.

## User setup workflow

1. Open the deployed GitHub Pages site.
2. Install a userscript manager:
   - Tampermonkey for Chrome/Edge/Firefox, or
   - Greasemonkey/Violentmonkey where preferred.
3. Click **Install connector** on the site. This opens `jackbox-ai-connector.user.js` in the userscript manager.
4. Open `https://jackbox.tv`.
5. The connector injects a **Jackbox AI Assistant** panel into the bottom-right of the `jackbox.tv` page.
6. Enter room code, player name, persona, style, and automation settings.
7. Click **Fill/join room** or join manually.
8. When a prompt appears, the connector sends it to the embedded dashboard, receives an answer, and submits it if auto-submit is enabled.

One browser tab represents one AI player. Open more Jackbox tabs/windows for more bots.

The top-level GitHub Pages site is mainly the installer/docs dashboard. It cannot directly control a separate `jackbox.tv` tab by itself; the actual automation controls must be used from the panel injected on `jackbox.tv`.

## Deploy to GitHub Pages

This repo includes `.github/workflows/pages.yml`.

1. Push to `main`.
2. In GitHub repo settings, enable **Pages** with **GitHub Actions** as the source.
3. The workflow runs:

```bash
npm run check
npm run build
```

and publishes `dist/`.

For a manual local bundle:

```bash
npm run check
npm run build
```

Serve locally:

```bash
npm run serve
# open http://127.0.0.1:4173/
```

## Static app files

| Path | Purpose |
| --- | --- |
| `index.html` | GitHub Pages dashboard and embedded connector panel UI |
| `styles.css` | Static dashboard styling |
| `app.js` | Persona catalog, prompt generation, bridge protocol, local state |
| `jackbox-ai-connector.user.js` | Tampermonkey/Greasemonkey automation connector for `jackbox.tv` |
| `Assets/avatars/` | Optional persona avatar images |
| `scripts/build-static.js` | Copies deployable static files into `dist/` |
| `scripts/check-static.js` | Syntax/wiring smoke check |

## Connector bridge protocol

The userscript has a self-contained fallback panel, so it works even if the embedded Pages iframe is blocked or not available. When possible, it also injects the dashboard as an iframe with `?embedded=1` and exchanges `window.postMessage` messages.

Connector → dashboard:

- `JBA_READY` — connector loaded on `jackbox.tv`.
- `JBA_PROMPT` — visible prompt detected; includes `prompt` and `promptId`.
- `JBA_LOG` — status/debug message.

Dashboard → connector:

- `JBA_CONFIG` — persona/style/autosubmit/autovote settings.
- `JBA_ANSWER` — generated answer for a prompt.
- `JBA_JOIN` — fill room code/player name and click Join.
- `JBA_EVERYONES_IN` — click the visible host start control.

## Client-side LLM upgrade point

`app.js` includes two client-side generation paths:

- **Built-in static generator** — immediate, zero download, useful as a reliable fallback.
- **WebLLM in-browser model** — selected from the dashboard with a model id such as `Llama-3.2-1B-Instruct-q4f16_1-MLC`; it dynamically loads `@mlc-ai/web-llm` in browsers with WebGPU support.

Both paths preserve the same `JBA_PROMPT` → `JBA_ANSWER` message contract, so a future Transformers.js or bundled-model adapter can replace `answerPrompt(prompt)` without changing the userscript.

## Limitations

- This automates the visible `jackbox.tv` page; it does not call private Jackbox APIs.
- Jackbox DOM changes can require selector updates in `jackbox-ai-connector.user.js`.
- One tab is one bot. True multi-bot isolation is easier with a local Playwright companion, not a pure userscript.
- Browser/userscript permissions and extension policies vary by browser.
- WebLLM requires WebGPU and model downloads; unsupported browsers automatically fall back to the built-in generator.
