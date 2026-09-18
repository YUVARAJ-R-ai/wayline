"use client";

import React from "react";

export interface WaylineLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export default function WaylineLogo({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
}: WaylineLogoProps) {
  const iconDimensions = {
    sm: { w: 24, h: 24, text: "text-base", sub: "text-[9px]" },
    md: { w: 32, h: 32, text: "text-xl", sub: "text-[10px]" },
    lg: { w: 48, h: 48, text: "text-2xl", sub: "text-xs" },
    xl: { w: 72, h: 72, text: "text-4xl", sub: "text-sm" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vector Wayline Icon */}
      <svg
        width={iconDimensions.w}
        height={iconDimensions.h}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          {/* Main Pin Gradient */}
          <linearGradient id="pinGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Glowing Path Gradient */}
          <linearGradient id="pathGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="40%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Map Base Tile Glass Gradients */}
          <linearGradient id="tileLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f3b30" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d211a" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="tileRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#254d3e" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0f261e" stopOpacity="0.85" />
          </linearGradient>

          {/* Top highlight shine */}
          <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>

          {/* Pin Ambient Glow Filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- Isometric Base Map Tiles --- */}
        {/* Left isometric panel */}
        <polygon
          points="20,62 48,46 62,56 34,74"
          fill="url(#tileLeft)"
          stroke="#34d399"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
        {/* Right isometric panel */}
        <polygon
          points="62,56 86,40 102,54 78,72"
          fill="url(#tileRight)"
          stroke="#6ee7b7"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />

        {/* Top edge glass highlights */}
        <path
          d="M 20 62 L 48 46 L 86 40 L 102 54"
          stroke="url(#shineGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* --- S-Curve Glowing Pathway --- */}
        <path
          d="M 34 74 C 44 68, 50 64, 56 60 C 62 56, 64 52, 60 48"
          stroke="url(#pathGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <path
          d="M 34 74 C 44 68, 50 64, 56 60 C 62 56, 64 52, 60 48"
          stroke="#a7f3d0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* --- Iconic Wayline Teardrop Location Pin --- */}
        <g filter="url(#glow)">
          {/* Main Pin Outer Path */}
          <path
            d="M 60 12 C 46 12 36 22 36 36 C 36 49 60 74 60 74 C 60 74 84 49 84 36 C 84 22 74 12 60 12 Z"
            fill="url(#pinGrad)"
            stroke="#6ee7b7"
            strokeWidth="1.5"
          />
          {/* Inner Pin Circular Cutout */}
          <circle cx="60" cy="34" r="10" fill="#090a0f" />
        </g>
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className={`font-bold tracking-tight ${iconDimensions.text}`}>
            <span className="text-text-primary">Way</span>
            <span className="text-accent-purple">line</span>
          </div>
          {showTagline && (
            <span
              className={`font-semibold uppercase tracking-[0.22em] text-text-muted ${iconDimensions.sub} -mt-0.5`}
            >
              Maps That Move You
            </span>
          )}
        </div>
      )}
    </div>
  );
}
