"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import {
  Calendar,
  Clock,
  XCircle,
  Timer,
  ArrowUpRight,
  Video,
  Phone,
  TrendingUp,
} from "lucide-react";

/* ── Mock Data ─────────────────────────────────────────────────── */

const stats = [
  { label: "Meetings This Week", value: "24", change: "+12%", icon: Calendar, changePositive: true },
  { label: "Upcoming Meetings", value: "8", icon: Clock },
  { label: "Cancelled", value: "2", change: "+5%", icon: XCircle, changePositive: false },
  { label: "Avg Duration", value: "45m", icon: Timer },
];

const upcomingMeetings = [
  { time: "10:00 AM", title: "Product Sync", desc: "Project Alpha planning", attendees: ["JD", "AS"], extra: 2, type: "video" },
  { time: "01:30 PM", title: "Client Presentation", desc: "Q3 Roadmap review", attendees: ["MK"], extra: 0, type: "video" },
  { time: "03:00 PM", title: "1:1 with Alex", desc: "Weekly catchup", attendees: ["AS"], extra: 0, type: "call" },
  { time: "04:30 PM", title: "Design Review", desc: "UI component audit", attendees: ["PR", "RK"], extra: 1, type: "video" },
  { time: "05:00 PM", title: "Sprint Retro", desc: "Sprint 14 retrospective", attendees: ["JD", "AS", "MK"], extra: 3, type: "video" },
];

const activityData = [
  { day: "M", value: 30, count: 3 },
  { day: "T", value: 60, count: 6, highlight: true },
  { day: "W", value: 40, count: 4 },
  { day: "T", value: 80, count: 8, highlight: true },
  { day: "F", value: 50, count: 5 },
  { day: "S", value: 20, count: 2 },
  { day: "S", value: 70, count: 7, highlight: true },
];

const recentActivity = [
  { event: "Invite accepted", detail: 'Sarah Jenkins for "Product Sync"', time: "10 mins ago", active: true },
  { event: "Meeting created", detail: '"Design Review" scheduled for tomorrow', time: "2 hours ago", active: false },
  { event: "Meeting rescheduled", detail: '"1:1 with Alex" moved to 3:00 PM', time: "Yesterday", active: false },
  { event: "RSVP received", detail: 'Rohan accepted "Sprint Retro"', time: "Yesterday", active: false },
];

const avatarColors = ["#dfd1ff", "#b2d5ff", "#ffdfd1", "#c8f7dc"];

/* ── Component ─────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-surface-0">
      <Navbar />

      <main className="pt-20 px-6 pb-12 max-w-[1200px] mx-auto">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[32px] font-semibold text-[#f1f5f9] tracking-tight leading-10">Dashboard</h1>
          <p className="text-[#94a3b8] text-base mt-1">Overview of your scheduling activity and upcoming events.</p>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="relative rounded-lg p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] group"
              style={{
                background: "rgba(19, 19, 30, 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Top gradient line */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px] rounded-t-lg opacity-50 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }}
              />
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm text-[#94a3b8]">{stat.label}</span>
                <stat.icon
                  size={20}
                  className={stat.changePositive === false ? "text-[#ef4444]" : "text-accent"}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-semibold text-[#f1f5f9] leading-10 tracking-tight">{stat.value}</span>
                {stat.change && (
                  <span className={`text-sm flex items-center ${stat.changePositive === false ? "text-[#ef4444]" : "text-[#4edea3]"}`}>
                    <ArrowUpRight size={14} />
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Two Column: Upcoming + Activity Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Upcoming Meetings */}
          <div
            className="lg:col-span-2 relative rounded-lg p-6"
            style={{
              background: "rgba(19, 19, 30, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-lg opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <div className="flex justify-between items-center mb-4 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <h2 className="text-xl font-semibold text-[#f1f5f9] tracking-tight">Upcoming Meetings</h2>
              <button className="text-xs font-semibold text-accent hover:text-[#c0c1ff] transition tracking-wider uppercase">View All</button>
            </div>
            <div className="space-y-1">
              {upcomingMeetings.map((m, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition group">
                  {/* Time pill */}
                  <div className="px-2 py-1 rounded-full text-xs font-semibold text-[#a855f7] whitespace-nowrap tracking-wider"
                    style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)" }}
                  >
                    {m.time}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-[#f1f5f9] font-medium group-hover:text-accent transition truncate">{m.title}</h3>
                    <p className="text-xs text-[#94a3b8] truncate">{m.desc}</p>
                  </div>
                  {/* Avatars */}
                  <div className="flex -space-x-2 mr-2">
                    {m.attendees.map((a, j) => (
                      <div
                        key={j}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border border-surface-0"
                        style={{ background: avatarColors[j % avatarColors.length], color: "#2d2447", zIndex: 30 - j }}
                      >
                        {a}
                      </div>
                    ))}
                    {m.extra > 0 && (
                      <div className="w-7 h-7 rounded-full bg-surface-4 flex items-center justify-center text-[10px] font-semibold text-[#94a3b8] border border-surface-0" style={{ zIndex: 10 }}>
                        +{m.extra}
                      </div>
                    )}
                  </div>
                  {/* Icon */}
                  {m.type === "video" ? (
                    <Video size={16} className="text-[#94a3b8] group-hover:text-accent transition flex-shrink-0" />
                  ) : (
                    <Phone size={16} className="text-[#94a3b8] group-hover:text-accent transition flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Chart */}
          <div
            className="relative rounded-lg p-6"
            style={{
              background: "rgba(19, 19, 30, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-lg opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <h2 className="text-xl font-semibold text-[#f1f5f9] tracking-tight mb-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              Activity
            </h2>
            <div className="h-48 flex items-end justify-between gap-2 mt-6">
              {activityData.map((bar, i) => (
                <div
                  key={i}
                  className="w-full relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip */}
                  {hoveredBar === i && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#f1f5f9] bg-surface-2 px-2 py-1 rounded whitespace-nowrap z-10">
                      {bar.count}
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      bar.highlight
                        ? "bg-accent shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                        : "bg-surface-4"
                    }`}
                    style={{ height: `${bar.value}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs font-semibold text-[#94a3b8] tracking-wider">
              {activityData.map((bar, i) => (
                <span key={i}>{bar.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div
          className="relative rounded-lg p-6"
          style={{
            background: "rgba(19, 19, 30, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-lg opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
          <h2 className="text-xl font-semibold text-[#f1f5f9] tracking-tight mb-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            Recent Activity
          </h2>
          <div className="relative pl-6 space-y-4">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-[2px]" style={{ background: "rgba(255,255,255,0.08)" }} />
            {recentActivity.map((item, i) => (
              <div key={i} className="relative group">
                <div
                  className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full z-10 transition-shadow ${
                    item.active
                      ? "bg-accent ring-4 ring-surface-0 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                      : "bg-surface-4 border border-[rgba(255,255,255,0.08)] ring-4 ring-surface-0 group-hover:bg-accent"
                  }`}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                  <span className="text-sm text-[#f1f5f9] font-medium">{item.event}</span>
                  <span className="text-sm text-[#94a3b8]">{item.detail}</span>
                  <span className="text-xs font-semibold text-[#908fa0] tracking-wider sm:ml-auto">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
