import React from 'react';
// REMOVED: import { motion } from 'framer-motion'; (This was crashing the build)
import { ArrowRight, Mic, Globe, Zap, Volume2, Layers, Radio, Users, Building2, GraduationCap, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
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
    <div className="min-h-screen bg-verbatim-navy text-white font-sans selection:bg-verbatim-orange selection:text-white overflow-x-hidden relative">
      
      {/* --- ANIMATED AURORA BACKGROUND (Added) --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Top Left - Orange Glow */}
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-verbatim-orange/20 rounded-full blur-[120px] animate-blob"></div>
          {/* Top Right - Purple Glow */}
          <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          {/* Bottom Left - Blue Glow */}
          <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
      </div>

      {/* --- CONTENT WRAPPER (Z-10 ensures content sits ON TOP of the background) --- */}
      <div className="relative z-10">

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
        <section className="py-20 px-6 bg-black/20 backdrop-blur-sm">
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
                  className={`glass-card p-8 rounded-2xl border border-white/5 hover:border-verbatim-orange/50 transition-all relative overflow-hidden bg-verbatim-navy/40 ${feature.isComingSoon ? 'opacity-80' : ''}`}
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

        {/* --- NEW SECTION: THE VERBATIM ADVANTAGE (From Whitepaper) --- */}
        <section className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-6">The Verbatim Advantage</h2>
              <p className="text-verbatim-light text-lg max-w-2xl mx-auto">
                Designed to break the conventional boundaries of content creation through three core pillars.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pillar 1 */}
              <div className="glass-card p-8 rounded-3xl border border-white/5 hover:border-verbatim-orange/30 transition-all group bg-verbatim-navy/40">
                <div className="mb-6 bg-verbatim-orange/10 w-14 h-14 rounded-xl flex items-center justify-center text-verbatim-orange">
                  <Layers size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Hyper-Scalability</h3>
                <h4 className="text-sm font-bold text-verbatim-orange uppercase tracking-wider mb-4">The "One-to-Many" Engine</h4>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Create a "Content Flywheel". Upload one piece of content (e.g., a 10-minute video) and automatically generate four distinct formats. A single input yields exponential output.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="glass-card p-8 rounded-3xl border border-white/5 hover:border-verbatim-orange/30 transition-all group bg-verbatim-navy/40">
                  <div className="mb-6 bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-blue-400">
                  <Globe size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Global Liquidity</h3>
                <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">The Babel Protocol</h4>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Language Agnostic. The Localization Studio dubs audio with emotional intelligence. An educational lecture recorded in Lagos can be consumed in Madrid or Paris within minutes.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="glass-card p-8 rounded-3xl border border-white/5 hover:border-verbatim-orange/30 transition-all group bg-verbatim-navy/40">
                  <div className="mb-6 bg-green-500/10 w-14 h-14 rounded-xl flex items-center justify-center text-green-400">
                  <Zap size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Enterprise Compliance</h3>
                <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">Intelligent Brand Safety</h4>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Unlike reckless AI tools, Verbatim includes a "Brand Safety" layer. It detects copyrighted Hollywood material (e.g., movies) and blocks processing to protect you from legal liability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- NEW SECTION: STRATEGIC USE CASES (From Whitepaper) --- */}
        <section className="py-24 px-6 bg-black/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-verbatim-orange font-bold tracking-widest uppercase text-sm mb-2 block">Strategic Impact</span>
                <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Unlock "Zombie Data" &<br/> Scale Your Voice.</h2>
                
                <div className="space-y-8">
                  {/* Creator */}
                  <div className="flex gap-4 group">
                    <div className="mt-1 p-2 bg-white/5 rounded-lg h-fit group-hover:bg-verbatim-orange/20 transition-colors"><Mic className="text-verbatim-orange" size={20}/></div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Content Creators & Influencers</h4>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        <strong>Problem:</strong> High effort to repurpose content.<br/>
                        <strong>Solution:</strong> Upload a voice note. Instantly receive a Viral Blog Post written in your voice. Reduces production time by 90%.
                      </p>
                    </div>
                  </div>

                  {/* Enterprise */}
                  <div className="flex gap-4 group">
                    <div className="mt-1 p-2 bg-white/5 rounded-lg h-fit group-hover:bg-blue-500/20 transition-colors"><Layers className="text-blue-400" size={20}/></div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Enterprise & Corporate</h4>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        <strong>Problem:</strong> Thousands of hours of unwatchable "Zombie Data" (Zoom recordings).<br/>
                        <strong>Solution:</strong> Generate Executive Summaries and Action Item Lists. Localize training videos at zero cost.
                      </p>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex gap-4 group">
                    <div className="mt-1 p-2 bg-white/5 rounded-lg h-fit group-hover:bg-green-500/20 transition-colors"><Globe className="text-green-400" size={20}/></div>
                    <div>
                      <h4 className="text-xl font-bold text-white">Education & Accessibility</h4>
                      <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                        <strong>Problem:</strong> Lectures only available in one format.<br/>
                        <strong>Solution:</strong> Total compliance with accessibility standards (WCAG). Provide transcripts for deaf students and dubbed audio for international students.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual/Text Block for Architecture (From Whitepaper Technical Architecture) */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-verbatim-orange/10 to-blue-500/10 rounded-[3rem] blur-3xl"></div>
                <div className="glass-card border border-white/10 rounded-[3rem] p-8 md:p-12 relative z-10 bg-verbatim-navy/60 backdrop-blur-md">
                  <h3 className="text-2xl font-bold mb-6">Technical Architecture</h3>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 bg-verbatim-orange rounded-full"></span>
                      <span><strong>Core:</strong> Google Gemini (Multimodal)</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 bg-verbatim-orange rounded-full"></span>
                      <span><strong>Backend:</strong> Python FastAPI (Robust Processing)</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 bg-verbatim-orange rounded-full"></span>
                      <span><strong>Frontend:</strong> React + Vite (Glassmorphism UI)</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 bg-verbatim-orange rounded-full"></span>
                      <span><strong>Security:</strong> Firebase Auth & Brand Safety Layer</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-verbatim-light border-t border-white/5 text-sm bg-black/40 backdrop-blur-md">
          <p>© 2026 Verbatim. Built with Gemini & React.</p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;