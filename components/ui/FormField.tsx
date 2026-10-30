import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className, id, type, onChange, autoCapitalize, autoCorrect, spellCheck, ...props }, ref) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "email" && e.target.value) {
        e.target.value = e.target.value.toLowerCase();
      }
      onChange?.(e);
    };

    return (
      <div className="space-y-1.5 w-full">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          type={type}
          autoCapitalize={type === "email" ? "none" : autoCapitalize}
          autoCorrect={type === "email" ? "off" : autoCorrect}
          spellCheck={type === "email" ? false : spellCheck}
          className={cn(
            "w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormField.displayName = "FormField";
