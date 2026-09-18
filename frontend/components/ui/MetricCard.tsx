"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  loading = false,
  onClick,
  className = "",
}: MetricCardProps) {
  const isInteractive = Boolean(onClick);

  const getTrendBadge = () => {
    if (!trend && !trendValue) return null;

    if (trend === "up") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-status-success/10 text-status-success border border-status-success/20 select-none">
          <TrendingUp className="w-3 h-3" />
          {trendValue}
        </span>
      );
    }

    if (trend === "down") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-status-error/10 text-status-error border border-status-error/20 select-none">
          <TrendingDown className="w-3 h-3" />
          {trendValue}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-bg-elevated text-text-muted border border-border-subtle select-none">
        <Minus className="w-3 h-3" />
        {trendValue}
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm flex flex-col justify-between select-none ${className}`}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="h-3.5 w-24 bg-bg-elevated rounded animate-pulse" />
          <div className="h-8 w-8 bg-bg-elevated rounded-xl animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-32 bg-bg-elevated rounded animate-pulse" />
          <div className="h-3.5 w-44 bg-bg-elevated rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={`bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between ${
        isInteractive
          ? "cursor-pointer hover:border-border-default hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-purple/30"
          : "hover:border-border-default hover:-translate-y-[1px]"
      } ${className}`}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted select-none">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-xl bg-bg-elevated border border-border-subtle text-text-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Middle row: Metric Value */}
      <div className="mb-2">
        <div className="text-2xl font-bold tracking-tight text-text-primary select-text">
          {value}
        </div>
      </div>

      {/* Bottom row: Trend badge & Subtitle */}
      {(trend || trendValue || subtitle) && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-text-secondary">
          {getTrendBadge()}
          {subtitle && (
            <span className="text-text-muted font-normal select-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
