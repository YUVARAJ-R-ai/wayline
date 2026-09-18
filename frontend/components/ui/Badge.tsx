"use client";

import React from "react";

export interface BadgeProps {
  variant?: "success" | "warning" | "error" | "neutral" | "accent";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export default function Badge({
  variant = "neutral",
  size = "sm",
  children,
  className = "",
  icon,
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-semibold",
  }[size];

  const variantStyles = {
    success:
      "bg-status-success/10 text-status-success border-status-success/20",
    warning:
      "bg-status-warning/10 text-status-warning border-status-warning/20",
    error:
      "bg-status-error/10 text-status-error border-status-error/20",
    neutral:
      "bg-bg-elevated text-text-secondary border-border-subtle",
    accent:
      "bg-accent-purple-muted text-accent-purple border-accent-purple/30",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border select-none tracking-wide ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
