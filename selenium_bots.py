from selenium import webdriver
from selenium.webdriver.common.by import By  # Import the By class for locating elements

from transformers import GPT2LMHeadModel, GPT2Tokenizer
import time
import torch
import random

emotions = ["angry", "happy", "sad"]


class Quiplash:
    def __init__(self, room, name='quipbot'):
        self.room = room
        self.username = name
        self.browser = webdriver.Chrome()
        self.browser.get('http://jackbox.tv')

    def login(self):
        time.sleep(2)
        room_field = self.browser.find_element(By.ID, 'roomcode')  # Use By.ID to locate the element
        room_field.send_keys(self.room)
        username_field = self.browser.find_element(By.ID, 'username')  # Use By.ID to locate the element
        username_field.send_keys(self.username)
        join_button = self.browser.find_element(By.ID, 'button-join')  # Use By.ID to locate the element
        join_button.click()
        time.sleep(2)

        join_button.click()

        time.sleep(2)

        print(f'{self.username} connected to game')

    def generate_text(self, prompt, prompt2):
        # tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        # model = GPT2LMHeadModel.from_pretrained("gpt2")
        #
        # inputs = tokenizer.encode(prompt, return_tensors="pt")
        # outputs = model.generate(inputs, max_length=150, num_return_sequences=1, no_repeat_ngram_size=2)            # Check if a GPU is available, if not, use the CPU
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        prompt = f"Given Topics: {self.username} | {prompt}   Related Quote:"
        if prompt2:
            prompt = f"Given Topics: {self.username} | {prompt} | {emotions} | Quiz | trivia Related Quote:"

        tokenizer = GPT2Tokenizer.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator")
        model = GPT2LMHeadModel.from_pretrained("ml6team/gpt-2-medium-conditional-quote-generator").to(device)
        inputs = tokenizer.encode(prompt, return_tensors="pt").to(device)
        # Custom gensen parameters with stochastic initialization
        max_length = random.randint(50, 100)  # Random value between 100 and 200
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
        filtered_responses = []

        print(f"{self.username}'s Responses:")
        for i, response in enumerate(responses):
            print(f"{i + 1}. {response}")
            print(f"{i + 1}. {response.rsplit('Related Quote:', 1)[1]}")
            if response.rsplit('Related Quote:', 1)[1].isspace() is False and "[" not in response.rsplit('Related Quote:', 1)[1] and '|' not in  response.rsplit('Related Quote:', 1)[1]  :
                filtered_responses.append(response.rsplit('Related Quote:', 1)[1])

        if len(filtered_responses)>0:
            return filtered_responses
        return []

    def start_playing(self):
        while True:
            time.sleep(1)
            try:
                if self.browser.find_element(By.ID, 'quiplash-answer-input'):  # Use By.ID to locate the element
                    prompt = self.browser.find_element(By.ID, 'question-text').text  # Use By.ID to locate the element
                    if prompt:
                        print(f"{self.username} got prompt: {prompt}")
                        emotion = random.choice(emotions)

                        prompt = f"{self.username} is feeling {emotion}. They respond: '{prompt}'"
                        total_responses = []
                        for i in range(1):
                            responses = self.generate_text(prompt,True)
                            total_responses = total_responses + responses
                        for i in range(1):
                            responses = self.generate_text(prompt,False)
                            total_responses = total_responses + responses
                        responses = total_responses
                        print('\n',self.username, responses)
                        if len(responses) >0:
                            response = random.choice(responses)

                            answer_input = self.browser.find_element(By.ID,
                                                                     'quiplash-answer-input')  # Use By.ID to locate the element
                            answer_input.send_keys(response)

                            submit_button = self.browser.find_element(By.ID,
                                                                      'quiplash-submit-answer')  # Use By.ID to locate the element
                            submit_button.click()
            except Exception as e:
                print(e)
            try:
                if self.browser.find_element(By.CLASS_NAME,
                                             'quiplash-vote-button'):  # Use By.CLASS_NAME to locate the element

                    elements = self.browser.find_elements(By.CLASS_NAME,
                                                          'quiplash-vote-button')  # Use By.CLASS_NAME to locate the elements
                    choice = elements[int(len(elements) * random.random())]
                    print(f"{self.username} voting for choice {choice.text}")
                    choice.click()
            except Exception as e:
                # print(e)
                pass

    def end_game(self):
        self.browser.close()
