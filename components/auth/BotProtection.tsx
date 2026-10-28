"use client";

import React, { useState, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

export interface BotProtectionProps {
  onVerify?: (token: string) => void;
  siteKey?: string;
}

// Cloudflare official test key that always passes without domain errors on localhost / dev
const CLOUDFLARE_TEST_ALWAYS_PASS = "1x00000000000000000000AA";

export function BotProtection({ onVerify, siteKey }: BotProtectionProps) {
  const [mounted, setMounted] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
        setIsLocalhost(true);
      }
    }
  }, []);

  const envKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  // In localhost development, use Cloudflare's always-pass testing key if custom sitekey triggers domain mismatch
  const resolvedSiteKey = siteKey || (isLocalhost ? CLOUDFLARE_TEST_ALWAYS_PASS : envKey);

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
      {mounted && resolvedSiteKey && resolvedSiteKey.length > 5 ? (
        <div className="flex flex-col items-center justify-center py-2 min-h-[65px]">
          <Turnstile
            key={resolvedSiteKey}
            siteKey={resolvedSiteKey}
            onSuccess={(token) => {
              if (onVerify) onVerify(token);
            }}
            onError={(errCode) => {
              console.warn("[Cloudflare Turnstile] Code:", errCode);
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
