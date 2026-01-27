import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LogOut, Upload, FileAudio, CheckCircle, AlertCircle, Loader2, 
  FileText, AlignLeft, Mic, Globe, Play, Languages, User as LucideUserIcon, Cpu, 
  XCircle, History, Download, ChevronRight, X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

// --- CLOUD CONFIG ---
const CLOUD_API_BASE = "https://verbatim-backend.onrender.com";

const Dashboard = (props) => {
  // Use a completely unique variable name to avoid minification clashes
  const vbtActiveUser = props.user;

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studioError, setStudioError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef(null);

  const [voiceEmotion, setVoiceEmotion] = useState("Neutral");
  const [targetLanguage, setTargetLanguage] = useState("English (US)");
  const [sourceType, setSourceType] = useState("Summary");
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState(""); 
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);

  useEffect(() => {
    axios.get(`${CLOUD_API_BASE}/api/languages`)
      .then(res => {
        setAvailableLanguages(res.data);
        fetchVoices("English (US)"); 
      })
      .catch(err => console.error("API Connection Offline"));

    if (vbtActiveUser?.uid) {
        fetchHistory();
    }
  }, [vbtActiveUser]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${CLOUD_API_BASE}/api/history/${vbtActiveUser.uid}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error("History hidden");
    }
  };

  const fetchVoices = async (language) => {
    try {
      const res = await axios.get(`${CLOUD_API_BASE}/api/voices?language=${encodeURIComponent(language)}`);
      setAvailableVoices(res.data);
      if (res.data.length > 0) setSelectedVoiceId(res.data[0].id);
    } catch (err) {}
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
    element.href = URL.createObjectURL(new Blob([content], {type: 'text/plain'}));
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault(); 
    if (!selectedFile || !vbtActiveUser) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", vbtActiveUser.uid);

    try {
      const response = await axios.post(`${CLOUD_API_BASE}/api/process-media`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
        }
      );
      setProcessingResults(response.data);
      setSelectedFile(null);
      fetchHistory();
    } catch (err) {
      let displayError = err.response?.data?.detail || err.message;
      if (err.response?.status === 429) displayError = "Engine Busy. Wait 60s.";
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!processingResults) return;
    setIsVoiceLoading(true);
    setGeneratedAudio(null);
    setTranslatedText(null);
    setStudioError(null);

    const formData = new FormData();
    formData.append("text", sourceType === "Summary" ? processingResults.summary : processingResults.transcript);
    formData.append("emotion", voiceEmotion);
    formData.append("language", targetLanguage);
    formData.append("voice_id", selectedVoiceId);

    try {
      const response = await axios.post(`${CLOUD_API_BASE}/api/generate-audio`, formData);
      setGeneratedAudio(`${CLOUD_API_BASE}${response.data.audio_url}`);
      if (response.data.translated_text) setTranslatedText(response.data.translated_text);
    } catch (err) {
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

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      <nav className="fixed w-full top-0 left-0 z-50 border-b border-white/10 bg-[#020617]/95 backdrop-blur-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.href = '/dashboard'}>
            <img src="/logo.png" alt="Verbatim Logo" className="h-10 w-auto rounded-lg border border-[#ff4d00] bg-white p-1" />
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black italic tracking-tighter">VERBATIM</span>
              <span className="text-[9px] font-bold text-[#ff4d00] uppercase">Transcription Pro</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {vbtActiveUser && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <LucideUserIcon size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-300 max-w-[100px] truncate">{vbtActiveUser.email?.split('@')[0]}</span>
                </div>
             )}

            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-wider">
                <History size={16} className="text-[#ff4d00]"/> History
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Online</span>
            </div>
            
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 transition-all">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {showHistory && (
        <div className="fixed inset-0 z-[60]">
             <div onClick={() => setShowHistory(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-[#020617] border-l border-white/10 z-[70] shadow-2xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 pt-10 md:pt-0">
                    <h3 className="text-2xl font-black flex items-center gap-2">Project History</h3>
                    <button onClick={() => setShowHistory(false)}><X size={24} /></button>
                </div>
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <p className="text-gray-500 text-center italic text-sm">No project history found.</p>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} onClick={() => loadFromHistory(item)} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl cursor-pointer transition-all">
                                <span className="text-sm font-bold text-white block truncate mb-1">{item.filename}</span>
                                <p className="text-[10px] text-gray-500 uppercase">{new Date(item.upload_time).toLocaleDateString()}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-12 pt-32 pb-40">
        <div className="bg-white/[0.02] rounded-3xl p-8 md:p-12 text-center mb-12 border border-white/5 shadow-2xl">
          <h2 className="text-2xl md:text-4xl font-black mb-4">Transform Your Media</h2>
          
            {error && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-4 text-left mx-auto max-w-2xl">
                <AlertCircle size={24} className="text-red-500" />
                <div><h4 className="font-bold text-red-400 uppercase text-xs">System Alert</h4><p className="text-red-200/80 text-sm">{error}</p></div>
              </div>
            )}

          <p className="text-gray-400 mb-10 max-w-xl mx-auto text-base">High-speed transcription and localization powered by Verbatim Turbo.</p>
          
          <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-[#ff4d00]/20 hover:border-[#ff4d00]/50 bg-white/5 rounded-3xl p-10 md:p-20 cursor-pointer transition-all overflow-hidden group">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*" className="hidden" />
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-[#ff4d00]/10 rounded-full text-[#ff4d00] group-hover:scale-110 transition-transform">
                <Upload size={48} />
              </div>
              <p className="text-xl md:text-3xl font-bold tracking-tight">{selectedFile ? selectedFile.name : "Drop media here"}</p>
              <p className="text-xs text-gray-500 uppercase font-black tracking-widest">MP4 • MKV • MP3 • WAV</p>
            </div>
          </div>

          {selectedFile && !isLoading && (
            <button onClick={handleUpload} className="mt-10 w-full max-w-md py-5 bg-[#ff4d00] text-white font-black text-lg rounded-2xl shadow-xl uppercase tracking-widest">
              Start Cloud Transcription
            </button>
          )}

          {isLoading && (
            <div className="mt-10 max-w-md mx-auto">
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
                <div style={{width: `${uploadProgress}%`}} className="bg-gradient-to-r from-[#ff4d00] to-pink-500 h-full transition-all duration-300" />
              </div>
              <p className="text-xs font-black text-[#ff4d00] mt-4 uppercase tracking-widest animate-pulse text-center">Processing... {uploadProgress}%</p>
            </div>
          )}
        </div>

        {processingResults && (
          <div className="space-y-8">
            <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <h3 className="text-xl md:text-2xl font-black flex items-center gap-3"><Mic className="text-[#ff4d00]" size={24} /> Smart Transcript</h3>
                <button onClick={() => downloadText('transcript.txt', processingResults.transcript)} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-xs font-bold uppercase transition-all hover:bg-white/20">Save TXT</button>
              </div>
              <div className="bg-black/40 p-6 md:p-8 rounded-2xl text-gray-300 leading-relaxed max-h-[400px] overflow-y-auto font-mono text-sm border border-white/5 whitespace-pre-wrap">
                {processingResults.transcript}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/[0.03] p-8 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><AlignLeft className="text-[#ff4d00]" /> Summary</h3>
                    <div className="text-gray-300 text-sm leading-relaxed">{processingResults.summary}</div>
              </div>
              <div className="bg-white/[0.03] p-8 rounded-2xl border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="text-[#ff4d00]" /> Blog Post</h3>
                    <div className="text-gray-300 text-sm leading-relaxed">{processingResults.blog_post}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#020617] to-black p-8 md:p-12 rounded-3xl border border-[#ff4d00]/30 shadow-2xl">
              <div className="mb-10 border-b border-white/10 pb-6">
                <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4">
                  <span className="p-3 bg-pink-500/20 rounded-xl text-pink-400"><Globe size={24} /></span>
                  Localization Studio
                </h3>
              </div>

                {studioError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{studioError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Target Language</label>
                    <select value={targetLanguage} onChange={handleLanguageChange} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#ff4d00] transition-all cursor-pointer text-sm">
                        {availableLanguages.map(lang => <option key={lang} value={lang} className="bg-gray-900">{lang}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Voice Model</label>
                    <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#ff4d00] transition-all cursor-pointer text-sm">
                        {availableVoices.map(v => <option key={v.id} value={v.id} className="bg-gray-900">{v.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">AI Emotion</label>
                    <select value={voiceEmotion} onChange={(e) => setVoiceEmotion(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#ff4d00] transition-all cursor-pointer text-sm">
                        <option value="Neutral" className="bg-gray-900">Neutral</option>
                        <option value="Professional" className="bg-gray-900">Professional</option>
                        <option value="Excited" className="bg-gray-900">Excited</option>
                        <option value="Happy" className="bg-gray-900">Happy</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerateVoice} disabled={isVoiceLoading} className="w-full py-5 bg-gradient-to-r from-[#ff4d00] to-pink-600 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50">
                  {isVoiceLoading ? <span className="animate-pulse">DUBBING ASSETS...</span> : "GENERATE GLOBAL AUDIO"}
                </button>

                {generatedAudio && (
                    <div className="mt-8 p-8 bg-black/40 rounded-2xl border border-green-500/30 text-center">
                        <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-6">Asset Ready for Distribution</p>
                        <audio src={generatedAudio} controls className="w-full mb-6" />
                        {translatedText && (
                            <div className="text-left border-t border-white/10 pt-6">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Localized Script:</p>
                                <p className="text-base text-gray-300 italic leading-relaxed">"{translatedText}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        )}
      </main>

      <Link 
        to="/blog" 
        state={{ blogContent: processingResults?.blog_post, blogTitle: "Intelligence Insights" }}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-[#ff4d00] p-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95"
      >
        <FileText size={20} /> DUB & TRANSLATE BLOG
      </Link>
    </div>
  );
};

export default Dashboard;