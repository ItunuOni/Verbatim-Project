import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'; // IMPORT USELOCATION TO CATCH DATA

const Blog = () => {
    const location = useLocation();
    
    // 1. DATA CATCHER: Use data from Dashboard, or show a fallback if empty
    const incomingTitle = location.state?.blogTitle || "VBT Intelligence Hub";
    const incomingContent = location.state?.blogContent || "No blog content detected. Please return to the Dashboard and upload a file to generate a new post.";

    const [blogTitle, setBlogTitle] = useState(incomingTitle);
    const [blogContent, setBlogContent] = useState(incomingContent);
    
    // 2. VERBATIM INTELLIGENCE STATE
    const [languages, setLanguages] = useState([]);
    const [voices, setVoices] = useState([]);
    const [selectedLang, setSelectedLang] = useState("English (US)");
    const [selectedVoice, setSelectedVoice] = useState("");
    const [selectedEmotion, setSelectedEmotion] = useState("Neutral");
    
    // 3. PROCESSING STATUS
    const [isProcessing, setIsProcessing] = useState(false);
    const [translatedText, setTranslatedText] = useState("");
    const [audioUrl, setAudioUrl] = useState("");

    // YOUR VERIFIED RENDER URL
    const API_BASE_URL = "https://verbatim-backend.onrender.com";

    // Load languages on startup
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/languages`)
            .then(res => res.json())
            .then(data => setLanguages(data))
            .catch(err => console.error("Language Fetch Error:", err));
    }, []);

    // Load voices whenever language changes
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/voices?language=${selectedLang}`)
            .then(res => res.json())
            .then(data => {
                setVoices(data);
                if (data.length > 0) setSelectedVoice(data[0].id);
            });
    }, [selectedLang]);

    const handleVerbatimProcess = async () => {
        // Safety check: Don't process if there is no content
        if (!location.state?.blogContent) {
            alert("Nothing to translate! Please process a video in the Dashboard first.");
            return;
        }

        setIsProcessing(true);
        const formData = new FormData();
        formData.append("text", blogContent);
        formData.append("language", selectedLang);
        formData.append("voice_id", selectedVoice);
        formData.append("emotion", selectedEmotion);

        try {
            const response = await fetch(`${API_BASE_URL}/api/generate-audio`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();
            if (data.status === "success") {
                setTranslatedText(data.translated_text);
                setAudioUrl(`${API_BASE_URL}${data.audio_url}`);
            }
        } catch (error) {
            console.error("Verbatim Logic Error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-8">
            <nav className="mb-8">
                <Link to="/dashboard" className="text-[#ff4d00] font-bold hover:underline">← Back to Dashboard</Link>
            </nav>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* DYNAMIC BLOG CONTENT SECTION */}
                <div className="space-y-6">
                    <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700 shadow-2xl">
                        <h1 className="text-4xl font-extrabold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
                            {blogTitle}
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                            {blogContent}
                        </p>
                    </div>
                    
                    {translatedText && (
                        <div className="p-6 bg-[#ff4d00]/5 border-l-4 border-[#ff4d00] rounded-r-xl animate-in fade-in slide-in-from-left-4 duration-500">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#ff4d00] mb-3">Translated Script ({selectedLang})</h3>
                            <p className="text-lg text-white italic leading-relaxed">{translatedText}</p>
                        </div>
                    )}
                </div>

                {/* VERBATIM CONTROL PANEL */}
                <div className="bg-slate-900 p-8 rounded-2xl border border-[#ff4d00]/20 shadow-2xl sticky top-8 h-fit">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-4 h-4 bg-[#ff4d00] rounded-full animate-ping"></div>
                        <h2 className="text-2xl font-bold italic tracking-tighter uppercase">Verbatim Intelligence</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">Target Language</label>
                            <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg outline-none focus:border-[#ff4d00] transition-colors">
                                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">AI Voice Model</label>
                            <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg outline-none focus:border-[#ff4d00] transition-colors">
                                {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-[0.2em]">Voice Emotion</label>
                            <select value={selectedEmotion} onChange={(e) => setSelectedEmotion(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg outline-none focus:border-[#ff4d00] transition-colors">
                                <option value="Neutral">Neutral / Natural</option>
                                <option value="Professional">Professional / News</option>
                                <option value="Excited">Excited / Hype</option>
                                <option value="Happy">Happy / Warm</option>
                                <option value="Whispering">Soft / Whisper</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleVerbatimProcess} 
                            disabled={isProcessing} 
                            className="w-full bg-[#ff4d00] hover:bg-[#e64500] py-4 rounded-xl font-black text-lg shadow-lg shadow-[#ff4d00]/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isProcessing ? "ENGINE ANALYZING..." : "TRANSLATE & DUB CONTENT"}
                        </button>

                        {audioUrl && (
                            <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-slate-700 text-center animate-in zoom-in-95">
                                <p className="text-xs font-bold text-[#ff4d00] mb-4 uppercase tracking-widest">Global Audio Asset Ready:</p>
                                <audio src={audioUrl} controls className="w-full" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Blog;