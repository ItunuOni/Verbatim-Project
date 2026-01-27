import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  LogOut, Upload, FileAudio, CheckCircle, AlertCircle, Loader2, 
  FileText, AlignLeft, Mic, Globe, Play, Languages, User as UserIcon, Cpu, 
  XCircle, History, Download, ChevronRight, X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const CLOUD_API_BASE = "https://verbatim-backend.onrender.com";

const Dashboard = ({ user: currentUser }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); 
  const [error, setError] = useState(null);
  const [studioError, setStudioError] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef(null);
  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  // --- STUDIO STATE ---
  const [voiceEmotion, setVoiceEmotion] = useState("Neutral");
  const [targetLanguage, setTargetLanguage] = useState("English (US)");
  const [sourceType, setSourceType] = useState("Summary");
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(""); 
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);

  // 1. Initial Data Fetch & Load FFmpeg
  useEffect(() => {
    // BULLETPROOF CHECK: Only load engine if browser supports High-Performance headers
    const isCompatible = window.crossOriginIsolated || window.SharedArrayBuffer;
    if (isCompatible) {
        loadFfmpeg(); 
    } else {
        console.warn("Turbo Engine skipped: Browser environment does not support SharedArrayBuffer.");
    }
    
    axios.get(`${CLOUD_API_BASE}/api/languages`)
      .then(res => {
        setAvailableLanguages(res.data);
        axios.get(`${CLOUD_API_BASE}/api/voices?language=English (US)`)
             .then(v => {
                 setAvailableVoices(v.data);
                 if(v.data.length > 0) setSelectedVoiceId(v.data[0].id);
             });
      })
      .catch(err => console.error("Cloud Connection Error:", err));

    if (currentUser?.uid) fetchHistory();
  }, [currentUser]);

  const loadFfmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    
    if (!ffmpeg.loaded) {
        try {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setFfmpegLoaded(true);
            console.log("Turbo Engine (FFmpeg) Loaded Successfully");
        } catch (err) {
            // SILENT FAIL: If it fails, we just don't set ffmpegLoaded to true.
            // The app will function normally using standard upload.
            console.error("Turbo Engine failed to initialize (Using Standard Mode):", err);
        }
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${CLOUD_API_BASE}/api/history/${currentUser.uid}`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const fetchVoices = async (language) => {
    try {
      const res = await axios.get(`${CLOUD_API_BASE}/api/voices?language=${encodeURIComponent(language)}`);
      setAvailableVoices(res.data);
      if (res.data.length > 0) setSelectedVoiceId(res.data[0].id);
    } catch (err) {
      console.error("Failed to fetch voices", err);
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setTargetLanguage(lang);
    fetchVoices(lang);
  };

  const handleLogout = async () => { await signOut(auth); };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress(0);
      setError(null);
    }
  };

  const downloadText = (filename, content) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- THE TURBO EXTRACTOR ---
  const transcode = async (file) => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpegLoaded) return file; 

    // SAFETY TRY/CATCH: If transcoding crashes, return original file
    try {
        await ffmpeg.writeFile('input.mp4', await fetchFile(file));
        await ffmpeg.exec(['-i', 'input.mp4', '-q:a', '0', '-map', 'a', 'output.mp3']);
        const data = await ffmpeg.readFile('output.mp3');
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        return new File([audioBlob], "extracted_audio.mp3", { type: 'audio/mp3' });
    } catch (err) {
        console.error("Optimization error (reverting to original):", err);
        return file;
    }
  };

  const handleUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault(); 
    if (!selectedFile || !currentUser) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    setError(null);
    setStatusMessage(""); // CRITICAL: Reset message so "Securing Assets... %" shows
    
    try {
        let fileToUpload = selectedFile;

        // CHECK: Is it a video? If so, try to optimize
        if (selectedFile.type.startsWith('video/')) {
            if (ffmpegLoaded) {
                 setStatusMessage("Turbo Engine: Optimizing Video..."); 
                 fileToUpload = await transcode(selectedFile);
                 
                 // CRITICAL: Clear message immediately after transcode so upload progress shows
                 setStatusMessage(""); 
                 console.log(`Optimized: ${Math.round(selectedFile.size/1024/1024)}MB -> ${Math.round(fileToUpload.size/1024/1024)}MB`);
            }
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("user_id", currentUser.uid);
        formData.append("original_filename", selectedFile.name); 

        const response = await axios({
            method: 'post',
            url: `${CLOUD_API_BASE}/api/process-media`,
            data: formData,
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (p) => {
                const percent = Math.round((p.loaded * 100) / p.total);
                setUploadProgress(percent);
                // Only switch text when fully uploaded
                if(percent === 100) setStatusMessage("AI Engine: Analyzing...");
            },
        });

        setProcessingResults(response.data);
        setSelectedFile(null);
        fetchHistory();

    } catch (err) {
        console.error(err);
        let displayError = "Upload failed. Please try a smaller file.";
        
        if (err.response) {
             if (err.response.status === 429) displayError = "Verbatim Engine Limit. Wait 60s.";
             else if (err.response.data && err.response.data.detail) {
                 // Smart Copyright Handling
                 if (err.response.data.detail.includes("finish_reason")) {
                     displayError = "System Alert: Copyrighted content detected (Movies/TV). Please upload original content.";
                 } else {
                     displayError = err.response.data.detail;
                 }
             }
        } else if (err.message === "Network Error") {
            displayError = "Network Timeout. Connection unstable. Try a smaller file or Audio-only.";
        }
        
        setError(displayError);
    } finally {
        setIsLoading(false);
        setStatusMessage("");
    }
  };

  const handleGenerateVoice = async () => {
    if (!processingResults) return;
    const textToUse = sourceType === "Summary" ? processingResults.summary : processingResults.transcript;
    
    setIsVoiceLoading(true);
    setGeneratedAudio(null);
    setTranslatedText(null);
    setStudioError(null);

    const formData = new FormData();
    formData.append("text", textToUse);
    formData.append("emotion", voiceEmotion);
    formData.append("language", targetLanguage);
    formData.append("voice_id", selectedVoiceId);

    try {
      const response = await axios.post(`${CLOUD_API_BASE}/api/generate-audio`, formData);
      const audioPath = response.data.audio_url;
      setGeneratedAudio(`${CLOUD_API_BASE}${audioPath}`);
      if (response.data.translated_text) setTranslatedText(response.data.translated_text);
    } catch (err) {
      console.error(err);
      setStudioError("Voice generation failed.");
    } finally {
      setIsVoiceLoading(false);
    }
  };

  const loadFromHistory = (item) => {
      setProcessingResults(item);
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const LOGO_PATH = "/logo.png";

  return (
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange overflow-x-hidden">
      
      <nav className="fixed w-full top-0 left-0 z-50 border-b border-white/10 bg-verbatim-navy/95 backdrop-blur-xl transition-all shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-wrap justify-between items-center gap-4">
          
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => window.location.href = '/dashboard'}>
            <div className="relative flex items-center justify-center">
              <img src={LOGO_PATH} alt="Verbatim Logo" className="h-12 w-auto md:h-16 rounded-lg border border-verbatim-orange bg-white p-1 object-contain" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl md:text-2xl font-black tracking-tighter italic">VERBATIM</span>
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-verbatim-orange uppercase">Transcription Pro</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-end">
             {currentUser && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <UserIcon size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-300 max-w-[100px] truncate">{currentUser.email?.split('@')[0]}</span>
                </div>
             )}

            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs font-bold uppercase tracking-wider">
                <History size={16} className="text-verbatim-orange"/> <span className="hidden sm:inline">History</span>
            </button>
            
            {/* TURBO ENGINE BADGE - Only shows when READY (Green). No annoying yellow loading state. */}
            {ffmpegLoaded && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 animate-in fade-in">
                    <div className="w-2 h-2 rounded-full animate-pulse bg-green-500"></div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-300 uppercase tracking-widest">
                        Turbo Engine Ready
                    </span>
                </div>
            )}
            
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-all hover:bg-white/5 rounded-lg">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

        {showHistory && (
            <div className="fixed inset-0 z-[60]">
                <div onClick={() => setShowHistory(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-verbatim-navy border-l border-white/10 z-[70] shadow-2xl p-6 overflow-y-auto">
                    <div className="h-20 md:hidden"></div> 
                    <div className="flex items-center justify-between mb-8 pt-10 md:pt-0">
                        <h3 className="text-2xl font-black flex items-center gap-2"><History className="text-verbatim-orange"/> Project History</h3>
                        <button onClick={() => setShowHistory(false)}><X className="text-gray-400 hover:text-white" /></button>
                    </div>
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-center italic">No history found.</p>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} onClick={() => loadFromHistory(item)} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl cursor-pointer group transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-white group-hover:text-verbatim-orange truncate max-w-[200px]">{item.filename}</span>
                                        <ChevronRight size={16} className="text-gray-500 group-hover:translate-x-1 transition-transform"/>
                                    </div>
                                    <p className="text-xs text-gray-500">{new Date(item.upload_time).toLocaleDateString()} • {new Date(item.upload_time).toLocaleTimeString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12 pt-32 pb-40">
        <div className="glass-card rounded-3xl p-6 md:p-12 text-center mb-12 border border-white/5 shadow-2xl bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-2xl md:text-4xl font-black mb-4">Transform Your Media</h2>
          
            {error && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 text-left mx-auto max-w-2xl">
                <div className="p-3 bg-red-500/20 rounded-full text-red-500"><AlertCircle size={24} /></div>
                <div><h4 className="font-bold text-red-400 uppercase tracking-tighter">System Alert</h4><p className="text-red-200/80 text-sm leading-tight">{error}</p></div>
                <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-white transition-colors"><XCircle size={20}/></button>
              </div>
            )}

          <p className="text-gray-400 mb-10 max-w-xl mx-auto text-base md:text-lg">Upload audio or video. Let Verbatim handle the heavy lifting.</p>
          
          <div onClick={() => fileInputRef.current.click()} className="group relative border-2 border-dashed border-verbatim-orange/20 hover:border-verbatim-orange/50 bg-white/5 rounded-3xl p-10 md:p-20 cursor-pointer transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-verbatim-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*" className="hidden" />
            <div className="flex flex-col items-center gap-6 relative z-10">
              <div className="p-6 md:p-8 bg-verbatim-orange/10 rounded-full text-verbatim-orange group-hover:scale-110 group-hover:bg-verbatim-orange/20 transition-all duration-500 shadow-2xl">
                {selectedFile ? <FileAudio size={48} className="md:w-16 md:h-16" /> : <Upload size={48} className="md:w-16 md:h-16" />}
              </div>
              <p className="text-xl md:text-3xl font-bold tracking-tight break-all">{selectedFile ? selectedFile.name : "Drop media here"}</p>
              <p className="text-xs md:text-sm text-gray-500 uppercase tracking-[0.2em] font-black">MP4 • MOV • MP3 • WAV</p>
            </div>
          </div>

          {selectedFile && !isLoading && (
            <button onClick={(e) => handleUpload(e)} className="mt-10 w-full max-w-md py-4 md:py-5 bg-verbatim-orange text-white font-black text-lg rounded-2xl hover:bg-orange-600 transition-all shadow-2xl uppercase tracking-widest">
              Start Cloud Transcription
            </button>
          )}

          {isLoading && (
            <div className="mt-10 max-w-md mx-auto">
              <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden border border-white/10 p-1">
                <div style={{width: `${uploadProgress}%`}} className="bg-gradient-to-r from-verbatim-orange to-pink-500 h-full rounded-full transition-all duration-300" />
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs md:text-sm font-black text-verbatim-orange uppercase tracking-[0.2em] animate-pulse">
                  {statusMessage || (uploadProgress < 100 ? `Securing Assets... ${uploadProgress}%` : "AI Engine: Generating Insights...")}
                </p>
                <Loader2 className="animate-spin text-verbatim-orange" size={16} />
              </div>
            </div>
          )}
        </div>

        {processingResults && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass-card p-6 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-verbatim-orange/20 rounded-lg"><Mic className="text-verbatim-orange" size={24} /></div>
                    <h3 className="text-xl md:text-2xl font-black">Smart Transcript</h3>
                </div>
                <button onClick={() => downloadText(`${processingResults.filename}_transcript.txt`, processingResults.transcript)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all w-full md:w-auto justify-center"><Download size={16}/> Save TXT</button>
              </div>
              <div className="bg-black/40 p-6 md:p-8 rounded-2xl text-gray-300 leading-relaxed max-h-[400px] overflow-y-auto font-mono text-xs md:text-sm border border-white/5 scrollbar-thin scrollbar-thumb-verbatim-orange break-words whitespace-pre-wrap">
                {processingResults.transcript}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-6 md:p-8 rounded-2xl h-full flex flex-col border border-white/10 bg-white/[0.02]">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><AlignLeft className="text-verbatim-orange" /> Summary</h3>
                    <button onClick={() => downloadText(`${processingResults.filename}_summary.txt`, processingResults.summary)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"><Download size={16}/></button>
                 </div>
                 <div className="text-gray-300 leading-relaxed h-[400px] md:h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-verbatim-orange/30 text-base md:text-lg">
                    {processingResults.summary}
                 </div>
              </div>
              
              <div className="glass-card p-6 md:p-8 rounded-2xl h-full flex flex-col border border-white/10 bg-white/[0.02]">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><FileText className="text-verbatim-orange" /> Blog Post</h3>
                    <button onClick={() => downloadText(`${processingResults.filename}_blog.txt`, processingResults.blog_post)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"><Download size={16}/></button>
                 </div>
                 <div className="text-gray-300 leading-relaxed whitespace-pre-line h-[400px] md:h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-verbatim-orange/30">
                    {processingResults.blog_post || "No blog post generated."}
                 </div>
              </div>
            </div>

            <div className="glass-card p-6 md:p-10 rounded-3xl border border-verbatim-orange/30 bg-gradient-to-br from-verbatim-navy to-black relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Globe size={200} className="text-verbatim-orange" /></div>
              
              <div className="relative z-10">
                <div className="mb-10 border-b border-white/10 pb-6">
                  <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4">
                    <span className="p-3 bg-pink-500/20 rounded-xl text-pink-400 shadow-lg shadow-pink-500/20"><Globe size={24} className="md:w-8 md:h-8" /></span>
                    Global Localization Studio
                  </h3>
                  <p className="text-gray-400 mt-2 md:ml-16 text-sm md:text-lg">Translate, Dub, and Adapt your content for a global audience.</p>
                </div>

                    {studioError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-left">
                        <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                        <p className="text-red-200/90 text-sm font-medium">{studioError}</p>
                        <button onClick={() => setStudioError(null)} className="ml-auto text-red-500 hover:text-white"><XCircle size={18}/></button>
                    </div>
                    )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">1. Source Asset</label>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setSourceType("Summary")} className={`w-full py-3 rounded-xl text-xs font-bold transition-all border ${sourceType === "Summary" ? "bg-verbatim-orange border-verbatim-orange text-white shadow-lg" : "bg-black/40 border-transparent text-gray-400 hover:bg-black/60"}`}>Summary</button>
                      <button onClick={() => setSourceType("Transcript")} className={`w-full py-3 rounded-xl text-xs font-bold transition-all border ${sourceType === "Transcript" ? "bg-verbatim-orange border-verbatim-orange text-white shadow-lg" : "bg-black/40 border-transparent text-gray-400 hover:bg-black/60"}`}>Transcript</button>
                    </div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">2. Target Language</label>
                    <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5 hover:border-verbatim-orange/50 transition-colors h-[50px]">
                      <Languages size={18} className="text-verbatim-orange" />
                      <select value={targetLanguage} onChange={handleLanguageChange} className="bg-transparent w-full outline-none text-white text-sm font-medium cursor-pointer">
                        {availableLanguages.map(lang => <option key={lang} value={lang} className="bg-gray-900">{lang}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">3. Voice Model</label>
                    <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5 hover:border-verbatim-orange/50 transition-colors h-[50px]">
                      <UserIcon size={18} className="text-verbatim-orange" />
                      <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="bg-transparent w-full outline-none text-white text-sm font-medium cursor-pointer">
                        {availableVoices.length > 0 ? (
                            availableVoices.map(voice => <option key={voice.id} value={voice.id} className="bg-gray-900">{voice.name}</option>)
                        ) : (
                            <option>Select Language First...</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                    <label className="block text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">4. AI Emotion</label>
                    <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-3 border border-white/5 hover:border-verbatim-orange/50 transition-colors h-[50px]">
                        <Cpu size={18} className="text-verbatim-orange" />
                        <select value={voiceEmotion} onChange={(e) => setVoiceEmotion(e.target.value)} className="bg-transparent w-full outline-none text-white text-sm font-medium cursor-pointer">
                            <option value="Neutral" className="bg-gray-900">Neutral</option>
                            <option value="Excited" className="bg-gray-900">Excited</option>
                            <option value="Sad" className="bg-gray-900">Sad</option>
                            <option value="Happy" className="bg-gray-900">Happy</option>
                            <option value="Angry" className="bg-gray-900">Angry</option>
                            <option value="Terrified" className="bg-gray-900">Terrified</option>
                            <option value="Whispering" className="bg-gray-900">Whispering</option>
                            <option value="Professional" className="bg-gray-900">Professional</option>
                            <option value="Fast" className="bg-gray-900">Fast Pace</option>
                            <option value="Slow" className="bg-gray-900">Slow Pace</option>
                        </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  {!generatedAudio ? (
                    <button onClick={handleGenerateVoice} disabled={isVoiceLoading || !processingResults} className="w-full md:w-auto px-16 py-5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-pink-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95 text-sm uppercase tracking-widest border border-white/10">
                      {isVoiceLoading ? <><Loader2 className="animate-spin" /> Dubbing & Translating...</> : <><Play fill="currentColor" /> Generate Global Audio</>}
                    </button>
                  ) : (
                    <div className="w-full animate-fade-in bg-black/40 p-6 md:p-8 rounded-2xl border border-green-500/30">
                      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-2">
                        <p className="text-green-400 font-bold flex items-center gap-2 text-lg"><CheckCircle size={24} /> Audio Asset Ready ({targetLanguage})</p>
                        <button onClick={() => setGeneratedAudio(null)} className="text-xs text-gray-400 hover:text-white underline">Generate New Version</button>
                      </div>
                      <audio controls src={generatedAudio} className="w-full mb-8 h-12" autoPlay />
                      
                      {translatedText && (
                        <div className="text-left">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Translated Script ({targetLanguage})</p>
                            <button 
                                onClick={() => downloadText(`translation_${targetLanguage}.txt`, translatedText)} 
                                className="flex items-center gap-1 text-xs font-bold text-verbatim-orange hover:text-white transition-colors"
                            >
                                <Download size={12}/> SAVE TXT
                            </button>
                          </div>
                          <div className="bg-black/20 p-6 rounded-xl text-gray-300 max-h-60 overflow-y-auto whitespace-pre-wrap border border-white/5 font-mono text-sm leading-relaxed">{translatedText}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* REFINED FLOATING ACTION BUTTON - Z-40 to prevent overlap */}
      <Link 
        to="/blog" 
        state={{ 
          blogContent: processingResults?.blog_post, 
          blogTitle: processingResults ? `Insights: ${processingResults.filename}` : "VBT Blog" 
        }}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 bg-verbatim-navy/95 backdrop-blur-xl border border-verbatim-orange/40 p-3 rounded-2xl shadow-2xl hover:border-verbatim-orange hover:bg-verbatim-orange transition-all duration-300 active:scale-95"
      >
        <div className="relative">
            <div className="absolute -inset-1 bg-verbatim-orange rounded-full blur-sm opacity-0 group-hover:opacity-60 transition-opacity"></div>
            <div className="bg-verbatim-orange/20 p-2.5 rounded-xl group-hover:bg-white/20 transition-colors">
                <FileText size={20} className="text-verbatim-orange group-hover:text-white" />
            </div>
        </div>
        <div className="flex flex-col items-start -space-y-1 pr-1">
            <span className="text-[9px] font-black text-verbatim-orange uppercase tracking-[0.2em] group-hover:text-white/80 transition-colors">Intelligence</span>
            <span className="text-sm font-black italic tracking-tighter group-hover:text-white transition-colors">DUB & TRANSLATE BLOG TEXT</span>
        </div>
      </Link>
    </div>
  );
};
export default Dashboard;