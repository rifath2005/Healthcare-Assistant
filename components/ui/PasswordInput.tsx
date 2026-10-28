"use client";

import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

export function computePasswordStrength(password: string): {
  score: number;
  label: "Too Weak" | "Weak" | "Fair" | "Strong";
  colorClass: string;
} {
  if (!password) return { score: 0, label: "Too Weak", colorClass: "bg-slate-200 dark:bg-slate-700" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", colorClass: "bg-red-500" };
  if (score <= 4) return { score: 2, label: "Fair", colorClass: "bg-amber-500" };
  return { score: 3, label: "Strong", colorClass: "bg-emerald-500" };
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = "Password", error, showStrength = false, className, id, onChange, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [currentValue, setCurrentValue] = useState("");
    const inputId = id || props.name || "password-input";

    const strength = computePasswordStrength(currentValue);

    return (
      <div className="space-y-1.5 w-full">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn(
              "w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border bg-white dark:bg-slate-900 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
              className
            )}
            onChange={(e) => {
              setCurrentValue(e.target.value);
              if (onChange) onChange(e);
            }}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {showStrength && currentValue.length > 0 && (
          <div className="pt-1 space-y-1">
            <div className="flex gap-1.5 h-1.5 w-full">
              <div
                className={cn(
                  "h-full flex-1 rounded-full transition-all",
                  strength.score >= 1 ? strength.colorClass : "bg-slate-200 dark:bg-slate-700"
                )}
              />
              <div
                className={cn(
                  "h-full flex-1 rounded-full transition-all",
                  strength.score >= 2 ? strength.colorClass : "bg-slate-200 dark:bg-slate-700"
                )}
              />
              <div
                className={cn(
                  "h-full flex-1 rounded-full transition-all",
                  strength.score >= 3 ? strength.colorClass : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            </div>
            <p className="text-[11px] text-right font-medium text-slate-500 dark:text-slate-400">
              Strength: <span className="font-semibold">{strength.label}</span>
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
