import random
import tkinter as tk
from tkinter import ttk, StringVar, Scrollbar, Text
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import threading
import torch

# Function to create a scrollable frame for tkinter
from selenium_bots import emotions, Quiplash


class ScrollableFrame(tk.Frame):
    def __init__(self, master, **kwargs):
        tk.Frame.__init__(self, master, **kwargs)

        self.canvas = tk.Canvas(self)
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = tk.Frame(self.canvas)

        self.scrollable_frame.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")


class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Quiplash Bot Controller")

        # Characters
        self.characters = [
            "Deadpool (Marvel Comics)",
            "Doraemon (Anime)",
            "Minions (Despicable Me)",
            "SpongeBob SquarePants (SpongeBob SquarePants)",
            "Pikachu (Pokémon)",
            "Groot (Guardians of the Galaxy)",
            "Stitch (Lilo & Stitch)",
            "Harley Quinn (DC Comics)",
            "Shrek (Shrek)",
            "Genie (Aladdin)",
            "Homer Simpson (The Simpsons)",
            "Jack Sparrow (Pirates of the Caribbean)",
            "Tony Stark/Iron Man (Marvel Cinematic Universe)",
            "Ron Swanson (Parks and Recreation)",
            "Michael Scott (The Office)",
            "Hermione Granger (Harry Potter)",
            "Captain Jack Harkness (Doctor Who)",
            "The Joker (DC Comics)",
            "Rick Sanchez (Rick and Morty)",
            "Austin Powers (Austin Powers franchise)",
            # Add more characters here...
        ]

        self.create_widgets()

    def create_widgets(self):
        frame = ttk.Frame(self.root)
        frame.pack(expand=True, fill="both")

        self.room_code = StringVar()
        room_label = ttk.Label(frame, text="Room Code:")
        room_label.grid(row=0, column=0, padx=5, pady=5, sticky="e")
        room_entry = ttk.Entry(frame, textvariable=self.room_code)
        room_entry.grid(row=0, column=1, padx=5, pady=5, sticky="ew")

        char_label = ttk.Label(frame, text="Select Characters:")
        char_label.grid(row=1, column=0, padx=5, pady=5, sticky="e")
        self.char_listbox = tk.Listbox(frame, selectmode="multiple")
        self.char_listbox.grid(row=1, column=1, padx=5, pady=5, sticky="ew")
        self.char_listbox.insert('end', *self.characters)

        custom_prompt_button = ttk.Button(frame, text="Use Custom Prompt", command=self.use_custom_prompt)
        custom_prompt_button.grid(row=2, column=0, padx=5, pady=5, sticky="w")

        start_button = ttk.Button(frame, text="Start Game", command=self.start_game)
        start_button.grid(row=2, column=1, padx=5, pady=5, sticky="e")

        # Create a scrollable frame for debug messages
        debug_frame = ScrollableFrame(frame)
        debug_frame.grid(row=3, column=0, columnspan=2, padx=5, pady=5, sticky="nsew")

        self.debug_text = Text(debug_frame.scrollable_frame, wrap="word", height=10, width=50)
        self.debug_text.pack(expand=True, fill="both")

        # Create a scrollable frame for console output
        console_frame = ScrollableFrame(frame)
        console_frame.grid(row=4, column=0, columnspan=2, padx=5, pady=5, sticky="nsew")

        self.console_text = Text(console_frame.scrollable_frame, wrap="word", height=20, width=70, bg="#000",
                                 fg="#00FF00")
        self.console_text.pack(expand=True, fill="both")

        # Buttons for custom prompts and debug mode
        debug_mode_button = ttk.Button(frame, text="Debug Mode", command=self.toggle_debug_mode)
        debug_mode_button.grid(row=5, column=0, padx=5, pady=5, sticky="w")

        self.debug_mode = False

        # Create a variable to store the custom prompts
        self.custom_prompts = [
            "An item on every pervert's grocery list: Mayonnaise",
            "Come up with a title for an adult version of any classic video game: The Legend of Zelda's Ass",
            "Come up with the name of a country that doesn't exist: Canada",
            "Fun thing to do if locked in the mall overnight"
        ]
        self.current_prompt_index = 0

    def start_game(self):
        room_code = self.room_code.get()
        selected_chars = [self.char_listbox.get(i) for i in self.char_listbox.curselection()]

        for character in selected_chars:
            game = Quiplash(room_code, character)
            game.login()
            threading.Thread(target=game.start_playing).start()

    def toggle_debug_mode(self):
        self.debug_mode = not self.debug_mode

    def use_custom_prompt(self):
        self.custom_prompt_window = tk.Toplevel(self.root)
        self.custom_prompt_window.title("Custom Prompt")

        char_label = ttk.Label(self.custom_prompt_window, text="Select Character:")
        char_label.grid(row=0, column=0, padx=5, pady=5, sticky="e")

        self.selected_char = StringVar()
        char_combobox = ttk.Combobox(self.custom_prompt_window, textvariable=self.selected_char, values=self.characters)
        char_combobox.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        char_combobox.current(0)

        prompt_label = ttk.Label(self.custom_prompt_window, text="Current Custom Prompt:")
        prompt_label.grid(row=1, column=0, padx=5, pady=5, sticky="e")

        self.custom_prompt_entry = ttk.Entry(self.custom_prompt_window, state='readonly')
        self.custom_prompt_entry.grid(row=1, column=1, padx=5, pady=5, sticky="ew")
        self.update_prompt_entry()

        generate_button = ttk.Button(self.custom_prompt_window, text="Generate Response",
                                     command=self.generate_response)
        generate_button.grid(row=2, column=1, padx=5, pady=5, sticky="e")

        self.response_text = Text(self.custom_prompt_window, wrap="word", height=10, width=50)
        self.response_text.grid(row=3, column=0, columnspan=2, padx=5, pady=5)

    def update_prompt_entry(self):
        # Update the custom prompt entry with the current prompt
        if 0 <= self.current_prompt_index < len(self.custom_prompts):
            self.custom_prompt_entry.configure(state='normal')
            self.custom_prompt_entry.delete(0, tk.END)
            self.custom_prompt_entry.insert(0, self.custom_prompts[self.current_prompt_index])
            self.custom_prompt_entry.configure(state='readonly')

    def remove_substrings_from_response(self, prompt, response):
        # Split the prompt into words
        prompt_words = prompt.split()

        # Remove each word from the response if it exists in the prompt
        for word in prompt_words:
            response = response.replace(word, '')

        # Clean up any extra spaces
        response = ' '.join(response.split())

        return response

    def split_response_sequences(self, response):
        split_sequences = []
        sequence_parts = response.split(':')

        # Iterate over the split sequences and combine them up to the next '|'
        for i, part in enumerate(sequence_parts):
            split_sequences.append(part)
            if '|' in part and i < len(sequence_parts) - 1:
                next_sequence_index = part.index('|')
                remaining_sequence = ':'.join(sequence_parts[i + 1:])
                if '|' in remaining_sequence:
                    next_sequence_index = min(next_sequence_index, remaining_sequence.index('|'))
                split_sequences[-1] += remaining_sequence[:next_sequence_index]
                break

        # Combine all the split sequences
        combined_response = ' '.join(split_sequences)
        return combined_response.strip()

    def generate_response(self):
        character = self.selected_char.get()
        prompt = self.custom_prompts[self.current_prompt_index]
        # emotion = random.choice(emotions)
        #
        # prompt = f"Given Topics: {character} | {prompt}  Related Quote:"
        #
        # tokenizer = GPT2Tokenizer.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator")
        # model = GPT2LMHeadModel.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator")
        #
        # inputs = tokenizer.encode(prompt, return_tensors="pt")
        # outputs = model.generate(inputs, max_length=150, num_return_sequences=1, no_repeat_ngram_size=2)
        # response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        prompt = f"Given Topics: {character} | {prompt} | {emotions} | Quiz | trivia Related Quote:"

        tokenizer = GPT2Tokenizer.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator")
        model = GPT2LMHeadModel.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator").to(device)
        inputs = tokenizer.encode(prompt, return_tensors="pt").to(device)
        # Custom gensen parameters with stochastic initialization
        max_length = random.randint(100, 200)  # Random value between 100 and 200
        num_return_sequences = 1  # Random value between 1 and 5
        no_repeat_ngram_size = random.randint(1, 5)  # Random value between 1 and 5
        temperature = random.uniform(0.5, 1.0)  # Random value between 0.5 and 1.0
        top_k = random.randint(10, 100)  # Random value between 10 and 100
        top_p = random.uniform(0.8, 0.95)  # Random value between 0.8 and 0.95

        gensen_parameters = {
            "max_length": max_length,
            "num_return_sequences": num_return_sequences,
            "no_repeat_ngram_size": no_repeat_ngram_size,
            "temperature": temperature,
            "top_k": top_k,
            "top_p": top_p,
        }

        outputs = model.generate(inputs, **gensen_parameters)
        responses = [tokenizer.decode(output, skip_special_tokens=True) for output in outputs]

        print(f"{character}'s Responses:")
        for i, response in enumerate(responses):
            print(f"{i + 1}. {response}")

        response = random.choice(responses)

        response_clean = response.split("Related Quote:")[1]
        self.response_text.delete(1.0, tk.END)
        self.response_text.insert(tk.END, prompt)

        self.response_text.insert(tk.END, """
          """)

        self.response_text.insert(tk.END, response)
        self.response_text.insert(tk.END, """
        
        
        """)

        self.response_text.insert(tk.END, response_clean)

        # Move to the next custom prompt if available
        self.current_prompt_index += 1
        if self.current_prompt_index >= len(self.custom_prompts):
            self.current_prompt_index = 0
        self.update_prompt_entry()


def main():
    # Call this function to get the path to the cache folder
    root = tk.Tk()
    root.geometry("800x600")
    app = App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
