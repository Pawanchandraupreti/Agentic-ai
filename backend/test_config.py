import os

from dotenv import load_dotenv

load_dotenv()

print("PROVIDER:", os.getenv("PROVIDER"))
print("ENDPOINT:", os.getenv("AZURE_OPENAI_ENDPOINT"))
print("API KEY:", "FOUND" if os.getenv("AZURE_OPENAI_API_KEY") else "MISSING")
print("MODEL:", os.getenv("MODEL"))