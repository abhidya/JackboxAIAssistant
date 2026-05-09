#!/usr/bin/env python3
"""
Offline Persona Data Collector

Collects avatars, descriptions, quotes, and metadata for comedy game personas.
After collection, the runtime app imports local files, never needing internet.
"""

import os
import sys
import json
import time
import argparse
import hashlib
import requests
from pathlib import Path

# Dependencies: pip install requests
# This script is the ONLY thing that hits Wikipedia/Wikimedia/Pexels/Pixabay.
# Generated files:
# - quote_generator_avatars.py
# - quote_generator_character_data.py
# - cache/persona_cache.json

###############################################################################
# CONFIGURATION
###############################################################################

CACHE_DIR = Path("cache")
CACHE_FILE = CACHE_DIR / "persona_cache.json"
AVATARS_DIR = Path("static") / "avatars"
AVATARS_FILE = Path("quote_generator_avatars.py")
CHARACTER_DATA_FILE = Path("quote_generator_character_data.py")

# Default avatar when no image found
FALLBACK_AVATAR = "/static/avatars/default.png"

# Persona list
PERSONAS = [
"Scooby-Doo (Scooby-Doo)",
"Rickety Cricket (It's Always Sunny in Philadelphia)",
"Donald Trump (Real Life)",
"Hillary Clinton (Real Life)",
"Shaquille O'Neal (Real Life)",
"MrBeast (YouTube)",
"Deadpool (Marvel Comics)",
"Doraemon (Anime)",
"Minions (Despicable Me)",
"SpongeBob SquarePants (SpongeBob)",
"Pikachu (Pokémon)",
"Groot (Guardians of the Galaxy)",
"Stitch (Lilo & Stitch)",
"Harley Quinn (DC Comics)",
"Shrek (Shrek)",
"Genie (Aladdin)",
"Homer Simpson (The Simpsons)",
"Jack Sparrow (Pirates of the Caribbean)",
"Tony Stark (Marvel)",
"Ron Swanson (Parks and Recreation)",
"Michael Scott (The Office)",
"Hermione Granger (Harry Potter)",
"Captain Jack Harkness (Doctor Who)",
"The Joker (DC Comics)",
"Rick Sanchez (Rick and Morty)",
"Austin Powers (Austin Powers franchise)",
]

# Wikipedia/Wikimedia title overrides
WIKI_TITLES = {
"Rickety Cricket (It's Always Sunny in Philadelphia)": "David Hornsby",
"Jack Sparrow (Pirates of the Caribbean)": "Johnny Depp",
"Tony Stark (Marvel)": "Robert Downey Jr.",
"Ron Swanson (Parks and Recreation)": "Nick Offerman",
"Michael Scott (The Office)": "Steve Carell",
"Hermione Granger (Harry Potter)": "Emma Watson",
"Captain Jack Harkness (Doctor Who)": "John Barrowman",
"Austin Powers (Austin Powers franchise)": "Mike Myers",
}
# Fill remaining with base name
for p in PERSONAS:
if p not in WIKI_TITLES:
WIKI_TITLES[p] = p.split("(")[0].strip()

# Generic terms for stock photo fallbacks
GENERIC_IMAGE_TERMS = {
"Deadpool (Marvel Comics)": "masked superhero parody",
"Doraemon (Anime)": "robot cat illustration",
"Minions (Despicable Me)": "yellow cartoon character",
"SpongeBob SquarePants (SpongeBob)": "cartoon sea sponge",
"Pikachu (Pokémon)": "cute electric mouse mascot",
"Groot (Guardians of the Galaxy)": "tree humanoid fantasy",
"Stitch (Lilo & Stitch)": "blue alien cartoon",
"Harley Quinn (DC Comics)": "clown woman cosplay",
"Shrek (Shrek)": "green ogre fantasy",
"Genie (Aladdin)": "blue genie fantasy",
"Homer Simpson (The Simpsons)": "cartoon dad",
"The Joker (DC Comics)": "clown villain cosplay",
"Rick Sanchez (Rick and Morty)": "mad scientist cartoon",
}

###############################################################################
# HELPERS
###############################################################################

def slugify(name):
import re
short = name.split("(")[0].strip()
slug = re.sub(r"[^a-zA-Z0-9]+", "-", short)
return slug.lower().strip("-")

def download_image(url, filepath):
try:
response = requests.get(url, stream=True, timeout=30,
headers={"User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)"})
response.raise_for_status()
content_type = response.headers.get("content-type", "")
if not content_type.startswith("image/"):
return False
ext = ".jpg"
if "image/png" in content_type:
ext = ".png"
elif "image/webp" in content_type:
ext = ".webp"
filepath = filepath.with_suffix(ext)
filepath.parent.mkdir(parents=True, exist_ok=True)
with open(filepath, "wb") as f:
for chunk in response.iter_content(chunk_size=8192):
f.write(chunk)
return filepath
except:
return False

def search_wikipedia(title):
try:
url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"
response = requests.get(url, timeout=10)
if response.status_code == 404:
return None
response.raise_for_status()
return response.json()
except:
return None

def search_wikimedia_commons(query):
try:
params = {
"action": "query", "format": "json", "generator": "search",
"gsrnamespace": 6, "gsrsearch": query, "gsrlimit": 1,
"prop": "imageinfo", "iiprop": "url"
}
url = "https://commons.wikimedia.org/w/api.php"
response = requests.get(url, params=params, timeout=10)
response.raise_for_status()
data = response.json()
pages = data.get("query", {}).get("pages", {})
for page_id, page in pages.items():
imageinfo = page.get("imageinfo", [])
if imageinfo:
return imageinfo[0].get("url")
return None
except:
return None

def search_pexils(term):
api_key = os.getenv("PEXELS_API_KEY")
if not api_key:
return None
url = "https://api.pexels.com/v1/search"
headers = {"Authorization": api_key}
params = {"query": term, "per_page": 1}
response = requests.get(url, headers=headers, params=params, timeout=10)
response.raise_for_status()
data = response.json()
photos = data.get("photos", [])
if photos:
return photos[0]["src"]["large"]
return None

def search_pixabay(term):
api_key = os.getenv("PIXABAY_API_KEY")
if not api_key:
return None
params = {"key": api_key, "q": term, "image_type": "photo", "safesearch": "true", "per_page": 3}
url = "https://pixabay.com/api/"
response = requests.get(url, params=params, timeout=10)
response.raise_for_status()
data = response.json()
hits = data.get("hits", [])
if hits:
return hits[0]["webformatURL"]
return None

def search_wikiquote(persona):
try:
url = "https://en.wikiquote.org/w/api.php"
params = {
"action": "query", "format": "json", "list": "search",
"srsearch": persona.split("(")[0].strip(), "srlimit": 3
}
response = requests.get(url, params=params, timeout=10)
response.raise_for_status()
data = response.json()
quotes = []
for result in data.get("query", {}).get("search", [])[:3]:
# Basic parsing, get first quote-like snippet
snippet = result.get("snippet", "")
import re
if snippet:
# Extract quoted text pattern
matches = re.findall(r'"([^"]{5,200})"', snippet)
quotes.extend(matches[:2])
return quotes[:5]
except:
return []

def load_cache():
return json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}

def save_cache(cache):
CACHE_DIR.mkdir(exist_ok=True)
CACHE_FILE.write_text(json.dumps(cache, indent=2))

def generate_output_files(cache):
# quote_generator_avatars.py
lines = ["CHARACTER_AVATARS = {"]
for persona in PERSONAS:
entry = cache.get(persona, {})
avatar_path = entry.get("avatar_path", FALLBACK_AVATAR)
lines.append(f" {persona!r}: {avatar_path!r},")
lines.append("}")
AVATARS_FILE.write_text("\n".join(lines))
print(f"✓ {AVATARS_FILE}")

# quote_generator_character_data.py
lines = ["CHARACTER_DATA = {"]
for persona in PERSONAS:
entry = cache.get(persona, {})
data = {
"display_name": entry.get("display_name") or persona.split("(")[0].strip(),
"source_title": entry.get("source_title", ""),
"source_url": entry.get("source_url", ""),
"description": entry.get("description", ""),
"extract": entry.get("extract", ""),
"quotes": entry.get("quotes", []),
"catchphrases": entry.get("catchphrases", []),
"traits": entry.get("traits", ""),
"style": entry.get("style", ""),
"avatar_path": entry.get("avatar_path", FALLBACK_AVATAR),
"data_source": entry.get("data_source", "cache")
}
lines.append(f" {persona!r}: {data},")
lines.append("}\n")
CHARACTER_DATA_FILE.write_text("\n".join(lines))
print(f"✓ {CHARACTER_DATA_FILE}")

def collect_persona(args, cache, persona):
wiki_title = WIKI_TITLES[persona]
print(f"\n📦 {persona}")
entry = cache.get(persona, {})
if entry and not args.force_refresh:
print(" ♻️ cached")
return

wiki_data = search_wikipedia(wiki_title)
if wiki_data:
entry["source_url"] = wiki_data.get("content_urls", {}).get("desktop", {}).get("page", "")
entry["description"] = wiki_data.get("description", "")
entry["extract"] = wiki_data.get("extract", "")
entry["data_source"] = "wikipedia"
print(f" ✓ Wikipedia: {wiki_title}")

# Avatar from Wikipedia
image_url = wiki_data.get("originalimage", {}).get("source") or wiki_data.get("thumbnail", {}).get("source")
if image_url:
filepath = download_image(image_url, AVATARS_DIR / slugify(persona))
if filepath:
entry["avatar_path"] = str(filepath)
print(" ✓ avatar")

# Wikimedia Commons fallback
if "avatar_path" not in entry:
commons_url = search_wikimedia_commons(wiki_title)
if commons_url:
filepath = download_image(commons_url, AVATARS_DIR / slugify(persona))
if filepath:
entry["avatar_path"] = str(filepath)
print(" ✓ Wikimedia")

# Stock photo fallbacks
if "avatar_path" not in entry:
generic = GENERIC_IMAGE_TERMS.get(persona)
if generic:
for api_search in [search_pexils, search_pixabay]:
url = api_search(generic)
if url:
filepath = download_image(url, AVATARS_DIR / slugify(persona))
if filepath:
entry["avatar_path"] = str(filepath)
print(f" ✓ {api_search.__name__}")
break

# Wikiquote quotes/quotes = search_wikiquote(persona)
if quotes:
entry["quotes"] = quotes
entry["catchphrases"] = quotes[:2]
print(f" ✓ {len(quotes)} quotes")

# Default avatar
try:
entry["avatar_path"] = entry.get("avatar_path") or FALLBACK_AVATAR
except:
entry["avatar_path"] = FALLBACK_AVATAR

cache[persona] = entry
time.sleep(0.5)

def main():
parser = argparse.ArgumentParser()
parser.add_argument("--force-refresh", nargs="*", metavar="PERSONA")
parser.add_argument("--avatars-only", action="store_true")
parser.add_argument("--data-only", action="store_true")
args = parser.parse_args()

cache = load_cache()
personas_to_process = PERSONAS

if args.force_refresh is not None:
if len(args.force_refresh) == 0:
print("🔄 Force refreshing ALL personas")
else:
personas_to_process = [p for p in PERSONAS if p in args.force_refresh]

print("\n" + "="*60)
print("COLLECTING PERSONA DATA")
print("="*60)

for persona in personas_to_process:
if persona in cache and not args.force_refresh:
print(f"\n♻️ {persona} (cached)")
continue
collect_persona(args, cache, persona)

save_cache(cache)

if not args.avatars_only:
generate_output_files(cache)

print("\n" + "="*60)
print("COLLECTION COMPLETE")
print("="*60)

if __name__ == "__main__":
main()
