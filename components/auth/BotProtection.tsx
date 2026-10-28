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
        <div className="flex flex-col items-center justify-center py-2 min-h-[65px]">
          <Turnstile
            siteKey={resolvedSiteKey}
            onSuccess={(token) => {
              if (onVerify) onVerify(token);
            }}
            onError={(errCode) => {
              console.warn("[Cloudflare Turnstile] Challenge failed or domain mismatch (code:", errCode, "). If on localhost, add localhost to Cloudflare allowed domains.");
            }}
            options={{
              theme: "auto",
              retry: "never",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
