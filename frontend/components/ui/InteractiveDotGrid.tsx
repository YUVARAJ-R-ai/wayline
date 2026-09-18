"use client";

import React, { useEffect, useState } from "react";

export default function InteractiveDotGrid() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isVisible]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* 1. Ultra-Subtle Ambient Micro-Dot Grid */}
      <div
        className="absolute inset-0 [background-size:24px_24px] opacity-75 transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(var(--dot-base-color, rgba(139, 155, 137, 0.09)) 1px, transparent 1px)",
        }}
      />

      {/* 2. Soft Cursor-Sensitive Interactive Highlight */}
      {mousePos && isVisible && (
        <div
          className="absolute inset-0 [background-size:24px_24px] transition-opacity duration-200"
          style={{
            backgroundImage:
              "radial-gradient(var(--dot-active-color, rgba(139, 155, 137, 0.26)) 1.2px, transparent 1.2px)",
            maskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)`,
          }}
        />
      )}

      {/* 3. Subtle Ambient Light Halo around Cursor */}
      {mousePos && isVisible && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-300"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            width: "300px",
            height: "300px",
            background:
              "radial-gradient(circle, var(--cursor-glow-color, rgba(67, 99, 82, 0.08)) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
