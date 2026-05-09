"""
Character Avatar Image Support

This module provides avatar image URLs/paths for characters.
Images will be downloaded to Assets/avatars/ directory.
"""

CHARACTER_AVATARS = {
"Scooby-Doo (Scooby-Doo)": "Assets/avatars/scooby-doo.jpg",
"Rickety Cricket (It's Always Sunny in Philadelphia)": "Assets/avatars/rickety-cricket.jpg",
"Donald Trump (Real Life)": "Assets/avatars/donald-trump.jpg",
"Hillary Clinton (Real Life)": "Assets/avatars/hillary-clinton.jpg",
"Shaquille O'Neal (Real Life)": "Assets/avatars/shaquille-oneal.jpg",
"MrBeast (YouTube)": "Assets/avatars/mrbeast.jpg",
"Deadpool (Marvel Comics)": "Assets/avatars/deadpool.jpg",
"Doraemon (Anime)": "Assets/avatars/doraemon.jpg",
"Minions (Despicable Me)": "Assets/avatars/minions.jpg",
"SpongeBob SquarePants (SpongeBob)": "Assets/avatars/spongebob.jpg",
"Pikachu (Pokémon)": "Assets/avatars/pikachu.jpg",
"Groot (Guardians of the Galaxy)": "Assets/avatars/groot.jpg",
"Stitch (Lilo & Stitch)": "Assets/avatars/stitch.jpg",
"Harley Quinn (DC Comics)": "Assets/avatars/harley-quinn.jpg",
"Shrek (Shrek)": "Assets/avatars/shrek.jpg",
"Genie (Aladdin)": "Assets/avatars/genie.jpg",
"Homer Simpson (The Simpsons)": "Assets/avatars/homer-simpson.jpg",
"Jack Sparrow (Pirates of the Caribbean)": "Assets/avatars/jack-sparrow.jpg",
"Tony Stark (Marvel)": "Assets/avatars/tony-stark.jpg",
"Ron Swanson (Parks and Recreation)": "Assets/avatars/ron-swanson.jpg",
"Michael Scott (The Office)": "Assets/avatars/michael-scott.jpg",
"Hermione Granger (Harry Potter)": "Assets/avatars/hermione-granger.jpg",
"Captain Jack Harkness (Doctor Who)": "Assets/avatars/jack-harkness.jpg",
"The Joker (DC Comics)": "Assets/avatars/the-joker.jpg",
"Rick Sanchez (Rick and Morty)": "Assets/avatars/rick-sanchez.jpg",
"Austin Powers (Austin Powers franchise)": "Assets/avatars/austin-powers.jpg",
}


def get_avatar_url(persona):
return CHARACTER_AVATARS.get(persona, None)


def has_avatar(persona):
return persona in CHARACTER_AVATARS
