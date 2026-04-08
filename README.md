# Jackbox AI Assistant

Local web app for running AI-controlled Jackbox players with **Ollama** and **Selenium**.

This project opens a browser UI where you can:

- create a Jackbox room session
- choose how many AI players to add
- assign exact character personas to each bot
- start and stop bots per session or per player
- trigger **Everybody's In** from the detected host browser
- inspect prompts, responses, logs, and dependency telemetry
- use **Prompt Lab** to preview character answers before a live game

## Current stack

- **Flask** web server
- **Ollama** for local model inference
- **Selenium + Chrome** for browser automation against `jackbox.tv`

The default model is `llama3.1:8b`.

## Requirements

- Python 3.10+
- Google Chrome installed locally
- Ollama installed and running

Python packages are listed in `requirements.txt`:

- Flask
- ollama
- selenium

## Quick start

1. Install Python dependencies:

   ```bash
   python3 -m pip install -r requirements.txt
   ```

2. Start Ollama if it is not already running:

   ```bash
   ollama serve
   ```

3. Pull the default model:

   ```bash
   ollama pull llama3.1:8b
   ```

4. Start the app:

   ```bash
   python3 app.py
   ```

5. Open the printed local URL in your browser. By default the app starts on `127.0.0.1:7000` and will automatically move to the next free port if that port is already in use.

You can also launch through:

```bash
python3 gui.py
```

`gui.py` is just a thin compatibility entrypoint that starts the Flask app.

## How to use it

### Launch tab

1. Enter the live Jackbox room code.
2. Choose the Ollama model.
3. Pick the bot count.
4. Select exactly that many character cards.
5. Create the session.

### Sessions tab

From the Sessions console you can:

- start all bots in a room
- stop all bots
- start or stop individual players
- click **Everyone's In**
- delete a session
- inspect each player's:
  - status
  - last prompt
  - last response
  - recent logs
  - current error

The app detects which running bot currently has the host control and uses that browser when you click **Everyone's In**.

### Prompt Lab

Prompt Lab lets you:

- pick a persona
- enter a Quiplash-style prompt
- choose an Ollama model
- inspect the exact prompt sent to Ollama
- review generated candidate answers before using them in a live room

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Flask bind host |
| `PORT` | `7000` | Preferred starting port |
| `SECRET_KEY` | generated at startup | Flask secret key |
| `JACKBOX_SECRET_KEY` | unset | Preferred explicit Flask secret key |
| `OLLAMA_MODEL` | `llama3.1:8b` | Default Ollama model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `JACKBOX_HEADLESS` | `1` | Run Chrome headless when set to `1` |
| `JACKBOX_USER_AGENT` | built-in Chrome UA | Override the user agent used by Selenium |

Example:

```bash
HOST=0.0.0.0 PORT=7000 OLLAMA_MODEL=llama3.1:8b python3 app.py
```

## Notes on Jackbox automation

- Bots join `https://jackbox.tv` with Selenium.
- Headless mode is enabled by default.
- The bot tries to dismiss the cookie banner before joining or clicking host controls.
- Bot answers are generated in-character and include awareness of the other cast members in the same session.
- The prompt generator enforces short Quiplash-style outputs and filters invalid responses.

## Dependency telemetry

The Sessions dashboard shows telemetry for the critical external dependencies this app relies on:

- **Jackbox** interactions like room join, answer submission, voting, and host control clicks
- **Browser** automation actions like launching and shutting down Chrome
- **AI** calls to Ollama

Each event records:

- success or failure
- latency
- operation name
- basic context details
- error text when a dependency call fails

## Project structure

| Path | Purpose |
| --- | --- |
| `app.py` | Flask app and routes |
| `session_manager.py` | In-memory session and player lifecycle management |
| `selenium_bots.py` | Jackbox browser automation worker |
| `quote_generator.py` | Ollama prompt building and answer generation |
| `dependency_telemetry.py` | Dependency call tracking and summaries |
| `templates/index.html` | Main UI |
| `gui.py` | Compatibility entrypoint |

## Limitations

- Session data is stored in memory only.
- There is no persistent database yet.
- There is no automated test suite yet.
- Runtime quality and speed depend heavily on the selected Ollama model and local machine resources.
- Jackbox DOM changes can break Selenium selectors over time.

## Development notes

- Keep Ollama running locally before starting a live room.
- If bots fail to join, confirm the lobby is live and still accepting players.
- If the default port is busy, the app will choose the next available local port automatically.
