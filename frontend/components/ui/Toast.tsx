"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "success",
  isOpen,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-status-success" />,
      border: "border-status-success/30",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-status-error" />,
      border: "border-status-error/30",
    },
    info: {
      icon: <Info className="w-4 h-4 text-accent-purple" />,
      border: "border-accent-purple/30",
    },
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-bg-surface ${typeConfig.border} border rounded-xl shadow-xl text-sm text-text-primary select-none`}
      >
        {typeConfig.icon}
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-text-muted hover:text-text-primary p-0.5 rounded transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
