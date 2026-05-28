"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import {
  User,
  Clock,
  Globe,
  Timer,
  Mail,
  CalendarCheck,
  Bell,
  BellOff,
  Newspaper,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

/* ── Toggle Component ─────────────────────────────────────────── */

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        enabled ? "bg-accent" : "bg-surface-4"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ── Select Component ─────────────────────────────────────────── */

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-sm text-[#c7c4d7] font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-3 text-[#f1f5f9] text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-accent border border-[rgba(255,255,255,0.08)] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [duration, setDuration] = useState("30 min");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [buffer, setBuffer] = useState("5 min");
  const [notifications, setNotifications] = useState({
    emailReminders: true,
    meetingConfirmations: true,
    cancellationAlerts: false,
    dailyDigest: true,
  });

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notifItems = [
    { key: "emailReminders" as const, icon: Mail, label: "Email reminders", desc: "Get notified 15 minutes before your meetings" },
    { key: "meetingConfirmations" as const, icon: CalendarCheck, label: "Meeting confirmations", desc: "Receive alerts when a meeting is booked" },
    { key: "cancellationAlerts" as const, icon: BellOff, label: "Cancellation alerts", desc: "Know when someone cancels a meeting" },
    { key: "dailyDigest" as const, icon: Newspaper, label: "Daily schedule digest", desc: "Get a morning summary of your day" },
  ];

  return (
    <div className="min-h-screen bg-surface-0">
      <Navbar />

      <main className="pt-20 px-6 pb-12 max-w-[700px] mx-auto">
        <header className="mb-8">
          <h1 className="text-[32px] font-semibold text-[#f1f5f9] tracking-tight leading-10">Settings</h1>
          <p className="text-[#94a3b8] text-base mt-1">Manage your account preferences and integrations.</p>
        </header>

        <div className="space-y-8">
          {/* ── Profile ──────────────────────────────────────── */}
          <section
            className="relative rounded-xl p-6"
            style={{ background: "rgba(19, 19, 30, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-5 flex items-center gap-2">
              <User size={18} className="text-accent" />
              Profile
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl text-white font-bold flex-shrink-0">
                AS
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-semibold text-[#f1f5f9]">Arsh Saxena</p>
                <p className="text-sm text-[#94a3b8]">arsh@example.com</p>
              </div>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#c7c4d7] hover:text-accent hover:bg-[rgba(99,102,241,0.08)] transition"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Edit Profile
              </button>
            </div>
          </section>

          {/* ── Meeting Defaults ──────────────────────────────── */}
          <section
            className="relative rounded-xl p-6"
            style={{ background: "rgba(19, 19, 30, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-5 flex items-center gap-2">
              <Clock size={18} className="text-accent" />
              Meeting Defaults
            </h2>
            <div className="space-y-2">
              <Select label="Default Duration" value={duration} onChange={setDuration} options={["15 min", "30 min", "45 min", "60 min"]} />
              <Select label="Timezone" value={timezone} onChange={setTimezone} options={["Asia/Kolkata (IST)", "America/New_York (EST)", "Europe/London (GMT)", "Asia/Tokyo (JST)", "America/Los_Angeles (PST)"]} />
              <Select label="Buffer Time" value={buffer} onChange={setBuffer} options={["0 min", "5 min", "10 min", "15 min"]} />
            </div>
          </section>

          {/* ── Notifications ──────────────────────────────────── */}
          <section
            className="relative rounded-xl p-6"
            style={{ background: "rgba(19, 19, 30, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-5 flex items-center gap-2">
              <Bell size={18} className="text-accent" />
              Notifications
            </h2>
            <div className="space-y-1">
              {notifItems.map((item) => (
                <div key={item.key} className="flex items-center gap-4 p-4 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition">
                  <item.icon size={18} className="text-[#908fa0] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f1f5f9] font-medium">{item.label}</p>
                    <p className="text-xs text-[#94a3b8]">{item.desc}</p>
                  </div>
                  <Toggle enabled={notifications[item.key]} onChange={() => toggleNotif(item.key)} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Connected Accounts ──────────────────────────────── */}
          <section
            className="relative rounded-xl p-6"
            style={{ background: "rgba(19, 19, 30, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-xl opacity-50" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }} />
            <h2 className="text-lg font-semibold text-[#f1f5f9] tracking-tight mb-5 flex items-center gap-2">
              <Globe size={18} className="text-accent" />
              Connected Accounts
            </h2>
            <div
              className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
            >
              {/* Google icon */}
              <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <p className="text-sm text-[#f1f5f9] font-medium">Google Calendar</p>
                <p className="text-xs text-[#94a3b8]">arsh@example.com</p>
                <p className="text-[11px] text-[#908fa0] mt-0.5">Last synced: 5 mins ago</p>
              </div>
              <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#c7c4d7] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Disconnect
              </button>
            </div>
          </section>

          {/* ── Danger Zone ──────────────────────────────────── */}
          <section
            className="relative rounded-xl p-6"
            style={{ background: "rgba(19, 19, 30, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <h2 className="text-lg font-semibold text-[#ef4444] tracking-tight mb-3 flex items-center gap-2">
              <AlertTriangle size={18} />
              Danger Zone
            </h2>
            <p className="text-sm text-[#94a3b8] mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition flex items-center gap-2"
              style={{ border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <Trash2 size={15} />
              Delete Account
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
