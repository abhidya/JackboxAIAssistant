import threading
import uuid
from dataclasses import dataclass, field

from quote_generator import CHARACTER_ICONS, DEFAULT_MODEL, generate_quote_candidates
from selenium_bots import QuiplashBot


@dataclass
class PlayerRecord:
    id: str
    username: str
    persona: str
    model: str = DEFAULT_MODEL
    status: str = "pending"
    logs: list[str] = field(default_factory=list)
    last_prompt: str = ""
    last_response: str = ""
    error: str = ""
    bot: QuiplashBot | None = None


@dataclass
class GameSession:
    id: str
    room_code: str
    title: str
    players: dict[str, PlayerRecord] = field(default_factory=dict)


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, GameSession] = {}
        self._lock = threading.RLock()

    def create_session(self, room_code, title=""):
        session_id = uuid.uuid4().hex[:8]
        session = GameSession(
            id=session_id,
            room_code=room_code,
            title=title or f"Room {room_code}",
        )
        with self._lock:
            self._sessions[session_id] = session
        return session

    def list_sessions(self):
        with self._lock:
            return [
                {
                    "id": session.id,
                    "room_code": session.room_code,
                    "title": session.title,
                    "player_count": len(session.players),
                    "host_player": self._find_host_player_name(session),
                    "players": [
                        {
                            "id": player.id,
                            "username": player.username,
                            "persona": player.persona,
                            "icon": CHARACTER_ICONS.get(player.persona, "🎤"),
                            "model": player.model,
                            "status": player.status,
                            "has_host_controls": bool(player.bot and player.status == "running" and player.bot.has_everyones_in_control()),
                            "last_prompt": player.last_prompt,
                            "last_response": player.last_response,
                            "error": player.error,
                            "logs": list(player.logs[-8:]),
                        }
                        for player in session.players.values()
                    ],
                }
                for session in self._sessions.values()
            ]

    def delete_session(self, session_id):
        session = self._get_session(session_id)
        self.stop_session(session_id)
        with self._lock:
            self._sessions.pop(session.id, None)
        return session.title

    def add_players(self, session_id, raw_players, default_persona, model):
        session = self._get_session(session_id)
        lines = [line.strip() for line in raw_players.splitlines() if line.strip()]
        if not lines:
            raise ValueError("Add at least one player name. Use one line per player.")

        added = 0
        with self._lock:
            for line in lines:
                if "|" in line:
                    username, persona = [part.strip() for part in line.split("|", 1)]
                else:
                    username, persona = line, default_persona

                if not username:
                    continue

                player_id = uuid.uuid4().hex[:8]
                session.players[player_id] = PlayerRecord(
                    id=player_id,
                    username=username,
                    persona=persona or username,
                    model=model or DEFAULT_MODEL,
                )
                added += 1

        if not added:
            raise ValueError("No valid player names were provided.")
        return added

    def add_persona_players(self, session_id, personas, model):
        session = self._get_session(session_id)
        if not personas:
            raise ValueError("Select at least one character.")

        added = 0
        used_usernames = {player.username.lower() for player in session.players.values()}
        with self._lock:
            for persona in personas:
                base_name = persona.split("(")[0].strip()
                username = base_name
                suffix = 2
                while username.lower() in used_usernames:
                    username = f"{base_name} {suffix}"
                    suffix += 1
                used_usernames.add(username.lower())

                player_id = uuid.uuid4().hex[:8]
                session.players[player_id] = PlayerRecord(
                    id=player_id,
                    username=username,
                    persona=persona,
                    model=model or DEFAULT_MODEL,
                )
                added += 1
        return added

    def start_session(self, session_id):
        session = self._get_session(session_id)
        started = 0
        for player_id in list(session.players.keys()):
            if self._start_player_if_needed(session, player_id):
                started += 1
        return started

    def stop_session(self, session_id):
        session = self._get_session(session_id)
        stopped = 0
        for player_id in list(session.players.keys()):
            player = session.players[player_id]
            if player.bot and player.status in {"starting", "running", "error"}:
                player.bot.stop()
                player.status = "stopped"
                player.logs.append("Bot stop requested.")
                stopped += 1
        return stopped

    def click_everyones_in(self, session_id):
        session = self._get_session(session_id)
        host_player = self._find_host_player(session)
        if not host_player:
            raise ValueError("No running player currently has the Everybody's In button.")

        host_player.bot.click_everyones_in()
        host_player.logs.append("Clicked Everybody's In from web control.")
        host_player.logs = host_player.logs[-50:]
        return host_player.username

    def start_player(self, session_id, player_id):
        session = self._get_session(session_id)
        if not self._start_player_if_needed(session, player_id):
            raise ValueError("Player is already running or starting.")

    def stop_player(self, session_id, player_id):
        session = self._get_session(session_id)
        player = self._get_player(session, player_id)
        if not player.bot:
            raise ValueError("Player has not been started yet.")
        player.bot.stop()
        player.status = "stopped"
        player.logs.append("Bot stop requested.")

    def generate_preview(self, persona, prompt_task, model):
        full_prompt, candidates = generate_quote_candidates(
            persona=persona,
            prompt_task=prompt_task,
            model=model,
        )
        return full_prompt, candidates

    def _get_session(self, session_id):
        with self._lock:
            session = self._sessions.get(session_id)
        if not session:
            raise ValueError("Session not found.")
        return session

    def _get_player(self, session, player_id):
        player = session.players.get(player_id)
        if not player:
            raise ValueError("Player not found.")
        return player

    def _find_host_player(self, session):
        for player in session.players.values():
            if player.bot and player.status == "running" and player.bot.has_everyones_in_control():
                return player
        return None

    def _find_host_player_name(self, session):
        host_player = self._find_host_player(session)
        return host_player.username if host_player else ""

    def _start_player_if_needed(self, session, player_id):
        player = self._get_player(session, player_id)
        if player.status in {"starting", "running"} and player.bot:
            return False

        cast_members = [
            other_player.persona
            for other_id, other_player in session.players.items()
            if other_id != player_id
        ]

        player.logs.append("Starting bot.")
        player.error = ""
        player.status = "starting"

        def handle_event(event_type, message):
            with self._lock:
                if event_type == "status":
                    player.status = message
                    if message in {"finished", "stopped"}:
                        player.bot = None
                elif event_type == "prompt":
                    player.last_prompt = message
                elif event_type == "response":
                    player.last_response = message
                elif event_type == "error":
                    player.error = message
                    player.status = "error"
                    player.bot = None
                else:
                    player.logs.append(message)
                    player.logs = player.logs[-50:]

        player.bot = QuiplashBot(
            room_code=session.room_code,
            username=player.username,
            persona=player.persona,
            model=player.model,
            cast_members=cast_members,
            event_callback=handle_event,
        )
        player.bot.start()
        return True
