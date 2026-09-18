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
    sm: { w: 28, h: 28, text: "text-base", sub: "text-[8px]" },
    md: { w: 36, h: 36, text: "text-lg", sub: "text-[9px]" },
    lg: { w: 48, h: 48, text: "text-2xl", sub: "text-[11px]" },
    xl: { w: 72, h: 72, text: "text-4xl", sub: "text-xs" },
  }[size];

  // Precision SVG Icon Component for Wayline Brand Ribbon
  const LogoVector = ({ isAppIcon = false }: { isAppIcon?: boolean }) => (
    <svg
      width={iconDimensions.w}
      height={iconDimensions.h}
      viewBox="0 0 160 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 select-none drop-shadow-sm"
    >
      <defs>
        {/* Gradients matching the Official Color Palette */}
        {/* Charcoal: #0B0F0D | Olive: #1F2A1F | Sage: #436352 | Stone: #8B9B89 | Sand: #DAD7C7 | Ivory: #F6F4EB */}
        <linearGradient id="ribbonLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DAD7C7" />
          <stop offset="40%" stopColor="#8B9B89" />
          <stop offset="100%" stopColor="#436352" />
        </linearGradient>

        <linearGradient id="ribbonFold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1F2A1F" />
          <stop offset="60%" stopColor="#2A3C2D" />
          <stop offset="100%" stopColor="#436352" />
        </linearGradient>

        <linearGradient id="ribbonRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B9B89" />
          <stop offset="35%" stopColor="#436352" />
          <stop offset="100%" stopColor="#1F2A1F" />
        </linearGradient>

        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6F4EB" />
          <stop offset="60%" stopColor="#DAD7C7" />
          <stop offset="100%" stopColor="#8B9B89" />
        </linearGradient>

        {/* Topographic pattern for ribbon surface */}
        <pattern id="topoPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M0 10 Q 10 5, 20 10 T 40 10 M0 20 Q 10 15, 20 20 T 40 20 M0 30 Q 10 25, 20 30 T 40 30"
            fill="none"
            stroke="#DAD7C7"
            strokeWidth="0.5"
            strokeOpacity="0.25"
          />
        </pattern>
      </defs>

      {/* Optional App Icon Rounded Container */}
      {isAppIcon && (
        <rect
          x="4"
          y="4"
          width="152"
          height="122"
          rx="28"
          fill={variant === "app-icon-light" ? "#F6F4EB" : "#0B0F0D"}
          stroke={variant === "app-icon-light" ? "#DAD7C7" : "#1F2A1F"}
          strokeWidth="3"
        />
      )}

      {/* --- RIBBON "W" COMPONENT --- */}
      <g transform={isAppIcon ? "scale(0.82) translate(18, 12)" : ""}>
        {/* 1. Left Diagonal Arm */}
        <path
          d="M 22 36 L 40 30 L 64 84 L 46 90 Z"
          fill="url(#ribbonLeft)"
        />
        {/* Topographic Texture Overlay on Left Arm */}
        <path
          d="M 22 36 L 40 30 L 64 84 L 46 90 Z"
          fill="url(#topoPattern)"
          opacity="0.6"
        />
        {/* Left inner contour line */}
        <path
          d="M 31 33 L 55 87"
          stroke="#DAD7C7"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeDasharray="2 2"
        />

        {/* 2. Middle Fold / Valley Turn */}
        <path
          d="M 46 90 C 54 96, 68 94, 76 78 L 88 56 L 72 52 L 60 76 C 56 82, 50 86, 46 90 Z"
          fill="url(#ribbonFold)"
        />

        {/* 3. Mountain Ridge & Apex Arch (Rising to Waypoint Node) */}
        <path
          d="M 72 52 L 88 56 L 112 30 C 118 24, 126 28, 130 36 L 148 88 L 132 94 L 118 48 C 116 42, 110 40, 106 44 L 88 64 Z"
          fill="url(#ribbonRight)"
        />
        {/* Topographic Texture Overlay on Right Arch */}
        <path
          d="M 72 52 L 88 56 L 112 30 C 118 24, 126 28, 130 36 L 148 88 L 132 94 L 118 48 C 116 42, 110 40, 106 44 L 88 64 Z"
          fill="url(#topoPattern)"
          opacity="0.4"
        />

        {/* 4. Waypoint Center Path Spine */}
        <path
          d="M 78 60 Q 96 52, 118 36"
          stroke="#DAD7C7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* 5. Circular Waypoint Node at Mountain Apex */}
        <g transform="translate(118, 36)">
          <circle cx="0" cy="0" r="8" fill="#1F2A1F" stroke="#DAD7C7" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="3.5" fill="#F6F4EB" />
        </g>

        {/* 6. Compass North Star ✦ at Top Right */}
        <g transform="translate(142, 22)">
          {/* Vertical tapered ray */}
          <polygon
            points="0,-14 2.5,-3 14,0 2.5,3 0,14 -2.5,3 -14,0 -2.5,-3"
            fill="url(#starGrad)"
          />
          {/* Diagonal secondary sparkle */}
          <polygon
            points="0,-7 1.5,-1.5 7,0 1.5,1.5 0,7 -1.5,1.5 -7,0 -1.5,-1.5"
            fill="#DAD7C7"
            opacity="0.75"
            transform="rotate(45)"
          />
          {/* Central core */}
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
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vector Wayline Ribbon Icon */}
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
