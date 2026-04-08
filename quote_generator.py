import random
import os
import re
from functools import lru_cache

import ollama

from dependency_telemetry import track_dependency_call

DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
emotions = ["angry", "excited", "depressed", "sarcastic", "confused", "manic", "paranoid"]

CHARACTER_METADATA = {
    "Scooby-Doo (Scooby-Doo)": {
        "traits": "Hungry, cowardly, loyal dog, loves solving mysteries for food",
        "style": "Replaces the first letter of words with 'R', goofy, easily scared",
        "catchphrase": "Ruh-roh, Raggy!",
    },
    "Rickety Cricket (It's Always Sunny in Philadelphia)": {
        "traits": "Former priest, street-hardened, completely unhinged, physically ruined but optimistic",
        "style": "Desperate, manic, grossly over-sharing, highly inappropriate",
        "catchphrase": "Hips and nips! Make it sexy!",
    },
    "Donald Trump (Real Life)": {
        "traits": "Presidential, boastful, obsessed with ratings, crowds, and winning",
        "style": "Hyperbolic, repetitive, uses words like 'tremendous' and 'huge', goes on tangents",
        "catchphrase": "Frankly, it's tremendous.",
    },
    "Hillary Clinton (Real Life)": {
        "traits": "Overly prepared politician, tries too hard to relate to the youth, serious",
        "style": "Rehearsed, slightly robotic, awkward attempts at modern slang",
        "catchphrase": "Pokemon GO to the polls.",
    },
    "Shaquille O'Neal (Real Life)": {
        "traits": "Massive former NBA star, casual millionaire, endorses every product imaginable",
        "style": "Deep voice, mumbling, brings up his 4 rings, pitches random products like IcyHot",
        "catchphrase": "Google me, Chuck. or BBQ chicken alert!",
    },
    "MrBeast (YouTube)": {
        "traits": "Hyper-energetic, casually throws around millions of dollars, challenge-obsessed",
        "style": "Screaming YouTuber voice, clickbait enthusiasm, entirely unhinged philanthropy",
        "catchphrase": "I just bought a private island to...",
    },
    "Deadpool (Marvel Comics)": {
        "traits": "Fourth-wall breaking, unhinged, violent, pop-culture obsessed",
        "style": "Sarcastic, self-aware, manic",
        "catchphrase": "Chimichangas!",
    },
    "Doraemon (Anime)": {
        "traits": "Helpful but easily exasperated, futuristic robot cat, loves Dorayaki",
        "style": "Earnest but slightly robotic and annoyed",
        "catchphrase": "*Pulls gadget from 4D pocket*",
    },
    "Minions (Despicable Me)": {
        "traits": "Chaotic, unintelligent, obsessed with bananas and mischief",
        "style": "Slapstick, mostly gibberish with random English words",
        "catchphrase": "Banana!",
    },
    "SpongeBob SquarePants (SpongeBob)": {
        "traits": "Overly optimistic, naive, nautical, childish, fry cook",
        "style": "Extremely enthusiastic and innocent, nautical puns",
        "catchphrase": "I'm ready!",
    },
    "Pikachu (Pokémon)": {
        "traits": "Loyal, electric, cute but fierce",
        "style": "Only speaks in 'Pika', but provide a chaotic English translation in parentheses",
        "catchphrase": "Pika pika! (Translation: ...)",
    },
    "Groot (Guardians of the Galaxy)": {
        "traits": "Protective, tree-like, simple but deeply emotional",
        "style": "Always starts with 'I am Groot', followed by a highly specific translated answer in parentheses",
        "catchphrase": "I am Groot.",
    },
    "Stitch (Lilo & Stitch)": {
        "traits": "Destructive, alien, learning to be good, aggressive",
        "style": "Broken English, animalistic, chaotic",
        "catchphrase": "Meega nala kweesta!",
    },
    "Harley Quinn (DC Comics)": {
        "traits": "Manic, violently cheerful, obsessed with mayhem",
        "style": "Brooklyn accent, playful but deadly, erratic",
        "catchphrase": "Hiya puddin'!",
    },
    "Shrek (Shrek)": {
        "traits": "Grumpy, gross, fiercely private, Scottish ogre",
        "style": "Annoyed, sarcastic, swamp-focused",
        "catchphrase": "What are you doing in my swamp?!",
    },
    "Genie (Aladdin)": {
        "traits": "Theatrical, fast-talking, magical, impressionist",
        "style": "Over-the-top, loud, constantly shifting personas",
        "catchphrase": "Phenomenal cosmic powers!",
    },
    "Homer Simpson (The Simpsons)": {
        "traits": "Lazy, hungry, foolish, prone to anger",
        "style": "Slow-witted, food-obsessed, suburban dad",
        "catchphrase": "D'oh!",
    },
    "Jack Sparrow (Pirates of the Caribbean)": {
        "traits": "Drunk, eccentric, selfish but occasionally heroic, pirate",
        "style": "Slurring, overly elaborate vocabulary, confusing",
        "catchphrase": "But why is the rum gone?",
    },
    "Tony Stark (Marvel)": {
        "traits": "Arrogant, wealthy, genius, insecure but hides it with humor",
        "style": "Snarky, fast-talking, pop-culture referencing",
        "catchphrase": "I am Iron Man.",
    },
    "Tony Stark/Iron Man (Marvel Cinematic Universe)": {
        "traits": "Arrogant, wealthy, genius, insecure but hides it with humor",
        "style": "Snarky, fast-talking, pop-culture referencing",
        "catchphrase": "I am Iron Man.",
    },
    "Ron Swanson (Parks and Recreation)": {
        "traits": "Libertarian, stoic, loves meat and woodworking, hates the government",
        "style": "Deadpan, hyper-masculine, exceptionally brief",
        "catchphrase": "End of speech.",
    },
    "Michael Scott (The Office)": {
        "traits": "Desperate for approval, highly inappropriate, lacks self-awareness",
        "style": "Awkward, tries too hard to be funny, deeply insecure",
        "catchphrase": "That's what she said!",
    },
    "Hermione Granger (Harry Potter)": {
        "traits": "Rule-abiding, brilliant, slightly bossy, bookish",
        "style": "Matter-of-fact, condescending but well-meaning",
        "catchphrase": "Honestly, don't you two read?",
    },
    "Captain Jack Harkness (Doctor Who)": {
        "traits": "Flirtatious, fearless, immortal space rogue, dramatic",
        "style": "Confident, cheeky, adventurous, innuendo-heavy",
        "catchphrase": "Never miss a good time.",
    },
    "The Joker (DC Comics)": {
        "traits": "Psychopathic, chaotic, obsessed with Batman, clownish",
        "style": "Dark irony, theatrical, menacingly funny",
        "catchphrase": "Why so serious?",
    },
    "Rick Sanchez (Rick and Morty)": {
        "traits": "Nihilistic, alcoholic, universe-hopping genius, abusive",
        "style": "Stuttering, burping, highly cynical, fourth-wall breaking",
        "catchphrase": "*Burp*",
    },
    "Austin Powers (Austin Powers franchise)": {
        "traits": "Swinging spy, shameless flirt, absurdly confident",
        "style": "Shagadelic, goofy innuendo, retro British swagger",
        "catchphrase": "Yeah, baby!",
    },
}

PERSONA_OPTIONS = list(CHARACTER_METADATA.keys())
CHARACTER_ICONS = {
    "Scooby-Doo (Scooby-Doo)": "🐶",
    "Rickety Cricket (It's Always Sunny in Philadelphia)": "🧎",
    "Donald Trump (Real Life)": "🇺🇸",
    "Hillary Clinton (Real Life)": "📋",
    "Shaquille O'Neal (Real Life)": "🏀",
    "MrBeast (YouTube)": "💸",
    "Deadpool (Marvel Comics)": "🗡️",
    "Doraemon (Anime)": "🤖",
    "Minions (Despicable Me)": "🍌",
    "SpongeBob SquarePants (SpongeBob)": "🧽",
    "Pikachu (Pokémon)": "⚡",
    "Groot (Guardians of the Galaxy)": "🌳",
    "Stitch (Lilo & Stitch)": "👾",
    "Harley Quinn (DC Comics)": "🃏",
    "Shrek (Shrek)": "🧌",
    "Genie (Aladdin)": "🪔",
    "Homer Simpson (The Simpsons)": "🍩",
    "Jack Sparrow (Pirates of the Caribbean)": "🏴‍☠️",
    "Tony Stark (Marvel)": "🤖",
    "Tony Stark/Iron Man (Marvel Cinematic Universe)": "🦾",
    "Ron Swanson (Parks and Recreation)": "🥓",
    "Michael Scott (The Office)": "☕",
    "Hermione Granger (Harry Potter)": "📚",
    "Captain Jack Harkness (Doctor Who)": "🚀",
    "The Joker (DC Comics)": "🎭",
    "Rick Sanchez (Rick and Morty)": "🧪",
    "Austin Powers (Austin Powers franchise)": "🕺",
}


def get_persona_catalog():
    return [
        {
            "name": persona,
            "icon": CHARACTER_ICONS.get(persona, "🎤"),
            "short_name": persona.split("(")[0].strip(),
        }
        for persona in PERSONA_OPTIONS
    ]


@lru_cache(maxsize=1)
def _get_client():
    return ollama.Client(host=OLLAMA_BASE_URL)


def _get_character_metadata(character):
    return CHARACTER_METADATA.get(
        character,
        {
            "traits": "Chaotic and funny",
            "style": "Brief and punchy",
            "catchphrase": "",
        },
    )


def _format_player_context(cast_members):
    if not cast_members:
        return ""
    return ", ".join(cast_members)


def build_prompt_task(character, prompt_task, include_extra_context=False, cast_members=None):
    short_name = character.split("(")[0].strip()
    metadata = _get_character_metadata(character)
    system_instruction = (
        f"You are {short_name}. You are playing the comedy party game Quiplash.\n"
        f"Traits: {metadata['traits']}.\n"
        f"Style: {metadata['style']}.\n\n"
        f"Other players in this lobby: {_format_player_context(cast_members) or 'Unknown'}.\n"
        "Know the cast, but only reference them when it makes the joke funnier.\n\n"
        "STRICT RULES:\n"
        "1. Your answer MUST BE UNDER 7 WORDS.\n"
        "2. Be extremely brief, edgy, and funny.\n"
        "3. Stay 100% in character.\n"
        f"4. Integrate your tic/catchphrase '{metadata['catchphrase']}' naturally if possible.\n"
        "5. DO NOT explain yourself. Just give the answer."
    )
    user_input = f"Quiplash Prompt: '{prompt_task}'"
    if include_extra_context:
        user_input += f" Make it weird and feel {random.choice(emotions)}."
    return system_instruction, user_input


def _normalize_answer(answer):
    answer = answer.strip().strip("\"'")
    answer = re.sub(r"^\s*[-*\d.)]+\s*", "", answer)
    answer = re.sub(r"\s+", " ", answer)
    return answer.strip()


def _is_valid_answer(answer):
    if not answer:
        return False
    if len(answer.split()) > 7:
        return False
    lowered = answer.lower()
    if lowered.startswith("quiplash prompt"):
        return False
    return True


def generate_quote_candidates(
    persona,
    prompt_task,
    model=None,
    candidate_count=3,
    include_extra_context=False,
    cast_members=None,
):
    selected_model = model or DEFAULT_MODEL
    client = _get_client()
    collected_candidates = []
    seen_candidates = set()
    prompts_used = []

    try:
        for _ in range(max(candidate_count * 2, 3)):
            system_instruction, user_input = build_prompt_task(
                persona,
                prompt_task,
                include_extra_context=include_extra_context or len(collected_candidates) > 0,
                cast_members=cast_members,
            )
            prompts_used.append(f"System: {system_instruction}\nUser: {user_input}")
            with track_dependency_call(
                "ai",
                "generate_quote",
                details=f"model={selected_model} persona={persona}",
            ):
                response = client.chat(
                    model=selected_model,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_input},
                    ],
                    options={
                        "temperature": 0.9,
                        "top_p": 0.9,
                        "num_predict": 15,
                        "stop": ["\n", "User:", "Prompt:", '"'],
                    },
                )
            answer = _normalize_answer(response["message"]["content"])
            if _is_valid_answer(answer):
                normalized = answer.lower()
                if normalized not in seen_candidates:
                    seen_candidates.add(normalized)
                    collected_candidates.append(answer)
            if len(collected_candidates) >= candidate_count:
                break
    except Exception as exc:
        short_name = persona.split("(")[0].strip()
        raise RuntimeError(
            f"Could not generate with Ollama at {OLLAMA_BASE_URL} using {selected_model}: {exc}"
        ) from exc

    if not collected_candidates:
        metadata = _get_character_metadata(persona)
        fallback = f"I broke the internet. {metadata['catchphrase']}".strip()
        collected_candidates.append(fallback)

    return "\n\n".join(prompts_used), collected_candidates[:candidate_count]
