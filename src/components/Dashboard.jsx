import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { LogOut, Upload, FileAudio, CheckCircle, AlertCircle, Loader2, FileText, AlignLeft, Mic, Globe, Play, Languages, User } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Dashboard = ({ user }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // --- GLOBAL STUDIO STATE ---
  const [voiceEmotion, setVoiceEmotion] = useState("Neutral");
  const [targetLanguage, setTargetLanguage] = useState("English (US)");
  const [sourceType, setSourceType] = useState("Summary");
  
  // Voice Selection State
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(""); 
  
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8000/api/languages")
      .then(res => {
        setAvailableLanguages(res.data);
        fetchVoices("English (US)"); 
      })
      .catch(console.error);
  }, []);

  const fetchVoices = async (language) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/voices?language=${encodeURIComponent(language)}`);
      setAvailableVoices(res.data);
      if (res.data.length > 0) {
        setSelectedVoiceId(res.data[0].id);
      }
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
      setProcessingResults(null);
      setError(null);
      setGeneratedAudio(null);
      setTranslatedText(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setIsLoading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", user.uid);

    try {
      const response = await axios.post("http://localhost:8000/api/process-media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total)),
        }
      );
      setProcessingResults(response.data);
      setSelectedFile(null);
    } catch (err) {
      setError("Failed to process file. Ensure backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!processingResults) return;

    const textToUse = sourceType === "Summary" ? processingResults.summary : processingResults.transcript;
    if (!textToUse) { setError("Selected source text is empty."); return; }

    setIsVoiceLoading(true);
    setGeneratedAudio(null);
    setTranslatedText(null);

    const formData = new FormData();
    formData.append("text", textToUse);
    formData.append("emotion", voiceEmotion);
    formData.append("language", targetLanguage);
    formData.append("voice_id", selectedVoiceId);

    try {
      const response = await axios.post("http://localhost:8000/api/generate-audio", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setGeneratedAudio(response.data.audio_url);
      if (response.data.translated_text) setTranslatedText(response.data.translated_text);
    } catch (err) {
      setError("Failed to generate voice.");
    } finally {
      setIsVoiceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-verbatim-navy text-white p-6">
      {/* Navbar */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12 bg-verbatim-navy/80 backdrop-blur-md sticky top-0 z-50 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Verbatim Logo" className="h-14 w-auto rounded-lg border-2 border-verbatim-orange shadow-md bg-white p-1 object-contain" />
          <span className="text-2xl font-bold tracking-tight hidden sm:block">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-verbatim-light hidden sm:block">Welcome, {user.displayName}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-4 pb-20">
        <div className="glass-card rounded-2xl p-10 text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">New Transcription</h2>
          <p className="text-verbatim-light mb-8">Upload audio or video to generate global assets.</p>
          <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-verbatim-orange/30 hover:border-verbatim-orange bg-verbatim-orange/5 rounded-xl p-12 cursor-pointer transition-all group">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*" className="hidden" />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-verbatim-orange/10 rounded-full text-verbatim-orange group-hover:scale-110 transition-transform">
                {selectedFile ? <FileAudio size={40} /> : <Upload size={40} />}
              </div>
              <p className="text-xl font-medium">{selectedFile ? selectedFile.name : "Click to Upload Media"}</p>
            </div>
          </div>
          {selectedFile && (
            <button onClick={handleUpload} disabled={isLoading} className="mt-6 w-full py-4 bg-verbatim-orange text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-lg">
              {isLoading ? <><Loader2 className="animate-spin" /> Processing...</> : "Start Transcription"}
            </button>
          )}
          {isLoading && <div className="mt-6"><div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-verbatim-orange h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div><p className="text-sm text-verbatim-orange mt-2">{uploadProgress}% Uploaded</p></div>}
          {error && <div className="mt-6 p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg flex items-center gap-3"><AlertCircle size={20} /> {error}</div>}
        </div>

        {processingResults && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="glass-card p-8 rounded-2xl border-l-4 border-l-verbatim-orange">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Mic /> Full Transcript</h3>
              <div className="text-verbatim-light leading-relaxed bg-black/30 p-6 rounded-xl whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono text-sm border border-white/5">
                {processingResults.transcript || "No transcript available."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SUMMARY CARD - UPDATED HEIGHT */}
              <div className="glass-card p-8 rounded-2xl h-full flex flex-col">
                 <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlignLeft /> Summary</h3>
                 <div className="text-verbatim-light leading-relaxed h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-verbatim-orange/20 scrollbar-track-transparent">
                    {processingResults.summary}
                 </div>
              </div>
              
              {/* BLOG POST CARD - UPDATED HEIGHT */}
              <div className="glass-card p-8 rounded-2xl h-full flex flex-col">
                 <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText /> Blog Post</h3>
                 <div className="text-verbatim-light leading-relaxed whitespace-pre-line h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-verbatim-orange/20 scrollbar-track-transparent">
                    {processingResults.blog_post}
                 </div>
              </div>
            </div>

            {/* --- 3. GLOBAL LOCALIZATION STUDIO --- */}
            <div className="glass-card p-8 rounded-2xl border border-verbatim-orange/30 bg-gradient-to-br from-verbatim-navy to-black">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><Globe size={24} /></div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Global Localization Studio</h3>
                    <p className="text-sm text-verbatim-light">Translate & Dub your content into 50+ languages.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {/* 1. Source */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="block text-sm text-gray-400 mb-2">1. Source Material</label>
                  <div className="flex gap-2">
                    <button onClick={() => setSourceType("Summary")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sourceType === "Summary" ? "bg-verbatim-orange" : "bg-black/40"}`}>Summary</button>
                    <button onClick={() => setSourceType("Transcript")} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sourceType === "Transcript" ? "bg-verbatim-orange" : "bg-black/40"}`}>Transcript</button>
                  </div>
                </div>

                {/* 2. Language */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="block text-sm text-gray-400 mb-2">2. Target Language</label>
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                    <Languages size={16} className="text-gray-400" />
                    <select value={targetLanguage} onChange={handleLanguageChange} className="bg-transparent w-full outline-none text-white text-sm">
                      {availableLanguages.map(lang => <option key={lang} value={lang} className="bg-gray-900">{lang}</option>)}
                    </select>
                  </div>
                </div>

                {/* 3. Voice Selection */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="block text-sm text-gray-400 mb-2">3. Voice Model</label>
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                    <User size={16} className="text-gray-400" />
                    <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="bg-transparent w-full outline-none text-white text-sm">
                      {availableVoices.map(voice => (
                        <option key={voice.id} value={voice.id} className="bg-gray-900">{voice.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Emotion */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="block text-sm text-gray-400 mb-2">4. Emotion</label>
                  <select value={voiceEmotion} onChange={(e) => setVoiceEmotion(e.target.value)} className="w-full bg-black/40 rounded-lg px-3 py-2 border border-white/5 outline-none text-white text-sm">
                    <option value="Neutral" className="bg-gray-900">Neutral</option>
                    <option value="Excited" className="bg-gray-900">Excited</option>
                    <option value="Sad" className="bg-gray-900">Sad</option>
                    <option value="Whispering" className="bg-gray-900">Whispering</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                {!generatedAudio ? (
                  <button onClick={handleGenerateVoice} disabled={isVoiceLoading} className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-full transition-all shadow-lg shadow-pink-900/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isVoiceLoading ? <><Loader2 className="animate-spin" /> Translating & Dubbing...</> : <><Play fill="currentColor" /> Generate Global Audio</>}
                  </button>
                ) : (
                  <div className="w-full animate-fade-in bg-black/20 p-6 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-green-400 font-medium flex items-center gap-2"><CheckCircle size={16} /> Audio Ready ({targetLanguage})</p>
                      <button onClick={() => setGeneratedAudio(null)} className="text-xs text-gray-400 hover:text-white underline">Create Another</button>
                    </div>
                    <audio controls src={generatedAudio} className="w-full mb-6" autoPlay />
                    {translatedText && (
                      <div className="text-left">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Translated Script ({targetLanguage}):</p>
                        <div className="bg-black/40 p-4 rounded-lg text-sm text-verbatim-light max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/5">{translatedText}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;