"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";

interface ScheduleCalendarProps {
  markedDates?: Date[];
  onSelect?: (date: Date) => void;
}

export default function ScheduleCalendar({ markedDates = [], onSelect }: ScheduleCalendarProps) {
  const [current, setCurrent] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = startOfMonth(current).getDay();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrent(subMonths(current, 1))}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-white">
          {format(current, "MMMM yyyy", { locale: vi })}
        </span>
        <button
          type="button"
          onClick={() => setCurrent(addMonths(current, 1))}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d} className="text-xs font-medium text-slate-500">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const isMarked = markedDates.some((d) => isSameDay(d, day));
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect?.(day)}
              className={`rounded-lg py-1.5 text-xs transition-colors ${
                !isSameMonth(day, current) ? "text-slate-700" :
                isMarked ? "bg-violet-600 font-semibold text-white" :
                isToday ? "border border-violet-500 text-violet-300" :
                "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
