#!/usr/bin/env python3
"""
Minimal Persona Data Collector
Fetches Wikipedia summaries and extracts basic info to hardcode Python files.
"""

import requests
import re
import json
from pathlib import Path

PERSONAS = [
"Scooby-Doo (Scooby-Doo)",
"Tony Stark (Marvel)",
"Deadpool (Marvel Comics)",
]

def slugify(name):
    return re.sub(r"[^a-zA-Z0-9]+", "-", name.split("(")[0]).lower().strip("-")

def get_wiki_summary(title):
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"⚠️  Failed to fetch {title}: {e}")
        return None

def collect():
    cache = {}
    for persona in PERSONAS:
        display_name = persona.split("(")[0].strip()
        wiki_title = display_name.replace(" ", "_")
        data = get_wiki_summary(wiki_title)
        
        entry = {
            "display_name": display_name,
            "description": "",
            "extract": "",
            "image": "",
            "quotes": [],
            "catchphrases": [],
        }
        
        if data:
            entry["description"] = data.get("description", "")
            entry["extract"] = data.get("extract", "")
            entry["image"] = data.get("thumbnail", {}).get("source", "")
        
        cache[persona] = entry
        print(f"✓ Collected: {persona}")
        time.sleep(0.5)
    
    Path("static").mkdir(exist_ok=True)
    Path("static/avatars").mkdir(exist_ok=True)
    
    # Generate quote_generator_avatars.py
    avatars_lines = ["CHARACTER_AVATARS = {"]
    for persona in PERSONAS:
        entry = cache.get(persona, {})
        avatar_path = entry.get("image", "")
        avatars_lines.append(f" {persona!r}: {avatar_path!r},")
    avatars_lines.append("}")
    Path("quote_generator_avatars.py").write_text("\n".join(avatars_lines))
    print("\n✓ Generated: quote_generator_avatars.py")
    
    # Generate quote_generator_character_data.py
    data_lines = ["CHARACTER_DATA = {"]
    for persona in PERSONAS:
        data = cache[persona]
        json_str = json.dumps(data, indent=4)
        data_lines.append(f" {persona!r}: {json_str},")
    data_lines.append("}")
    Path("quote_generator_character_data.py").write_text("\n".join(data_lines))
    print("✓ Generated: quote_generator_character_data.py")

if __name__ == "__main__":
    import time
    print("Collecting persona data from Wikipedia...")
    collect()
    print("\n✅ Collection complete!")
    print("\nFiles generated:")
    for f in ["quote_generator_avatars.py", "quote_generator_character_data.py"]:
        print(f" - {f}")
    print("""
⚠️  Important: This is a sample using Wikipedia/fair-use assumptions.
   Real people avatars (Trump, Shaq) are public figure photos; fictional ones
   (Deadpool) are likely fair-use thumbnails. Fonts and metadata still owned by original creators.

""")
