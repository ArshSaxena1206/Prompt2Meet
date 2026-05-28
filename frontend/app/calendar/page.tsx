"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";

/* ── Mock Data ─────────────────────────────────────────────────── */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MeetingPill {
  title: string;
  time: string;
  status: "confirmed" | "pending";
  attendees: number;
}

interface CalendarDay {
  date: number;
  isToday?: boolean;
  isPast?: boolean;
  isWeekend?: boolean;
  isOtherMonth?: boolean;
  meetings: MeetingPill[];
}

function generateCalendarData(): CalendarDay[] {
  const today = 28;
  const daysInMonth = 31;
  // May 2026 starts on Friday (index 4)
  const startDay = 4;
  const cells: CalendarDay[] = [];

  // Prev month padding
  const prevMonthDays = startDay;
  for (let i = prevMonthDays; i > 0; i--) {
    cells.push({ date: 30 - i + 1, isPast: true, isOtherMonth: true, meetings: [] });
  }

  const meetingsMap: Record<number, MeetingPill[]> = {
    5: [{ title: "Sprint Planning", time: "10:00 AM", status: "confirmed", attendees: 5 }],
    8: [
      { title: "Design Review", time: "2:00 PM", status: "confirmed", attendees: 3 },
      { title: "1:1 with Alex", time: "4:00 PM", status: "pending", attendees: 2 },
    ],
    12: [{ title: "Client Call", time: "11:00 AM", status: "pending", attendees: 4 }],
    15: [{ title: "Team Standup", time: "9:30 AM", status: "confirmed", attendees: 8 }],
    19: [
      { title: "Product Sync", time: "10:00 AM", status: "confirmed", attendees: 4 },
      { title: "Roadmap Review", time: "3:00 PM", status: "confirmed", attendees: 6 },
    ],
    22: [{ title: "Interview", time: "1:00 PM", status: "pending", attendees: 3 }],
    26: [{ title: "Retro", time: "4:00 PM", status: "confirmed", attendees: 7 }],
    28: [
      { title: "Weekly Sync", time: "10:00 AM", status: "confirmed", attendees: 5 },
      { title: "Design Handoff", time: "2:30 PM", status: "pending", attendees: 3 },
    ],
    29: [{ title: "Sprint Demo", time: "11:00 AM", status: "confirmed", attendees: 10 }],
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (startDay + d - 1) % 7;
    cells.push({
      date: d,
      isToday: d === today,
      isPast: d < today,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      meetings: meetingsMap[d] || [],
    });
  }

  // Next month padding
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: i, isOtherMonth: true, meetings: [] });
  }

  return cells;
}

/* ── Component ─────────────────────────────────────────────────── */

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [hoveredPill, setHoveredPill] = useState<string | null>(null);
  const calendarData = generateCalendarData();

  return (
    <div className="min-h-screen bg-surface-0">
      <Navbar />

      <main className="pt-20 px-6 pb-12 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-[32px] font-semibold text-[#f1f5f9] tracking-tight leading-10">May 2026</h1>
            <div className="flex gap-1">
              <button className="p-2 rounded-lg hover:bg-surface-3 text-[#c7c4d7] hover:text-accent transition">
                <ChevronLeft size={18} />
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-3 text-[#c7c4d7] hover:text-accent transition">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {/* Toggle */}
          <div className="flex rounded-full p-1" style={{ background: "rgba(19, 19, 30, 0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                viewMode === "monthly" ? "bg-accent text-white" : "text-[#94a3b8] hover:text-[#f1f5f9]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                viewMode === "weekly" ? "bg-accent text-white" : "text-[#94a3b8] hover:text-[#f1f5f9]"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: "rgba(19, 19, 30, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />

          {/* Day Headers */}
          <div className="grid grid-cols-7">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-semibold tracking-wider uppercase ${
                  i >= 5 ? "text-[#908fa0]" : "text-[#c7c4d7]"
                }`}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Date Cells */}
          <div className="grid grid-cols-7">
            {calendarData.map((cell, i) => {
              const cellId = `cell-${i}`;
              return (
                <div
                  key={i}
                  className={`relative min-h-[100px] p-2 transition-colors group ${
                    cell.isToday
                      ? "ring-1 ring-accent ring-inset"
                      : ""
                  } ${cell.isOtherMonth ? "opacity-30" : ""}`}
                  style={{
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: cell.isToday
                      ? "rgba(99,102,241,0.08)"
                      : cell.isWeekend
                      ? "rgba(26,26,36,0.5)"
                      : "transparent",
                  }}
                >
                  {/* Date number */}
                  <span
                    className={`text-xs font-medium ${
                      cell.isToday
                        ? "text-accent font-bold"
                        : cell.isPast && !cell.isOtherMonth
                        ? "text-[#908fa0]/60"
                        : "text-[#c7c4d7]"
                    }`}
                  >
                    {cell.date}
                  </span>

                  {/* Meeting pills */}
                  <div className="mt-1 space-y-1">
                    {cell.meetings.map((meeting, j) => {
                      const pillId = `${cellId}-${j}`;
                      return (
                        <div
                          key={j}
                          className="relative"
                          onMouseEnter={() => setHoveredPill(pillId)}
                          onMouseLeave={() => setHoveredPill(null)}
                        >
                          <div
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate cursor-pointer transition ${
                              meeting.status === "confirmed"
                                ? "bg-accent/20 text-[#c0c1ff] hover:bg-accent/30"
                                : "bg-[#f59e0b]/20 text-[#fbbf24] hover:bg-[#f59e0b]/30"
                            }`}
                          >
                            {meeting.title}
                          </div>

                          {/* Hover tooltip */}
                          {hoveredPill === pillId && (
                            <div
                              className="absolute z-50 left-0 top-full mt-1 p-3 rounded-lg min-w-[200px] animate-fade-in"
                              style={{
                                background: "rgba(19, 19, 30, 0.95)",
                                backdropFilter: "blur(16px)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                              }}
                            >
                              <p className="text-sm font-medium text-[#f1f5f9] mb-1">{meeting.title}</p>
                              <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-1.5">
                                <Clock size={12} />
                                {meeting.time}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] mb-2">
                                <Users size={12} />
                                {meeting.attendees} attendees
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  meeting.status === "confirmed"
                                    ? "bg-accent/20 text-[#c0c1ff]"
                                    : "bg-[#f59e0b]/20 text-[#fbbf24]"
                                }`}
                              >
                                {meeting.status === "confirmed" ? "Confirmed" : "Pending"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Hover add icon */}
                  {cell.meetings.length === 0 && !cell.isOtherMonth && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity">
                      <span className="text-[#c7c4d7] text-lg">+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent/30 border border-accent/50" />
            <span className="text-xs text-[#94a3b8]">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]/30 border border-[#f59e0b]/50" />
            <span className="text-xs text-[#94a3b8]">Pending</span>
          </div>
        </div>
      </main>
    </div>
  );
}
