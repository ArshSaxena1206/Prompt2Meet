"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
  }

  async function startRecording() {
    if (disabled) return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert("Web Speech API (Speech Recognition) is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Visualize audio levels
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const tick = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn("Could not capture media stream for visualization:", err);
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (e: any) => {
      const result = e.results[e.resultIndex];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      }
    };

    recognition.onend = () => {
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
      setState("idle");
      cleanup();
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setState("idle");
      cleanup();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
  }

  async function stopRecording() {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    recognitionRef.current?.stop();
    setState("processing");
  }

  function handleClick() {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const scale = 1 + audioLevel * 0.4;

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple rings when recording */}
      {isRecording && (
        <>
          <span
            className="absolute rounded-full border border-accent/40 animate-ping"
            style={{
              width: `${40 + audioLevel * 20}px`,
              height: `${40 + audioLevel * 20}px`,
            }}
          />
          <span
            className="absolute rounded-full border border-accent/20 animate-ping"
            style={{
              width: `${56 + audioLevel * 28}px`,
              height: `${56 + audioLevel * 28}px`,
              animationDelay: "0.2s",
            }}
          />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={isRecording ? "Click to stop" : "Click to speak"}
        style={{ transform: `scale(${isRecording ? scale : 1})` }}
        className={`
          relative z-10 w-11 h-11 rounded-full flex items-center justify-center
          transition-all duration-150
          ${isRecording
            ? "bg-danger/90 hover:bg-danger shadow-[0_0_16px_rgba(239,68,68,0.5)]"
            : isProcessing
            ? "bg-surface-3 cursor-wait"
            : "bg-surface-3 hover:bg-surface-4 border border-subtle hover:border-accent/40"
          }
          disabled:opacity-50
        `}
      >
        {isProcessing ? (
          <Loader2 size={16} className="text-text-secondary animate-spin" />
        ) : isRecording ? (
          <MicOff size={16} className="text-white" />
        ) : (
          <Mic size={16} className="text-text-secondary" />
        )}
      </button>
    </div>
  );
}
