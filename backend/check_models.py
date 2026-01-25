import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load your key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: No API Key found. Check your .env file.")
else:
    print(f"✅ Key found starting with: {api_key[:4]}...")
    genai.configure(api_key=api_key)

    try:
        print("\n🔍 Asking Google for available models...")
        found_any = False
        for m in genai.list_models():
            # We only care about models that can generate content
            if 'generateContent' in m.supported_generation_methods:
                print(f"  • {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ No models found. Your API key might need 'Generative AI API' enabled in Google Console.")
            
    except Exception as e:
        print(f"❌ Error connecting to Google: {e}")