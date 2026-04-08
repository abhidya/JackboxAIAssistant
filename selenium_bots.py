import os
import random
import re
import threading
import time

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from dependency_telemetry import track_dependency_call
from quote_generator import generate_quote_candidates


class QuiplashBot:
    def __init__(self, room_code, username, persona, model, cast_members, event_callback):
        self.room_code = room_code
        self.username = username
        self.persona = persona
        self.model = model
        self.cast_members = cast_members
        self.event_callback = event_callback
        self.stop_event = threading.Event()
        self.thread = None
        self.browser = None
        self.browser_lock = threading.RLock()
        self.last_answered_prompt = ""
        self.last_vote_signature = ""

    def start(self):
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self._safe_quit()

    def has_everyones_in_control(self):
        with self.browser_lock:
            if not self.browser:
                return False
            self._dismiss_cookie_banner()
            return self._find_everyones_in_button(timeout=0) is not None

    def click_everyones_in(self):
        with self.browser_lock:
            if not self.browser:
                raise RuntimeError("Bot browser is not running.")

            self._dismiss_cookie_banner()
            start_button = self._find_everyones_in_button(timeout=8)
            if start_button is not None:
                with track_dependency_call(
                    "jackbox",
                    "click_everyones_in",
                    details=f"room={self.room_code} user={self.username}",
                ):
                    try:
                        start_button.click()
                    except WebDriverException:
                        self.browser.execute_script("arguments[0].click();", start_button)
                self._emit("log", "Clicked Everybody's In.")
                return

            clickable_elements = self.browser.find_elements(By.TAG_NAME, "button")
            clickable_elements += self.browser.find_elements(By.CSS_SELECTOR, "[role='button']")

            for element in clickable_elements:
                if not element.is_displayed() or not element.is_enabled():
                    continue
                label = self._normalize_button_text(element.text)
                if label in {"everyonesin", "everybodysin"}:
                    with track_dependency_call(
                        "jackbox",
                        "click_everyones_in",
                        details=f"room={self.room_code} user={self.username}",
                    ):
                        element.click()
                    self._emit("log", "Clicked Everybody's In.")
                    return

            raise RuntimeError("Could not find an enabled Everybody's In button in the host browser.")

    def _emit(self, event_type, message):
        self.event_callback(event_type, message)

    def _build_driver(self):
        options = webdriver.ChromeOptions()
        if os.environ.get("JACKBOX_HEADLESS", "1") == "1":
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1280,900")
        options.add_argument("--log-level=3")
        options.add_argument(
            f"--user-agent={os.environ.get('JACKBOX_USER_AGENT', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36')}"
        )
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        with track_dependency_call(
            "browser",
            "launch_driver",
            details=f"user={self.username}",
        ):
            return webdriver.Chrome(options=options)

    @staticmethod
    def _normalize_button_text(text):
        return re.sub(r"[^a-z]", "", text.lower())

    def _safe_quit(self):
        with self.browser_lock:
            if not self.browser:
                return
            try:
                with track_dependency_call(
                    "browser",
                    "quit_driver",
                    details=f"user={self.username}",
                ):
                    self.browser.quit()
            except WebDriverException:
                pass
            finally:
                self.browser = None

    def _dismiss_cookie_banner(self):
        for selector in (".cky-btn-accept", "[data-cky-tag='accept-button']"):
            matches = self.browser.find_elements(By.CSS_SELECTOR, selector)
            for match in matches:
                if match.is_displayed() and match.is_enabled():
                    try:
                        match.click()
                    except WebDriverException:
                        self.browser.execute_script("arguments[0].click();", match)
                    self._emit("log", "Accepted cookie banner.")
                    return

    def _find_everyones_in_button(self, timeout=0):
        deadline = time.time() + timeout
        while True:
            exact_button = self._wait_for_visible_button("quiplash-startgame", timeout=0)
            if exact_button is not None:
                return exact_button

            clickable_elements = self.browser.find_elements(By.TAG_NAME, "button")
            clickable_elements += self.browser.find_elements(By.CSS_SELECTOR, "[role='button']")
            for element in clickable_elements:
                if not element.is_displayed() or not element.is_enabled():
                    continue
                label = self._normalize_button_text(element.text)
                if label in {"everyonesin", "everybodysin"}:
                    return element

            if time.time() >= deadline or self.stop_event.is_set():
                return None
            time.sleep(0.5)

    def _wait_for_visible_button(self, element_id, timeout=8):
        deadline = time.time() + timeout
        while time.time() < deadline and not self.stop_event.is_set():
            matches = self.browser.find_elements(By.ID, element_id)
            if matches:
                button = matches[0]
                if button.is_displayed() and button.is_enabled():
                    return button
            time.sleep(0.5)
        return None

    def _login(self):
        self._emit("log", "Connecting to jackbox.tv.")
        wait = WebDriverWait(self.browser, 15)
        with track_dependency_call(
            "jackbox",
            "join_room",
            details=f"room={self.room_code} user={self.username}",
        ):
            room_field = wait.until(EC.presence_of_element_located((By.ID, "roomcode")))
            room_field.clear()
            room_field.send_keys(self.room_code)

            username_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
            username_field.clear()
            username_field.send_keys(self.username)

            self._dismiss_cookie_banner()
            join_button = wait.until(EC.presence_of_element_located((By.ID, "button-join")))
            if not self._wait_for_join_button(join_button):
                raise RuntimeError(
                    f"Room {self.room_code} is not joinable right now. "
                    "Make sure the Jackbox lobby is live, the code is correct, and the game is accepting players."
                )
            join_button.click()
            self._emit("log", f"{self.username} connected to room {self.room_code}.")

    def _wait_for_join_button(self, join_button, timeout=12):
        deadline = time.time() + timeout
        while time.time() < deadline and not self.stop_event.is_set():
            if join_button.is_enabled():
                return True
            time.sleep(0.5)
        return False

    def _generate_response(self, prompt_text):
        prompt_task = f"Answer this Quiplash prompt in one funny line: {prompt_text}"
        _, candidates = generate_quote_candidates(
            persona=self.persona,
            prompt_task=prompt_task,
            model=self.model,
            cast_members=self.cast_members,
        )
        return candidates

    def _handle_prompt(self):
        answer_inputs = self.browser.find_elements(By.ID, "quiplash-answer-input")
        if not answer_inputs:
            return

        prompt_elements = self.browser.find_elements(By.ID, "question-text")
        prompt_text = prompt_elements[0].text.strip() if prompt_elements else ""
        if not prompt_text or prompt_text == self.last_answered_prompt:
            return

        self._emit("prompt", prompt_text)
        self._emit("log", f"Generating answer for prompt: {prompt_text}")
        candidates = self._generate_response(prompt_text)
        if not candidates:
            self._emit("log", "No candidate responses generated.")
            return

        answer_input = answer_inputs[0]
        if answer_input.get_attribute("value").strip():
            return

        selected_response = random.choice(candidates)
        submit_buttons = self.browser.find_elements(By.ID, "quiplash-submit-answer")
        if submit_buttons:
            with track_dependency_call(
                "jackbox",
                "submit_answer",
                details=f"room={self.room_code} user={self.username}",
            ):
                answer_input.clear()
                answer_input.send_keys(selected_response)
                submit_buttons[0].click()
            self.last_answered_prompt = prompt_text
            self._emit("response", selected_response)
            self._emit("log", f"Submitted answer: {selected_response}")

    def _handle_vote(self):
        vote_buttons = self.browser.find_elements(By.CLASS_NAME, "quiplash-vote-button")
        if len(vote_buttons) < 2:
            return

        signature = "|".join(button.text.strip() for button in vote_buttons)
        if not signature or signature == self.last_vote_signature:
            return

        choice = random.choice(vote_buttons)
        with track_dependency_call(
            "jackbox",
            "submit_vote",
            details=f"room={self.room_code} user={self.username}",
        ):
            choice.click()
        self.last_vote_signature = signature
        self._emit("log", f"Voted for: {choice.text}")

    def _run(self):
        had_error = False
        try:
            self._emit("status", "starting")
            self.browser = self._build_driver()
            with self.browser_lock:
                with track_dependency_call(
                    "jackbox",
                    "open_homepage",
                    details=f"user={self.username}",
                ):
                    self.browser.get("https://jackbox.tv")
                self._login()
            self._emit("status", "running")

            while not self.stop_event.is_set():
                with self.browser_lock:
                    self._handle_prompt()
                    self._handle_vote()
                time.sleep(1)
        except Exception as exc:
            if self.stop_event.is_set():
                self._emit("log", "Bot stopped.")
            else:
                had_error = True
                if isinstance(exc, TimeoutException):
                    error_message = (
                        f"{type(exc).__name__}: Timed out waiting for the Jackbox page to become ready."
                    )
                else:
                    error_message = str(exc).strip() or repr(exc)
                    if error_message == "Message:":
                        error_message = repr(exc)
                self._emit("error", f"{type(exc).__name__}: {error_message}")
        finally:
            self._safe_quit()
            if self.stop_event.is_set():
                self._emit("status", "stopped")
            elif not had_error:
                self._emit("status", "finished")
