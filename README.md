# Jackbox AI Assistant — GitHub Pages Edition

This repository is now **GitHub Pages-first**. The main app is a static website (`index.html`, `app.js`, `styles.css`) with an installable Tampermonkey/Greasemonkey connector (`jackbox-ai-connector.user.js`). No Flask server, Ollama daemon, Selenium process, or hosted backend is required for the default workflow.

## What this version does

- Hosts a static assistant dashboard on GitHub Pages.
- Lets users install a userscript connector for both the deployed dashboard and `https://jackbox.tv/*`.
- Uses the deployed GitHub Pages dashboard as the primary control surface.
- Injects a compact fallback assistant panel into Jackbox.
- Detects visible Quiplash-style prompts in the Jackbox page.
- Generates short persona answers in the dashboard with WebLLM running in the browser.
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
4. Keep the deployed GitHub Pages dashboard open.
5. Open `https://jackbox.tv` in another tab. This tab is still required because browser security only allows the userscript to click and type inside a page where it is running.
6. Enter room code, player name, persona, style, and automation settings in the deployed dashboard.
7. Click **Fill/join room** from the deployed dashboard, or join manually in the Jackbox tab.
8. When a prompt appears, the Jackbox-side connector relays it to the deployed dashboard, receives an answer, and submits it if auto-submit is enabled.

One browser tab represents one AI player. Open more Jackbox tabs/windows for more bots.

The deployed page can now run the control UI directly, but it still cannot directly access Jackbox DOM from its own origin. The userscript bridges the deployed dashboard tab and the Jackbox tab through userscript storage events.

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

## Checks

Run `npm run check` before deploying. The check compiles the dashboard JavaScript and userscript, then verifies the static bridge contract: dashboard and Jackbox userscript matches, userscript storage grants, relay keys, top-level dashboard messaging, and workflow documentation.

## Static app files

| Path | Purpose |
| --- | --- |
| `index.html` | GitHub Pages dashboard and embedded connector panel UI |
| `styles.css` | Static dashboard styling |
| `app.js` | Persona catalog, prompt generation, bridge protocol, local state |
| `jackbox-ai-connector.user.js` | Tampermonkey/Greasemonkey bridge for the deployed dashboard plus automation connector for `jackbox.tv` |
| `Assets/avatars/` | Optional persona avatar images |
| `scripts/build-static.js` | Copies deployable static files into `dist/` |
| `scripts/check-static.js` | Syntax/wiring smoke check |

## Connector bridge protocol

The userscript has a self-contained fallback panel, so it works even if the deployed dashboard is not open. When the deployed dashboard is open, the same userscript also runs there and relays dashboard messages to the Jackbox tab through userscript storage events. When possible, the Jackbox-side panel can still embed the dashboard as an iframe with `?embedded=1` and exchange `window.postMessage` messages.

Connector → dashboard:

- `JBA_READY` — connector loaded on `jackbox.tv`.
- `JBA_PROMPT` — visible prompt detected; includes `prompt` and `promptId`.
- `JBA_LOG` — status/debug message.

Dashboard → connector:

- `JBA_CONFIG` — persona/style/autosubmit/autovote settings.
- `JBA_ANSWER` — generated answer for a prompt.
- `JBA_JOIN` — fill room code/player name and click Join.
- `JBA_EVERYONES_IN` — click the visible host start control.

## Client-side LLM

`app.js` uses WebLLM for dashboard generation and Jackbox prompt answers. The dashboard imports `@mlc-ai/web-llm` in the browser, loads the selected model id, and calls `engine.chat.completions.create()` for both Prompt Lab candidates and live `JBA_PROMPT` responses.

The Jackbox-side userscript still has a small local emergency answer path so it can remain operational if the dashboard tab is closed or the bridge is unavailable. The deployed dashboard itself does not use that static generator path.

The bridge contract remains `JBA_PROMPT` → `JBA_ANSWER`, so a future Transformers.js or bundled-model adapter can replace `answerPrompt(prompt)` without changing the userscript automation layer.

## Limitations

- This automates the visible `jackbox.tv` page; it does not call private Jackbox APIs.
- Jackbox DOM changes can require selector updates in `jackbox-ai-connector.user.js`.
- One tab is one bot. True multi-bot isolation is easier with a local Playwright companion, not a pure userscript.
- Browser/userscript permissions and extension policies vary by browser.
- WebLLM requires WebGPU and model downloads; unsupported browsers show a model error in the dashboard.
