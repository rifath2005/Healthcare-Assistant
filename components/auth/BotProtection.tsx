"use client";

import React from "react";
import { Turnstile } from "@marsidev/react-turnstile";

export interface BotProtectionProps {
  onVerify?: (token: string) => void;
  siteKey?: string;
}

export function BotProtection({ onVerify, siteKey }: BotProtectionProps) {
  const resolvedSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  return (
    <div className="space-y-2">
      {/* Invisible Honeypot Field */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="hp_clinical_token">Leave this field blank</label>
        <input
          type="text"
          name="hp_clinical_token"
          id="hp_clinical_token"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Cloudflare Turnstile Widget */}
      {resolvedSiteKey && resolvedSiteKey.length > 5 ? (
        <div className="flex justify-center py-2">
          <Turnstile
            siteKey={resolvedSiteKey}
            onSuccess={(token) => {
              if (onVerify) onVerify(token);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
