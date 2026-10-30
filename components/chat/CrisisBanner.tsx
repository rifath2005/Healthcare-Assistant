"use client";

import React from "react";
import { PhoneCall, MessageSquare, AlertTriangle, ShieldCheck } from "lucide-react";

interface CrisisBannerProps {
  severity?: string;
  trigger?: string;
}

export function CrisisBanner({ severity, trigger }: CrisisBannerProps) {
  return (
    <div className="my-2 sm:my-4 p-3.5 sm:p-6 bg-red-600 text-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-red-700 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-start gap-2.5 sm:gap-4">
        <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl shrink-0">
          <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <div className="space-y-1.5 sm:space-y-2 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/25 rounded-full text-[10px] sm:text-xs font-bold tracking-wide uppercase">
            Immediate Crisis Intervention Active
          </div>
          <h3 className="text-base sm:text-xl font-extrabold text-white">
            Help Is Available. You Are Not Alone.
          </h3>
          <p className="text-xs sm:text-sm text-red-50 leading-relaxed">
            Our safety system detected words indicating acute distress or physical emergency. Please step away from this AI assistant and reach out to compassionate human professionals immediately. Free, confidential assistance is available right now.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            {/* Emergency Services 112 / 108 */}
            <a
              href="tel:112"
              className="flex items-center justify-between p-3.5 bg-red-950 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-black transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-red-400" />
                <span>Call 112 / 108 EMS</span>
              </div>
              <span className="text-xs bg-red-800 text-red-100 px-2 py-0.5 rounded-full">Emergency</span>
            </a>

            {/* 988 Crisis Lifeline */}
            <a
              href="tel:112"
              className="flex items-center justify-between p-3.5 bg-white text-red-700 rounded-2xl font-bold text-sm shadow-md hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-5 h-5 text-red-600" />
                <span>Call/Text 988 Lifeline (112)</span>
              </div>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">24/7</span>
            </a>

            {/* Crisis Text Line */}
            <a
              href="sms:741741?body=HOME"
              className="flex items-center justify-between p-3.5 bg-white text-red-700 rounded-2xl font-bold text-sm shadow-md hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-red-600" />
                <span>Text HOME to 741741</span>
              </div>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Free</span>
            </a>
          </div>

          <p className="text-[11px] text-red-200 pt-2 text-center md:text-left">
            All hotlines are confidential, toll-free, and answered by trained counselors.
          </p>
        </div>
      </div>
    </div>
  );
}
