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
import warnings
from pathlib import Path
from typing import Annotated
import datetime

# --- SUPPRESS DEPRECATION WARNINGS ---
warnings.simplefilter("ignore", category=FutureWarning)

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
MODEL_NAME = "gemini-2.5-flash" 
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

# --- 2. MASSIVE GLOBAL VOICE DATABASE (60+ LANGUAGES) ---
VOICE_DB = {
    # --- SPECIAL AFRICAN LANGUAGES (GOOGLE CLOUD) ---
    "Yoruba (Nigeria)": [{"id": "yo-NG-Standard-A", "name": "Bunmi (Native Yoruba)", "engine": "google", "fallback": "en-NG-EzinneNeural"}],
    "Igbo (Nigeria)": [{"id": "ig-NG-Standard-A", "name": "Ngozi (Native Igbo)", "engine": "google", "fallback": "en-NG-AbeoNeural"}],
    "Hausa (Nigeria)": [{"id": "ha-NG-Standard-A", "name": "Danjuma (Native Hausa)", "engine": "google", "fallback": "en-NG-EzinneNeural"}],

    # --- ENGLISH DIALECTS (EDGE TTS) ---
    "English (US)": [{"id": "en-US-GuyNeural", "name": "Guy (Male)", "engine": "edge"}, {"id": "en-US-JennyNeural", "name": "Jenny (Female)", "engine": "edge"}],
    "English (UK)": [{"id": "en-GB-SoniaNeural", "name": "Sonia (Female)", "engine": "edge"}, {"id": "en-GB-RyanNeural", "name": "Ryan (Male)", "engine": "edge"}],
    "English (Nigeria)": [{"id": "en-NG-AbeoNeural", "name": "Abeo (Male)", "engine": "edge"}, {"id": "en-NG-EzinneNeural", "name": "Ezinne (Female)", "engine": "edge"}],
    "English (Australia)": [{"id": "en-AU-NatashaNeural", "name": "Natasha (Female)", "engine": "edge"}, {"id": "en-AU-WilliamNeural", "name": "William (Male)", "engine": "edge"}],
    "English (India)": [{"id": "en-IN-NeerjaNeural", "name": "Neerja (Female)", "engine": "edge"}, {"id": "en-IN-PrabhatNeural", "name": "Prabhat (Male)", "engine": "edge"}],
    "English (Ireland)": [{"id": "en-IE-EmilyNeural", "name": "Emily (Female)", "engine": "edge"}, {"id": "en-IE-ConnorNeural", "name": "Connor (Male)", "engine": "edge"}],
    "English (South Africa)": [{"id": "en-ZA-LeahNeural", "name": "Leah (Female)", "engine": "edge"}, {"id": "en-ZA-LukeNeural", "name": "Luke (Male)", "engine": "edge"}],

    # --- EUROPEAN (EDGE TTS) ---
    "French (France)": [{"id": "fr-FR-VivienneNeural", "name": "Vivienne (Female)", "engine": "edge"}, {"id": "fr-FR-HenriNeural", "name": "Henri (Male)", "engine": "edge"}],
    "French (Canada)": [{"id": "fr-CA-SylvieNeural", "name": "Sylvie (Female)", "engine": "edge"}, {"id": "fr-CA-AntoineNeural", "name": "Antoine (Male)", "engine": "edge"}],
    "Spanish (Spain)": [{"id": "es-ES-ElviraNeural", "name": "Elvira (Female)", "engine": "edge"}, {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Male)", "engine": "edge"}],
    "Spanish (Mexico)": [{"id": "es-MX-DaliaNeural", "name": "Dalia (Female)", "engine": "edge"}, {"id": "es-MX-JorgeNeural", "name": "Jorge (Male)", "engine": "edge"}],
    "German": [{"id": "de-DE-KatjaNeural", "name": "Katja (Female)", "engine": "edge"}, {"id": "de-DE-ConradNeural", "name": "Conrad (Male)", "engine": "edge"}],
    "Italian": [{"id": "it-IT-ElsaNeural", "name": "Elsa (Female)", "engine": "edge"}, {"id": "it-IT-IsabellaNeural", "name": "Isabella (Female)", "engine": "edge"}],
    "Portuguese (Brazil)": [{"id": "pt-BR-FranciscaNeural", "name": "Francisca (Female)", "engine": "edge"}, {"id": "pt-BR-AntonioNeural", "name": "Antonio (Male)", "engine": "edge"}],
    "Portuguese (Portugal)": [{"id": "pt-PT-RaquelNeural", "name": "Raquel (Female)", "engine": "edge"}, {"id": "pt-PT-DuarteNeural", "name": "Duarte (Male)", "engine": "edge"}],
    "Dutch": [{"id": "nl-NL-FennaNeural", "name": "Fenna (Female)", "engine": "edge"}, {"id": "nl-NL-MaartenNeural", "name": "Maarten (Male)", "engine": "edge"}],
    "Russian": [{"id": "ru-RU-SvetlanaNeural", "name": "Svetlana (Female)", "engine": "edge"}, {"id": "ru-RU-DmitryNeural", "name": "Dmitry (Male)", "engine": "edge"}],
    "Ukrainian": [{"id": "uk-UA-PolinaNeural", "name": "Polina (Female)", "engine": "edge"}, {"id": "uk-UA-OstapNeural", "name": "Ostap (Male)", "engine": "edge"}],
    "Polish": [{"id": "pl-PL-ZofiaNeural", "name": "Zofia (Female)", "engine": "edge"}, {"id": "pl-PL-MarekNeural", "name": "Marek (Male)", "engine": "edge"}],
    "Czech": [{"id": "cs-CZ-VlastaNeural", "name": "Vlasta (Female)", "engine": "edge"}, {"id": "cs-CZ-AntoninNeural", "name": "Antonin (Male)", "engine": "edge"}],
    "Greek": [{"id": "el-GR-AthinaNeural", "name": "Athina (Female)", "engine": "edge"}, {"id": "el-GR-NestorasNeural", "name": "Nestoras (Male)", "engine": "edge"}],
    "Swedish": [{"id": "sv-SE-SofieNeural", "name": "Sofie (Female)", "engine": "edge"}, {"id": "sv-SE-MattiasNeural", "name": "Mattias (Male)", "engine": "edge"}],
    "Norwegian": [{"id": "nb-NO-PernilleNeural", "name": "Pernille (Female)", "engine": "edge"}, {"id": "nb-NO-FinnNeural", "name": "Finn (Male)", "engine": "edge"}],
    "Danish": [{"id": "da-DK-ChristelNeural", "name": "Christel (Female)", "engine": "edge"}, {"id": "da-DK-JeppeNeural", "name": "Jeppe (Male)", "engine": "edge"}],
    "Finnish": [{"id": "fi-FI-NooraNeural", "name": "Noora (Female)", "engine": "edge"}, {"id": "fi-FI-HarriNeural", "name": "Harri (Male)", "engine": "edge"}],
    "Hungarian": [{"id": "hu-HU-NoemiNeural", "name": "Noemi (Female)", "engine": "edge"}, {"id": "hu-HU-TamasNeural", "name": "Tamas (Male)", "engine": "edge"}],
    "Romanian": [{"id": "ro-RO-AlinaNeural", "name": "Alina (Female)", "engine": "edge"}, {"id": "ro-RO-EmilNeural", "name": "Emil (Male)", "engine": "edge"}],
    "Slovak": [{"id": "sk-SK-ViktoriaNeural", "name": "Viktoria (Female)", "engine": "edge"}, {"id": "sk-SK-LukasNeural", "name": "Lukas (Male)", "engine": "edge"}],
    "Turkish": [{"id": "tr-TR-EmelNeural", "name": "Emel (Female)", "engine": "edge"}, {"id": "tr-TR-AhmetNeural", "name": "Ahmet (Male)", "engine": "edge"}],

    # --- ASIAN (EDGE TTS) ---
    "Chinese (Mandarin)": [{"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Female)", "engine": "edge"}, {"id": "zh-CN-YunxiNeural", "name": "Yunxi (Male)", "engine": "edge"}],
    "Chinese (Cantonese)": [{"id": "zh-HK-HiuGaaiNeural", "name": "HiuGaai (Female)", "engine": "edge"}, {"id": "zh-HK-WanLungNeural", "name": "WanLung (Male)", "engine": "edge"}],
    "Japanese": [{"id": "ja-JP-NanamiNeural", "name": "Nanami (Female)", "engine": "edge"}, {"id": "ja-JP-KeitaNeural", "name": "Keita (Male)", "engine": "edge"}],
    "Korean": [{"id": "ko-KR-SunHiNeural", "name": "Sun-Hi (Female)", "engine": "edge"}, {"id": "ko-KR-InJoonNeural", "name": "In-Joon (Male)", "engine": "edge"}],
    "Hindi": [{"id": "hi-IN-SwaraNeural", "name": "Swara (Female)", "engine": "edge"}, {"id": "hi-IN-MadhurNeural", "name": "Madhur (Male)", "engine": "edge"}],
    "Bengali": [{"id": "bn-IN-TanishaaNeural", "name": "Tanishaa (Female)", "engine": "edge"}, {"id": "bn-IN-BashkarNeural", "name": "Bashkar (Male)", "engine": "edge"}],
    "Tamil": [{"id": "ta-IN-PallaviNeural", "name": "Pallavi (Female)", "engine": "edge"}, {"id": "ta-IN-ValluvarNeural", "name": "Valluvar (Male)", "engine": "edge"}],
    "Telugu": [{"id": "te-IN-ShrutiNeural", "name": "Shruti (Female)", "engine": "edge"}, {"id": "te-IN-MohanNeural", "name": "Mohan (Male)", "engine": "edge"}],
    "Thai": [{"id": "th-TH-PremwadeeNeural", "name": "Premwadee (Female)", "engine": "edge"}, {"id": "th-TH-NiwatNeural", "name": "Niwat (Male)", "engine": "edge"}],
    "Vietnamese": [{"id": "vi-VN-HoaiMyNeural", "name": "HoaiMy (Female)", "engine": "edge"}, {"id": "vi-VN-NamMinhNeural", "name": "NamMinh (Male)", "engine": "edge"}],
    "Indonesian": [{"id": "id-ID-GadisNeural", "name": "Gadis (Female)", "engine": "edge"}, {"id": "id-ID-ArdiNeural", "name": "Ardi (Male)", "engine": "edge"}],
    "Malay": [{"id": "ms-MY-YasminNeural", "name": "Yasmin (Female)", "engine": "edge"}, {"id": "ms-MY-OsmanNeural", "name": "Osman (Male)", "engine": "edge"}],
    "Filipino": [{"id": "fil-PH-BlessicaNeural", "name": "Blessica (Female)", "engine": "edge"}, {"id": "fil-PH-AngeloNeural", "name": "Angelo (Male)", "engine": "edge"}],

    # --- MIDDLE EAST & AFRICA (EDGE TTS) ---
    "Arabic (Saudi)": [{"id": "ar-SA-ZariyahNeural", "name": "Zariyah (Female)", "engine": "edge"}, {"id": "ar-SA-HamedNeural", "name": "Hamed (Male)", "engine": "edge"}],
    "Arabic (Egypt)": [{"id": "ar-EG-SalmaNeural", "name": "Salma (Female)", "engine": "edge"}, {"id": "ar-EG-ShakirNeural", "name": "Shakir (Male)", "engine": "edge"}],
    "Swahili (Kenya)": [{"id": "sw-KE-ZuriNeural", "name": "Zuri (Female)", "engine": "edge"}, {"id": "sw-KE-RafikiNeural", "name": "Rafiki (Male)", "engine": "edge"}],
    "Swahili (Tanzania)": [{"id": "sw-TZ-RehemaNeural", "name": "Rehema (Female)", "engine": "edge"}, {"id": "sw-TZ-DaudiNeural", "name": "Daudi (Male)", "engine": "edge"}],
    "Zulu": [{"id": "zu-ZA-ThandoNeural", "name": "Thando (Female)", "engine": "edge"}, {"id": "zu-ZA-ThembaNeural", "name": "Themba (Male)", "engine": "edge"}],
    "Afrikaans": [{"id": "af-ZA-AdriNeural", "name": "Adri (Female)", "engine": "edge"}, {"id": "af-ZA-WillemNeural", "name": "Willem (Male)", "engine": "edge"}],
    "Amharic": [{"id": "am-ET-MekdesNeural", "name": "Mekdes (Female)", "engine": "edge"}, {"id": "am-ET-AmehaNeural", "name": "Ameha (Male)", "engine": "edge"}],
    "Somali": [{"id": "so-SO-UbaxNeural", "name": "Ubax (Female)", "engine": "edge"}, {"id": "so-SO-MuuseNeural", "name": "Muuse (Male)", "engine": "edge"}]
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
def read_root():
    return {"status": "Verbatim Engine Online", "Mode": "Global 50+ Languages"}

@app.get("/api/languages")
def get_languages():
    return sorted(list(VOICE_DB.keys()))

@app.get("/api/voices")
def get_voices(language: str):
    return VOICE_DB.get(language, VOICE_DB.get("English (US)"))

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

# --- GOOGLE CLOUD TTS ENGINE ---
async def generate_google_tts(text, voice_id, output_path):
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GEMINI_API_KEY}"
    lang_code = "-".join(voice_id.split("-")[:2])
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": lang_code, "name": voice_id},
        "audioConfig": {"audioEncoding": "MP3"}
    }
    
    try:
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code == 200:
            audio_content = response.json().get("audioContent")
            if audio_content:
                with open(output_path, "wb") as out:
                    out.write(base64.b64decode(audio_content))
                return True
        else:
            print(f"❌ Google TTS Error: {response.text}")
    except Exception as e:
        print(f"❌ Google Connection Error: {e}")
        
    return False

@app.post("/api/generate-audio")
async def generate_audio(
    text: Annotated[str, Form()],
    emotion: Annotated[str, Form()],
    language: Annotated[str, Form()],
    voice_id: Annotated[str, Form()]
):
    try:
        # 1. Translate (Gemini 2.5 Flash)
        translation_prompt = f"Translate the following text into {language}. Return ONLY the translation, no extra text:\n\n{text}"
        translation_response = retry_gemini_call(model, translation_prompt)
        translated_text = translation_response.text.strip()
        tts_ready_text = clean_text_for_tts(translated_text)
        
        output_filename = f"dub_{uuid.uuid4()}.mp3"
        output_path = TEMP_DIR / output_filename
        settings = EMOTION_SETTINGS.get(emotion, EMOTION_SETTINGS["Neutral"])

        # 2. Identify Engine & Fallback
        selected_voice_data = next((v for v in VOICE_DB.get(language, []) if v["id"] == voice_id), None)
        engine = selected_voice_data.get("engine", "edge") if selected_voice_data else "edge"
        fallback_id = selected_voice_data.get("fallback", "en-US-GuyNeural") if selected_voice_data else "en-US-GuyNeural"

        print(f"🎤 Generating: {language} | Engine: {engine} | Voice: {voice_id}")

        # 3. Generate Audio
        success = False
        
        if engine == "google":
            success = await generate_google_tts(tts_ready_text, voice_id, output_path)
            
        if not success:
            if engine == "google": print(f"⚠️ Google Engine failed. Switching to Fallback: {fallback_id}")
            # Edge Fallback (Crash Proof)
            communicate = edge_tts.Communicate(tts_ready_text, fallback_id if engine == "google" else voice_id, rate=settings["rate"], pitch=settings["pitch"])
            await communicate.save(str(output_path))
        
        gc.collect()
        
        return {
            "status": "success", 
            "audio_url": f"/temp/{output_filename}", 
            "translated_text": translated_text,
            "language": language
        }
    except Exception as e:
        print(f"❌ Critical Voice Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Voice generation failed. Please try a different language.")

@app.post("/api/process-text")
async def process_text(request: TextRequest):
    if not request.user_id: raise HTTPException(status_code=400)
    try:
        prompt = f"Analyze:\n{request.text[:50000]}\n\nOutput: 1. Transcript 2. Blog Post 3. Summary."
        response = retry_gemini_call(model, prompt)
        full_text = response.text
        
        transcript = request.text 
        blog_post = full_text.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full_text else ""
        summary = full_text.split("Summary")[1].strip() if "Summary" in full_text else ""

        db.collection('users').document(request.user_id).collection('transcriptions').document().set({
            "filename": f"Note: {datetime.datetime.now().strftime('%m-%d %H:%M')}",
            "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": transcript, "blog_post": blog_post, "summary": summary
        })
        return {"message": "Success", "transcript": transcript, "blog_post": blog_post, "summary": summary}
    except Exception as e:
        print(f"Text Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-media")
async def process_media(file: UploadFile, user_id: Annotated[str, Form()]):
    if not user_id: raise HTTPException(status_code=400)
    unique_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    temp_filepath = TEMP_DIR / unique_filename
    files_to_cleanup = [temp_filepath]

    try:
        with open(temp_filepath, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        path_to_upload = temp_filepath
        upload_mime_type = "audio/mp3" 

        if Path(file.filename).suffix.lower() in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            audio_path = TEMP_DIR / f"{temp_filepath.stem}.mp3"
            print(f"🚀 Turbo Extraction: {file.filename}")
            command = ["ffmpeg", "-i", str(temp_filepath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", "-y", str(audio_path)]
            if subprocess.run(command).returncode == 0:
                path_to_upload = audio_path
                files_to_cleanup.append(audio_path)
            else:
                upload_mime_type = "video/mp4"
        elif Path(file.filename).suffix.lower() == ".wav":
            upload_mime_type = "audio/wav"
        
        media_file = genai.upload_file(path=str(path_to_upload), mime_type=upload_mime_type)
        while media_file.state.name == "PROCESSING": time.sleep(2); media_file = genai.get_file(media_file.name)
        
        resp = retry_gemini_call(model, [media_file, "Provide: 1. Full Transcript 2. Blog Post 3. Summary."])
        full = resp.text
        trans = full.split("Transcript")[1].split("Blog Post")[0].strip() if "Transcript" in full else ""
        clean = clean_transcript(trans)
        blog = full.split("Blog Post")[1].split("Summary")[0].strip() if "Blog Post" in full else ""
        summ = full.split("Summary")[1].strip() if "Summary" in full else ""

        db.collection('users').document(user_id).collection('transcriptions').document().set({
            "filename": file.filename, "upload_time": firestore.SERVER_TIMESTAMP,
            "transcript": clean, "blog_post": blog, "summary": summ
        })
        return {"message": "Success", "transcript": clean, "blog_post": blog, "summary": summ}
    except Exception as e:
        print(f"Media Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in files_to_cleanup: 
            if p.exists(): os.remove(p)
        gc.collect()