import React from 'react';
import { Logo } from './Logo';
import { AppView } from '../../types';
import {
  Wand2,
  Sparkles,
  Film,
  Layout,
  Bot,
  FolderKanban,
  Settings,
  Info,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  projectsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenSettings,
  onOpenAbout,
  projectsCount = 0,
}) => {
  const navItems: { id: AppView; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'videomaker',
      label: 'Video Maker',
      icon: <Film className="w-4 h-4" />,
      badge: 'PRO',
    },
    {
      id: 'generator',
      label: 'Image Generator',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'studio',
      label: 'Creative Studio',
      icon: <Wand2 className="w-4 h-4" />,
    },
    {
      id: 'designer',
      label: 'AI Designer',
      icon: <Layout className="w-4 h-4" />,
    },
    {
      id: 'assistant',
      label: 'AI Assistant',
      icon: <Bot className="w-4 h-4" />,
    },
    {
      id: 'gallery',
      label: 'Projects',
      icon: <FolderKanban className="w-4 h-4" />,
      badge: projectsCount > 0 ? String(projectsCount) : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div
          onClick={() => onNavigate('videomaker')}
          className="cursor-pointer group flex items-center gap-2"
        >
          <Logo size="sm" showSubtitle={true} showCreator={false} />
          <div className="hidden xl:flex flex-col border-l border-slate-800 pl-3 ml-1">
            <span className="text-[10px] text-slate-400 font-medium">Created by</span>
            <span className="text-[11px] text-cyan-300 font-semibold tracking-tight">
              Ahmad Samim Rahmani
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition-colors"
            title="Studio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAbout}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition-colors"
            title="About Niksa AI Studio"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
