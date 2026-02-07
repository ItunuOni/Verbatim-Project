import React from 'react';
import { 
  ArrowRight, Mic, Globe, Zap, Volume2, Layers, Radio, Lock, 
  Link as LinkIcon, Activity, FileText, Shield, Cpu, CheckCircle 
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const LandingPage = () => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Failed:", err);
    }
  };

  const LOGO_PATH = "/logo.png";

  const GoogleLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  // --- FULL 6-CARD FEATURE GRID ---
  const features = [
    {
      icon: <Mic size={32} />,
      color: "text-verbatim-orange",
      bg: "bg-verbatim-orange/10",
      title: "Precision Transcription",
      desc: "Convert speech to text with 99% accuracy. Captures nuances, accents, and technical jargon seamlessly."
    },
    {
      icon: <Globe size={32} />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      title: "Global Localization",
      desc: "Translate and dub content into 50+ languages. Reach new markets with native-level AI voiceovers."
    },
    {
      icon: <Layers size={32} />,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      title: "Multi-Format Engine",
      desc: "One upload, infinite assets. Automatically generate Blog Posts and Summaries from a single file."
    },
    {
      icon: <Cpu size={32} />,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      title: "Smart Summarization",
      desc: "Turn hour-long meetings into 5-minute executive briefs. AI identifies key action items instantly."
    },
    {
      icon: <Volume2 size={32} />,
      color: "text-green-400",
      bg: "bg-green-500/10",
      title: "Audio Extraction",
      desc: "Upload video files (MP4, MOV) and let our engine strip the audio at 40x speed for fast processing."
    },
    {
      icon: <Shield size={32} />,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      title: "Enterprise Security",
      desc: "Data is encrypted and processed in a secure cloud environment. We prioritize privacy and asset protection."
    }
  ];

  return (
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white overflow-x-hidden w-full relative perspective-1000">
      
      {/* --- 3D ATMOSPHERE --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-verbatim-orange/20 rounded-full blur-[100px] md:blur-[150px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-purple-600/20 rounded-full blur-[100px] md:blur-[150px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[350px] md:w-[700px] h-[350px] md:h-[700px] bg-blue-600/10 rounded-full blur-[100px] md:blur-[150px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full">
        
        {/* --- NAVBAR --- */}
        <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/5 backdrop-blur-xl bg-verbatim-navy/80">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 group cursor-pointer w-full md:w-auto justify-center md:justify-start" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-2 bg-gradient-to-tr from-verbatim-orange to-pink-500 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                {/* LOGO SIZE FIX: Larger on Desktop (h-24), contained on Mobile (h-14) */}
                <img src={LOGO_PATH} alt="Verbatim Logo" className="relative h-14 md:h-24 w-auto rounded-lg border border-verbatim-orange/50 bg-black/50 p-1 transform group-hover:scale-105 transition-all duration-300 z-10 shadow-lg object-contain" />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-xl md:text-3xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-verbatim-orange group-hover:to-pink-500 transition-all duration-300">VERBATIM</span>
                <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-verbatim-orange uppercase shadow-orange-glow">Transcription Pro</span>
              </div>
            </div>
            <button onClick={handleGoogleLogin} className="w-full md:w-auto px-6 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-gray-300 text-sm md:text-base">
              <GoogleLogo />
              <span>Login with Google</span>
            </button>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <header className="relative pt-40 md:pt-64 pb-20 md:pb-32 px-4 md:px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-verbatim-orange/10 text-verbatim-orange border border-verbatim-orange/20 text-[10px] md:text-xs font-bold mb-6 md:mb-8 uppercase tracking-[0.2em] hover:bg-verbatim-orange/20 transition-colors cursor-default">
                <span className="w-2 h-2 rounded-full bg-verbatim-orange animate-ping"></span>
                v1.0 Engine Live
              </span>
              <h1 className="text-5xl md:text-9xl font-black mb-6 md:mb-8 leading-[0.9] tracking-tighter cursor-default transform hover:scale-[1.01] transition-transform duration-700">
                <span className="block text-white drop-shadow-2xl">Speak Locally.</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-verbatim-orange via-pink-500 to-purple-500 drop-shadow-2xl">Resonate Globally.</span>
              </h1>
              <p className="text-lg md:text-2xl text-gray-300 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed font-light tracking-wide px-4">
                Turn raw media into polished assets. <span className="text-white font-bold">Transcription, Translation, and AI Dubbing</span> running on a cloud-native engine.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 px-4">
                <button onClick={handleGoogleLogin} className="group relative w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-verbatim-orange text-white font-black rounded-full hover:bg-orange-600 transition-all flex items-center justify-center gap-3 text-base md:text-lg shadow-[0_0_30px_rgba(255,77,0,0.4)] hover:shadow-[0_0_60px_rgba(255,77,0,0.6)] hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-full border border-white/20"></div>
                  Launch Studio <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* --- 3D FEATURE GRID (FIXED: 6 CARDS) --- */}
        <section className="py-20 md:py-24 px-4 md:px-6 bg-black/20 backdrop-blur-sm border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 tracking-tight">Everything You Need</h2>
              <p className="text-gray-400 text-base md:text-lg">Powerful tools built for the modern creator economy.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 perspective-1000">
              {features.map((feature, idx) => (
                <div key={idx} className="group glass-card p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all duration-500 bg-verbatim-navy/40 transform hover:-translate-y-2 hover:rotate-x-2 shadow-xl hover:shadow-2xl">
                  <div className={`mb-6 p-4 ${feature.bg} w-fit rounded-2xl ${feature.color} group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                    {feature.icon}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${feature.color} transition-colors`}>{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- THE VAULT (ROADMAP) --- */}
        <section className="py-24 md:py-32 px-4 md:px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-verbatim-orange/5 to-black/0"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 md:mb-16 gap-6 text-center md:text-left">
              <div>
                <span className="text-verbatim-orange font-bold tracking-[0.3em] uppercase text-xs mb-2 block">The Roadmap</span>
                <h2 className="text-4xl md:text-6xl font-black leading-none">Verbatim <span className="text-transparent bg-clip-text bg-gradient-to-r from-verbatim-orange to-white">2.0</span></h2>
              </div>
              <div className="px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs md:text-sm font-bold text-gray-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                In Development
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
              {/* Locked Feature 1 - FIX: Opacity-0 on overlay by default */}
              <div className="relative group p-1 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 hover:from-verbatim-orange/20 hover:to-transparent transition-all duration-500 transform hover:scale-[1.01] overflow-hidden">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100 cursor-not-allowed">
                  <div className="bg-black/90 px-5 py-3 rounded-full border border-verbatim-orange/50 text-verbatim-orange font-bold tracking-widest uppercase text-[10px] flex items-center gap-2 shadow-[0_0_30px_rgba(255,77,0,0.3)] mb-2">
                    <Lock size={12} /> Locked // Dev Phase
                  </div>
                  <p className="text-gray-400 text-xs font-mono">Unlocking Q3 2026</p>
                </div>
                <div className="h-full bg-verbatim-navy p-8 md:p-10 rounded-[22px] relative overflow-hidden border border-white/5 group-hover:blur-[2px] transition-all duration-500">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><LinkIcon size={100} /></div>
                  <div className="mb-6 p-4 bg-gray-800 w-fit rounded-2xl text-gray-400"><LinkIcon size={32} /></div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-300">Social Link Intelligence</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">Process URLs directly from YouTube, TikTok, and Instagram without file uploads. A unified content pipe.</p>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-verbatim-orange/50 shadow-[0_0_10px_rgba(255,77,0,0.5)]"></div>
                  </div>
                  <p className="text-right text-[10px] font-mono text-verbatim-orange mt-2">85% COMPLETE</p>
                </div>
              </div>

              {/* Locked Feature 2 - FIX: Opacity-0 on overlay by default */}
              <div className="relative group p-1 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 hover:from-purple-500/20 hover:to-transparent transition-all duration-500 transform hover:scale-[1.01] overflow-hidden">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 opacity-0 group-hover:opacity-100 cursor-not-allowed">
                  <div className="bg-black/90 px-5 py-3 rounded-full border border-purple-500/50 text-purple-400 font-bold tracking-widest uppercase text-[10px] flex items-center gap-2 shadow-[0_0_30px_rgba(168,85,247,0.3)] mb-2">
                    <Lock size={12} /> Locked // Research Phase
                  </div>
                  <p className="text-gray-400 text-xs font-mono">Unlocking Q4 2026</p>
                </div>
                <div className="h-full bg-verbatim-navy p-8 md:p-10 rounded-[22px] relative overflow-hidden border border-white/5 group-hover:blur-[2px] transition-all duration-500">
                  <div className="absolute top-0 right-0 p-6 opacity-10"><Activity size={100} /></div>
                  <div className="mb-6 p-4 bg-gray-800 w-fit rounded-2xl text-gray-400"><Activity size={32} /></div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-300">Voice Cloning & Synthesis</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">Train the AI on your own voice for personalized dubbing across 30+ languages. Your voice, everywhere.</p>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="w-[40%] h-full bg-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                  </div>
                  <p className="text-right text-[10px] font-mono text-purple-400 mt-2">40% COMPLETE</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 text-center text-gray-500 border-t border-white/5 text-xs bg-black/60 backdrop-blur-xl">
          <p>© 2026 Verbatim. The future of content is universal.</p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;