import os
import shutil
import uuid
import re 
import json 
import time 
import gc   
import subprocess 
import sys
import requests
import base64
from pathlib import Path
from typing import Annotated
import datetime

# --- IMPORTS ---
from dotenv import load_dotenv
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import edge_tts
from pydantic import BaseModel

# --- AUTO-INSTALL FFMPEG ---
import static_ffmpeg
static_ffmpeg.add_paths()

# --- 1. SETUP & CONFIG ---
load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, "serviceAccountKey.json")

# --- FIREBASE INIT ---
try:
    if not firebase_admin._apps:
        cred = None
        if os.getenv("FIREBASE_SERVICE_KEY"):
            print("✅ Loading Firebase Key from Environment...")
            key_dict = json.loads(os.getenv("FIREBASE_SERVICE_KEY"))
            cred = credentials.Certificate(key_dict)
        elif os.path.exists(key_path):
            print("✅ Loading Firebase Key from File...")
            cred = credentials.Certificate(key_path)
        
        if cred:
            firebase_admin.initialize_app(cred)
            print(f"✅ Verbatim Database: Active")
            
    db = firestore.client()
except Exception as e:
    print(f"❌ Firebase Error: {e}")

# --- AI ENGINE CONFIG ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-flash-latest"
model = genai.GenerativeModel(MODEL_NAME)

# --- HELPERS ---
def clean_transcript(text):
    return re.sub(r'\*\d+:\d+\s*-\s*\d+:\d+\*', '', text).strip()

def clean_text_for_tts(text):
    return re.sub(r'[#*_]+', '', text).strip()

def retry_gemini_call(model_instance, prompt_input, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return model_instance.generate_content(prompt_input)
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep(delay)
                continue
            raise e

# --- 2. HYBRID VOICE DATABASE ---
# EDGE-TTS (Free) for Global Languages
# GOOGLE TTS (Paid/API) for Authentic African Languages
VOICE_DB = {
    # --- AFRICAN LANGUAGES (POWERED BY GOOGLE CLOUD) ---
    "Yoruba (Nigeria)": [{"id": "yo-NG-Standard-A", "name": "Bunmi (Native Yoruba)", "engine": "google"}],
    "Igbo (Nigeria)": [{"id": "ig-NG-Standard-A", "name": "Ngozi (Native Igbo)", "engine": "google"}],
    "Hausa (Nigeria)": [{"id": "ha-NG-Standard-A", "name": "Danjuma (Native Hausa)", "engine": "google"}],
    
    # --- GLOBAL ENGLISH (EDGE TTS) ---
    "English (US)": [{"id": "en-US-GuyNeural", "name": "Guy (Male)", "engine": "edge"}, {"id": "en-US-JennyNeural", "name": "Jenny (Female)", "engine": "edge"}],
    "English (Nigeria)": [{"id": "en-NG-AbeoNeural", "name": "Abeo (Male)", "engine": "edge"}, {"id": "en-NG-EzinneNeural", "name": "Ezinne (Female)", "engine": "edge"}],
    "English (UK)": [{"id": "en-GB-SoniaNeural", "name": "Sonia (Female)", "engine": "edge"}, {"id": "en-GB-RyanNeural", "name": "Ryan (Male)", "engine": "edge"}],
    
    # --- EUROPEAN & ASIAN (EDGE TTS) ---
    "French (France)": [{"id": "fr-FR-VivienneNeural", "name": "Vivienne (Female)", "engine": "edge"}, {"id": "fr-FR-HenriNeural", "name": "Henri (Male)", "engine": "edge"}],
    "Spanish (Spain)": [{"id": "es-ES-ElviraNeural", "name": "Elvira (Female)", "engine": "edge"}, {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Male)", "engine": "edge"}],
    "German": [{"id": "de-DE-KatjaNeural", "name": "Katja (Female)", "engine": "edge"}],
    "Chinese (Mandarin)": [{"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Female)", "engine": "edge"}],
    "Japanese": [{"id": "ja-JP-NanamiNeural", "name": "Nanami (Female)", "engine": "edge"}],
    "Korean": [{"id": "ko-KR-SunHiNeural", "name": "Sun-Hi (Female)", "engine": "edge"}],
    "Russian": [{"id": "ru-RU-SvetlanaNeural", "name": "Svetlana (Female)", "engine": "edge"}],
    "Hindi": [{"id": "hi-IN-SwaraNeural", "name": "Swara (Female)", "engine": "edge"}],
    "Arabic": [{"id": "ar-SA-ZariyahNeural", "name": "Zariyah (Female)", "engine": "edge"}],
    "Swahili": [{"id": "sw-KE-ZuriNeural", "name": "Zuri (Female)", "engine": "edge"}]
}

EMOTION_SETTINGS = {
    "Neutral": {"rate": "+0%", "pitch": "+0Hz"},
    "Excited": {"rate": "+10%", "pitch": "+5Hz"},
    "Sad": {"rate": "-10%", "pitch": "-5Hz"},
    "Professional": {"rate": "-5%", "pitch": "-2Hz"},
    "Fast": {"rate": "+25%", "pitch": "+0Hz"},
    "Slow": {"rate": "-25%", "pitch": "+0Hz"}
}

# --- 3. APP INITIALIZATION ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
    expose_headers=["*"]
)

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)
app.mount("/temp", StaticFiles(directory="temp"), name="temp")

class TextRequest(BaseModel):
    text: str
    user_id: str

# --- 4. ENDPOINTS ---

@app.get("/")
def read_root(): return {"status": "Verbatim Engine Online", "Mode": "Hybrid Neural"}

@app.get("/api/languages")
def get_languages(): return sorted(list(VOICE_DB.keys()))

@app.get("/api/voices")
def get_voices(language: str): return VOICE_DB.get(language, VOICE_DB.get("English (US)"))

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    try:
        docs = db.collection('users').document(user_id).collection('transcriptions').order_by("upload_time", direction=firestore.Query.DESCENDING).stream()
        return [{"id": doc.id, **doc.to_dict(), "upload_time": doc.to_dict().get("upload_time", "").isoformat() if doc.to_dict().get("upload_time") else ""} for doc in docs]
    except Exception as e:
        print(f"❌ History Fetch Error: {e}")
        return []

@app.delete("/api/history/{user_id}/{doc_id}")
def delete_history_item(user_id: str, doc_id: str):
    try:
        db.collection('users').document(user_id).collection('transcriptions').document(doc_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- GOOGLE CLOUD TTS ENGINE (FOR AUTHENTIC AFRICAN VOICES) ---
async def generate_google_tts(text, voice_id, output_path):
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GEMINI_API_KEY}"
    
    # Extract language code from ID (e.g. "yo-NG-Standard-A" -> "yo-NG")
    lang_code = "-".join(voice_id.split("-")[:2])
    
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": lang_code, "name": voice_id},
        "audioConfig": {"audioEncoding": "MP3"}
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        audio_content = response.json().get("audioContent")
        if audio_content:
            with open(output_path, "wb") as out:
                out.write(base64.b64decode(audio_content))
            return True
    
    print(f"❌ Google TTS Failed: {response.text}")
    return False

@app.post("/api/generate-audio")
async def generate_audio(
    text: Annotated[str, Form()],
    emotion: Annotated[str, Form()],
    language: Annotated[str, Form()],
    voice_id: Annotated[str, Form()]
):
    try:
        # 1. Translate
        translation_prompt = f"Translate the following text into {language}. Return ONLY the translation, no extra text:\n\n{text}"
        translation_response = retry_gemini_call(model, translation_prompt)
        translated_text = translation_response.text.strip()
        tts_ready_text = clean_text_for_tts(translated_text)
        
        output_filename = f"dub_{uuid.uuid4()}.mp3"
        output_path = TEMP_DIR / output_filename
        settings = EMOTION_SETTINGS.get(emotion, EMOTION_SETTINGS["Neutral"])

        # 2. DETERMINE ENGINE
        # Check if the selected voice is marked as 'google' or 'edge'
        selected_voice_data = None
        voices = VOICE_DB.get(language, [])
        for v in voices:
            if v["id"] == voice_id:
                selected_voice_data = v
                break
        
        engine = selected_voice_data.get("engine", "edge") if selected_voice_data else "edge"
        
        print(f"🎤 Generating with Engine: {engine.upper()} for {language}")

        # 3. GENERATE
        success = False
        
        if engine == "google":
            success = await generate_google_tts(tts_ready_text, voice_id, output_path)
            
        # Fallback to Edge if Google fails or if engine is Edge
        if not success:
            if engine == "google": print("⚠️ Google Engine failed, falling back to Edge...")
            communicate = edge_tts.Communicate(tts_ready_text, voice_id, rate=settings["rate"], pitch=settings["pitch"])
            await communicate.save(str(output_path))
        
        gc.collect()
        
        return {
            "status": "success", 
            "audio_url": f"/temp/{output_filename}", 
            "translated_text": translated_text,
            "language": language
        }
    except Exception as e:
        print(f"❌ Dubbing Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice Generation Failed: {str(e)}")

@app.post("/api/process-text")
async def process_text(request: TextRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    try:
        prompt = f"""
        Analyze the following text.
        1. Return the text exactly as provided under the heading 'Transcript'.
        2. Write a Viral Blog Post (500 words) based on it under 'Blog Post'.
        3. Write a Strategic Summary (150 words) under 'Summary'.
        
        TEXT INPUT:
        {request.text[:100000]} 
        """
        
        response = retry_gemini_call(model, prompt)
        full_text = response.text
        
        transcript = request.text 
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": f"Text Note: {datetime.datetime.now().strftime('%Y-%m-%d')}",
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, 
            "blog_post": blog_post, 
            "summary": summary
        })

        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}
    except Exception as e:
        print(f"❌ Text Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-media")
async def process_media(file: UploadFile, user_id: Annotated[str, Form()]):
    if not user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    temp_filepath = TEMP_DIR / unique_filename
    files_to_cleanup = [temp_filepath]

    try:
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        path_to_upload = temp_filepath
        upload_mime_type = "audio/mp3" 

        # --- TURBO EXTRACTION ---
        if file_extension in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            audio_path = TEMP_DIR / f"{temp_filepath.stem}.mp3"
            print(f"🚀 Turbo Extraction: {file.filename}...")
            command = [
                "ffmpeg", "-i", str(temp_filepath), 
                "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", 
                "-y", str(audio_path)
            ]
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode == 0:
                path_to_upload = audio_path
                files_to_cleanup.append(audio_path)
            else:
                upload_mime_type = "video/mp4"

        elif file_extension == ".wav":
            upload_mime_type = "audio/wav"
        
        media_file = genai.upload_file(path=str(path_to_upload), mime_type=upload_mime_type)
        
        while media_file.state.name == "PROCESSING":
            time.sleep(2)
            media_file = genai.get_file(media_file.name)
            
        response = retry_gemini_call(model, [
            media_file,
            "Provide: 1. Full Transcript (Do NOT include timestamps, timecodes, or speaker labels). 2. Blog Post (500 words). 3. Summary (150 words). Format with headings: 'Transcript', 'Blog Post', 'Summary'."
        ])

        full_text = response.text
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        clean_trans = clean_transcript(transcript)
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        db.collection('users').document(user_id).collection('transcriptions').document().set({
            "filename": file.filename,
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": clean_trans, 
            "blog_post": blog_post, 
            "summary": summary
        })

        return {"message": "Success", "transcript": clean_trans, "blog_post": blog_post, "summary": summary}

    except Exception as e:
        print(f"❌ Processing Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in files_to_cleanup:
            if path.exists(): 
                try: os.remove(path)
                except: pass
        gc.collect()