"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PremiumButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  children,
  className = "",
  type = "button",
  ...props
}: PremiumButtonProps) {
  const isDisabled = disabled || loading;

  // Base styling: tactile micro-transitions, clean alignment, accessible focus
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/40";

  // Size variants
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
  }[size];

  // Appearance variants using design tokens
  const variantStyles = {
    primary:
      "bg-accent-purple text-btn-primary-text font-semibold border border-transparent shadow-sm hover:opacity-90 active:scale-[0.98]",
    secondary:
      "bg-bg-elevated text-text-primary font-medium border border-border-default hover:bg-bg-surface hover:border-border-strong active:scale-[0.98]",
    danger:
      "bg-status-error/10 text-status-error font-medium border border-status-error/20 hover:bg-status-error/20 active:scale-[0.98]",
    ghost:
      "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-transparent active:scale-[0.98]",
  }[variant];

  // Disabled / Loading styling
  const stateStyles = isDisabled
    ? "opacity-50 cursor-not-allowed pointer-events-none active:scale-100"
    : "";

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${stateStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  );
}
