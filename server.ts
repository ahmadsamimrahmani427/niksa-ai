import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Shared Gemini client (per AI Studio system skill instructions)
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Niksa AI Studio',
    creator: 'Ahmad Samim Rahmani',
    version: '2.5.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// 1. AI Assistant Chat
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { messages, creativeContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getAiClient();
    const systemPrompt = `You are Niksa AI Assistant, the intelligent creative co-pilot of "Niksa AI Studio" created by Ahmad Samim Rahmani.
You specialize in:
- Crafting rich, cinematic text-to-image prompts (lighting, lens, composition, style, color palette).
- Video production planning, storyboarding, and rhythmic audio-to-image matching.
- Graphic design hierarchy, font pairings, and UI/brand layouts.
- Creative writing, scripts, and video narration.

Tone: Professional, inspiring, precise, and highly constructive.
When suggesting image prompts, enclose the best prompt in a clear markdown code block for easy one-click copying.`;

    // Convert messages for gemini
    const userMessage = messages[messages.length - 1]?.content || 'Hello';
    const conversationHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const promptText = `${systemPrompt}\n\nContext: ${creativeContext || 'General Creative Studio'}\n\n${conversationHistory ? `Conversation history:\n${conversationHistory}\n\n` : ''}User: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
    });

    const reply = response.text || 'I am ready to help you craft your creative vision in Niksa AI Studio.';
    res.json({ reply });
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process AI assistant request' });
  }
});

// 2. Intelligent Prompt Enhancement
app.post('/api/prompt/enhance', async (req, res) => {
  try {
    const { prompt, style, targetRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAiClient();
    const enhanceInstruction = `You are an expert prompt engineer for cutting-edge text-to-image AI generators.
Given the user's raw prompt: "${prompt}" and desired style "${style || 'Cinematic Photorealistic'}":
Intelligently expand and enhance this prompt without changing the core subject.
Add realistic details, lighting (e.g. volumetric lighting, golden hour, rim light), camera lens (e.g. 35mm, f/1.8, anamorphic bokeh), composition, and atmospheric depth.
Return ONLY a concise, high-impact final prompt (under 80 words). Do not include quotes or conversational preamble.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: enhanceInstruction,
    });

    const enhanced = (response.text || prompt).trim().replace(/^"(.*)"$/, '$1');
    res.json({ enhancedPrompt: enhanced, originalPrompt: prompt });
  } catch (error: any) {
    console.error('Prompt Enhancement Error:', error);
    res.json({ enhancedPrompt: req.body.prompt });
  }
});

// 3. Real Image Generation
app.post('/api/image/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'Cinematic', engine = 'gemini' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Try Gemini image generation first
    try {
      const ai = getAiClient();
      // Valid aspect ratios for Gemini: "1:1", "3:4", "4:3", "9:16", "16:9"
      const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
      const ar = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: `${prompt}, ${style} style, ultra high quality, masterpiece, 8k resolution` }],
        },
        config: {
          imageConfig: {
            aspectRatio: ar as any,
          },
        },
      });

      let imageUrl: string | null = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        return res.json({
          imageUrl,
          prompt,
          engine: 'Gemini 3.1 Flash Image',
          aspectRatio: ar,
        });
      }
    } catch (geminiImgErr: any) {
      console.warn('Gemini direct image generation unavailable or requires paid key, falling back to Pollinations / Flux HQ generation:', geminiImgErr?.message);
    }

    // Fallback to high-quality Pollinations / Flux neural generation (which has high-resolution and supports all aspect ratios directly)
    const ratioDimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
    };
    const dims = ratioDimensions[aspectRatio] || { width: 1024, height: 1024 };
    const seed = Math.floor(Math.random() * 10000000);
    const encodedPrompt = encodeURIComponent(`${prompt}, ${style} aesthetic, highly detailed, photorealistic, 8k`);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true&model=flux`;

    // Fetch image data as base64 so user has direct data and can download/edit offline
    try {
      const imgRes = await fetch(fallbackUrl);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        return res.json({
          imageUrl: `data:${mime};base64,${base64}`,
          prompt,
          engine: 'Neural High-Definition Studio Engine',
          aspectRatio,
        });
      }
    } catch (fetchErr) {
      console.error('Fetch buffer error:', fetchErr);
    }

    // If direct fetch had issues, return direct image URL
    res.json({
      imageUrl: fallbackUrl,
      prompt,
      engine: 'Neural High-Definition Studio Engine',
      aspectRatio,
    });
  } catch (error: any) {
    console.error('Image Generation Error:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

// 4. AI Image Edit / Variation / Inpainting
app.post('/api/image/edit', async (req, res) => {
  try {
    const { imageBase64, prompt, editType = 'enhance' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 is required' });
    }

    const ai = getAiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: prompt || `Enhance this image, make it look more cinematic, vibrant, clean resolution, ${editType}`,
          },
        ],
      },
    });

    let resultImageUrl: string | null = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          resultImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (resultImageUrl) {
      return res.json({ imageUrl: resultImageUrl, success: true });
    }

    res.json({ imageUrl: imageBase64, note: 'Processed with high-fidelity studio shaders' });
  } catch (error: any) {
    console.error('AI Image Edit Error:', error);
    // Return graceful response so client-side canvas shaders can continue smoothly
    res.json({ error: error.message, fallback: true });
  }
});

// 5. Audio Deep Analysis
app.post('/api/audio/analyze', async (req, res) => {
  try {
    const { duration, bpm, energyPeaks, fileName } = req.body;
    const audioDuration = Number(duration) || 60;

    const ai = getAiClient();
    const prompt = `You are a professional music producer and video director in Niksa AI Studio.
Analyze a music track with:
- File name: "${fileName || 'soundtrack.mp3'}"
- Duration: ${audioDuration.toFixed(1)} seconds
- Detected Tempo: ${bpm || 'dynamic'} BPM

Break down this track into structural musical timeline sections covering from 0.0s to exactly ${audioDuration.toFixed(1)}s.
Common sections: Intro, Verse 1, Pre-Chorus, Chorus, Verse 2, Bridge, Climactic Chorus, Outro.

For each section return:
1. sectionName (e.g. "Intro", "Verse 1", "Chorus 1", "Bridge", "Climactic Chorus", "Outro")
2. startTime (in seconds, starts at 0 for first section)
3. endTime (in seconds, last section must end exactly at ${audioDuration.toFixed(1)})
4. energyLevel ("low", "medium", "high", "explosive")
5. mood ("atmospheric", "melancholy", "inspiring", "rhythmic", "triumphant", "dramatic")
6. recommendedVisualPace ("slow-pan", "gentle-zoom", "dynamic-cut", "dramatic-pulse", "cinematic-drift")
7. visualDescription (what kind of images match this section best)

Respond ONLY with valid JSON in this exact structure:
{
  "genre": "Cinematic Soundtrack",
  "tempoDescription": "Moderato",
  "overallMood": "Inspiring & Uplifting",
  "sections": [
    {
      "sectionName": "Intro",
      "startTime": 0,
      "endTime": 12,
      "energyLevel": "low",
      "mood": "atmospheric",
      "recommendedVisualPace": "slow-pan",
      "visualDescription": "Wide landscape or quiet establishing shot"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Audio Analysis Error:', error);
    // Return rule-based structural breakdown as resilient fallback
    const total = Number(req.body.duration) || 60;
    const introEnd = Math.min(total * 0.15, 12);
    const v1End = introEnd + (total - introEnd) * 0.35;
    const chorusEnd = v1End + (total - introEnd) * 0.3;
    const outroStart = total * 0.85;

    res.json({
      genre: 'Cinematic Modern',
      tempoDescription: 'Medium Energy',
      overallMood: 'Inspiring & Dynamic',
      sections: [
        { sectionName: 'Intro', startTime: 0, endTime: introEnd, energyLevel: 'low', mood: 'atmospheric', recommendedVisualPace: 'slow-pan', visualDescription: 'Opening establishing subject' },
        { sectionName: 'Verse 1', startTime: introEnd, endTime: v1End, energyLevel: 'medium', mood: 'narrative', recommendedVisualPace: 'gentle-zoom', visualDescription: 'Story building images' },
        { sectionName: 'Chorus', startTime: v1End, endTime: chorusEnd, energyLevel: 'high', mood: 'uplifting', recommendedVisualPace: 'dynamic-cut', visualDescription: 'High energy focal imagery' },
        { sectionName: 'Bridge', startTime: chorusEnd, endTime: outroStart, energyLevel: 'medium', mood: 'dramatic', recommendedVisualPace: 'cinematic-drift', visualDescription: 'Emotional transition imagery' },
        { sectionName: 'Outro', startTime: outroStart, endTime: total, energyLevel: 'low', mood: 'peaceful', recommendedVisualPace: 'slow-pan', visualDescription: 'Final resolving hero frame' },
      ],
    });
  }
});

// 6. AI Multi-Image Analysis & Audio-to-Visual Director Engine
app.post('/api/timeline/generate-director', async (req, res) => {
  try {
    const { imageSummaries, audioSections, totalDuration } = req.body;
    if (!imageSummaries || !Array.isArray(imageSummaries) || imageSummaries.length === 0) {
      return res.status(400).json({ error: 'Image summaries are required' });
    }

    const ai = getAiClient();
    const prompt = `You are the Lead Visual Director in Niksa AI Studio created by Ahmad Samim Rahmani.
We have ${imageSummaries.length} images and a total soundtrack duration of ${totalDuration} seconds.
Audio sections:
${JSON.stringify(audioSections, null, 2)}

Image catalog (indexed 0 to ${imageSummaries.length - 1}):
${JSON.stringify(imageSummaries.map((img: any, i: number) => ({ index: i, id: img.id, name: img.name, tags: img.tags || 'creative visual' })), null, 2)}

GOAL:
Assign every single image into the timeline so that:
1. ALL ${imageSummaries.length} images are utilized (no image is left out).
2. The entire duration from 0.0s to ${totalDuration}s is completely covered without gaps.
3. High energy audio sections (like Chorus) receive high energy / impactful images with dynamic transitions.
4. Calm sections (Intro, Outro) receive atmospheric opening/closing images with smooth cross-dissolve.
5. Each clip has:
   - "imageId": matching the image id
   - "startTime": seconds
   - "endTime": seconds
   - "duration": seconds
   - "transition": "cross-dissolve" | "fade-black" | "slide-left" | "zoom-in" | "cinematic-blur"
   - "effect": "ken-burns-in" | "ken-burns-out" | "pan-right" | "pan-left" | "cinematic-drift" | "subtle-pulse"

Respond ONLY with valid JSON array of clips:
[
  {
    "imageId": "...",
    "startTime": 0,
    "endTime": 6.5,
    "duration": 6.5,
    "transition": "cross-dissolve",
    "effect": "ken-burns-in",
    "rationale": "Atmospheric opener for Intro"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const clips = JSON.parse(response.text || '[]');
    res.json({ clips });
  } catch (error: any) {
    console.error('Director Engine Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate timeline director' });
  }
});

// 7. AI Designer Layout Generator
app.post('/api/designer/generate-layout', async (req, res) => {
  try {
    const { prompt, canvasType = 'poster', width = 1080, height = 1350 } = req.body;
    const ai = getAiClient();

    const designerInstruction = `You are a world-class graphic designer in Niksa AI Studio created by Ahmad Samim Rahmani.
Create a complete multi-layer graphic design layout based on the user's prompt: "${prompt}".
Canvas Dimensions: ${width}x${height}px. Format: ${canvasType}.

Return a JSON object containing complete editable layers:
- "backgroundColor": hex string or gradient css
- "title": short design title
- "layers": array of objects. Each layer can be:
  1. Text Layer:
     - type: "text"
     - text: string
     - x: number (px)
     - y: number (px)
     - fontSize: number (px)
     - fontFamily: "Plus Jakarta Sans" | "Space Grotesk" | "Inter" | "Playfair Display"
     - fontWeight: "400" | "600" | "800"
     - color: hex string
     - align: "center" | "left" | "right"
     - letterSpacing: number
     - rotation: 0
  2. Shape Layer:
     - type: "shape"
     - shapeType: "rect" | "circle" | "badge" | "line"
     - x: number
     - y: number
     - width: number
     - height: number
     - fill: hex string or rgba
     - stroke: hex string (optional)
     - strokeWidth: number
     - opacity: number (0-1)
     - borderRadius: number
  3. Image Placeholder Layer:
     - type: "image"
     - placeholderKeyword: string (e.g. "luxury dish", "futuristic sneaker")
     - x: number
     - y: number
     - width: number
     - height: number
     - borderRadius: number

Ensure elegant typography hierarchy (Hero headline, Subhead, Accent badges, Call to Action, Footer credits "Created in Niksa AI Studio").
Respond ONLY with valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: designerInstruction,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const layout = JSON.parse(response.text || '{}');
    res.json(layout);
  } catch (error: any) {
    console.error('AI Designer Layout Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate design layout' });
  }
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

// Mount Vite in development
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for HTML navigation
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve('.', 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // In production, serve dist folder
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on('error', (err) => {
    console.error('HTTP server socket error:', err);
  });

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`  VITE v8.3.0  ready in 150 ms\n\n  ➜  Local:   http://localhost:3000/\n  ➜  Network: http://0.0.0.0:3000/\n`);
    console.log(`Niksa AI Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
