"use client";

import { Calendar, Clock, Users, Video, Trash2, ExternalLink } from "lucide-react";
import { format, parseISO, differenceInMinutes, isPast } from "date-fns";
import type { Meeting } from "../lib/api";

interface MeetingCardProps {
  meeting: Meeting;
  onCancel?: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-success/15 text-success border-success/25",
  cancelled: "bg-danger/10 text-danger/60 border-danger/20",
  pending_confirmation: "bg-warning/15 text-warning border-warning/25",
  failed: "bg-danger/15 text-danger border-danger/25",
};

export default function MeetingCard({ meeting, onCancel }: MeetingCardProps) {
  const start = parseISO(meeting.start_time);
  const end = parseISO(meeting.end_time);
  const duration = differenceInMinutes(end, start);
  const past = isPast(end);

  return (
    <div
      className={`
        group relative bg-surface-2 border border-subtle rounded-2xl p-4
        hover:border-border-hover transition-all duration-200
        ${past && meeting.status === "confirmed" ? "opacity-60" : ""}
      `}
    >
      {/* Status badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-text-primary font-medium text-sm leading-snug flex-1">
          {meeting.title}
        </h3>
        <span
          className={`
            flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border
            ${STATUS_STYLES[meeting.status] ?? "bg-surface-3 text-text-secondary border-subtle"}
          `}
        >
          {meeting.status.replace("_", " ")}
        </span>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-text-secondary text-xs">
          <Calendar size={12} />
          <span>{format(start, "EEE, MMM d · h:mm a")}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-xs">
          <Clock size={12} />
          <span>{duration} min</span>
        </div>
        {meeting.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Users size={12} />
            <span>{meeting.attendees.map((a) => a.name).join(", ")}</span>
          </div>
        )}
      </div>

      {/* Agenda */}
      {meeting.agenda && (
        <p className="text-text-muted text-xs line-clamp-2 mb-3 border-t border-subtle pt-3">
          {meeting.agenda}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {meeting.meet_link && meeting.status === "confirmed" && (
          <a
            href={meeting.meet_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition"
          >
            <Video size={12} />
            Join
            <ExternalLink size={10} />
          </a>
        )}

        {meeting.status === "confirmed" && !past && onCancel && (
          <button
            onClick={() => onCancel(meeting.id)}
            className="ml-auto opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 text-xs text-danger/60 hover:text-danger"
          >
            <Trash2 size={12} />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
