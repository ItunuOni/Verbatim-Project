import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Globe, Mic, Cpu } from 'lucide-react';

const Blog = () => {
    const location = useLocation();
    
    // --- 1. SMART DATA HANDLER ---
    const rawTitle = location.state?.blogTitle;
    const cleanTitle = (rawTitle && !rawTitle.includes("undefined")) 
        ? rawTitle 
        : "Verbatim Intelligence Hub";

    const incomingContent = location.state?.blogContent || "No blog content detected. Please return to the Dashboard and upload a file to generate a new post.";

    const [blogTitle, setBlogTitle] = useState(cleanTitle);
    const [blogContent, setBlogContent] = useState(incomingContent);
    
    // --- 2. VERBATIM INTELLIGENCE STATE ---
    const [languages, setLanguages] = useState([]);
    const [voices, setVoices] = useState([]);
    const [selectedLang, setSelectedLang] = useState("English (US)");
    const [selectedVoice, setSelectedVoice] = useState("");
    const [selectedEmotion, setSelectedEmotion] = useState("Neutral");
    
    // --- 3. PROCESSING & FEEDBACK STATUS ---
    const [isProcessing, setIsProcessing] = useState(false);
    const [translatedText, setTranslatedText] = useState("");
    const [audioUrl, setAudioUrl] = useState("");
    const [copied, setCopied] = useState(false);

    // YOUR VERIFIED RENDER URL
    const API_BASE_URL = "https://verbatim-backend.onrender.com";

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/languages`)
            .then(res => res.json())
            .then(data => setLanguages(data))
            .catch(err => console.error("Language Fetch Error:", err));
    }, []);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/voices?language=${encodeURIComponent(selectedLang)}`)
            .then(res => res.json())
            .then(data => {
                setVoices(data);
                if (data.length > 0) setSelectedVoice(data[0].id);
            });
    }, [selectedLang]);

    const handleCopy = () => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); 
    };

    const handleVerbatimProcess = async () => {
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

    // --- 4. THE "MARKDOWN" BEAUTIFIER ---
    const formatText = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => {
            if (line.startsWith('### ') || line.startsWith('#### ')) {
                return <h3 key={index} className="text-xl md:text-2xl font-bold text-white mt-6 mb-3">{line.replace(/#+\s/, '')}</h3>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-2xl md:text-3xl font-black text-verbatim-orange mt-8 mb-4">{line.replace('## ', '')}</h2>;
            }
            if (line.trim() === '') {
                return <br key={index} />;
            }
            return <p key={index} className="text-slate-300 mb-3 leading-relaxed text-base md:text-lg">{line}</p>;
        });
    };

    return (
        <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white relative overflow-x-hidden">
            
            {/* --- SUNO-STYLE AURORA BACKGROUND --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Top Left - Orange Glow */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-verbatim-orange/20 rounded-full blur-[120px] animate-blob"></div>
                {/* Top Right - Purple Glow */}
                <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
                {/* Bottom Left - Blue Glow */}
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
            </div>

            {/* --- CONTENT WRAPPER (Z-10) --- */}
            <div className="relative z-10 p-4 md:p-8">
                <nav className="mb-8 max-w-7xl mx-auto">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                        <div className="p-2 bg-white/5 rounded-full group-hover:bg-verbatim-orange group-hover:text-white transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-bold text-sm tracking-wide">BACK TO DASHBOARD</span>
                    </Link>
                </nav>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-md">
                            <div className="absolute top-0 right-0 p-12 bg-verbatim-orange/10 rounded-bl-[100px] -mr-10 -mt-10 blur-3xl pointer-events-none"></div>
                            <h1 className="text-3xl md:text-5xl font-black mb-8 leading-tight">{blogTitle}</h1>
                            <div className="prose prose-invert max-w-none">{formatText(blogContent)}</div>
                        </div>
                        
                        {translatedText && (
                            <div className="bg-gradient-to-r from-gray-900 to-black p-1 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                                 <div className="bg-[#0f172a] p-8 rounded-[22px] border border-white/10 relative">
                                    <div className="absolute top-4 right-4">
                                         <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-verbatim-orange hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">
                                             {copied ? <Check size={14} /> : <Copy size={14} />}
                                             {copied ? "COPIED!" : "COPY TRANSLATION"}
                                         </button>
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-verbatim-orange mb-6 flex items-center gap-2"><Globe size={16}/> Translated Script ({selectedLang})</h3>
                                    <p className="text-lg text-gray-300 italic leading-relaxed font-serif border-l-4 border-verbatim-orange pl-6">"{translatedText}"</p>
                                 </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl sticky top-8">
                            <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                                <div className="p-3 bg-gradient-to-br from-verbatim-orange to-pink-600 rounded-xl shadow-lg shadow-orange-500/20"><Mic className="text-white" size={24} /></div>
                                <div><h2 className="text-xl font-black uppercase tracking-tight">Studio Controls</h2><p className="text-xs text-gray-400 font-medium">Localize & Dub Content</p></div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><Globe size={12} /> Target Language</label>
                                    <div className="relative">
                                        <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-verbatim-orange focus:ring-1 focus:ring-verbatim-orange transition-all appearance-none cursor-pointer text-sm font-medium hover:bg-black/60">
                                            {languages.map(lang => <option key={lang} value={lang} className="bg-gray-900">{lang}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><Mic size={12} /> AI Voice Model</label>
                                    <div className="relative">
                                        <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-verbatim-orange focus:ring-1 focus:ring-verbatim-orange transition-all appearance-none cursor-pointer text-sm font-medium hover:bg-black/60">
                                            {voices.map(v => <option key={v.id} value={v.id} className="bg-gray-900">{v.name}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest"><Cpu size={12} /> Emotion Style</label>
                                    <div className="relative">
                                        <select value={selectedEmotion} onChange={(e) => setSelectedEmotion(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-verbatim-orange focus:ring-1 focus:ring-verbatim-orange transition-all appearance-none cursor-pointer text-sm font-medium hover:bg-black/60">
                                            <option value="Neutral" className="bg-gray-900">Neutral / Natural</option>
                                            <option value="Professional" className="bg-gray-900">Professional / News</option>
                                            <option value="Excited" className="bg-gray-900">Excited / Hype</option>
                                            <option value="Happy" className="bg-gray-900">Happy / Warm</option>
                                            <option value="Whispering" className="bg-gray-900">Soft / Whisper</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                                    </div>
                                </div>

                                <button onClick={handleVerbatimProcess} disabled={isProcessing} className="w-full mt-4 bg-gradient-to-r from-verbatim-orange to-pink-600 hover:from-orange-500 hover:to-pink-500 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isProcessing ? (<>Processing <span className="animate-pulse">...</span></>) : (<>Generate Audio Asset</>)}
                                </button>

                                {audioUrl && (
                                    <div className="mt-8 p-6 bg-black/40 rounded-2xl border border-green-500/30 text-center animate-in zoom-in-95">
                                        <div className="flex items-center justify-center gap-2 mb-4">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Ready for Playback</p>
                                        </div>
                                        <audio src={audioUrl} controls className="w-full h-10 accent-verbatim-orange" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Blog;