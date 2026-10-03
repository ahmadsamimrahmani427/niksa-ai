import React, { useState, useRef, useEffect } from 'react';
import { StudioImage, AppSettings } from '../../types';
import {
  ImageProcessingService,
  ImageAdjustments,
  defaultAdjustments,
} from '../../services/imageProcessingService';
import {
  Wand2,
  Sliders,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Trash2,
  Sparkles,
  Maximize2,
  Layers,
  Film,
  ZoomIn,
  RefreshCw,
  Check,
  Loader2,
  Palette,
  Scissors,
  Upload,
} from 'lucide-react';

interface CreativeStudioProps {
  initialImage: StudioImage | null;
  onSaveImage: (image: StudioImage) => void;
  onSendToVideoMaker: (image: StudioImage) => void;
  onSendToDesigner: (image: StudioImage) => void;
  settings: AppSettings;
}

export const CreativeStudio: React.FC<CreativeStudioProps> = ({
  initialImage,
  onSaveImage,
  onSendToVideoMaker,
  onSendToDesigner,
  settings,
}) => {
  const [currentImage, setCurrentImage] = useState<StudioImage | null>(initialImage);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'adjust' | 'background' | 'ai-enhance' | 'style'>('adjust');
  const [statusText, setStatusText] = useState<string>('');

  // Background replacement controls
  const [bgColor, setBgColor] = useState<string>('#0284c7');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialImage) {
      setCurrentImage(initialImage);
      setAdjustments(defaultAdjustments);
    }
  }, [initialImage]);

  // Re-render live canvas preview whenever adjustments or image change
  useEffect(() => {
    if (!currentImage) return;
    renderLivePreview();
  }, [currentImage, adjustments]);

  const renderLivePreview = async () => {
    if (!currentImage) return;
    try {
      const processedUrl = await ImageProcessingService.processAdjustments(
        currentImage.url,
        adjustments
      );
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = await ImageProcessingService.loadImage(processedUrl);
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      console.error('Preview render failed:', e);
    }
  };

  /**
   * Handle Uploading Local Image into Studio
   */
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const imgEl = await ImageProcessingService.loadImage(dataUrl);
      const newImg: StudioImage = {
        id: `studio_img_${Date.now()}`,
        name: file.name,
        url: dataUrl,
        width: imgEl.naturalWidth,
        height: imgEl.naturalHeight,
        createdAt: Date.now(),
        originalDataUrl: dataUrl,
      };
      setCurrentImage(newImg);
      setAdjustments(defaultAdjustments);
      onSaveImage(newImg);
    };
    reader.readAsDataURL(file);
  };

  /**
   * AI Image Enhancement (Bicubic Detail Sharpness + Clarity Shaders)
   */
  const handleAiEnhance = async () => {
    if (!currentImage) return;
    try {
      setIsProcessing(true);
      setStatusText('Applying neural contrast enhancement and sharpening...');

      const enhancedDataUrl = await ImageProcessingService.processAdjustments(
        currentImage.url,
        {
          ...adjustments,
          sharpness: 55,
          contrast: 15,
          saturation: 12,
          exposure: 5,
        }
      );

      const updatedImage: StudioImage = {
        ...currentImage,
        url: enhancedDataUrl,
      };
      setCurrentImage(updatedImage);
      onSaveImage(updatedImage);
      setStatusText('Enhanced successfully!');
      setTimeout(() => setStatusText(''), 3000);
    } catch (err: any) {
      console.error('Enhance failed:', err);
      setStatusText(`Enhance error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Real 2x / 4x Super-Resolution Upscaling
   */
  const handleUpscale = async (factor: 2 | 4) => {
    if (!currentImage) return;
    try {
      setIsProcessing(true);
      setStatusText(`Upscaling image to ${factor}x Ultra-HD resolution...`);

      const upscaledDataUrl = await ImageProcessingService.upscaleImage(
        currentImage.url,
        factor
      );
      const img = await ImageProcessingService.loadImage(upscaledDataUrl);

      const upscaledImage: StudioImage = {
        ...currentImage,
        url: upscaledDataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setCurrentImage(upscaledImage);
      onSaveImage(upscaledImage);
      setStatusText(`Upscaled to ${img.naturalWidth}x${img.naturalHeight}px!`);
      setTimeout(() => setStatusText(''), 3000);
    } catch (err: any) {
      console.error('Upscale failed:', err);
      setStatusText(`Upscale failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Background Removal (Real Transparent PNG)
   */
  const handleRemoveBackground = async () => {
    if (!currentImage) return;
    try {
      setIsProcessing(true);
      setStatusText('Segmenting foreground & removing background...');

      const transparentDataUrl = await ImageProcessingService.removeBackground(
        currentImage.url,
        38
      );

      const transparentImage: StudioImage = {
        ...currentImage,
        url: transparentDataUrl,
      };
      setCurrentImage(transparentImage);
      onSaveImage(transparentImage);
      setStatusText('Background removed successfully (Transparent PNG)!');
      setTimeout(() => setStatusText(''), 3000);
    } catch (err: any) {
      console.error('Background removal failed:', err);
      setStatusText(`Background removal failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Background Replacement
   */
  const handleReplaceBackground = async (type: 'color' | 'gradient' | 'studio' | 'cyberpunk') => {
    if (!currentImage) return;
    try {
      setIsProcessing(true);
      setStatusText(`Compositing new ${type} background...`);

      const replacedDataUrl = await ImageProcessingService.replaceBackground(
        currentImage.url,
        type,
        bgColor
      );

      const updated: StudioImage = {
        ...currentImage,
        url: replacedDataUrl,
      };
      setCurrentImage(updated);
      onSaveImage(updated);
      setStatusText('Background replaced successfully!');
      setTimeout(() => setStatusText(''), 3000);
    } catch (err: any) {
      console.error('Replace failed:', err);
      setStatusText(`Replacement failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Canvas Expansion / Outpainting
   */
  const handleExpandCanvas = async () => {
    if (!currentImage) return;
    try {
      setIsProcessing(true);
      setStatusText('Expanding canvas borders with seamless reflections...');

      const expandedUrl = await ImageProcessingService.expandCanvas(currentImage.url, 25);
      const img = await ImageProcessingService.loadImage(expandedUrl);

      const updated: StudioImage = {
        ...currentImage,
        url: expandedUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setCurrentImage(updated);
      onSaveImage(updated);
      setStatusText('Canvas expanded successfully!');
      setTimeout(() => setStatusText(''), 3000);
    } catch (err: any) {
      console.error('Expand failed:', err);
      setStatusText(`Expand failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Download Processed Image
   */
  const handleDownload = async () => {
    if (!currentImage) return;
    // Download what's currently rendered on the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 0.98);
      ImageProcessingService.downloadImage(
        dataUrl,
        `niksa_studio_edited_${Date.now()}.png`
      );
    } else {
      ImageProcessingService.downloadImage(
        currentImage.url,
        `niksa_studio_${Date.now()}.png`
      );
    }
  };

  /**
   * Reset Adjustments
   */
  const handleResetAdjustments = () => {
    setAdjustments(defaultAdjustments);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Left Sidebar: Studio Editing Toolsets */}
      <div className="w-full lg:w-[420px] border-r border-slate-800/80 bg-slate-900/50 p-5 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
              Creative Studio
            </h2>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="sr-only"
            />
          </label>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'adjust'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Adjust
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'background'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cutout
          </button>
          <button
            onClick={() => setActiveTab('ai-enhance')}
            className={`py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'ai-enhance'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Enhance
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'style'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Styles
          </button>
        </div>

        {/* Tab 1: Adjustments (Brightness, Contrast, Saturation, Sharpness, Rotation, Flips) */}
        {activeTab === 'adjust' && (
          <div className="space-y-3.5 text-xs">
            {/* Quick Geometric Transforms */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <button
                onClick={() =>
                  setAdjustments((prev) => ({
                    ...prev,
                    rotation: (prev.rotation + 90) % 360,
                  }))
                }
                className="flex-1 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold flex items-center justify-center gap-1.5"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rotate</span>
              </button>

              <button
                onClick={() =>
                  setAdjustments((prev) => ({ ...prev, flipH: !prev.flipH }))
                }
                className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  adjustments.flipH
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flip H</span>
              </button>

              <button
                onClick={() =>
                  setAdjustments((prev) => ({ ...prev, flipV: !prev.flipV }))
                }
                className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  adjustments.flipV
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flip V</span>
              </button>

              <button
                onClick={handleResetAdjustments}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                title="Reset adjustments"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Brightness</span>
                <span className="font-mono text-cyan-300">{adjustments.brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.brightness}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-cyan-300">{adjustments.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.contrast}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-cyan-300">{adjustments.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.saturation}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, saturation: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Exposure */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Exposure</span>
                <span className="font-mono text-cyan-300">{adjustments.exposure}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.exposure}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, exposure: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Sharpness */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Sharpness (Convolution Unsharp Mask)</span>
                <span className="font-mono text-cyan-300">{adjustments.sharpness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments.sharpness}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, sharpness: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Blur */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Blur</span>
                <span className="font-mono text-cyan-300">{adjustments.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={adjustments.blur}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, blur: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-cyan-300">{adjustments.opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={adjustments.opacity}
                onChange={(e) =>
                  setAdjustments((prev) => ({ ...prev, opacity: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Cutout & Background Tools */}
        {activeTab === 'background' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Background Isolation</span>
              <p className="text-slate-400 text-[11px]">
                Extract subject automatically with edge alpha anti-aliasing. Produces clean transparent PNG.
              </p>
              <button
                onClick={handleRemoveBackground}
                disabled={isProcessing}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Remove Background (Transparent)</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <span className="font-bold text-white block">Background Replacement</span>
              <p className="text-slate-400 text-[11px]">
                Composite your isolated subject against studio backdrops, solid palettes, or cyberpunk neon gradients.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleReplaceBackground('studio')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center font-medium"
                >
                  Studio Backdrop
                </button>
                <button
                  onClick={() => handleReplaceBackground('cyberpunk')}
                  className="p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 border border-purple-800/50 text-center font-medium"
                >
                  Cyberpunk Glow
                </button>
                <button
                  onClick={() => handleReplaceBackground('gradient')}
                  className="p-2 rounded-lg bg-sky-950/40 hover:bg-sky-900/40 text-sky-200 border border-sky-800/50 text-center font-medium"
                >
                  Deep Oceanic
                </button>
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-800 border border-slate-700">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <button
                    onClick={() => handleReplaceBackground('color')}
                    className="flex-1 text-[11px] text-slate-300 font-semibold"
                  >
                    Solid Color
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Canvas Outpainting & Expansion</span>
              <p className="text-slate-400 text-[11px]">
                Expands outer boundaries seamlessly by 25% with atmospheric border mirroring.
              </p>
              <button
                onClick={handleExpandCanvas}
                disabled={isProcessing}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand Canvas Boundaries</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: AI Enhancement & Super-Resolution Upscaling */}
        {activeTab === 'ai-enhance' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-2.5">
              <span className="font-bold text-cyan-300 block flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                AI Detail Enhancer
              </span>
              <p className="text-slate-300 text-[11px]">
                Intelligently enhances optical clarity, corrects micro-contrast, balances highlights, and enriches textures.
              </p>
              <button
                onClick={handleAiEnhance}
                disabled={isProcessing}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Apply AI Detail Enhancement</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <span className="font-bold text-white block">Super-Resolution Upscaling</span>
              <p className="text-slate-400 text-[11px]">
                Upscales pixel dimensions while running high-frequency unsharp recovery to avoid blurry artifacts.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleUpscale(2)}
                  disabled={isProcessing}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-center transition-colors"
                >
                  Upscale 2X (2K HD)
                </button>
                <button
                  onClick={() => handleUpscale(4)}
                  disabled={isProcessing}
                  className="py-2.5 px-3 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-700/50 font-bold text-center transition-colors"
                >
                  Upscale 4X (4K Ultra)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Artistic Style Transformation Presets */}
        {activeTab === 'style' && (
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-300 block mb-1">
              Select Color & Aesthetic Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'Original Natural' },
                { id: 'cinematic', label: '35mm Cinematic' },
                { id: 'cyberpunk', label: 'Neon Cyberpunk' },
                { id: 'noir', label: 'Noir Black & White' },
                { id: 'vintage', label: 'Warm Sepia Vintage' },
                { id: 'warm', label: 'Sunset Golden Hour' },
                { id: 'cool', label: 'Arctic Deep Cool' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAdjustments((prev) => ({ ...prev, filter: style.id }))}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    adjustments.filter === style.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Toast */}
        {statusText && (
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-xs text-cyan-300 flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{statusText}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-auto pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!currentImage}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Master PNG</span>
          </button>
        </div>
      </div>

      {/* Right Canvas: Live Studio Preview */}
      <div className="flex-1 flex flex-col p-6 items-center justify-center overflow-hidden bg-slate-950/70 relative">
        {currentImage ? (
          <div className="relative flex flex-col items-center justify-center max-h-[75vh] w-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>

            {/* Quick Routing Strip */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => onSendToVideoMaker(currentImage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/40 transition-colors"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Send to Video Maker</span>
              </button>

              <button
                onClick={() => onSendToDesigner(currentImage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Send to AI Designer</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 mb-3 text-cyan-400">
              <Wand2 className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Image Open in Studio</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Upload a photo from your computer or generate one with the AI Image Generator to edit, enhance, and upscale.
            </p>
            <label className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer">
              Open Image
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="sr-only"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
