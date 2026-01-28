import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, Mic, Globe, Zap, Volume2, Layers, Radio, 
  FileText, ShieldCheck, CheckCircle2, Users, Building2, GraduationCap 
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animations on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Failed:", err);
    }
  };

  const LOGO_PATH = "/logo.png";

  // --- GOOGLE LOGO COMPONENT ---
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
      
      {/* --- NAVIGATION --- */}
      {/* Animated: Slides down and fades in */}
      <nav className={`glass fixed w-full z-50 top-0 left-0 border-b border-white/10 backdrop-blur-xl transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-auto py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          
          <div className="flex items-center gap-4 sm:gap-6 group cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-4 bg-gradient-to-tr from-verbatim-orange to-pink-500 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(255,77,0,0.4)]"></div>
              <img src={LOGO_PATH} alt="Verbatim Logo" className="relative h-16 sm:h-20 w-auto min-w-[100px] rounded-xl border-2 border-verbatim-orange bg-white p-1 transform group-hover:scale-110 transition-all duration-300 z-10 shadow-2xl object-contain"/>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-2xl font-black tracking-tighter italic group-hover:text-verbatim-orange transition-colors duration-300">VERBATIM</span>
              <span className="text-[10px] font-bold tracking-[0.3em] text-verbatim-orange opacity-90 uppercase">Transcription Pro</span>
            </div>
          </div>

          <button onClick={handleGoogleLogin} className="w-full sm:w-auto px-6 py-3 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-gray-300">
            <GoogleLogo /> <span>Login with Google</span>
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-48 sm:pt-64 pb-20 px-6 overflow-hidden">
        {/* Animated: Fades in and slides up */}
        <div className={`max-w-5xl mx-auto text-center relative z-10 transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-verbatim-orange/10 text-verbatim-orange border border-verbatim-orange/20 text-sm font-bold mb-8 uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-verbatim-orange"></span> v1.0 Stable Release
            </span>

            <h1 className="text-5xl md:text-8xl font-extrabold mb-8 leading-tight md:leading-tighter tracking-tight">
              Speak Locally. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-verbatim-orange to-orange-400">Resonate Globally.</span>
            </h1>

            <p className="text-xl md:text-2xl text-verbatim-light mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              The Enterprise Media Intelligence Engine. Turn raw audio & video into Transcripts, Summaries, Blogs, and Dubbed Audio in one click.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
               <button onClick={handleGoogleLogin} className="w-full sm:w-auto px-8 py-4 bg-verbatim-orange text-white font-bold rounded-full hover:bg-orange-600 transition-all flex items-center justify-center gap-3 text-lg shadow-[0_0_40px_rgba(255,77,0,0.3)] hover:scale-105">
                Get Started ASAP <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-verbatim-orange/15 rounded-full blur-[150px] -z-10 animate-pulse"></div>
      </header>

      {/* --- HOW IT WORKS (THE ENGINE) --- */}
      {/* Visualizes the One-to-Many Concept from the Docs */}
      <section className="py-24 px-6 bg-black/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-6">The "One-to-Many" Engine</h2>
              <p className="text-verbatim-light text-lg max-w-2xl mx-auto">Verbatim is not just a transcriber. It is a transformation pipeline. Upload one file, receive four strategic assets instantly.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: <Mic className="text-verbatim-orange" size={32}/>, step: "01", title: "Smart Transcript", desc: "Speaker-aware text logs with 99% accuracy." },
                { icon: <Layers className="text-blue-400" size={32}/>, step: "02", title: "Exec Summary", desc: "Condensed insights and action items for management." },
                { icon: <FileText className="text-pink-400" size={32}/>, step: "03", title: "Viral Blog Post", desc: "SEO-ready articles written in your unique voice." },
                { icon: <Globe className="text-green-400" size={32}/>, step: "04", title: "Global Dub", desc: "AI-voiced audio translation in 50+ languages." }
              ].map((item, i) => (
                <div key={i} className="glass-card p-8 rounded-3xl border border-white/5 hover:border-verbatim-orange/30 transition-all hover:-translate-y-2 group">
                   <div className="text-4xl font-black text-white/5 mb-4 group-hover:text-verbatim-orange/20 transition-colors">{item.step}</div>
                   <div className="mb-6 bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center">{item.icon}</div>
                   <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                   <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* --- USE CASES & SECURITY (FROM DOCS) --- */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Target Sectors */}
            <div>
               <span className="text-verbatim-orange font-bold tracking-widest uppercase text-sm mb-2 block">Who is Verbatim For?</span>
               <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Built for Scale.<br/>Designed for Impact.</h2>
               <div className="space-y-8">
                  <div className="flex gap-4">
                     <div className="mt-1"><Users className="text-verbatim-orange" size={24}/></div>
                     <div>
                        <h4 className="text-xl font-bold text-white">Content Creators</h4>
                        <p className="text-gray-400 mt-2">Reduce production time by 90%. Turn one YouTube video into a week's worth of LinkedIn posts and blogs automatically.</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="mt-1"><Building2 className="text-blue-400" size={24}/></div>
                     <div>
                        <h4 className="text-xl font-bold text-white">Enterprise & Business</h4>
                        <p className="text-gray-400 mt-2">Unlock "Zombie Data." Turn hours of recorded meetings into searchable text and actionable summaries. Localize training videos at zero cost.</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="mt-1"><GraduationCap className="text-green-400" size={24}/></div>
                     <div>
                        <h4 className="text-xl font-bold text-white">Education Systems</h4>
                        <p className="text-gray-400 mt-2">Democratize learning. Provide instant transcripts for accessibility (WCAG) and translate lectures for international students.</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right: Security Badge */}
            <div className="relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-verbatim-orange/20 to-blue-500/20 rounded-[3rem] blur-3xl"></div>
               <div className="glass-card border border-white/10 rounded-[3rem] p-8 md:p-12 relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                     <ShieldCheck className="text-green-400" size={28}/>
                     <span className="text-lg font-bold">Enterprise Grade Security</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Intelligent Copyright Protection</h3>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                     Unlike reckless AI tools, Verbatim includes a "Brand Safety" layer. Our engine automatically detects and blocks copyrighted Hollywood content (like movies) to protect your organization from legal liability.
                  </p>
                  <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-verbatim-orange"/> <span>Encrypted Asset Transmission</span></div>
                     <div className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-verbatim-orange"/> <span>No Data Training on User Files</span></div>
                     <div className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 size={16} className="text-verbatim-orange"/> <span>GDPR & CCPA Compliant Architecture</span></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TECH SPECS GRID --- */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap size={32} />, title: "Gemini 2.0 Flash", desc: "Powered by Google's latest multimodal model for reasoning." },
              { icon: <Globe size={32} />, title: "50+ Languages", desc: "Native-level translation for Spanish, French, Hindi, and more." },
              { icon: <Volume2 size={32} />, title: "Emotional AI", desc: "Voice synthesis that understands context and emotion." },
              { icon: <Radio size={32} />, title: "Live Streaming", desc: "Real-time socket transcription coming in V2.0.", isComingSoon: true },
              { icon: <Layers size={32} />, title: "Multi-Format", desc: "MP4, MOV, WAV, MP3. We handle the heavy lifting." },
              { icon: <CheckCircle2 size={32} />, title: "99.9% Uptime", desc: "Built on Python FastAPI and React for maximum stability." }
            ].map((feature, i) => (
              <div key={i} className={`glass-card p-8 rounded-2xl border border-white/5 hover:border-verbatim-orange/50 transition-all relative overflow-hidden group ${feature.isComingSoon ? 'opacity-80' : ''}`}>
                {feature.isComingSoon && (
                   <div className="absolute top-4 right-4 bg-verbatim-orange/20 text-verbatim-orange text-[10px] font-bold px-3 py-1 rounded-full border border-verbatim-orange/30">COMING SOON</div>
                )}
                <div className="mb-6 text-verbatim-orange group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-verbatim-light leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-verbatim-light border-t border-white/5 bg-black/40">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
           <img src={LOGO_PATH} className="h-8 grayscale" alt="logo"/>
           <span className="font-bold tracking-widest">VERBATIM</span>
        </div>
        <p className="text-sm">© 2026 Verbatim. Built with Gemini, React & Python.</p>
      </footer>
    </div>
  );
};

export default LandingPage;