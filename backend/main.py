#testing drive health
import os
import shutil
import uuid
from pathlib import Path
from dotenv import load_dotenv

import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Annotated
import edge_tts
from moviepy.editor import VideoFileClip  # NEW: Video Processing Library

# --- 1. SETUP ---

load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, "serviceAccountKey.json")

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        print(f"✅ Successfully loaded key from: {key_path}")
    db = firestore.client()
except Exception as e:
    print(f"❌ Error initializing Firebase: {e}")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file.")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-flash-latest')

# --- 2. VOICE DATABASE ---
VOICE_DB = {
    "English (US)": [
        {"id": "en-US-GuyNeural", "name": "Guy (Male)", "gender": "Male"},
        {"id": "en-US-JennyNeural", "name": "Jenny (Female)", "gender": "Female"},
        {"id": "en-US-AriaNeural", "name": "Aria (Female - Cheerful)", "gender": "Female"},
        {"id": "en-US-ChristopherNeural", "name": "Christopher (Male)", "gender": "Male"}
    ],
    "English (UK)": [
        {"id": "en-GB-SoniaNeural", "name": "Sonia (Female)", "gender": "Female"},
        {"id": "en-GB-RyanNeural", "name": "Ryan (Male)", "gender": "Male"}
    ],
    "English (Nigeria)": [
        {"id": "en-NG-AbeoNeural", "name": "Abeo (Male)", "gender": "Male"},
        {"id": "en-NG-EzinneNeural", "name": "Ezinne (Female)", "gender": "Female"}
    ],
    "French": [
        {"id": "fr-FR-VivienneNeural", "name": "Vivienne (Female)", "gender": "Female"},
        {"id": "fr-FR-HenriNeural", "name": "Henri (Male)", "gender": "Male"}
    ],
    "Spanish (Spain)": [
        {"id": "es-ES-ElviraNeural", "name": "Elvira (Female)", "gender": "Female"},
        {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Male)", "gender": "Male"}
    ],
    "Spanish (Mexico)": [
        {"id": "es-MX-DaliaNeural", "name": "Dalia (Female)", "gender": "Female"},
        {"id": "es-MX-JorgeNeural", "name": "Jorge (Male)", "gender": "Male"}
    ],
    "German": [
        {"id": "de-DE-KatjaNeural", "name": "Katja (Female)", "gender": "Female"},
        {"id": "de-DE-ConradNeural", "name": "Conrad (Male)", "gender": "Male"}
    ],
    "Chinese (Mandarin)": [
        {"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Female)", "gender": "Female"},
        {"id": "zh-CN-YunxiNeural", "name": "Yunxi (Male)", "gender": "Male"}
    ],
    "Japanese": [
        {"id": "ja-JP-NanamiNeural", "name": "Nanami (Female)", "gender": "Female"},
        {"id": "ja-JP-KeitaNeural", "name": "Keita (Male)", "gender": "Male"}
    ],
    "Korean": [
        {"id": "ko-KR-SunHiNeural", "name": "Sun-Hi (Female)", "gender": "Female"},
        {"id": "ko-KR-InJoonNeural", "name": "In-Joon (Male)", "gender": "Male"}
    ],
    "Portuguese (Brazil)": [
        {"id": "pt-BR-FranciscaNeural", "name": "Francisca (Female)", "gender": "Female"},
        {"id": "pt-BR-AntonioNeural", "name": "Antonio (Male)", "gender": "Male"}
    ],
    "Hindi": [
        {"id": "hi-IN-SwaraNeural", "name": "Swara (Female)", "gender": "Female"},
        {"id": "hi-IN-MadhurNeural", "name": "Madhur (Male)", "gender": "Male"}
    ],
}
DEFAULT_VOICE_MAP = {
    "Arabic": "ar-SA-HamedNeural", "Italian": "it-IT-DiegoNeural", "Russian": "ru-RU-DmitryNeural",
}

# --- 3. APP CONFIG ---

app = FastAPI()

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)
app.mount("/temp", StaticFiles(directory="temp"), name="temp")

# --- 4. ENDPOINTS ---

@app.post("/api/process-media")
async def process_media(file: UploadFile, user_id: Annotated[str, Form()]):
    if not user_id: raise HTTPException(status_code=400, detail="User ID is required.")
    
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    temp_filepath = TEMP_DIR / unique_filename
    
    # Track files to cleanup later
    files_to_cleanup = [temp_filepath]

    try:
        # 1. Save the uploaded file locally
        with open(temp_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        path_to_upload = temp_filepath

        # 2. VIDEO OPTIMIZATION LOGIC (The 40x Boost)
        # If it is a video, strip the audio and upload ONLY the audio
        if file_extension in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            print(f"🎥 Video detected: {file.filename}. Extracting audio for optimization...")
            try:
                # Define output mp3 path
                audio_filename = f"{temp_filepath.stem}.mp3"
                audio_path = TEMP_DIR / audio_filename
                
                # Extract audio using MoviePy
                video_clip = VideoFileClip(str(temp_filepath))
                video_clip.audio.write_audiofile(str(audio_path), logger=None) # logger=None to keep terminal clean
                video_clip.close()
                
                # Update path to point to the new lightweight MP3
                path_to_upload = audio_path
                files_to_cleanup.append(audio_path)
                print(f"✅ Audio extracted: {audio_filename} (Ready for fast upload)")
            except Exception as e:
                print(f"⚠️ Audio extraction failed: {e}. Falling back to full video upload.")
                # If extraction fails, we just upload the original video

        # 3. Upload to Gemini
        print(f"🚀 Uploading to Gemini...")
        uploaded_file = genai.upload_file(path=str(path_to_upload))

        print("🧠 Analyzing with Gemini...")
        prompt = """Analyze this media. Provide: 1. Full Transcript. 2. Blog Post (500 words). 3. Summary (150 words). Format with headings: "Transcript", "Blog Post", "Summary"."""
        response = model.generate_content([uploaded_file, prompt])
        genai.delete_file(uploaded_file.name)

        full_text = response.text
        transcript = ""
        blog_post = ""
        summary = ""

        if "Transcript" in full_text: transcript = full_text.split("Transcript")[1].split("Blog Post")[0].strip()
        if "Blog Post" in full_text: blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip()
        if "Summary" in full_text: summary = full_text.split("Summary")[1].strip()

        db.collection('users').document(user_id).collection('transcriptions').document().set({
            "filename": file.filename, "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, "blog_post": blog_post, "summary": summary
        })

        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup all temp files (both video and extracted audio)
        for path in files_to_cleanup:
            if path.exists(): 
                try:
                    os.remove(path)
                except:
                    pass

@app.get("/api/voices")
def get_voices(language: str = Query(..., description="Language name")):
    if language in VOICE_DB: return VOICE_DB[language]
    if language in DEFAULT_VOICE_MAP: return [{"id": DEFAULT_VOICE_MAP[language], "name": "Default Voice", "gender": "Neutral"}]
    return []

@app.get("/api/languages")
def get_languages():
    all_langs = list(set(list(VOICE_DB.keys()) + list(DEFAULT_VOICE_MAP.keys())))
    all_langs.sort()
    return all_langs

@app.post("/api/generate-audio")
async def generate_audio(text: Annotated[str, Form()], emotion: Annotated[str, Form()], language: Annotated[str, Form()], voice_id: Annotated[str, Form()] = None):
    try:
        print(f"Generating: Lang={language}, Voice={voice_id}, Emotion={emotion}")
        final_text = text
        if "English" not in language:
            translation_prompt = f"Translate accurately into {language}. Return only translation:\n\n{text}"
            translation_response = model.generate_content(translation_prompt)
            final_text = translation_response.text

        selected_voice = voice_id
        if not selected_voice:
             if language in VOICE_DB: selected_voice = VOICE_DB[language][0]["id"]
             else: selected_voice = DEFAULT_VOICE_MAP.get(language, "en-US-GuyNeural")

        rate = "+0%"
        pitch = "+0Hz"
        if emotion == "Excited": rate, pitch = "+10%", "+5Hz"
        elif emotion == "Sad": rate, pitch = "-10%", "-5Hz"
        elif emotion == "Whispering": rate = "-5%"
        
        output_filename = f"voice_{uuid.uuid4()}.mp3"
        output_path = TEMP_DIR / output_filename
        communicate = edge_tts.Communicate(final_text, selected_voice, rate=rate, pitch=pitch)
        await communicate.save(output_path)
        
        return {"audio_url": f"http://localhost:8000/temp/{output_filename}", "translated_text": final_text if "English" not in language else None}

    except Exception as e:
        print(f"Voice Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))