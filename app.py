import os
import secrets
import socket

from flask import Flask, flash, redirect, render_template, request, url_for

from dependency_telemetry import dependency_tracker
from quote_generator import DEFAULT_MODEL, PERSONA_OPTIONS, get_persona_catalog
from session_manager import SessionManager


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = (
        os.environ.get("JACKBOX_SECRET_KEY")
        or os.environ.get("SECRET_KEY")
        or secrets.token_hex(32)
    )
    manager = SessionManager()

    def render_index(
        active_panel="launch",
        generated_candidates=None,
        generated_prompt_task="",
        generated_persona="",
        generated_model=DEFAULT_MODEL,
        generated_full_prompt="",
    ):
        return render_template(
            "index.html",
            personas=PERSONA_OPTIONS,
            persona_catalog=get_persona_catalog(),
            sessions=manager.list_sessions(),
            default_model=DEFAULT_MODEL,
            active_panel=active_panel,
            generated_candidates=generated_candidates or [],
            generated_prompt_task=generated_prompt_task,
            generated_persona=generated_persona,
            generated_model=generated_model,
            generated_full_prompt=generated_full_prompt,
            dependency_metrics=dependency_tracker.snapshot(),
        )

    @app.get("/")
    def index():
        active_panel = request.args.get("panel", "launch")
        return render_index(active_panel=active_panel)

    @app.post("/sessions")
    def create_session():
        room_code = request.form.get("room_code", "").strip().upper()
        title = request.form.get("title", "").strip()
        model = request.form.get("model", "").strip() or DEFAULT_MODEL
        selected_personas = request.form.getlist("personas")
        ai_player_count = request.form.get("ai_player_count", "").strip()

        if not room_code:
            flash("Room code is required.", "error")
            return redirect(url_for("index"))

        if not ai_player_count.isdigit():
            flash("Choose how many AI players you want.", "error")
            return redirect(url_for("index"))

        ai_player_count = int(ai_player_count)
        if ai_player_count < 1:
            flash("You need at least one AI player.", "error")
            return redirect(url_for("index"))

        if len(selected_personas) != ai_player_count:
            flash(f"Pick exactly {ai_player_count} character(s).", "error")
            return redirect(url_for("index"))

        session = manager.create_session(room_code=room_code, title=title)
        manager.add_persona_players(session.id, selected_personas, model)
        flash(f"Session created for room {room_code} with {ai_player_count} AI player(s).", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/players")
    def add_players(session_id):
        raw_players = request.form.get("players_text", "")
        default_persona = request.form.get("default_persona", "").strip()
        model = request.form.get("model", "").strip() or DEFAULT_MODEL

        try:
            added_players = manager.add_players(
                session_id=session_id,
                raw_players=raw_players,
                default_persona=default_persona,
                model=model,
            )
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Added {added_players} player(s).", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/start")
    def start_session(session_id):
        try:
            started = manager.start_session(session_id)
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Started {started} player(s).", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/stop")
    def stop_session(session_id):
        try:
            stopped = manager.stop_session(session_id)
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Stopped {stopped} player(s).", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/everyones-in")
    def click_everyones_in(session_id):
        try:
            host_username = manager.click_everyones_in(session_id)
        except (ValueError, RuntimeError) as exc:
            flash(str(exc), "error")
        else:
            flash(f"Clicked Everybody's In from {host_username}'s browser.", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/delete")
    def delete_session(session_id):
        try:
            title = manager.delete_session(session_id)
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Deleted session {title}.", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/players/<player_id>/start")
    def start_player(session_id, player_id):
        try:
            username = manager.start_player(session_id, player_id)
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Started {username}.", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/sessions/<session_id>/players/<player_id>/stop")
    def stop_player(session_id, player_id):
        try:
            username = manager.stop_player(session_id, player_id)
        except ValueError as exc:
            flash(str(exc), "error")
        else:
            flash(f"Stopped {username}.", "success")
        return redirect(url_for("index", panel="sessions"))

    @app.post("/generate")
    def generate():
        persona = request.form.get("persona", "").strip()
        prompt_task = request.form.get("prompt_task", "").strip()
        model = request.form.get("model", "").strip() or DEFAULT_MODEL

        generated_candidates = []
        generated_full_prompt = ""
        if not persona or not prompt_task:
            flash("Persona and prompt task are required to generate quotes.", "error")
        else:
            try:
                generated_full_prompt, generated_candidates = manager.generate_preview(
                    persona=persona,
                    prompt_task=prompt_task,
                    model=model,
                )
                flash(f"Generated {len(generated_candidates)} candidate quote(s).", "success")
            except RuntimeError as exc:
                flash(str(exc), "error")

        return render_index(
            active_panel="prompt",
            generated_candidates=generated_candidates,
            generated_prompt_task=prompt_task,
            generated_persona=persona,
            generated_model=model,
            generated_full_prompt=generated_full_prompt,
        )

    return app


app = create_app()


def _resolve_port(preferred_port, host="0.0.0.0", attempts=20):
    for port in range(preferred_port, preferred_port + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
            except OSError:
                continue
            return port
    raise OSError(f"No available ports found in range {preferred_port}-{preferred_port + attempts - 1}.")


def main():
    host = os.environ.get("HOST", "127.0.0.1")
    preferred_port = int(os.environ.get("PORT", "7000"))
    resolved_port = _resolve_port(preferred_port, host=host)
    if resolved_port != preferred_port:
        print(f"Port {preferred_port} is in use. Starting on port {resolved_port} instead.")
    app.run(host=host, port=resolved_port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
