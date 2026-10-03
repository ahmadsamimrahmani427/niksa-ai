import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Sparkles, ArrowRight, Play, Cpu, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setLoadingStep(1), 400);
    const t2 = setTimeout(() => setLoadingStep(2), 1100);
    const t3 = setTimeout(() => setLoadingStep(3), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.06)_0,transparent_70%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-lg px-6 text-center">
        {/* Animated Brand Emblem */}
        <div className="mb-6 p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-[0_0_50px_rgba(56,189,248,0.2)] backdrop-blur-xl">
          <Logo size="xl" showSubtitle={false} />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-['Space_Grotesk']">
          Niksa <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">AI Studio</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 font-medium mb-1">
          Complete Production AI Creative Workspace
        </p>

        <p className="text-xs text-cyan-400/90 font-semibold tracking-wide uppercase mb-8">
          Created by Ahmad Samim Rahmani
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8 text-left">
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">AI Image Engine</div>
              <div className="text-[10px] text-slate-400">High-Res Text-to-Image</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Video Maker</div>
              <div className="text-[10px] text-slate-400">Automated Audio Sync</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">AI Designer</div>
              <div className="text-[10px] text-slate-400">Multi-Layer Canvas</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Creative Studio</div>
              <div className="text-[10px] text-slate-400">Real Editor & Effects</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onEnter}
          className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 transition-all duration-300 shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:shadow-[0_0_35px_rgba(56,189,248,0.6)] cursor-pointer active:scale-95"
        >
          <span>Launch Niksa Studio</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Footer Metadata */}
        <div className="mt-8 text-[11px] text-slate-400">
          Version 2.5.0 Pro &bull; &copy; 2026 Ahmad Samim Rahmani &bull; All Rights Reserved
        </div>
      </div>
    </div>
  );
};
