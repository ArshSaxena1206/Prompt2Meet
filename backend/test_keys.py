import asyncio
import google.generativeai as genai
import resend
from sqlalchemy.ext.asyncio import create_async_engine
from utils.config import settings
import sys

async def main():
    print("--- Checking API Keys and Connections ---")
    
    # 1. Gemini
    try:
        print("\nChecking Gemini API...")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = await model.generate_content_async("Hello! Reply with 'OK'.")
        print("[OK] Gemini API is working! Response:", response.text.strip())
    except Exception as e:
        print("[X] Gemini API failed:", str(e))
        
    # 2. Database
    try:
        print("\nChecking Neon Postgres Database...")
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.begin() as conn:
            print("[OK] Database connection successful!")
    except Exception as e:
        print("[X] Database connection failed:", str(e))
        
    # 3. Resend
    try:
        print("\nChecking Resend API...")
        resend.api_key = settings.RESEND_API_KEY
        # Just check if we can fetch domains or something to verify auth, 
        # or just try to send a test email to a dummy address (it will fail if key is invalid, 
        # but if it's valid it might succeed or fail due to unverified domain. We'll just catch auth errors).
        # We can try to list domains:
        domains = resend.Domains.list()
        print("[OK] Resend API is authenticated!")
    except Exception as e:
        if "unauthorized" in str(e).lower() or "invalid api key" in str(e).lower():
            print("[X] Resend API failed:", str(e))
        else:
            # Might fail because free tier doesn't support listing domains, but auth is ok
            print("[!] Resend API responded, but encountered an error (key might be valid):", str(e))
            
    print("\n--- Diagnostic Complete ---")

if __name__ == "__main__":
    asyncio.run(main())
