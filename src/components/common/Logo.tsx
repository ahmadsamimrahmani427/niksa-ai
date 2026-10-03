import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showCreator?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showCreator = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Ribbon 'N' with Sparkle & Pixels */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,180,255,0.35)]"
        >
          <defs>
            <linearGradient id="niksaGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="niksaGradRight" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="40%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="niksaGradCenter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <linearGradient id="niksaStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Left Ribbon stem */}
          <path
            d="M28 88C24 64 26 44 48 34C58 29 65 31 66 38C67 46 54 52 46 62C38 72 32 82 28 88Z"
            fill="url(#niksaGradLeft)"
          />

          {/* Diagonal Swoop Ribbon */}
          <path
            d="M32 86C45 68 62 50 78 40C88 34 94 40 92 52C90 68 76 86 64 92C50 98 38 94 32 86Z"
            fill="url(#niksaGradCenter)"
            opacity="0.9"
          />

          {/* Right Ribbon Stem with folded depth */}
          <path
            d="M62 90C74 86 86 70 88 56C90 44 86 42 78 48C70 54 58 72 52 86C50 91 56 92 62 90Z"
            fill="url(#niksaGradRight)"
          />

          {/* Digital Pixel Cubes (Top Right) */}
          <rect x="88" y="24" width="8" height="8" rx="1.5" fill="#38bdf8" />
          <rect x="98" y="24" width="8" height="8" rx="1.5" fill="#2563eb" />
          <rect x="88" y="34" width="8" height="8" rx="1.5" fill="#8b5cf6" />
          <rect x="98" y="34" width="8" height="8" rx="1.5" fill="#a855f7" />

          {/* Sparkle Star on Left Shoulder */}
          <path
            d="M26 36L28 26L30 36L40 38L30 40L28 50L26 40L16 38L26 36Z"
            fill="url(#niksaStarGrad)"
            filter="drop-shadow(0 0 6px rgba(255,255,255,0.8))"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-extrabold tracking-tight text-white font-['Space_Grotesk'] ${titleSizes[size]}`}>
            Niksa
          </span>
          <span className={`font-medium tracking-wider text-cyan-400 font-['Space_Grotesk'] ${titleSizes[size]}`}>
            AI
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`font-semibold uppercase tracking-[0.2em] text-slate-400 mt-0.5 ${subSizes[size]}`}
          >
            Studio
          </span>
        )}
        {showCreator && (
          <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
            By Ahmad Samim Rahmani
          </span>
        )}
      </div>
    </div>
  );
};
