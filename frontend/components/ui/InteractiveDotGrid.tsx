"use client";

import React, { useEffect, useState } from "react";

export default function InteractiveDotGrid() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Use pageX / pageY so the spotlight moves with document scroll
      setMousePos({ x: e.pageX, y: e.pageY });
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
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none w-full min-h-full">
      {/* 1. Ambient Micro-Dot Grid (Scrolls naturally with the page) */}
      <div
        className="absolute inset-0 [background-size:24px_24px] opacity-90 transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(var(--dot-base-color, rgba(139, 155, 137, 0.17)) 1.15px, transparent 1.15px)",
        }}
      />

      {/* 2. Cursor-Sensitive Spotlight (Intensifies dots as cursor moves) */}
      {mousePos && isVisible && (
        <div
          className="absolute inset-0 [background-size:24px_24px] transition-opacity duration-150"
          style={{
            backgroundImage:
              "radial-gradient(var(--dot-active-color, rgba(218, 215, 199, 0.48)) 1.4px, transparent 1.4px)",
            maskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)`,
          }}
        />
      )}

      {/* 3. Subtle Ambient Light Halo around Cursor */}
      {mousePos && isVisible && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-200"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            width: "320px",
            height: "320px",
            background:
              "radial-gradient(circle, var(--cursor-glow-color, rgba(67, 99, 82, 0.14)) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
