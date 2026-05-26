"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Sparkles, Calendar, Bot, User, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

import VoiceRecorder from "./components/VoiceRecorder";
import ConfirmModal from "./components/ConfirmModal";
import MeetingCard from "./components/MeetingCard";
import { parsePrompt, confirmMeeting, listMeetings, cancelMeeting } from "./lib/api";
import type { ParsedIntent, ConfirmResponse, Meeting } from "./lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "info" | "success" | "error" | "question" | "ready";
  intent?: ParsedIntent;
  timestamp: Date;
}

// ── Mock auth (replace with real Google OAuth in production) ──────────────────
const MOCK_USER = {
  name: "Arsh",
  email: "arsh@example.com",
  access_token: "mock-token",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI meeting scheduler. Tell me who you want to meet and when — you can type or use voice input.",
      type: "info",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<{ intent: ParsedIntent; prompt: string } | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    try {
      const data = await listMeetings(MOCK_USER.email);
      setMeetings(data);
    } catch {
      // silently fail
    }
  }

  function addMessage(msg: Omit<Message, "id" | "timestamp">) {
    setMessages((prev: Message[]) => [
      ...prev,
      { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() },
    ]);
  }

  async function handleSubmit(e?: FormEvent, overrideInput?: string) {
    e?.preventDefault();
    const prompt = (overrideInput ?? input).trim();
    if (!prompt || loading) return;

    setInput("");
    addMessage({ role: "user", content: prompt });

    // Update conversation history for multi-turn
    const updatedHistory = [
      ...conversationHistory,
      { role: "user", content: prompt },
    ];

    setLoading(true);
    try {
      const result = await parsePrompt(prompt, "Asia/Kolkata", conversationHistory.length > 0 ? updatedHistory : undefined);
      const intent = result.intent;

      if (intent.status === "ready") {
        const assistantMsg = `I found the meeting details. Please review and confirm:`;
        addMessage({
          role: "assistant",
          content: assistantMsg,
          type: "ready",
          intent,
        });
        setConfirmIntent({ intent, prompt });
        setConversationHistory([]); // Reset after successful parse

      } else if (intent.status === "needs_info") {
        const question = intent.clarifying_question || "Could you provide more details?";
        addMessage({ role: "assistant", content: question, type: "question" });

        // Update history for follow-up
        setConversationHistory([
          ...updatedHistory,
          { role: "assistant", content: question },
        ]);

      } else {
        const errMsg = intent.reason || "I couldn't process that request.";
        addMessage({
          role: "assistant",
          content: errMsg + (intent.suggestion ? `\n\n💡 ${intent.suggestion}` : ""),
          type: "error",
        });
        setConversationHistory([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      addMessage({ role: "assistant", content: `Error: ${msg}`, type: "error" });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm(intent: ParsedIntent): Promise<ConfirmResponse> {
    const result = await confirmMeeting({
      intent,
      organizer_email: MOCK_USER.email,
      organizer_name: MOCK_USER.name,
      access_token: MOCK_USER.access_token,
      raw_prompt: confirmIntent?.prompt,
    });

    addMessage({
      role: "assistant",
      content: `✅ Meeting "${result.title}" has been scheduled! Invitations sent to ${result.attendees.map((a) => a.name).join(", ")}.${result.meet_link ? "\n\nJoin link: " + result.meet_link : ""}`,
      type: "success",
    });

    toast.success("Meeting scheduled successfully!");
    setConfirmIntent(null);
    loadMeetings();
    return result;
  }

  async function handleCancelMeeting(id: string) {
    if (!confirm("Cancel this meeting? Attendees will be notified.")) return;
    try {
      await cancelMeeting(id, MOCK_USER.access_token, MOCK_USER.name);
      toast.success("Meeting cancelled");
      loadMeetings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  }

  const examplePrompts = [
    "Schedule a 30-min sync with Priya Sharma tomorrow at 3 PM",
    "Book a 1-hour design review with the frontend team on Friday at 11 AM",
    "Set up a quick catch-up with Rohan next Monday morning",
  ];

  return (
    <div className="flex h-screen bg-surface-0 relative overflow-hidden">

      {/* ── Sidebar: Meeting History ───────────────────────────────────────── */}
      <aside
        className={`
          absolute top-0 left-0 h-full z-20 w-80 bg-surface-1 border-r border-subtle
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:flex
        `}
      >
        <div className="flex items-center gap-2 p-4 border-b border-subtle">
          <Calendar size={16} className="text-accent" />
          <h2 className="text-text-primary font-semibold text-sm">Meetings</h2>
          <button
            onClick={loadMeetings}
            className="ml-auto p-1.5 rounded-lg hover:bg-surface-3 text-text-secondary transition"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {meetings.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm">
              <Calendar size={28} className="mx-auto mb-3 opacity-30" />
              <p>No meetings yet</p>
            </div>
          ) : (
            meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onCancel={handleCancelMeeting} />
            ))
          )}
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-0">

        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-3.5 border-b border-subtle glass">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-3 transition"
          >
            <Calendar size={16} className="text-text-secondary" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <span className="font-semibold text-text-primary text-sm">AI Meeting Scheduler</span>
            <span className="text-[10px] text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">Gemini 1.5 Flash</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs text-white font-bold">
              {MOCK_USER.name.charAt(0)}
            </div>
            <span className="text-text-secondary text-sm hidden sm:block">{MOCK_USER.name}</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-accent" />
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`
                    px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === "user"
                      ? "bg-accent text-white rounded-tr-sm"
                      : msg.type === "error"
                      ? "bg-danger/10 border border-danger/20 text-danger/90 rounded-tl-sm"
                      : msg.type === "success"
                      ? "bg-success/10 border border-success/20 text-text-primary rounded-tl-sm"
                      : msg.type === "question"
                      ? "bg-warning/8 border border-warning/20 text-text-primary rounded-tl-sm"
                      : msg.type === "ready"
                      ? "bg-surface-3 border border-accent/20 text-text-primary rounded-tl-sm"
                      : "bg-surface-2 border border-subtle text-text-primary rounded-tl-sm"
                    }
                  `}
                >
                  {msg.type === "error" && <AlertCircle size={13} className="inline mr-1.5 mb-0.5" />}
                  {msg.type === "success" && <CheckCircle2 size={13} className="inline mr-1.5 mb-0.5 text-success" />}
                  {msg.content}
                </div>

                <span className="text-text-muted text-[11px] px-1">
                  {format(msg.timestamp, "h:mm a")}
                </span>
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-white font-bold">
                  {MOCK_USER.name.charAt(0)}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                <Bot size={14} className="text-accent" />
              </div>
              <div className="bg-surface-2 border border-subtle rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse-dot"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Example prompts (shown when only welcome message) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-text-muted text-xs mb-2 text-center">Try an example:</p>
            <div className="flex flex-col gap-1.5">
              {examplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(p); handleSubmit(undefined, p); }}
                  className="text-left text-sm text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 border border-subtle hover:border-accent/30 rounded-xl px-4 py-2.5 transition"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-subtle glass"
        >
          <div className="flex items-center gap-2 bg-surface-2 border border-subtle hover:border-accent/30 focus-within:border-accent/50 rounded-2xl px-4 py-2.5 transition">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Schedule a meeting with…"
              disabled={loading}
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none disabled:opacity-50"
            />

            <VoiceRecorder
              onTranscript={(text) => { setInput(text); handleSubmit(undefined, text); }}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 flex items-center justify-center transition flex-shrink-0"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-center text-text-muted text-[11px] mt-2">
            Powered by Gemini 1.5 Flash + Web Speech API · Google Calendar integrated
          </p>
        </form>
      </main>

      {/* Confirm Modal */}
      {confirmIntent && (
        <ConfirmModal
          intent={confirmIntent.intent}
          rawPrompt={confirmIntent.prompt}
          onConfirm={handleConfirm}
          onClose={() => setConfirmIntent(null)}
        />
      )}
    </div>
  );
}
