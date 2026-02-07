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
            print("❌ CRITICAL: No Firebase Key found in File or Environment!")
        
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
            error_str = str(e)
            if "429" in error_str:
                if attempt < retries - 1:
                    print(f"⚠️ Quota Hit (429). Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2 
                    continue
                else:
                    raise e
            else:
                raise e 

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

# --- DATA MODELS ---
class LinkRequest(BaseModel):
    url: str
    user_id: str

class TextRequest(BaseModel):
    text: str
    user_id: str

# --- 4. ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "Verbatim Engine Online", "Global_Reach": "Active"}

@app.get("/api/languages")
def get_languages():
    return list(VOICE_DB.keys())

@app.get("/api/voices")
def get_voices(language: str):
    return VOICE_DB.get(language, VOICE_DB["English (US)"])

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    try:
        docs = db.collection('users').document(user_id).collection('transcriptions').order_by("upload_time", direction=firestore.Query.DESCENDING).stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            if "upload_time" in data and data["upload_time"]:
                data["upload_time"] = data["upload_time"].isoformat()
            history.append({"id": doc.id, **data})
        return history
    except Exception as e:
        print(f"❌ History Fetch Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history/{user_id}/{doc_id}")
def delete_history_item(user_id: str, doc_id: str):
    try:
        doc_ref = db.collection('users').document(user_id).collection('transcriptions').document(doc_id)
        if not doc_ref.get().exists:
             raise HTTPException(status_code=404, detail="Item not found")
        doc_ref.delete()
        return {"status": "deleted", "id": doc_id}
    except Exception as e:
        print(f"❌ Delete Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-audio")
async def generate_audio(
    text: Annotated[str, Form()],
    emotion: Annotated[str, Form()],
    language: Annotated[str, Form()],
    voice_id: Annotated[str, Form()]
):
    try:
        translation_prompt = f"Translate the following text into {language}. Return ONLY the translation, no extra text:\n\n{text}"
        translation_response = retry_gemini_call(model, translation_prompt)
        translated_text = translation_response.text.strip()
        tts_ready_text = clean_text_for_tts(translated_text)
        settings = EMOTION_SETTINGS.get(emotion, EMOTION_SETTINGS["Neutral"])
        
        output_filename = f"dub_{uuid.uuid4()}.mp3"
        output_path = TEMP_DIR / output_filename
        
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
        raise HTTPException(status_code=500, detail=str(e))

# --- THE "SWARM" API-PROXY LINK PROCESSOR ---
@app.post("/api/process-link")
async def process_link(request: LinkRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    output_filename = f"social_{uuid.uuid4()}.mp3"
    output_path = TEMP_DIR / output_filename
    
    print(f"🚀 Processing Social Link via Swarm: {request.url}")

    # --- THE MAGIC: ROTATING NODE LIST ---
    # We use a swarm of Cobalt instances. If one is blocked, we try the next.
    relay_nodes = [
        "https://api.cobalt.tools/api/json",      # Primary (Official)
        "https://cobalt.steamcommunity.com/api/json", # Robust Backup
        "https://co.wuk.sh/api/json",             # Fast Secondary
        "https://api.wcdl.me/api/json"            # Emergency Fallback
    ]
    
    download_success = False
    
    for node in relay_nodes:
        if download_success: break
        try:
            print(f"🔄 Attempting Relay Node: {node}")
            
            headers = {
                "Accept": "application/json", 
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            
            payload = {
                "url": request.url,
                "aFormat": "mp3",
                "isAudioOnly": True,
                "dubLang": False
            }
            
            # 1. Ask Node to process
            response = requests.post(node, json=payload, headers=headers, timeout=20)
            data = response.json()
            
            # 2. Check for URL in response
            if "url" in data:
                stream_url = data["url"]
                print(f"⬇️ Node Success! Downloading stream...")
                
                # 3. Download the actual file
                with requests.get(stream_url, stream=True, timeout=30) as r:
                    r.raise_for_status()
                    with open(output_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                            
                # 4. Verify File
                if output_path.exists() and output_path.stat().st_size > 1000:
                    download_success = True
                    print("✅ File acquired successfully.")
            elif "status" in data and data["status"] == "error":
                print(f"⚠️ Node reported error: {data.get('text')}")
                
        except Exception as e:
            print(f"⚠️ Node Failed ({node}): {e}")
            continue

    if not download_success:
        print("❌ All Swarm Nodes Failed.")
        raise HTTPException(status_code=500, detail="Could not retrieve content. Link might be private, geo-locked, or all proxies are currently busy.")

    try:
        # 5. UPLOAD TO GEMINI
        print("📤 Uploading to AI Engine...")
        media_file = genai.upload_file(path=str(output_path), mime_type="audio/mp3") 
        
        while media_file.state.name == "PROCESSING":
            time.sleep(1)
            media_file = genai.get_file(media_file.name)
            
        # 6. ANALYZE
        print("🧠 Generating Insights...")
        response = retry_gemini_call(model, [
            media_file,
            "Provide: 1. Full Transcript (No timestamps). 2. Blog Post (500 words). 3. Summary (150 words). Format with headings: 'Transcript', 'Blog Post', 'Summary'."
        ])

        full_text = response.text
        transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full_text else ""
        clean_trans = clean_transcript(transcript)
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        # 7. SAVE
        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": f"Link: {request.url[:30]}...",
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": clean_trans, 
            "blog_post": blog_post, 
            "summary": summary
        })
        
        # Cleanup
        if output_path.exists(): os.remove(output_path)

        return {"message": "Success", "transcript": clean_trans, "blog_post": blog_post, "summary": summary, "filename": "Web Link Asset"}

    except Exception as e:
        print(f"❌ AI/Database Error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")

@app.post("/api/process-text")
async def process_text(request: TextRequest):
    if not request.user_id: raise HTTPException(status_code=400, detail="User ID required.")
    
    print("🚀 Processing Raw Text Input...")
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

        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary, "filename": "Text Analysis"}
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

        if file_extension in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            audio_path = TEMP_DIR / f"{temp_filepath.stem}.mp3"
            print(f"🚀 Starting Turbo Extraction for {file.filename}...")
            command = ["ffmpeg", "-i", str(temp_filepath), "-vn", "-acodec", "libmp3lame", "-q:a", "4", "-y", str(audio_path)]
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode != 0:
                print(f"⚠️ FFmpeg failed, falling back to raw upload. Error: {result.stderr}")
                path_to_upload = temp_filepath
                upload_mime_type = "video/mp4" 
            else:
                path_to_upload = audio_path
                files_to_cleanup.append(audio_path)
                upload_mime_type = "audio/mp3"

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
        error_str = str(e)
        print(f"❌ Processing Error: {error_str}")
        if "429" in error_str:
             raise HTTPException(status_code=429, detail="Engine Busy. Retrying... please wait a moment.")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in files_to_cleanup:
            if path.exists(): 
                try: os.remove(path)
                except: pass
        gc.collect()