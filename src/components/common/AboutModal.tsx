import React from 'react';
import { Logo } from './Logo';
import { X, ExternalLink, Mail, Award, CheckCircle2, Shield, Sparkles } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-4 mb-6">
          <Logo size="lg" showSubtitle={true} />
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30">
            <h3 className="font-bold text-cyan-300 text-base mb-1">About Niksa AI Studio</h3>
            <p className="text-slate-300">
              Niksa AI Studio is a complete, production-grade creative ecosystem built to empower artists, creators, marketers, and video directors with real AI generation, deep audio-video synchronization, and professional image manipulation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                App Creator
              </span>
              <span className="font-bold text-white text-base block">
                Ahmad Samim Rahmani
              </span>
              <span className="text-xs text-cyan-400 flex items-center gap-1 mt-1">
                <Award className="w-3.5 h-3.5" /> Founder & Lead Architect
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                App Information
              </span>
              <span className="font-bold text-white text-base block">
                v2.5.0 Pro
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Production Ready
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
            <h4 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">
              Core Architecture & Modules
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Text-to-Image Generation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Automated Video Maker & Sync</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Multi-Layer AI Designer</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Creative Studio & Shaders</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Real Audio Waveform Analyzer</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Interactive AI Creative Copilot</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300">Creator Contact:</span>
              <span className="text-xs font-semibold text-white">ahmadsamimrahmani427@gmail.com</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800">
            &copy; 2026 Ahmad Samim Rahmani. All rights reserved. Niksa AI Studio&trade;.
          </div>
        </div>
      </div>
    </div>
  );
};
