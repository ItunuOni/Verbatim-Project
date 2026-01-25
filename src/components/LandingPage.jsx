import React from 'react';
import { motion } from 'framer-motion';
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

  return (
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white">
      {/* Navigation - MASTER LOGO FIX */}
      <nav className="glass fixed w-full z-50 top-0 left-0 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-32 flex justify-between items-center">
          
          {/* THE OFFICIAL LOGO BUTTON */}
          <div className="flex items-center gap-6 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="relative flex items-center justify-center">
              {/* Pro Glow Aura */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-verbatim-orange to-pink-500 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(255,77,0,0.4)]"></div>
              
              {/* Your Official Logo (Master Sizing) */}
              <img 
                src={LOGO_PATH}
                alt="Verbatim Logo" 
                className="relative h-24 w-auto min-w-[140px] rounded-xl border-2 border-verbatim-orange bg-white p-1 transform group-hover:scale-110 transition-all duration-300 z-10 shadow-2xl object-contain"
              />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-3xl font-black tracking-tighter italic group-hover:text-verbatim-orange transition-colors duration-300">
                VERBATIM
              </span>
              <span className="text-[11px] font-bold tracking-[0.3em] text-verbatim-orange opacity-90 uppercase">
                Transcription Pro
              </span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="px-8 py-3 bg-verbatim-orange text-white font-bold rounded-full hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(255,77,0,0.4)] hover:scale-105 active:scale-95"
          >
            Login with Google
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-64 pb-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-verbatim-orange/10 text-verbatim-orange border border-verbatim-orange/20 text-sm font-bold mb-8 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-verbatim-orange animate-pulse"></span>
              v1.0 Released Globally
            </span>

            <h1 className="text-6xl md:text-8xl font-extrabold mb-8 leading-tighter tracking-tight">
              Speak Locally. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-verbatim-orange to-orange-400">
                Resonate Globally.
              </span>
            </h1>

            <p className="text-2xl text-verbatim-light mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              The world's most powerful localization engine—now running in the cloud. Turn raw media into polished, multi-format assets that break every language barrier.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={handleGoogleLogin}
                className="w-full sm:w-auto px-12 py-5 bg-verbatim-orange text-white font-bold rounded-full hover:bg-orange-600 transition-all flex items-center justify-center gap-3 text-xl shadow-[0_0_40px_rgba(255,77,0,0.3)] hover:scale-105"
              >
                Get Started ASAP <ArrowRight size={24} />
              </button>
            </div>
          </motion.div>
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-verbatim-orange/15 rounded-full blur-[150px] -z-10 animate-pulse"></div>
      </header>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Go Global</h2>
            <p className="text-verbatim-light text-lg">From raw audio & video to emotional AI dubbing in minutes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Mic size={32} />, title: "Precision Transcription", desc: "Convert speech to text with 99% accuracy using Gemini 2.0 Flash." },
              { icon: <Globe size={32} />, title: "50+ Languages", desc: "Instantly translate your content into Spanish, French, Hindi, and more." },
              { icon: <Volume2 size={32} />, title: "Emotional AI Voiceovers", desc: "Generate human-like speech with controllable emotions." },
              { icon: <Layers size={32} />, title: "Multi-Format Output", desc: "Get Blog Posts and Summaries automatically generated." },
              { icon: <Zap size={32} />, title: "Video-to-Audio", desc: "Smart extraction engine processes video files at 40x speed." },
              { icon: <Radio size={32} />, title: "Live Transcription", desc: "Coming in v2.0: Real-time speech-to-text for live broadcasts.", isComingSoon: true }
            ].map((feature, i) => (
              <motion.div 
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
              </motion.div>
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