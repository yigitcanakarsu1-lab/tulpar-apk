import React, { useState, useEffect, useRef } from "react";
import { X, Mic, Sparkles, Volume2, ShieldCheck, Sun, Moon, ExternalLink } from "lucide-react";
import { TulparLogo } from "./TulparLogo";
import { AppPermissionsConfig } from "../types";
import {
  parseVoiceCommand,
  hasWakeWord,
  stripWakeWord,
  executeAppLaunch,
} from "../utils/voiceCommandDispatcher";
import { requestScreenWakeLock, releaseScreenWakeLock } from "../utils/wakeLock";

interface AmbientWakeWordScreenProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: AppPermissionsConfig;
  onSendVoiceQuery: (query: string) => Promise<string>;
}

export const AmbientWakeWordScreen: React.FC<AmbientWakeWordScreenProps> = ({
  isOpen,
  onClose,
  permissions,
  onSendVoiceQuery,
}) => {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [status, setStatus] = useState<"listening" | "processing" | "speaking" | "idle">("idle");
  const [transcript, setTranscript] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionUrl, setActionUrl] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isMounted = useRef(true);
  const restartTimerRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("tr-TR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Screen Wake Lock & Continuous Listening when open
  useEffect(() => {
    isMounted.current = true;

    if (isOpen) {
      if (permissions.ambientModeWakeLock) {
        requestScreenWakeLock();
      }
      startContinuousListening();
    } else {
      releaseScreenWakeLock();
      stopListening();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setStatus("idle");
      setTranscript("");
      setAssistantReply("");
      setActionNotice(null);
    }

    return () => {
      isMounted.current = false;
      clearTimeout(restartTimerRef.current);
      releaseScreenWakeLock();
      stopListening();
    };
  }, [isOpen]);

  const speak = (text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    // Temporarily pause recognition while speaking on Android so speaker output isn't re-transcribed
    isSpeakingRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find((v) => v.lang.startsWith("tr"));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    const finishSpeaking = () => {
      isSpeakingRef.current = false;
      if (isMounted.current && isOpen) {
        setStatus("listening");
        // Resume listening on Android
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isMounted.current && isOpen && !isSpeakingRef.current) {
            try {
              recognitionRef.current?.start();
            } catch {}
          }
        }, 300);
      }
      if (onEnd) onEnd();
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.speak(utterance);
  };

  const handleCommandOrQuery = async (rawText: string) => {
    const cleanedText = stripWakeWord(rawText) || rawText;
    if (!cleanedText.trim()) return;

    setStatus("processing");
    setTranscript(rawText);

    // 1. Check if voice command matches permitted app
    const commandResult = parseVoiceCommand(cleanedText, permissions);

    if (commandResult.isCommand) {
      if (commandResult.permitted && commandResult.url) {
        const desc = commandResult.actionDescription || `${commandResult.appName} açılıyor...`;
        setActionNotice(desc);
        setActionUrl(commandResult.url);
        setStatus("speaking");
        speak(commandResult.spokenReply || `${commandResult.appName} açılıyor.`, () => {
          executeAppLaunch(commandResult.url!);
          setTimeout(() => {
            setActionNotice(null);
            setActionUrl(null);
          }, 4000);
        });
        return;
      } else {
        setActionNotice(`${commandResult.appName} için izin kapalı.`);
        setActionUrl(null);
        setStatus("speaking");
        speak(
          commandResult.spokenReply ||
            `${commandResult.appName} izni ayarlardan devre dışı bırakılmış.`
        );
        return;
      }
    }

    // 2. Normal AI query to Tulpar
    try {
      const reply = await onSendVoiceQuery(cleanedText);
      if (!isMounted.current) return;
      setAssistantReply(reply);
      setStatus("speaking");
      speak(reply);
    } catch (err: any) {
      if (!isMounted.current) return;
      const errMsg = "Yanıt alınırken bir sorun oluştu.";
      setAssistantReply(errMsg);
      setStatus("speaking");
      speak(errMsg);
    }
  };

  const startContinuousListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setActionNotice("Tarayıcınız sürekli ses tanımayı desteklemiyor.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "tr-TR";

      recognition.onstart = () => {
        if (isMounted.current && !isSpeakingRef.current) setStatus("listening");
      };

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return;
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const text = lastResult[0].transcript.trim();
          if (text) {
            handleCommandOrQuery(text);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Ambient recognition error:", event.error);
        if (event.error === "not-allowed") {
          setActionNotice("Mikrofon izni verilmedi.");
        }
      };

      recognition.onend = () => {
        // Auto-restart continuous listening in ambient mode with debounce for Android stability
        if (isMounted.current && isOpen && !isSpeakingRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isMounted.current && isOpen && !isSpeakingRef.current) {
              try {
                recognition.start();
              } catch {
                // Ignore if already active
              }
            }
          }, 350);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start continuous recognition:", err);
    }
  };

  const stopListening = () => {
    clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none overflow-hidden p-6 md:p-10 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-400 text-xs">
          <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Always-On Siri Modu • "Hey Tulpar" Dinleniyor</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title="Çıkış"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Center Ambient Display */}
      <div className="flex flex-col items-center justify-center text-center my-auto space-y-8">
        {/* Digital Clock */}
        <div className="space-y-1">
          <div className="text-6xl md:text-8xl font-light tracking-tight text-neutral-200 tabular-nums">
            {timeStr}
          </div>
          <div className="text-sm md:text-base font-normal text-neutral-500 capitalize tracking-wide">
            {dateStr}
          </div>
        </div>

        {/* Central Orb / Winged Horse Logo */}
        <div className="relative flex items-center justify-center">
          {/* Animated glow rings */}
          {status === "listening" && (
            <div className="absolute h-36 w-36 rounded-full bg-neutral-800/80 animate-ping opacity-40" />
          )}
          {status === "processing" && (
            <div className="absolute h-40 w-40 rounded-full border-2 border-amber-500/40 animate-spin" />
          )}
          {status === "speaking" && (
            <div className="absolute h-44 w-44 rounded-full bg-purple-500/20 animate-pulse" />
          )}

          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full bg-neutral-900 border transition-all duration-500 shadow-2xl p-5 ${
              status === "listening"
                ? "border-emerald-500/50 shadow-emerald-500/20"
                : status === "processing"
                ? "border-amber-500/50 shadow-amber-500/20"
                : status === "speaking"
                ? "border-purple-500/50 shadow-purple-500/20"
                : "border-neutral-800"
            }`}
          >
            <TulparLogo size={70} variant="white" />
          </div>
        </div>

        {/* Dynamic Action / Speech Subtitle Banner */}
        <div className="min-h-[4rem] max-w-lg px-4 flex flex-col items-center justify-center space-y-2">
          {actionNotice && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-emerald-400 bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-800/60 animate-in fade-in">
                <Sparkles className="h-4 w-4" />
                <span>{actionNotice}</span>
              </div>
              {actionUrl && (
                <button
                  onClick={() => executeAppLaunch(actionUrl)}
                  className="flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-1.5 text-xs font-semibold shadow-lg hover:bg-neutral-200 active:scale-95 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Şimdi Aç</span>
                </button>
              )}
            </div>
          )}

          {transcript && !actionNotice && (
            <p className="text-xs text-neutral-400 italic">
              "{transcript}"
            </p>
          )}

          {assistantReply && (
            <p className="text-sm md:text-base font-medium text-neutral-200 line-clamp-3">
              {assistantReply}
            </p>
          )}

          {!transcript && !actionNotice && !assistantReply && (
            <p className="text-xs md:text-sm text-neutral-500">
              "Hey Tulpar", "YouTube aç", "Ahmet'i ara" veya bir soru söyleyin...
            </p>
          )}
        </div>
      </div>

      {/* Bottom status */}
      <div className="flex items-center justify-between text-xs text-neutral-600 border-t border-neutral-900 pt-4">
        <span>Ekran Kilitlenmez (Wake Lock Aktif)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5 text-emerald-500" />
            Canlı Dinlemede
          </span>
        </div>
      </div>
    </div>
  );
};
