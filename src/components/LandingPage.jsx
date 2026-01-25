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

  return (
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white">
      {/* Navigation */}
      <nav className="glass fixed w-full z-50 top-0 left-0 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.jpg" 
              alt="Verbatim" 
              className="h-16 w-auto rounded-xl border-2 border-verbatim-orange shadow-[0_0_15px_rgba(255,77,0,0.3)] bg-white p-1 object-contain" 
            />
            <span className="text-3xl font-bold tracking-tight text-white hidden sm:block">Verbatim</span>
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
      <header className="relative pt-40 pb-20 px-6 overflow-hidden">
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
              The world's most powerful localization engine—now running on your desktop. Turn raw media into polished, multi-format assets that break every language barrier.
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
        
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-verbatim-orange/15 rounded-full blur-[150px] -z-10 animate-pulse"></div>
      </header>

      {/* UPDATED Features Grid */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Go Global</h2>
            <p className="text-verbatim-light text-lg">From raw audio & video to emotional AI dubbing in minutes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Mic size={32} />, 
                title: "Precision Transcription", 
                desc: "Convert speech to text with 99% accuracy using Gemini 2.0 Flash. Supports complex accents and technical jargon." 
              },
              { 
                icon: <Globe size={32} />, 
                title: "50+ Languages", 
                desc: "Instantly translate your content into Spanish, French, Hindi, Nigerian English, and 46+ other languages." 
              },
              { 
                icon: <Volume2 size={32} />, 
                title: "Emotional AI Voiceovers", 
                desc: "Generate human-like speech with controllable emotions—Excited, Sad, Whispering, and more." 
              },
              { 
                icon: <Layers size={32} />, 
                title: "Multi-Format Output", 
                desc: "Get Blog Posts, Summaries, and Transcripts automatically generated from a single upload." 
              },
              { 
                icon: <Zap size={32} />, 
                title: "Video-to-Audio Optimization", 
                desc: "Smart extraction engine processes video files at 40x speed by isolating audio tracks." 
              },
              { 
                icon: <Radio size={32} />, 
                title: "Live Transcription (Soon)", 
                desc: "Coming in v2.0: Real-time speech-to-text for live meetings and broadcasts.",
                isComingSoon: true 
              }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-8 rounded-2xl hover:border-verbatim-orange/50 transition-colors relative overflow-hidden ${feature.isComingSoon ? 'opacity-80' : ''}`}
              >
                {feature.isComingSoon && (
                   <div className="absolute top-4 right-4 bg-verbatim-orange/20 text-verbatim-orange text-xs font-bold px-3 py-1 rounded-full border border-verbatim-orange/30">
                     COMING SOON
                   </div>
                )}
                <div className="mb-6 text-verbatim-orange">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-verbatim-light leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

       {/* Footer */}
       <footer className="py-8 text-center text-verbatim-light border-t border-white/5 text-sm">
         <p>© 2026 Verbatim. Built with Gemini & React.</p>
       </footer>
    </div>
  );
};

export default LandingPage;