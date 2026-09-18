"use client";

import React from "react";

export interface WaylineLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  variant?: "default" | "app-icon-dark" | "app-icon-light";
  className?: string;
}

export default function WaylineLogo({
  size = "md",
  showText = true,
  showTagline = false,
  variant = "default",
  className = "",
}: WaylineLogoProps) {
  const iconDimensions = {
    sm: { w: 42, h: 20, text: "text-base", sub: "text-[8px]" },
    md: { w: 56, h: 26, text: "text-lg", sub: "text-[9px]" },
    lg: { w: 80, h: 38, text: "text-2xl", sub: "text-[11px]" },
    xl: { w: 120, h: 56, text: "text-4xl", sub: "text-xs" },
  }[size];

  // Precision SVG Icon Component matching exact Wayline Brand mark
  const LogoVector = ({ isAppIcon = false }: { isAppIcon?: boolean }) => (
    <svg
      width={iconDimensions.w}
      height={iconDimensions.h}
      viewBox="0 0 320 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 select-none drop-shadow-sm"
    >
      <defs>
        {/* Left Sand/Stone Ribbon Gradient */}
        <linearGradient id="compStoneGrad" x1="20%" y1="20%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#DAD7C7" />
          <stop offset="45%" stopColor="#C2C0B0" />
          <stop offset="85%" stopColor="#8B9B89" />
          <stop offset="100%" stopColor="#728271" />
        </linearGradient>

        {/* Wave Crest Light Surface */}
        <linearGradient id="compCrestGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B9B89" />
          <stop offset="40%" stopColor="#DAD7C7" />
          <stop offset="85%" stopColor="#E5E3D8" />
          <stop offset="100%" stopColor="#C2C0B0" />
        </linearGradient>

        {/* Under-fold Dark Green Depth Gradient */}
        <linearGradient id="compUnderfoldGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#0B0F0D" />
          <stop offset="35%" stopColor="#1A261C" />
          <stop offset="70%" stopColor="#233527" />
          <stop offset="100%" stopColor="#2C4032" />
        </linearGradient>

        {/* Right Sage/Forest Arch Leg Gradient */}
        <linearGradient id="compRightLegGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#557563" />
          <stop offset="30%" stopColor="#436352" />
          <stop offset="70%" stopColor="#324D3E" />
          <stop offset="100%" stopColor="#1F2F24" />
        </linearGradient>

        {/* Compass Star Light & Shadow Facet Gradients */}
        <linearGradient id="compStarLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F6F4EB" />
          <stop offset="100%" stopColor="#DAD7C7" />
        </linearGradient>

        <linearGradient id="compStarDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B9B89" />
          <stop offset="50%" stopColor="#436352" />
          <stop offset="100%" stopColor="#1F2A1F" />
        </linearGradient>

        <pattern id="compTopoLines" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 0 10 Q 7 4, 15 10 T 30 10 M 0 20 Q 7 14, 15 20 T 30 20" fill="none" stroke="#FFFFFF" strokeWidth="0.75" strokeOpacity="0.18" />
        </pattern>
      </defs>

      {/* Optional App Icon Container */}
      {isAppIcon && (
        <rect
          x="4"
          y="4"
          width="312"
          height="142"
          rx="24"
          fill="transparent"
        />
      )}

      <g id="wayline-mark">
        {/* 1. Left Diagonal Arm */}
        <path
          d="M 36 42 L 72 42 L 108 108 C 104 116, 94 122, 85 120 C 76 118, 70 110, 66 104 L 36 42 Z"
          fill="url(#compStoneGrad)"
        />
        <path
          d="M 36 42 L 72 42 L 108 108 C 104 116, 94 122, 85 120 C 76 118, 70 110, 66 104 L 36 42 Z"
          fill="url(#compTopoLines)"
        />

        {/* 2. Middle Rising Wave */}
        <path
          d="M 85 126 C 98 126, 114 110, 126 90 L 144 58 C 150 48, 158 50, 163 56 L 167 62 C 160 55, 152 56, 147 64 L 128 98 C 117 118, 102 134, 85 126 Z"
          fill="url(#compCrestGrad)"
        />
        <path
          d="M 85 126 C 98 126, 114 110, 126 90 L 144 58 C 150 48, 158 50, 163 56 L 167 62 C 160 55, 152 56, 147 64 L 128 98 C 117 118, 102 134, 85 126 Z"
          fill="url(#compTopoLines)"
        />

        {/* 3. Under-fold Valley */}
        <path
          d="M 148 64 C 153 56, 160 56, 166 62 L 176 76 C 182 86, 172 112, 150 112 C 138 112, 132 102, 138 92 L 148 64 Z"
          fill="url(#compUnderfoldGrad)"
        />

        {/* 4. Right Arch Leg */}
        <path
          d="M 163 76 C 172 60, 192 24, 214 24 C 228 24, 236 34, 240 46 L 278 122 C 280 128, 274 134, 264 132 C 256 130, 252 122, 248 114 L 218 52 C 215 46, 208 44, 202 50 L 172 84 C 166 88, 161 84, 163 76 Z"
          fill="url(#compRightLegGrad)"
        />
        <path
          d="M 163 76 C 172 60, 192 24, 214 24 C 228 24, 236 34, 240 46 L 278 122 C 280 128, 274 134, 264 132 C 256 130, 252 122, 248 114 L 218 52 C 215 46, 208 44, 202 50 L 172 84 C 166 88, 161 84, 163 76 Z"
          fill="url(#compTopoLines)"
        />

        {/* 5. Cream Wayline Track Line & Pin Node */}
        <path
          d="M 163 88 C 170 78, 196 46, 212 36"
          stroke="#141C16"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M 163 88 C 170 78, 196 46, 212 36"
          stroke="#F6F4EB"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Apex Waypoint Node */}
        <g transform="translate(214, 34)">
          <circle cx="0" cy="0" r="10" fill="#0E1611" stroke="#2D4336" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="5.5" fill="#F6F4EB" />
        </g>

        {/* 6. Compass Star */}
        <g transform="translate(258, 22)">
          <polygon points="0,0 0,-18 3.5,-3" fill="url(#compStarLight)" />
          <polygon points="0,0 0,-18 -3.5,-3" fill="url(#compStarDark)" />
          <polygon points="0,0 0,18 -3.5,3" fill="url(#compStarLight)" />
          <polygon points="0,0 0,18 3.5,3" fill="url(#compStarDark)" />
          <polygon points="0,0 16,0 3,-3.5" fill="url(#compStarLight)" />
          <polygon points="0,0 16,0 3,3.5" fill="url(#compStarDark)" />
          <polygon points="0,0 -16,0 -3,3.5" fill="url(#compStarLight)" />
          <polygon points="0,0 -16,0 -3,-3.5" fill="url(#compStarDark)" />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );

  if (variant === "app-icon-dark" || variant === "app-icon-light") {
    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <LogoVector isAppIcon={true} />
        {showText && (
          <div className="flex flex-col">
            <div className={`font-bold tracking-tight ${iconDimensions.text}`}>
              <span className="text-text-primary">Way</span>
              <span className="text-brand-stone">line</span>
            </div>
            {showTagline && (
              <span
                className={`font-semibold uppercase tracking-[0.25em] text-text-muted ${iconDimensions.sub} -mt-0.5`}
              >
                Maps That Move You
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Exact Vector Wayline Ribbon Icon */}
      <LogoVector isAppIcon={false} />

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className={`font-bold tracking-tight ${iconDimensions.text}`}>
            <span className="text-text-primary">Way</span>
            <span className="text-brand-stone">line</span>
          </div>
          {showTagline && (
            <span
              className={`font-semibold uppercase tracking-[0.25em] text-text-muted ${iconDimensions.sub} -mt-0.5`}
            >
              Maps That Move You
            </span>
          )}
        </div>
      )}
    </div>
  );
}
