import React from 'react';
import { X, Sliders, Shield, Wand2, Sparkles, Check } from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 text-slate-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Studio Settings</h3>
            <p className="text-xs text-slate-400">Configure engine defaults and export preferences</p>
          </div>
        </div>

        <div className="space-y-5 text-sm">
          {/* Default Export Quality */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Default Video & Canvas Export Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['720p', '1080p', '4k'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateSettings({ defaultResolution: res })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    settings.defaultResolution === res
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {settings.defaultResolution === res && <Check className="w-3.5 h-3.5" />}
                  {res.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Watermark Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block font-semibold text-white text-sm">Branded Studio Watermark</span>
              <span className="text-xs text-slate-400">
                Adds &quot;Niksa AI Studio &bull; Ahmad Samim Rahmani&quot; watermark on exports
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.watermark}
                onChange={(e) => onUpdateSettings({ watermark: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Audio Auto Analysis */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="block font-semibold text-white text-sm">Automatic Audio AI Analysis</span>
              <span className="text-xs text-slate-400">
                Detect rhythm, beats, and song sections automatically when music is loaded
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoAnalyzeAudio}
                onChange={(e) => onUpdateSettings({ autoAnalyzeAudio: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* App Branding Info */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-300 flex items-center justify-between">
            <div>
              <span className="font-semibold block text-white">Niksa AI Studio</span>
              <span>Created by Ahmad Samim Rahmani &bull; 2026</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
              v2.5.0
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
