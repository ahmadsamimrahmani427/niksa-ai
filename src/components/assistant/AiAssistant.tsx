import React, { useState } from 'react';
import { AssistantMessage, StudioImage } from '../../types';
import {
  Bot,
  Send,
  Sparkles,
  Wand2,
  Film,
  Layout,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';

interface AiAssistantProps {
  onSendToGenerator: (prompt: string) => void;
  onSendToDesigner: (prompt: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  onSendToGenerator,
  onSendToDesigner,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        'Hello! I am your Niksa AI Creative Assistant. How can I assist you with image generation prompts, video storyboards, color palettes, or layout concepts today?',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickPrompts = [
    {
      title: 'Cinematic Portrait Prompt',
      prompt: 'Suggest an ultra-detailed cinematic portrait prompt with dramatic rim lighting and 35mm lens anamorphic bokeh.',
    },
    {
      title: 'Video Storyboard Concept',
      prompt: 'Create a 5-scene visual storyboard sequence for an atmospheric sci-fi music track with rising emotional chorus.',
    },
    {
      title: 'Luxury Brand Palette',
      prompt: 'Provide a sophisticated color palette and font pairing for an exclusive luxury fragrance poster.',
    },
    {
      title: 'Social Video Hook Script',
      prompt: 'Write a high-retention 15-second opening hook and visual cues for a creative tech showcase video.',
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Assistant endpoint error');
      const data = await res.json();

      // Check if response contains a prompt inside code blocks
      const replyText = data.reply || 'I am ready to help you craft your vision.';
      const codeBlockMatch = replyText.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const extractedPrompt = codeBlockMatch ? codeBlockMatch[1].trim() : undefined;

      const assistantMsg: AssistantMessage = {
        id: `msg_assistant_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
        suggestedPrompt: extractedPrompt,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: 'I apologize, but I encountered an error connecting to the creative engine. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-62px)] bg-slate-950 overflow-hidden text-slate-200">
      {/* Assistant Header */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Niksa Creative Copilot</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                Gemini 3.8
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Prompt ideation, music-to-visual storyboards, and design architecture
            </p>
          </div>
        </div>
      </div>

      {/* Messages Flow Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-900/90 border border-slate-800 rounded-bl-none text-slate-200 shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Action Buttons if AI generated a code-block prompt */}
              {msg.suggestedPrompt && (
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onSendToGenerator(msg.suggestedPrompt!)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Send to Image Generator</span>
                  </button>

                  <button
                    onClick={() => onSendToDesigner(msg.suggestedPrompt!)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-semibold transition-colors"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Send to AI Designer</span>
                  </button>

                  <button
                    onClick={() => copyText(msg.id, msg.suggestedPrompt!)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 rounded-bl-none flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Niksa Copilot thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Starters */}
      {messages.length <= 2 && (
        <div className="px-6 py-2 max-w-4xl w-full mx-auto">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-2">
            Suggested Creative Inquiries
          </span>
          <div className="grid grid-cols-2 gap-2">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-xs">
                    {item.prompt}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors ml-2 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask Niksa Copilot for prompt ideas, audio matching tips, or video scripts..."
            className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 text-slate-950 font-bold hover:from-cyan-300 hover:to-blue-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
