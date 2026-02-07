import os
import shutil
import uuid
import re 
import json 
import time 
import gc   
import subprocess 
import sys
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
            print(f"✅ Database: Active")
            
    db = firestore.client()
except Exception as e:
    print(f"❌ Firebase Error: {e}")

# --- AI INIT ---
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
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

# --- APP ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)
app.mount("/temp", StaticFiles(directory="temp"), name="temp")

class TextRequest(BaseModel):
    text: str
    user_id: str

# --- ENDPOINTS ---
@app.get("/")
def read_root(): return {"status": "Online"}

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    try:
        docs = db.collection('users').document(user_id).collection('transcriptions').order_by("upload_time", direction=firestore.Query.DESCENDING).stream()
        return [{"id": doc.id, **doc.to_dict(), "upload_time": doc.to_dict().get("upload_time", "").isoformat() if doc.to_dict().get("upload_time") else ""} for doc in docs]
    except: return []

@app.delete("/api/history/{user_id}/{doc_id}")
def delete_history(user_id: str, doc_id: str):
    db.collection('users').document(user_id).collection('transcriptions').document(doc_id).delete()
    return {"status": "deleted"}

@app.get("/api/languages")
def get_languages(): return ["English (US)", "English (UK)", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic"]

@app.get("/api/voices")
def get_voices(language: str): return [{"id": "en-US-GuyNeural", "name": "Guy"}, {"id": "en-US-JennyNeural", "name": "Jenny"}]

@app.post("/api/generate-audio")
async def generate_audio(text: Annotated[str, Form()], emotion: Annotated[str, Form()], language: Annotated[str, Form()], voice_id: Annotated[str, Form()]):
    try:
        resp = retry_gemini_call(model, f"Translate to {language}: {text}")
        clean = clean_text_for_tts(resp.text)
        name = f"dub_{uuid.uuid4()}.mp3"
        await edge_tts.Communicate(clean, voice_id).save(str(TEMP_DIR / name))
        return {"status": "success", "audio_url": f"/temp/{name}", "translated_text": resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-text")
async def process_text(request: TextRequest):
    if not request.user_id: raise HTTPException(status_code=400)
    try:
        resp = retry_gemini_call(model, f"Analyze:\n{request.text[:30000]}\n\nOutput: 1. Transcript 2. Blog Post 3. Summary.")
        full = resp.text
        transcript = request.text
        blog = full.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full else ""
        summary = full.split("Summary")[1].strip() if "Summary" in full else ""
        
        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": "Text Note", "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, "blog_post": blog, "summary": summary
        })
        return {"message": "Success", "transcript": transcript, "blog_post": blog, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- OPTIMIZED MEDIA PROCESSOR (TURBO MODE) ---
@app.post("/api/process-media")
async def process_media(file: UploadFile, user_id: Annotated[str, Form()]):
    if not user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    temp_filepath = TEMP_DIR / unique_filename
    files_to_cleanup = [temp_filepath]

    try:
        # 1. Save Upload
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        path_to_upload = temp_filepath
        upload_mime_type = "audio/mp3" 

        # 2. TURBO EXTRACTION (For Video Files)
        if file_extension in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            audio_path = TEMP_DIR / f"{temp_filepath.stem}.mp3"
            print(f"🚀 Turbo Extraction: {file.filename}...")
            
            # OPTIMIZATION: Extract MONO audio at 16kHz (Smallest possible size for AI)
            command = [
                "ffmpeg", "-i", str(temp_filepath), 
                "-vn",              # No Video
                "-ac", "1",         # Mono Channel (Faster)
                "-ar", "16000",     # 16kHz Sample Rate (Speech Optimized)
                "-b:a", "32k",      # 32k Bitrate (Tiny File Size)
                "-y", str(audio_path)
            ]
            
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode == 0:
                print("✅ Extraction Complete.")
                path_to_upload = audio_path
                files_to_cleanup.append(audio_path)
            else:
                print(f"⚠️ FFmpeg failed: {result.stderr}, falling back to raw.")
                upload_mime_type = "video/mp4"

        elif file_extension == ".wav":
            upload_mime_type = "audio/wav"
        
        # 3. Upload to Gemini
        print("📤 Uploading to AI...")
        media_file = genai.upload_file(path=str(path_to_upload), mime_type=upload_mime_type)
        
        # 4. Wait for AI Processing
        while media_file.state.name == "PROCESSING":
            time.sleep(2)
            media_file = genai.get_file(media_file.name)
            
        # 5. Generate Content
        print("🧠 Analyzing...")
        response = retry_gemini_call(model, [
            media_file,
            "Provide: 1. Full Transcript (No timestamps). 2. Blog Post (500 words). 3. Summary (150 words). Format with headings: 'Transcript', 'Blog Post', 'Summary'."
        ])

        full_text = response.text
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        clean_trans = clean_transcript(transcript)
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        # 6. Save Data
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