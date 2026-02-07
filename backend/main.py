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
import yt_dlp
from pydantic import BaseModel

# --- AUTO-INSTALL FFMPEG ---
import static_ffmpeg
static_ffmpeg.add_paths()

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
    clean_text = re.sub(r'\*\d+:\d+\s*-\s*\d+:\d+\*', '', text)
    clean_text = re.sub(r'\[\d+:\d+\]', '', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    return clean_text

def clean_text_for_tts(text):
    text = re.sub(r'#+\s*', '', text)
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'_+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def retry_gemini_call(model_instance, prompt_input, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return model_instance.generate_content(prompt_input)
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep(delay * (attempt + 1))
                continue
            raise e

def extract_video_id(url):
    """Extracts YouTube Video ID from various URL formats"""
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    return match.group(1) if match else None

# --- 2. GLOBAL VOICE DATABASE ---
VOICE_DB = {
    "English (US)": [{"id": "en-US-GuyNeural", "name": "Guy (Male)"}, {"id": "en-US-JennyNeural", "name": "Jenny (Female)"}],
    "English (Nigeria)": [{"id": "en-NG-AbeoNeural", "name": "Abeo (Male)"}, {"id": "en-NG-EzinneNeural", "name": "Ezinne (Female)"}],
    "English (UK)": [{"id": "en-GB-SoniaNeural", "name": "Sonia (Female)"}, {"id": "en-GB-RyanNeural", "name": "Ryan (Male)"}],
    "French": [{"id": "fr-FR-VivienneNeural", "name": "Vivienne (Female)"}, {"id": "fr-FR-HenriNeural", "name": "Henri (Male)"}],
    "Spanish": [{"id": "es-ES-ElviraNeural", "name": "Elvira (Female)"}, {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Male)"}],
    "German": [{"id": "de-DE-KatjaNeural", "name": "Katja (Female)"}, {"id": "de-DE-ConradNeural", "name": "Conrad (Male)"}],
    "Chinese (Mandarin)": [{"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Female)"}, {"id": "zh-CN-YunxiNeural", "name": "Yunxi (Male)"}],
    "Japanese": [{"id": "ja-JP-NanamiNeural", "name": "Nanami (Female)"}, {"id": "ja-JP-KeitaNeural", "name": "Keita (Male)"}],
    "Korean": [{"id": "ko-KR-SunHiNeural", "name": "Sun-Hi (Female)"}, {"id": "ko-KR-InJoonNeural", "name": "In-Joon (Male)"}],
    "Portuguese (Brazil)": [{"id": "pt-BR-FranciscaNeural", "name": "Francisca (Female)"}, {"id": "pt-BR-AntonioNeural", "name": "Antonio (Male)"}],
    "Russian": [{"id": "ru-RU-SvetlanaNeural", "name": "Svetlana (Female)"}, {"id": "ru-RU-DmitryNeural", "name": "Dmitry (Male)"}],
    "Hindi": [{"id": "hi-IN-SwaraNeural", "name": "Swara (Female)"}, {"id": "hi-IN-MadhurNeural", "name": "Madhur (Male)"}],
    "Arabic": [{"id": "ar-SA-ZariyahNeural", "name": "Zariyah (Female)"}, {"id": "ar-SA-HamedNeural", "name": "Hamed (Male)"}],
    "Italian": [{"id": "it-IT-ElsaNeural", "name": "Elsa (Female)"}, {"id": "it-IT-IsabellaNeural", "name": "Isabella (Female)"}],
    "Dutch": [{"id": "nl-NL-FennaNeural", "name": "Fenna (Female)"}, {"id": "nl-NL-MaartenNeural", "name": "Maarten (Male)"}],
    "Turkish": [{"id": "tr-TR-EmelNeural", "name": "Emel (Female)"}, {"id": "tr-TR-AhmetNeural", "name": "Ahmet (Male)"}],
    "Polish": [{"id": "pl-PL-ZofiaNeural", "name": "Zofia (Female)"}, {"id": "pl-PL-MarekNeural", "name": "Marek (Male)"}],
    "Swedish": [{"id": "sv-SE-SofieNeural", "name": "Sofie (Female)"}, {"id": "sv-SE-MattiasNeural", "name": "Mattias (Male)"}],
    "Indonesian": [{"id": "id-ID-GadisNeural", "name": "Gadis (Female)"}, {"id": "id-ID-ArdiNeural", "name": "Ardi (Male)"}]
}

EMOTION_SETTINGS = {
    "Neutral": {"rate": "+0%", "pitch": "+0Hz"},
    "Excited": {"rate": "+10%", "pitch": "+5Hz"},
    "Sad": {"rate": "-10%", "pitch": "-5Hz"},
    "Happy": {"rate": "+5%", "pitch": "+2Hz"},
    "Angry": {"rate": "+5%", "pitch": "-2Hz"},
    "Terrified": {"rate": "+20%", "pitch": "+10Hz"},
    "Whispering": {"rate": "-5%", "pitch": "-10Hz"},
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

# --- THE "PIPED" PROXY LINK PROCESSOR (ANTI-BLOCK) ---
@app.post("/api/process-link")
async def process_link(request: LinkRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    unique_id = uuid.uuid4()
    output_filename = f"social_{unique_id}.mp3"
    output_path = TEMP_DIR / output_filename
    
    print(f"🚀 [PIPED PROXY] Processing: {request.url}")
    
    success = False
    
    # --- STRATEGY 1: PIPED API (YouTube Only - No Block) ---
    # Piped acts as a middleman. We ask it for the stream URL, it gives us a clean link.
    video_id = extract_video_id(request.url)
    if video_id and not success:
        print(f"🔄 Detected YouTube ID: {video_id}. Attempting Piped Proxy...")
        piped_instances = [
            "https://pipedapi.kavin.rocks",
            "https://api.piped.privacy.com.de",
            "https://pipedapi.tokhmi.xyz"
        ]
        
        for instance in piped_instances:
            try:
                resp = requests.get(f"{instance}/streams/{video_id}", timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    # Find best audio stream
                    audio_streams = data.get("audioStreams", [])
                    if audio_streams:
                        # Get the one with highest bitrate
                        best_audio = max(audio_streams, key=lambda x: x.get("bitrate", 0))
                        stream_url = best_audio["url"]
                        
                        print(f"⬇️ Downloading clean stream from Piped ({instance})...")
                        with requests.get(stream_url, stream=True, timeout=30) as r:
                            r.raise_for_status()
                            with open(output_path, 'wb') as f:
                                for chunk in r.iter_content(chunk_size=8192):
                                    f.write(chunk)
                        
                        if output_path.exists() and output_path.stat().st_size > 1000:
                            success = True
                            print("✅ Success: Piped Proxy")
                            break
            except Exception as e:
                print(f"⚠️ Piped Instance {instance} Failed: {e}")
                continue

    # --- STRATEGY 2: COBALT SWARM (For TikTok/Twitter/FB/Backup) ---
    if not success:
        print("🔄 Attempting Cobalt Relay Swarm...")
        nodes = [
            "https://co.wuk.sh/api/json",
            "https://api.cobalt.tools/api/json", 
            "https://cobalt.steamcommunity.com/api/json"
        ]
        for node in nodes:
            try:
                headers = {"Accept": "application/json", "Content-Type": "application/json"}
                payload = {"url": request.url, "aFormat": "mp3", "isAudioOnly": True}
                resp = requests.post(node, json=payload, headers=headers, timeout=20)
                data = resp.json()
                if "url" in data:
                    print(f"⬇️ Downloading from Cobalt ({node})...")
                    with requests.get(data["url"], stream=True, timeout=30) as r:
                        r.raise_for_status()
                        with open(output_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                    if output_path.exists() and output_path.stat().st_size > 1000:
                        success = True
                        print(f"✅ Success: Cobalt Relay")
                        break
            except Exception as e:
                print(f"⚠️ Cobalt Node {node} Error: {e}")

    # --- STRATEGY 3: YT-DLP (Last Resort - Force IPv4) ---
    if not success:
        print("🔄 Attempting yt-dlp (Last Resort)...")
        try:
            # We run this as a subprocess to ensure clean environment
            # Force IPv4 to bypass common Cloud blocks
            cmd = [
                "yt-dlp",
                "-f", "bestaudio",
                "--force-ipv4",
                "--no-check-certificate",
                "-o", str(output_path),
                request.url
            ]
            subprocess.run(cmd, check=True, timeout=60)
            if output_path.exists() and output_path.stat().st_size > 1000:
                success = True
                print("✅ Success: yt-dlp Local")
        except Exception as e:
            print(f"⚠️ yt-dlp Failed: {e}")

    if not success:
        print("❌ CRITICAL: All Extraction Strategies Failed.")
        raise HTTPException(status_code=500, detail="Unable to retrieve media. The link may be private, geo-blocked, or the proxy network is overloaded.")

    # --- AI PROCESSING ---
    try:
        print("📤 Uploading to Gemini...")
        media_file = genai.upload_file(path=str(output_path), mime_type="audio/mp3")
        
        start = time.time()
        while media_file.state.name == "PROCESSING":
            if time.time() - start > 60: break
            time.sleep(1)
            media_file = genai.get_file(media_file.name)
            
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

        # Cleanup
        if output_path.exists(): os.remove(output_path)
        
        # Save DB
        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": f"Link: {request.url[:30]}...",
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": clean_trans, 
            "blog_post": blog_post, 
            "summary": summary
        })

        return {"message": "Success", "transcript": clean_trans, "blog_post": blog_post, "summary": summary}

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
    
    unique_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    temp_filepath = TEMP_DIR / unique_filename
    
    try:
        with open(temp_filepath, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        media_file = genai.upload_file(path=str(temp_filepath), mime_type="audio/mp3")
        while media_file.state.name == "PROCESSING": time.sleep(1); media_file = genai.get_file(media_file.name)
        
        response = retry_gemini_call(model, [media_file, "Provide: 1. Transcript 2. Blog Post 3. Summary. Headers: 'Transcript', 'Blog Post', 'Summary'."])
        full_text = response.text
        
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        clean_trans = clean_transcript(transcript)
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        db.collection('users').document(user_id).collection('transcriptions').document().set({
            "filename": file.filename, "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": clean_trans, "blog_post": blog_post, "summary": summary
        })
        if temp_filepath.exists(): os.remove(temp_filepath)
        return {"message": "Success", "transcript": clean_trans, "blog_post": blog_post, "summary": summary}
    except Exception as e:
        if temp_filepath.exists(): os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-audio")
async def generate_audio(text: Annotated[str, Form()], emotion: Annotated[str, Form()], language: Annotated[str, Form()], voice_id: Annotated[str, Form()]):
    try:
        trans_resp = retry_gemini_call(model, f"Translate to {language}: {text}")
        clean_text = clean_text_for_tts(trans_resp.text)
        out_name = f"dub_{uuid.uuid4()}.mp3"
        await edge_tts.Communicate(clean_text, voice_id).save(str(TEMP_DIR / out_name))
        return {"status": "success", "audio_url": f"/temp/{out_name}", "translated_text": trans_resp.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))