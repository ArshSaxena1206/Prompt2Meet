"use client";

import Navbar from "../../components/Navbar";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  ChevronRight,
  CalendarClock,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* ── Mock Data ─────────────────────────────────────────────────── */

const meeting = {
  title: "Weekly Project Sync",
  status: "confirmed" as const,
  date: "Thursday, May 29, 2026",
  time: "3:00 PM - 3:30 PM IST",
  meetLink: "https://meet.google.com/abc-defg-hij",
  agenda: [
    "Review progress on Q3 deliverables",
    "Discuss client feedback from last sprint",
    "Plan next week's priorities and assignments",
    "Address any blockers or dependencies",
  ],
  attendees: [
    { initials: "PR", name: "Priya Sharma", email: "priya@company.com", rsvp: "accepted", color: "#dfd1ff" },
    { initials: "AS", name: "Arsh Saxena", email: "arsh@company.com", rsvp: "accepted", color: "#b2d5ff" },
    { initials: "RM", name: "Rohan Mehta", email: "rohan@company.com", rsvp: "pending", color: "#c8f7dc" },
    { initials: "SK", name: "Sara Khan", email: "sara@company.com", rsvp: "declined", color: "#ffdfd1" },
  ],
};

const statusConfig = {
  confirmed: { label: "Confirmed", bg: "bg-accent/20", text: "text-[#c0c1ff]", icon: CheckCircle2 },
  pending: { label: "Pending", bg: "bg-[#f59e0b]/20", text: "text-[#fbbf24]", icon: AlertCircle },
  cancelled: { label: "Cancelled", bg: "bg-[#ef4444]/20", text: "text-[#ef4444]", icon: XCircle },
};

const rsvpConfig = {
  accepted: { label: "Accepted", bg: "bg-[#10b981]/15", text: "text-[#4edea3]" },
  pending: { label: "Pending", bg: "bg-[#f59e0b]/15", text: "text-[#fbbf24]" },
  declined: { label: "Declined", bg: "bg-[#ef4444]/15", text: "text-[#ef4444]" },
};

/* ── Component ─────────────────────────────────────────────────── */

export default function MeetingDetailPage({ params }: { params: { id: string } }) {
  const status = statusConfig[meeting.status];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-surface-0">
      <Navbar />

      <main className="pt-20 px-6 pb-12 max-w-[800px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-[#94a3b8] mb-6">
          <Link href="/dashboard" className="hover:text-accent transition">Dashboard</Link>
          <ChevronRight size={14} />
          <Link href="/" className="hover:text-accent transition">Meetings</Link>
          <ChevronRight size={14} />
          <span className="text-[#f1f5f9]">{meeting.title}</span>
        </div>

        {/* Main Card */}
        <div
          className="relative rounded-xl p-8 space-y-6"
          style={{
            background: "rgba(19, 19, 30, 0.7)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Top gradient border */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl"
            style={{ background: "linear-gradient(90deg, #6366f1, #a855f7, transparent)" }}
          />

          {/* Title + Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-[28px] font-bold text-[#f1f5f9] tracking-tight">{meeting.title}</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bg} ${status.text} text-xs font-semibold`}>
              <StatusIcon size={13} />
              {status.label}
            </div>
          </div>

          {/* Date/Time */}
          <div className="flex items-center gap-3 text-[#c7c4d7]">
            <Calendar size={18} className="text-accent flex-shrink-0" />
            <span className="text-sm">{meeting.date} · {meeting.time}</span>
          </div>

          {/* Join Google Meet */}
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] group"
          >
            <Video size={18} className="group-hover:scale-110 transition-transform" />
            Join Google Meet
          </a>

          {/* Divider */}
          <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* Agenda */}
          <div>
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-3 flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Agenda
            </h2>
            <div
              className="rounded-lg p-4 space-y-2.5"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
            >
              {meeting.agenda.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p className="text-sm text-[#c7c4d7]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* Attendees */}
          <div>
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-3">
              Attendees ({meeting.attendees.length})
            </h2>
            <div className="space-y-2">
              {meeting.attendees.map((attendee, i) => {
                const rsvp = rsvpConfig[attendee.rsvp as keyof typeof rsvpConfig];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition"
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: attendee.color, color: "#2d2447" }}
                    >
                      {attendee.initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#f1f5f9] font-medium">{attendee.name}</p>
                      <p className="text-xs text-[#94a3b8] truncate">{attendee.email}</p>
                    </div>
                    {/* RSVP Chip */}
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${rsvp.bg} ${rsvp.text}`}>
                      {rsvp.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-[#c7c4d7] transition hover:text-accent hover:bg-[rgba(99,102,241,0.08)]"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <CalendarClock size={16} />
              Reschedule
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-[#ef4444] transition hover:bg-[rgba(239,68,68,0.08)]"
              style={{ border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <XCircle size={16} />
              Cancel Meeting
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
