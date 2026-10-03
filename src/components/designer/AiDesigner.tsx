import React, { useState, useRef, useEffect } from 'react';
import {
  DesignProject,
  DesignLayer,
  TextDesignLayer,
  ShapeDesignLayer,
  ImageDesignLayer,
  StudioImage,
  AppSettings,
} from '../../types';
import { ImageProcessingService } from '../../services/imageProcessingService';
import {
  Layout,
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Sparkles,
  Download,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo2,
  Redo2,
  Wand2,
  Loader2,
  ChevronDown,
  Check,
} from 'lucide-react';

interface AiDesignerProps {
  initialImage?: StudioImage | null;
  onSaveDesign: (project: DesignProject) => void;
  settings: AppSettings;
}

export const AiDesigner: React.FC<AiDesignerProps> = ({
  initialImage,
  onSaveDesign,
  settings,
}) => {
  // Canvas Dimensions & Project State
  const [canvasWidth, setCanvasWidth] = useState<number>(1080);
  const [canvasHeight, setCanvasHeight] = useState<number>(1350);
  const [canvasBg, setCanvasBg] = useState<string>('#090d16');
  const [projectTitle, setProjectTitle] = useState<string>('Luxury Brand Poster');
  const [zoom, setZoom] = useState<number>(0.55);

  // Layers & Selection
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Dragging State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [layerStartPos, setLayerStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState<string>('Luxury modern Italian restaurant dinner poster');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<DesignLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Initialize with starter design template or uploaded image
  useEffect(() => {
    if (layers.length === 0) {
      loadTemplate('poster');
    }
  }, []);

  // If initial image provided from another studio, add it as a layer
  useEffect(() => {
    if (initialImage) {
      addImageLayer(initialImage.url, initialImage.name);
    }
  }, [initialImage]);

  // Save history state
  const pushHistory = (newLayers: DesignLayer[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newLayers);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setLayers(newLayers);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers(history[historyIndex + 1]);
    }
  };

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  /**
   * Update layer properties
   */
  const updateLayer = (id: string, updates: Partial<DesignLayer>) => {
    const updated = layers.map((layer) =>
      layer.id === id ? ({ ...layer, ...updates } as DesignLayer) : layer
    );
    pushHistory(updated);
  };

  /**
   * Add Text Layer
   */
  const addTextLayer = () => {
    const newText: TextDesignLayer = {
      id: `text_${Date.now()}`,
      name: 'Headline Text',
      type: 'text',
      text: 'NIKSA AI STUDIO',
      x: canvasWidth / 2 - 250,
      y: canvasHeight / 2 - 40,
      width: 500,
      height: 80,
      fontSize: 52,
      fontFamily: 'Space Grotesk',
      fontWeight: '800',
      color: '#ffffff',
      textAlign: 'center',
      letterSpacing: 2,
      lineHeight: 1.1,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      glow: true,
    };
    pushHistory([...layers, newText]);
    setSelectedLayerId(newText.id);
  };

  /**
   * Add Shape Layer
   */
  const addShapeLayer = (shapeType: 'rect' | 'circle' | 'badge') => {
    const newShape: ShapeDesignLayer = {
      id: `shape_${Date.now()}`,
      name: `${shapeType.toUpperCase()} Shape`,
      type: 'shape',
      shapeType,
      x: canvasWidth / 2 - 150,
      y: canvasHeight / 2 - 100,
      width: 300,
      height: shapeType === 'circle' ? 300 : 200,
      fill: 'rgba(56, 189, 248, 0.25)',
      stroke: '#38bdf8',
      strokeWidth: 2,
      borderRadius: shapeType === 'rect' ? 24 : 0,
      rotation: 0,
      opacity: 0.9,
      visible: true,
      locked: false,
    };
    pushHistory([...layers, newShape]);
    setSelectedLayerId(newShape.id);
  };

  /**
   * Add Image Layer
   */
  const addImageLayer = (url: string, name: string = 'Image Layer') => {
    const newImage: ImageDesignLayer = {
      id: `img_${Date.now()}`,
      name,
      type: 'image',
      imageUrl: url,
      x: canvasWidth / 2 - 200,
      y: canvasHeight / 2 - 200,
      width: 400,
      height: 400,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      mask: 'rounded',
    };
    pushHistory([...layers, newImage]);
    setSelectedLayerId(newImage.id);
  };

  /**
   * Delete Layer
   */
  const handleDeleteLayer = (id: string) => {
    const updated = layers.filter((l) => l.id !== id);
    pushHistory(updated);
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  /**
   * Duplicate Layer
   */
  const handleDuplicateLayer = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const duplicated: DesignLayer = {
      ...target,
      id: `${target.type}_${Date.now()}`,
      name: `${target.name} Copy`,
      x: target.x + 30,
      y: target.y + 30,
    };
    pushHistory([...layers, duplicated]);
    setSelectedLayerId(duplicated.id);
  };

  /**
   * Reorder Layers
   */
  const moveLayerOrder = (id: string, direction: 'up' | 'down') => {
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;

    const reordered = [...layers];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    pushHistory(reordered);
  };

  /**
   * Load Curated Design Templates
   */
  const loadTemplate = (type: 'poster' | 'social' | 'youtube' | 'minimal') => {
    if (type === 'poster') {
      setCanvasWidth(1080);
      setCanvasHeight(1350);
      setCanvasBg('#060913');
      const sampleLayers: DesignLayer[] = [
        {
          id: 'shape_bg_card',
          name: 'Center Glass Card',
          type: 'shape',
          shapeType: 'rect',
          x: 90,
          y: 120,
          width: 900,
          height: 1110,
          fill: 'rgba(15, 23, 42, 0.65)',
          stroke: 'rgba(56, 189, 248, 0.3)',
          strokeWidth: 2,
          borderRadius: 36,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'text_tag',
          name: 'Tagline Badge',
          type: 'text',
          text: 'EXCLUSIVE CHEF TASTING • 2026',
          x: 140,
          y: 200,
          width: 800,
          height: 40,
          fontSize: 20,
          fontFamily: 'Space Grotesk',
          fontWeight: '600',
          color: '#38bdf8',
          textAlign: 'center',
          letterSpacing: 4,
          lineHeight: 1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'text_headline',
          name: 'Hero Title',
          type: 'text',
          text: 'L’ARTE CULINARIA',
          x: 140,
          y: 270,
          width: 800,
          height: 100,
          fontSize: 68,
          fontFamily: 'Space Grotesk',
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: 3,
          lineHeight: 1.1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          glow: true,
        },
        {
          id: 'text_sub',
          name: 'Subtitle',
          type: 'text',
          text: 'A gastronomic sensory journey through modern Mediterranean flavours & vintage selections.',
          x: 190,
          y: 400,
          width: 700,
          height: 80,
          fontSize: 24,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: '400',
          color: '#cbd5e1',
          textAlign: 'center',
          letterSpacing: 0.5,
          lineHeight: 1.4,
          rotation: 0,
          opacity: 0.9,
          visible: true,
          locked: false,
        },
        {
          id: 'shape_cta',
          name: 'CTA Button',
          type: 'shape',
          shapeType: 'rect',
          x: 340,
          y: 980,
          width: 400,
          height: 80,
          fill: '#38bdf8',
          stroke: '#67e8f9',
          strokeWidth: 1,
          borderRadius: 20,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'text_cta',
          name: 'CTA Text',
          type: 'text',
          text: 'RESERVE TABLE',
          x: 340,
          y: 1005,
          width: 400,
          height: 40,
          fontSize: 22,
          fontFamily: 'Space Grotesk',
          fontWeight: '800',
          color: '#020617',
          textAlign: 'center',
          letterSpacing: 3,
          lineHeight: 1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'text_footer',
          name: 'Footer Credits',
          type: 'text',
          text: 'Niksa AI Studio • Designed by Ahmad Samim Rahmani',
          x: 140,
          y: 1140,
          width: 800,
          height: 30,
          fontSize: 14,
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: '500',
          color: '#64748b',
          textAlign: 'center',
          letterSpacing: 1,
          lineHeight: 1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
      ];
      pushHistory(sampleLayers);
    } else if (type === 'youtube') {
      setCanvasWidth(1280);
      setCanvasHeight(720);
      setCanvasBg('#0a0a14');
      const ytLayers: DesignLayer[] = [
        {
          id: 'yt_badge',
          name: 'Category Badge',
          type: 'shape',
          shapeType: 'rect',
          x: 80,
          y: 140,
          width: 220,
          height: 50,
          fill: '#ef4444',
          borderRadius: 12,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'yt_badge_txt',
          name: 'Badge Text',
          type: 'text',
          text: 'NEW RELEASE',
          x: 80,
          y: 155,
          width: 220,
          height: 30,
          fontSize: 18,
          fontFamily: 'Space Grotesk',
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: 2,
          lineHeight: 1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
        },
        {
          id: 'yt_title',
          name: 'Thumb Title',
          type: 'text',
          text: 'CREATE COMPLETE\nAI VIDEOS IN SECONDS',
          x: 80,
          y: 220,
          width: 850,
          height: 200,
          fontSize: 64,
          fontFamily: 'Space Grotesk',
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'left',
          letterSpacing: 1,
          lineHeight: 1.1,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          glow: true,
        },
      ];
      pushHistory(ytLayers);
    }
  };

  /**
   * AI Layout Generator: Prompt to multi-layer design
   */
  const handleAiGenerateLayout = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setIsAiGenerating(true);
      const res = await fetch('/api/designer/generate-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          canvasType: 'poster',
          width: canvasWidth,
          height: canvasHeight,
        }),
      });

      if (!res.ok) throw new Error('AI layout generator request failed');
      const data = await res.json();

      if (data.backgroundColor) setCanvasBg(data.backgroundColor);
      if (data.title) setProjectTitle(data.title);

      if (data.layers && Array.isArray(data.layers)) {
        const generated: DesignLayer[] = data.layers.map((l: any, i: number) => ({
          ...l,
          id: `ai_layer_${Date.now()}_${i}`,
          name: l.name || `${l.type} Layer ${i + 1}`,
          visible: true,
          locked: false,
          opacity: l.opacity ?? 1,
          rotation: l.rotation ?? 0,
        }));
        pushHistory(generated);
      }
    } catch (err: any) {
      console.error('AI Layout Error:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  /**
   * Export Canvas to High-Res Image (PNG)
   */
  const handleExportCanvas = async () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw layers in order
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;

      if (layer.rotation) {
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-(layer.x + layer.width / 2), -(layer.y + layer.height / 2));
      }

      if (layer.type === 'shape') {
        const s = layer as ShapeDesignLayer;
        ctx.fillStyle = s.fill || '#38bdf8';
        if (s.shapeType === 'circle') {
          ctx.beginPath();
          ctx.arc(s.x + s.width / 2, s.y + s.height / 2, s.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(s.x, s.y, s.width, s.height);
        }
      } else if (layer.type === 'text') {
        const t = layer as TextDesignLayer;
        ctx.font = `${t.fontWeight || '700'} ${t.fontSize}px "${t.fontFamily || 'sans-serif'}"`;
        ctx.fillStyle = t.color || '#ffffff';
        ctx.textAlign = t.textAlign || 'center';

        const textX = t.textAlign === 'center' ? t.x + t.width / 2 : t.textAlign === 'right' ? t.x + t.width : t.x;
        ctx.fillText(t.text, textX, t.y + t.fontSize);
      } else if (layer.type === 'image') {
        const imgLayer = layer as ImageDesignLayer;
        try {
          const loadedImg = await ImageProcessingService.loadImage(imgLayer.imageUrl);
          ctx.drawImage(loadedImg, imgLayer.x, imgLayer.y, imgLayer.width, imgLayer.height);
        } catch {}
      }

      ctx.restore();
    }

    // Optional Watermark
    if (settings.watermark) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Niksa AI Studio • Created by Ahmad Samim Rahmani', canvasWidth - 420, canvasHeight - 24);
    }

    const dataUrl = exportCanvas.toDataURL('image/png', 0.98);
    ImageProcessingService.downloadImage(dataUrl, `niksa_design_${Date.now()}.png`);

    onSaveDesign({
      id: `design_${Date.now()}`,
      title: projectTitle,
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: canvasBg,
      layers,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Design Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-cyan-400" />
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-1 py-0.5"
            />
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 text-xs text-slate-400">
            <span>Size:</span>
            <span className="font-mono text-cyan-300 font-semibold">{canvasWidth}x{canvasHeight}</span>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Add Elements Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={addTextLayer}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Text</span>
          </button>

          <button
            onClick={() => addShapeLayer('rect')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            <Square className="w-3.5 h-3.5 text-purple-400" />
            <span>Rectangle</span>
          </button>

          <button
            onClick={() => addShapeLayer('circle')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            <Circle className="w-3.5 h-3.5 text-sky-400" />
            <span>Circle</span>
          </button>

          <label className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = () => addImageLayer(r.result as string, file.name);
                r.readAsDataURL(file);
              }}
              className="sr-only"
            />
          </label>
        </div>

        {/* Right: Export & Templates */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTemplate('poster')}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300"
          >
            Poster
          </button>

          <button
            onClick={() => loadTemplate('youtube')}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300"
          >
            YouTube
          </button>

          <button
            onClick={handleExportCanvas}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Design</span>
          </button>
        </div>
      </div>

      {/* Main Studio Center: Left AI Assistant Panel + Middle Interactive Canvas + Right Layer Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: AI Design Generator & Background Controls */}
        <div className="w-72 border-r border-slate-800/80 bg-slate-900/40 p-4 overflow-y-auto hidden md:flex flex-col gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 space-y-2.5">
            <span className="font-bold text-cyan-300 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              AI Design Assistant
            </span>
            <p className="text-slate-400 text-[11px]">
              Type any concept and AI will generate typography, shapes, and hierarchy.
            </p>
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Cyberpunk tech conference flyer..."
              className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs resize-none focus:border-cyan-400 focus:outline-none"
            />
            <button
              onClick={handleAiGenerateLayout}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isAiGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>Generate AI Layout</span>
            </button>
          </div>

          {/* Canvas Background Color */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-300 block">Canvas Background</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={canvasBg.startsWith('#') ? canvasBg : '#090d16'}
                onChange={(e) => setCanvasBg(e.target.value)}
                className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-slate-400 text-xs">{canvasBg}</span>
            </div>
          </div>
        </div>

        {/* Center: Interactive Canvas Board */}
        <div
          className="flex-1 bg-slate-950/80 p-6 flex items-center justify-center overflow-auto relative"
          onClick={() => setSelectedLayerId(null)}
        >
          {/* Zoom Float Control */}
          <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs">
            <button
              onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
              className="p-1 hover:text-white text-slate-400"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-cyan-300 font-bold px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              className="p-1 hover:text-white text-slate-400"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actual Scaled Artboard */}
          <div
            ref={canvasRef}
            style={{
              width: `${canvasWidth * zoom}px`,
              height: `${canvasHeight * zoom}px`,
              backgroundColor: canvasBg,
            }}
            className="relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-800 transition-all select-none overflow-hidden"
          >
            {/* Render Layers */}
            {layers.map((layer) => {
              if (!layer.visible) return null;
              const isSelected = selectedLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLayerId(layer.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedLayerId(layer.id);
                    if (layer.locked) return;
                    setIsDragging(true);
                    setDragStart({ x: e.clientX, y: e.clientY });
                    setLayerStartPos({ x: layer.x, y: layer.y });
                  }}
                  style={{
                    position: 'absolute',
                    left: `${layer.x * zoom}px`,
                    top: `${layer.y * zoom}px`,
                    width: `${layer.width * zoom}px`,
                    height: `${layer.height * zoom}px`,
                    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                    opacity: layer.opacity ?? 1,
                  }}
                  className={`cursor-move transition-shadow ${
                    isSelected
                      ? 'outline outline-2 outline-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] z-30'
                      : 'hover:outline hover:outline-1 hover:outline-slate-600'
                  }`}
                >
                  {/* Layer Content */}
                  {layer.type === 'shape' && (
                    <div
                      style={{
                        backgroundColor: (layer as ShapeDesignLayer).fill,
                        border: (layer as ShapeDesignLayer).stroke
                          ? `${(layer as ShapeDesignLayer).strokeWidth || 1}px solid ${(layer as ShapeDesignLayer).stroke}`
                          : undefined,
                        borderRadius:
                          (layer as ShapeDesignLayer).shapeType === 'circle'
                            ? '50%'
                            : `${((layer as ShapeDesignLayer).borderRadius || 0) * zoom}px`,
                      }}
                      className="w-full h-full"
                    />
                  )}

                  {layer.type === 'text' && (
                    <div
                      style={{
                        fontSize: `${(layer as TextDesignLayer).fontSize * zoom}px`,
                        fontFamily: (layer as TextDesignLayer).fontFamily,
                        fontWeight: (layer as TextDesignLayer).fontWeight,
                        color: (layer as TextDesignLayer).color,
                        textAlign: (layer as TextDesignLayer).textAlign,
                        letterSpacing: `${((layer as TextDesignLayer).letterSpacing || 0) * zoom}px`,
                        lineHeight: (layer as TextDesignLayer).lineHeight,
                        textShadow: (layer as TextDesignLayer).glow
                          ? '0 0 15px rgba(56,189,248,0.6)'
                          : undefined,
                      }}
                      className="w-full h-full flex items-center justify-center p-1 leading-tight break-words select-none"
                    >
                      {(layer as TextDesignLayer).text}
                    </div>
                  )}

                  {layer.type === 'image' && (
                    <img
                      src={(layer as ImageDesignLayer).imageUrl}
                      alt={layer.name}
                      className="w-full h-full object-cover rounded-xl pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Layer List & Property Inspector */}
        <div className="w-80 border-l border-slate-800/80 bg-slate-900/40 p-4 overflow-y-auto flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              Layer Stack ({layers.length})
            </span>
          </div>

          {/* Layer List */}
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {layers
              .slice()
              .reverse()
              .map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white font-semibold'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate text-xs flex-1">{layer.name}</span>
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { visible: !layer.visible });
                        }}
                        className="hover:text-white"
                        title={layer.visible ? 'Hide' : 'Show'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { locked: !layer.locked });
                        }}
                        className="hover:text-white"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Selected Layer Inspector */}
          {selectedLayer ? (
            <div className="pt-3 border-t border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-[11px]">
                  {selectedLayer.type} Properties
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveLayerOrder(selectedLayer.id, 'up')}
                    className="p-1 hover:text-white text-slate-400"
                    title="Bring forward"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveLayerOrder(selectedLayer.id, 'down')}
                    className="p-1 hover:text-white text-slate-400"
                    title="Send backward"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateLayer(selectedLayer.id)}
                    className="p-1 hover:text-white text-slate-400"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLayer(selectedLayer.id)}
                    className="p-1 hover:text-rose-400 text-slate-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text-Specific Controls */}
              {selectedLayer.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Text Content</label>
                    <textarea
                      rows={2}
                      value={(selectedLayer as TextDesignLayer).text}
                      onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Font Size</label>
                      <input
                        type="number"
                        value={(selectedLayer as TextDesignLayer).fontSize}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 12 })
                        }
                        className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Color</label>
                      <input
                        type="color"
                        value={(selectedLayer as TextDesignLayer).color || '#ffffff'}
                        onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                        className="w-full h-8 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Shape-Specific Controls */}
              {selectedLayer.type === 'shape' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Fill Color</label>
                    <input
                      type="color"
                      value={(selectedLayer as ShapeDesignLayer).fill.startsWith('#') ? (selectedLayer as ShapeDesignLayer).fill : '#38bdf8'}
                      onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                      className="w-full h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* General Layer Sizing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.width)}
                    onChange={(e) => updateLayer(selectedLayer.id, { width: parseInt(e.target.value) || 20 })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.height)}
                    onChange={(e) => updateLayer(selectedLayer.id, { height: parseInt(e.target.value) || 20 })}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-slate-500 text-xs">
              Click any element on the canvas to edit text, color, position, and sizing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
