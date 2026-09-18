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
      {/* 1. Ambient Dot Grid (Visible in both Dark & Light modes) */}
      <div
        className="absolute inset-0 [background-size:24px_24px] opacity-90 transition-opacity duration-300"
        style={{
          backgroundImage:
            "radial-gradient(var(--dot-base-color, rgba(139, 155, 137, 0.28)) 1.25px, transparent 1.25px)",
        }}
      />

      {/* 2. Cursor-Sensitive Spotlight Layer (Intensifies dots near the mouse pointer) */}
      {mousePos && isVisible && (
        <div
          className="absolute inset-0 [background-size:24px_24px] transition-opacity duration-150"
          style={{
            backgroundImage:
              "radial-gradient(var(--dot-active-color, #F6F4EB) 1.8px, transparent 1.8px)",
            maskImage: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)`,
          }}
        />
      )}

      {/* 3. Subtle Atmospheric Cursor Halo Glow */}
      {mousePos && isVisible && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-200"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            width: "380px",
            height: "380px",
            background:
              "radial-gradient(circle, var(--cursor-glow-color, rgba(67, 99, 82, 0.2)) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
