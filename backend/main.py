import os
import shutil
import uuid
import re 
import json 
import time 
import gc   
import subprocess 
import glob 
import sys
import requests
import traceback
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

# --- IMPORT YT-DLP ---
import yt_dlp

# --- 1. SETUP & CONFIG ---
load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, "serviceAccountKey.json")

# --- ROBUST FIREBASE INITIALIZATION ---
try:
    if not firebase_admin._apps:
        cred = None
        if os.getenv("FIREBASE_SERVICE_KEY"):
            print("✅ Loading Firebase Key from Environment Variable...")
            key_dict = json.loads(os.getenv("FIREBASE_SERVICE_KEY"))
            cred = credentials.Certificate(key_dict)
        elif os.path.exists(key_path):
            print("✅ Loading Firebase Key from File...")
            cred = credentials.Certificate(key_path)
        else:
            print("⚠️ WARNING: No Firebase Key found. Database saves will fail.")
        
        if cred:
            firebase_admin.initialize_app(cred)
            print(f"✅ Verbatim Database: Active")
            
    db = firestore.client()
except Exception as e:
    print(f"❌ Firebase Error: {e}")

# --- AI ENGINE CONFIG ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = "gemini-flash-latest"
model = genai.GenerativeModel(MODEL_NAME)

# --- HELPERS ---
def clean_transcript(text):
    return re.sub(r'\*\d+:\d+\s*-\s*\d+:\d+\*', '', text).strip()

def clean_text_for_tts(text):
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'\*+', '', text)
    return text.strip()

def retry_gemini_call(model_instance, prompt_input, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return model_instance.generate_content(prompt_input)
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
                continue
            raise e

# --- VOICE DB (Truncated for brevity, functions same as before) ---
VOICE_DB = {
    "English (US)": [{"id": "en-US-GuyNeural", "name": "Guy (Male)"}, {"id": "en-US-JennyNeural", "name": "Jenny (Female)"}],
    "English (UK)": [{"id": "en-GB-RyanNeural", "name": "Ryan (Male)"}, {"id": "en-GB-SoniaNeural", "name": "Sonia (Female)"}],
}
# (Add full list if needed, or keep your existing DB)

# --- APP INIT ---
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

class LinkRequest(BaseModel):
    url: str
    user_id: str

class TextRequest(BaseModel):
    text: str
    user_id: str

# --- ENDPOINTS ---
@app.get("/")
def read_root():
    return {"status": "Verbatim Engine Online"}

@app.get("/api/languages")
def get_languages():
    return list(VOICE_DB.keys())

@app.get("/api/voices")
def get_voices(language: str):
    return VOICE_DB.get(language, VOICE_DB.get("English (US)"))

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    try:
        docs = db.collection('users').document(user_id).collection('transcriptions').order_by("upload_time", direction=firestore.Query.DESCENDING).stream()
        return [{"id": doc.id, **doc.to_dict(), "upload_time": doc.to_dict().get("upload_time", "").isoformat() if doc.to_dict().get("upload_time") else ""} for doc in docs]
    except Exception as e:
        print(f"History Error: {e}")
        return []

@app.delete("/api/history/{user_id}/{doc_id}")
def delete_history_item(user_id: str, doc_id: str):
    try:
        db.collection('users').document(user_id).collection('transcriptions').document(doc_id).delete()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- THE BULLDOZER LINK PROCESSOR ---
@app.post("/api/process-link")
async def process_link(request: LinkRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    unique_id = uuid.uuid4()
    output_filename = f"social_{unique_id}.mp3"
    output_path = TEMP_DIR / output_filename
    
    print(f"🚀 [BULLDOZER] Processing: {request.url}")
    
    success = False
    
    # --- STRATEGY 1: YT-DLP with iOS Client (Low Block Rate) ---
    if not success:
        try:
            print("🔄 Attempt 1: Internal Engine (iOS Spoof)...")
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': str(output_path),
                'quiet': True,
                'extractor_args': {'youtube': {'player_client': ['ios']}},
                'http_headers': {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'},
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([request.url])
            if output_path.exists() and output_path.stat().st_size > 0:
                print("✅ Success: iOS Engine")
                success = True
        except Exception as e:
            print(f"⚠️ Attempt 1 Failed: {e}")

    # --- STRATEGY 2: Cobalt Relay (External Proxy) ---
    if not success:
        print("🔄 Attempt 2: Cobalt Relay Network...")
        nodes = ["https://api.cobalt.tools/api/json", "https://co.wuk.sh/api/json"]
        for node in nodes:
            try:
                headers = {"Accept": "application/json", "Content-Type": "application/json"}
                payload = {"url": request.url, "aFormat": "mp3", "isAudioOnly": True}
                resp = requests.post(node, json=payload, headers=headers, timeout=20)
                data = resp.json()
                if "url" in data:
                    with requests.get(data["url"], stream=True) as r:
                        r.raise_for_status()
                        with open(output_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                    if output_path.exists() and output_path.stat().st_size > 0:
                        print(f"✅ Success: Relay Node ({node})")
                        success = True
                        break
            except Exception as e:
                print(f"⚠️ Relay Node {node} Error: {e}")

    if not success:
        print("❌ CRITICAL: All Strategies Failed.")
        raise HTTPException(status_code=500, detail="Unable to download video. Link may be private or geo-blocked.")

    # --- AI PROCESSING ---
    try:
        print("📤 Uploading to Gemini...")
        media_file = genai.upload_file(path=str(output_path), mime_type="audio/mp3")
        
        while media_file.state.name == "PROCESSING":
            time.sleep(1)
            media_file = genai.get_file(media_file.name)
            
        print("🧠 Analyzing...")
        response = retry_gemini_call(model, [
            media_file,
            "Provide: 1. Full Transcript (No timestamps). 2. Blog Post (500 words). 3. Summary (150 words). Format with headings: 'Transcript', 'Blog Post', 'Summary'."
        ])
        
        full_text = response.text
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        # Cleanup
        if output_path.exists(): os.remove(output_path)
        
        # Save DB
        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": f"Link: {request.url[:30]}...",
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript,
            "blog_post": blog_post,
            "summary": summary
        })

        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}

    except Exception as e:
        print(f"❌ AI/Processing Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/api/process-text")
async def process_text(request: TextRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    try:
        response = retry_gemini_call(model, f"Analyze this text:\n{request.text[:50000]}\n\nProvide: 1. Transcript (Copy input). 2. Blog Post. 3. Summary. Format: 'Transcript', 'Blog Post', 'Summary'.")
        full_text = response.text
        transcript = request.text
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""
        
        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": "Text Note", "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, "blog_post": blog_post, "summary": summary
        })
        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-media")
async def process_media(file: UploadFile, user_id: Annotated[str, Form()]):
    if not user_id: raise HTTPException(status_code=400, detail="User ID required.")
    # (Existing File Upload Logic - kept simple for space, assume it works as it was stable)
    # ... [Insert your existing process_media logic here if you need to modify it, otherwise the previous version is fine]
    # For this snippet, I am focusing on fixing the LINK issue.
    # RE-PASTE your working process_media code here or use the one from the previous step.
    # I will provide a minimal working version below:
    
    unique_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    temp_filepath = TEMP_DIR / unique_filename
    
    try:
        with open(temp_filepath, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        media_file = genai.upload_file(path=str(temp_filepath), mime_type="audio/mp3")
        while media_file.state.name == "PROCESSING": time.sleep(1); media_file = genai.get_file(media_file.name)
        
        response = retry_gemini_call(model, [media_file, "Provide: 1. Transcript 2. Blog Post 3. Summary. Headers: 'Transcript', 'Blog Post', 'Summary'."])
        full_text = response.text
        
        # Simple extraction
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        db.collection('users').document(user_id).collection('transcriptions').document().set({
            "filename": file.filename, "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, "blog_post": blog_post, "summary": summary
        })
        if temp_filepath.exists(): os.remove(temp_filepath)
        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}
    except Exception as e:
        if temp_filepath.exists(): os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-audio")
async def generate_audio(text: Annotated[str, Form()], emotion: Annotated[str, Form()], language: Annotated[str, Form()], voice_id: Annotated[str, Form()]):
    # (Same as before)
    try:
        trans_resp = retry_gemini_call(model, f"Translate to {language}: {text}")
        clean_text = clean_text_for_tts(trans_resp.text)
        out_name = f"dub_{uuid.uuid4()}.mp3"
        await edge_tts.Communicate(clean_text, voice_id).save(str(TEMP_DIR / out_name))
        return {"status": "success", "audio_url": f"/temp/{out_name}", "translated_text": trans_resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))