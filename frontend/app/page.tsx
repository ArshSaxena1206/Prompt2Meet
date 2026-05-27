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

interface UserSession {
  name: string;
  email: string;
  access_token: string;
  picture?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm Prompt2Meet, your AI meeting scheduler. Tell me who you want to meet and when — you can type or use voice input.",
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

  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // 1. Check URL hash for token
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const tokenFromUrl = params.get("access_token");

    async function verifyAndSetUser(token: string) {
      try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
        if (!res.ok) throw new Error("Invalid token");
        const data = await res.json();
        
        const session: UserSession = {
          name: data.name,
          email: data.email,
          access_token: token,
          picture: data.picture,
        };
        setUser(session);
        localStorage.setItem("user_session", JSON.stringify(session));
        loadMeetings(session.email);
      } catch (err) {
        console.error("Auth failed:", err);
        localStorage.removeItem("user_session");
      } finally {
        setAuthLoading(false);
      }
    }

    if (tokenFromUrl) {
      // Clear hash to hide token
      window.history.replaceState(null, "", window.location.pathname);
      verifyAndSetUser(tokenFromUrl);
    } else {
      // 2. Check localStorage
      const cached = localStorage.getItem("user_session");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser(parsed);
          loadMeetings(parsed.email);
        } catch {
          localStorage.removeItem("user_session");
        }
      }
      setAuthLoading(false);
    }
  }, []);

  async function loadMeetings(userEmail?: string) {
    const emailToUse = userEmail || user?.email;
    if (!emailToUse) return;
    try {
      const data = await listMeetings(emailToUse);
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

  async function handleConfirm(intent: ParsedIntent): Promise<ConfirmResponse | undefined> {
    try {
      if (!user) throw new Error("You must be logged in to schedule a meeting.");
      const result = await confirmMeeting({
        intent,
        organizer_email: user.email,
        organizer_name: user.name,
        access_token: user.access_token,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm meeting";
      toast.error(msg);
      addMessage({
        role: "assistant",
        content: `❌ I couldn't schedule the meeting because the Google Calendar API rejected the mock token. You need to implement real Google OAuth to create actual calendar events! (Error: ${msg})`,
        type: "error",
      });
      setConfirmIntent(null);
    }
  }

  async function handleCancelMeeting(id: string) {
    if (!user) return;
    if (!confirm("Cancel this meeting? Attendees will be notified.")) return;
    try {
      await cancelMeeting(id, user.access_token, user.name);
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

  if (authLoading) {
    return (
      <div className="flex h-screen bg-surface-0 items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Calendar size={32} className="text-accent" />
          <p className="text-text-secondary text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen bg-surface-0 items-center justify-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
        
        <div className="bg-surface-1 border border-subtle p-8 rounded-3xl max-w-sm w-full text-center relative z-10 shadow-2xl glass">
          <div className="w-16 h-16 bg-accent/15 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <Sparkles size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome Back</h1>
          <p className="text-text-secondary text-sm mb-8">Sign in with Google to schedule meetings and manage your calendar.</p>
          
          <button
            onClick={() => window.location.href = "http://localhost:8000/auth/login"}
            className="w-full bg-surface-2 hover:bg-surface-3 border border-subtle hover:border-accent/30 text-text-primary font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

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
            onClick={() => loadMeetings()}
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
            <span className="font-semibold text-text-primary text-sm">Prompt2Meet</span>
            <span className="text-[10px] text-accent bg-accent-soft px-1.5 py-0.5 rounded font-medium">Gemini 2.5 Flash</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("user_session");
                setUser(null);
              }}
              className="text-xs text-text-muted hover:text-danger mr-2 transition"
            >
              Sign out
            </button>
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs text-white font-bold overflow-hidden">
              {user.picture ? <img src={user.picture} alt={user.name} /> : user.name.charAt(0)}
            </div>
            <span className="text-text-secondary text-sm hidden sm:block">{user.name}</span>
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
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-white font-bold overflow-hidden">
                  {user.picture ? <img src={user.picture} alt={user.name} /> : user.name.charAt(0)}
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
          <div className="text-center text-text-muted text-[11px] mt-2 space-y-1 pb-1">
            <p>Powered by Gemini 2.5 Flash + Web Speech API · Google Calendar integrated</p>
            <p>
              &copy; {new Date().getFullYear()} Prompt2Meet. All rights reserved. |{" "}
              <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a> |{" "}
              <a href="#" className="hover:text-accent transition-colors">Terms of Service</a> |{" "}
              Contact: <a href="mailto:support@prompt2meet.com" className="hover:text-accent transition-colors">support@prompt2meet.com</a>
            </p>
          </div>
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
