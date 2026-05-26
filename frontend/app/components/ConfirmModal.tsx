"use client";

import { useState } from "react";
import { X, Calendar, Clock, Users, FileText, Video, Loader2, CheckCircle } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import type { ParsedIntent, ConfirmResponse } from "../lib/api";

interface ConfirmModalProps {
  intent: ParsedIntent;
  rawPrompt: string;
  onConfirm: (intent: ParsedIntent) => Promise<ConfirmResponse>;
  onClose: () => void;
}

export default function ConfirmModal({ intent, rawPrompt, onConfirm, onClose }: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmResponse | null>(null);

  const start = intent.start_datetime ? parseISO(intent.start_datetime) : null;
  const end = intent.end_datetime ? parseISO(intent.end_datetime) : null;
  const duration = start && end ? differenceInMinutes(end, start) : intent.duration_minutes ?? 30;

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await onConfirm(intent);
      setConfirmed(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-surface-2 border border-subtle rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {confirmed ? (
          /* ─── Success State ─── */
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={28} />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Meeting Scheduled!</h2>
            <p className="text-text-secondary text-sm mb-6">
              Invitations have been sent to all attendees.
            </p>

            {confirmed.meet_link && (
              <a
                href={confirmed.meet_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 text-accent rounded-lg text-sm hover:bg-accent/25 transition mb-6"
              >
                <Video size={14} />
                Join Google Meet
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-sm transition border border-subtle"
            >
              Done
            </button>
          </div>

        ) : (
          /* ─── Confirm State ─── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-subtle">
              <h2 className="font-semibold text-text-primary">Confirm Meeting</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Details */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div className="bg-accent-soft border border-accent/20 rounded-xl p-4">
                <p className="text-xs text-accent font-medium uppercase tracking-wider mb-1">Meeting</p>
                <p className="text-text-primary font-semibold text-lg">{intent.title}</p>
                {intent.agenda && (
                  <p className="text-text-secondary text-sm mt-1">{intent.agenda}</p>
                )}
              </div>

              {/* Time */}
              {start && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-medium">
                      {format(start, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {format(start, "h:mm a")}
                      {end && ` – ${format(end, "h:mm a")}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Duration */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-accent" />
                </div>
                <p className="text-text-primary text-sm">{duration} minutes</p>
              </div>

              {/* Attendees */}
              {intent.attendees && intent.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users size={14} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-text-secondary text-xs mb-2">Attendees</p>
                    <div className="space-y-1.5">
                      {intent.attendees.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-4 flex items-center justify-center text-xs font-medium text-accent">
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-text-primary text-sm">{a.name}</span>
                            {a.email && (
                              <span className="text-text-muted text-xs ml-2">{a.email}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence */}
              {intent.confidence !== undefined && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <div className="flex-1 h-1 bg-surface-4 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${intent.confidence * 100}%` }}
                    />
                  </div>
                  <span>{Math.round(intent.confidence * 100)}% confidence</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-5 pt-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-surface-3 hover:bg-surface-4 text-text-secondary rounded-xl text-sm transition border border-subtle"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2 glow-accent"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Scheduling…
                  </>
                ) : (
                  "Confirm & Schedule"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
