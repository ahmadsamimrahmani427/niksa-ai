import React, { useState } from 'react';
import { StudioImage, AppSettings } from '../../types';
import { ImageProcessingService } from '../../services/imageProcessingService';
import {
  Sparkles,
  Wand2,
  Download,
  Film,
  Layers,
  Edit3,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface ImageGeneratorProps {
  onImageGenerated: (image: StudioImage) => void;
  onSendToVideoMaker: (image: StudioImage) => void;
  onSendToDesigner: (image: StudioImage) => void;
  onSendToStudio: (image: StudioImage) => void;
  settings: AppSettings;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  onImageGenerated,
  onSendToVideoMaker,
  onSendToDesigner,
  onSendToStudio,
  settings,
}) => {
  const [prompt, setPrompt] = useState<string>('cinematic portrait of a young man in a rainy city at night, neon lights reflection, 8k');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [stylePreset, setStylePreset] = useState<string>('Cinematic Photorealistic');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentImage, setCurrentImage] = useState<StudioImage | null>(null);
  const [history, setHistory] = useState<StudioImage[]>([]);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const stylePresets = [
    'Cinematic Photorealistic',
    'Cyberpunk Neo-Tokyo',
    'Ethereal Fantasy 3D',
    '35mm Film Photography',
    'Hyper-Realistic Product',
    'Studio Portrait Luxury',
    'Anime High-Octane',
    'Oil Masterpiece Classic',
  ];

  const aspectRatios = [
    { label: '1:1 Square', value: '1:1', desc: 'Instagram / Avatar' },
    { label: '16:9 Landscape', value: '16:9', desc: 'Cinematic / YouTube' },
    { label: '9:16 Portrait', value: '9:16', desc: 'Reels / Shorts / TikTok' },
    { label: '4:3 Standard', value: '4:3', desc: 'Editorial Presentation' },
    { label: '3:4 Mobile', value: '3:4', desc: 'Fashion / Portrait' },
  ];

  /**
   * 1. Prompt Enhancement with AI
   */
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    try {
      setIsEnhancing(true);
      setErrorMsg('');
      const res = await fetch('/api/prompt/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: stylePreset }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err: any) {
      console.error('Enhance failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  /**
   * 2. Real Image Generation
   */
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Please enter a prompt to generate an image.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg('');

      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          style: stylePreset,
          engine: settings.preferredEngine,
        }),
      });

      if (!res.ok) {
        throw new Error(`Generation failed with HTTP status ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const newImage: StudioImage = {
        id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Niksa_${stylePreset.replace(/\s+/g, '_')}_${Date.now()}`,
        url: data.imageUrl,
        prompt,
        width: aspectRatio === '16:9' ? 1280 : aspectRatio === '9:16' ? 720 : 1024,
        height: aspectRatio === '16:9' ? 720 : aspectRatio === '9:16' ? 1280 : 1024,
        aspectRatio,
        mood: 'epic',
        visualEnergy: 'high',
        createdAt: Date.now(),
        originalDataUrl: data.imageUrl,
      };

      setCurrentImage(newImage);
      setHistory((prev) => [newImage, ...prev]);
      onImageGenerated(newImage);
    } catch (err: any) {
      console.error('Image generation error:', err);
      setErrorMsg(err.message || 'Image generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * High-Resolution Download
   */
  const handleDownload = () => {
    if (!currentImage) return;
    ImageProcessingService.downloadImage(
      currentImage.url,
      `niksa_image_${Date.now()}.png`
    );
  };

  const copyPromptText = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Left Control Panel: Prompt & Configuration */}
      <div className="w-full lg:w-[460px] border-r border-slate-800/80 bg-slate-900/50 p-6 flex flex-col gap-5 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
              AI Image Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Powered by high-precision generative neural engines & intelligent prompt expansion.
          </p>
        </div>

        {/* Prompt Input Box */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Creative Prompt
            </label>
            <button
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || !prompt.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
              title="Enhance prompt with lighting, camera optics, and atmosphere"
            >
              {isEnhancing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              <span>Enhance Prompt</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate in detail..."
              className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none transition-colors resize-none leading-relaxed"
            />
            <button
              onClick={copyPromptText}
              className="absolute right-2.5 bottom-2.5 p-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Copy prompt"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Style Presets */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            Artistic Aesthetic & Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {stylePresets.map((style) => (
              <button
                key={style}
                onClick={() => setStylePreset(style)}
                className={`p-2 rounded-xl text-[11px] font-semibold text-left border transition-all ${
                  stylePreset === style
                    ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-200 shadow-sm'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-2">
            {aspectRatios.map((ar) => (
              <button
                key={ar.value}
                onClick={() => setAspectRatio(ar.value)}
                className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
                  aspectRatio === ar.value
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-semibold">{ar.value}</span>
                <span className="text-[9px] text-slate-500 leading-none">{ar.desc.split('/')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerateImage}
          disabled={isGenerating || !prompt.trim()}
          className="mt-auto w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(56,189,248,0.3)] transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Masterpiece...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Image</span>
            </>
          )}
        </button>
      </div>

      {/* Right Canvas: Generated Image Display & Quick Studio Routing */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {currentImage ? (
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
            {/* Main Image Display Box */}
            <div className="relative group max-h-[70vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
              <img
                src={currentImage.url}
                alt={currentImage.name}
                className="max-h-[68vh] w-auto object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />

              {/* Watermark Overlay in Preview */}
              {settings.watermark && (
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono backdrop-blur-md">
                  Niksa AI Studio &bull; Ahmad Samim Rahmani
                </div>
              )}
            </div>

            {/* Action Bar below Image */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download High-Res</span>
              </button>

              <button
                onClick={() => onSendToVideoMaker(currentImage)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/40 transition-colors shadow-sm"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Use in Video Maker</span>
              </button>

              <button
                onClick={() => onSendToStudio(currentImage)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit in Creative Studio</span>
              </button>

              <button
                onClick={() => onSendToDesigner(currentImage)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open in AI Designer</span>
              </button>

              <button
                onClick={handleGenerateImage}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                title="Regenerate with new variations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 mb-4 text-cyan-400">
              <ImageIcon className="w-12 h-12 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Your Canvas Awaits</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Enter your prompt on the left, pick an aspect ratio, and click &quot;Generate Image&quot; to produce high-resolution AI art.
            </p>
          </div>
        )}

        {/* History Strip at Bottom */}
        {history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-2">
              Recent Generations ({history.length})
            </span>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentImage(item)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border cursor-pointer flex-shrink-0 transition-transform hover:scale-105 ${
                    currentImage?.id === item.id
                      ? 'border-cyan-400 shadow-md shadow-cyan-500/30'
                      : 'border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
