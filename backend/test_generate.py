import google.generativeai as genai
from utils.config import settings
import asyncio

async def main():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    try:
        response = await model.generate_content_async("Hello")
        print("Success:", response.text)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
