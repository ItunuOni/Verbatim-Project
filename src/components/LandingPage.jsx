import React from 'react';
// REMOVED: import { motion } from 'framer-motion'; (This was crashing the build)
import { ArrowRight, Mic, Globe, Zap, Volume2, Layers, Radio } from 'lucide-react';
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

  // --- PATH TO YOUR ACTUAL LOGO ---
  const LOGO_PATH = "/logo.png";

  // --- GOOGLE LOGO COMPONENT (Official Colors) ---
  const GoogleLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white overflow-x-hidden">
      {/* Navigation - TABLET & MOBILE OPTIMIZED */}
      <nav className="glass fixed w-full z-50 top-0 left-0 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-auto py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          
          {/* THE OFFICIAL LOGO BUTTON */}
          <div className="flex items-center gap-4 sm:gap-6 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="relative flex items-center justify-center">
              {/* Pro Glow Aura */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-verbatim-orange to-pink-500 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(255,77,0,0.4)]"></div>
              
              {/* Your Official Logo */}
              <img 
                src={LOGO_PATH}
                alt="Verbatim Logo" 
                className="relative h-16 sm:h-24 w-auto min-w-[100px] sm:min-w-[140px] rounded-xl border-2 border-verbatim-orange bg-white p-1 transform group-hover:scale-110 transition-all duration-300 z-10 shadow-2xl object-contain"
              />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter italic group-hover:text-verbatim-orange transition-colors duration-300">
                VERBATIM
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] text-verbatim-orange opacity-90 uppercase">
                Transcription Pro
              </span>
            </div>
          </div>

          {/* LOGIN BUTTON with GOOGLE LOGO */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full sm:w-auto px-6 py-3 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-gray-300"
          >
            <GoogleLogo />
            <span>Login with Google</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-48 sm:pt-64 pb-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div>
            
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-verbatim-orange/10 text-verbatim-orange border border-verbatim-orange/20 text-sm font-bold mb-8 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-verbatim-orange animate-pulse"></span>
              v1.0 Released Globally
            </span>

            <h1 className="text-5xl md:text-8xl font-extrabold mb-8 leading-tight md:leading-tighter tracking-tight">
              Speak Locally. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-verbatim-orange to-orange-400">
                Resonate Globally.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-verbatim-light mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              The world's most powerful localization engine now running in the cloud. Turn raw media into polished, multi-format assets that break every language barrier.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
               {/* HERO LOGIN BUTTON with GOOGLE LOGO */}
               <button 
                onClick={handleGoogleLogin}
                className="w-full sm:w-auto px-8 py-4 bg-verbatim-orange text-white font-bold rounded-full hover:bg-orange-600 transition-all flex items-center justify-center gap-3 text-lg shadow-[0_0_40px_rgba(255,77,0,0.3)] hover:scale-105"
              >
                Get Started ASAP <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-verbatim-orange/15 rounded-full blur-[150px] -z-10 animate-pulse"></div>
      </header>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Go Global</h2>
            <p className="text-verbatim-light text-lg">From raw audio & video to emotional AI dubbing in minutes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Mic size={32} />, title: "Precision Transcription", desc: "Convert speech to text with 99% accuracy using Verbatim v1.0." },
              { icon: <Globe size={32} />, title: "50+ Languages", desc: "Instantly translate your content into Spanish, French, Hindi, and more." },
              { icon: <Volume2 size={32} />, title: "Emotional AI Voiceovers", desc: "Generate human-like speech with controllable emotions." },
              { icon: <Layers size={32} />, title: "Multi-Format Output", desc: "Get Blog Posts and Summaries automatically generated." },
              { icon: <Zap size={32} />, title: "Video-to-Audio", desc: "Smart extraction engine processes video files at 40x speed." },
              { icon: <Radio size={32} />, title: "Live Transcription", desc: "Coming in v2.0: Real-time speech-to-text for live broadcasts.", isComingSoon: true }
            ].map((feature, i) => (
              <div 
                key={i} 
                className={`glass-card p-8 rounded-2xl border border-white/5 hover:border-verbatim-orange/50 transition-all relative overflow-hidden ${feature.isComingSoon ? 'opacity-80' : ''}`}
              >
                {feature.isComingSoon && (
                   <div className="absolute top-4 right-4 bg-verbatim-orange/20 text-verbatim-orange text-[10px] font-bold px-3 py-1 rounded-full border border-verbatim-orange/30">
                      COMING SOON
                   </div>
                )}
                <div className="mb-6 text-verbatim-orange">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-verbatim-light leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-verbatim-light border-t border-white/5 text-sm">
        <p>© 2026 Verbatim. Built with Gemini & React.</p>
      </footer>
    </div>
  );
};

export default LandingPage;