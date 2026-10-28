"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { getClientTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export interface Slot {
  start: string;
  end: string;
  displayTime: string;
}

interface SlotPickerProps {
  doctorId: string;
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
}

export function SlotPicker({ doctorId, selectedSlot, onSelectSlot }: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(getClientTimezone());
  }, []);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/appointments/availability?doctorId=${doctorId}&date=${selectedDate}&timezone=${timezone}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setSlots(data.slots || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load availability slots:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [doctorId, selectedDate, timezone]);

  return (
    <div className="space-y-4">
      {/* Date Picker Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Select Date ({timezone})
        </label>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Slots Grid */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Available 30-Minute Telehealth Slots
        </label>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-emerald-600 gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking doctor availability...</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No open consultation slots on this date. Please choose another day.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {slots.map((slot, idx) => {
              const isSelected = selectedSlot?.start === slot.start;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{slot.displayTime}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
