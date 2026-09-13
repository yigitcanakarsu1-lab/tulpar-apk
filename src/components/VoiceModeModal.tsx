import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Volume2, Sparkles, AlertCircle, ShieldCheck, Sun } from "lucide-react";
import { TulparLogo } from "./TulparLogo";
import { AppPermissionsConfig } from "../types";
import {
  parseVoiceCommand,
  executeAppLaunch,
  DEFAULT_PERMISSIONS,
} from "../utils/voiceCommandDispatcher";

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceQuery: (query: string) => Promise<string>;
  permissions?: AppPermissionsConfig;
  onOpenPermissions?: () => void;
  onOpenAmbientMode?: () => void;
}

const VOICES = [
  { id: "breeze", name: "Breeze", desc: "Sıcak & Dingin" },
  { id: "cove", name: "Cove", desc: "Doğal & Samimi" },
  { id: "sky", name: "Sky", desc: "Canlı & Berrak" },
  { id: "juniper", name: "Juniper", desc: "Açık & Dinamik" },
  { id: "ember", name: "Ember", desc: "Güvenilir & Tok" },
];

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  onSendVoiceQuery,
  permissions,
  onOpenPermissions,
  onOpenAmbientMode,
}) => {
  const [status, setStatus] = useState<"listening" | "thinking" | "speaking" | "idle">(
    "idle"
  );
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[2].id);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Stop everything on close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setStatus("idle");
      setTranscript("");
      setLastResponse("");
      setErrorNotice(null);
    } else {
      startListening();
    }
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorNotice("Tarayıcınız mikrofon ses algılamasını desteklemiyor.");
      setStatus("idle");
      return;
    }

    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setStatus("listening");
        setErrorNotice(null);
      };

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");
        setTranscript(text);
      };

      recognition.onerror = (e: any) => {
        console.warn("Voice error:", e);
        if (e.error !== "no-speech") {
          setErrorNotice("Mikrofon algılanamadı veya izin verilmedi.");
        }
        setStatus("idle");
      };

      recognition.onend = async () => {
        // If transcript was captured, submit to AI or command parser!
        if (transcript.trim()) {
          const userQuery = transcript.trim();
          const activePermissions = permissions || DEFAULT_PERMISSIONS;

          // Check if user requested an app action (YouTube, Phone call, Instagram, etc.)
          const commandResult = parseVoiceCommand(userQuery, activePermissions);

          if (commandResult.isCommand) {
            if (commandResult.permitted && commandResult.url) {
              const msg = commandResult.spokenReply || `${commandResult.appName} açılıyor.`;
              setLastResponse(commandResult.actionDescription || msg);
              speakResponse(msg, () => {
                executeAppLaunch(commandResult.url!);
              });
              return;
            } else {
              const deniedMsg =
                commandResult.spokenReply ||
                `${commandResult.appName} izni ayarlardan devre dışı bırakılmış.`;
              setLastResponse(deniedMsg);
              speakResponse(deniedMsg);
              return;
            }
          }

          // General AI query
          setStatus("thinking");
          try {
            const reply = await onSendVoiceQuery(userQuery);
            setLastResponse(reply);
            speakResponse(reply);
          } catch (err: any) {
            setErrorNotice("Yanıt alınırken hata oluştu.");
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setErrorNotice("Ses sistemi başlatılamadı.");
      setStatus("idle");
    }
  };

  const speakResponse = (text: string, onComplete?: () => void) => {
    if (!("speechSynthesis" in window)) {
      setStatus("idle");
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown symbols for speech
    const cleanText = text
      .replace(/[*#`_~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "tr-TR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick system voices if available
    const availableVoices = window.speechSynthesis.getVoices();
    const trVoice = availableVoices.find((v) => v.lang.startsWith("tr"));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onstart = () => {
      setStatus("speaking");
    };

    utterance.onend = () => {
      setStatus("idle");
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      setStatus("idle");
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleOrbClick = () => {
    if (status === "speaking") {
      window.speechSynthesis.cancel();
      setStatus("idle");
    } else if (status === "listening") {
      recognitionRef.current?.stop();
    } else if (status === "idle") {
      setTranscript("");
      startListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white px-6 py-10 transition-all duration-300">
      {/* Top Bar (Screenshot 2 style) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white p-0.5 overflow-hidden ring-1 ring-neutral-700">
            <TulparLogo size={24} variant="black" className="h-full w-full object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-neutral-200">
            Tulpar Canlı Ses
          </span>
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
        </div>

        <div className="flex items-center gap-2">
          {onOpenAmbientMode && (
            <button
              onClick={() => {
                onClose();
                onOpenAmbientMode();
              }}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-700/80 px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Ambiyans Always-On Siri Modu"
            >
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ambiyans Siri Modu</span>
            </button>
          )}

          {onOpenPermissions && (
            <button
              onClick={onOpenPermissions}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
              title="Sesli Komut & Uygulama İzinleri"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onClose}
            id="btn-voice-mode-close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Center Fluid Audio Waveform / Pulsating Orb (Screenshot 2) */}
      <div className="flex flex-1 flex-col items-center justify-center my-auto text-center">
        <button
          onClick={handleOrbClick}
          className="group relative flex items-center justify-center p-8 focus:outline-none"
          title="Duraklat / Başlat"
        >
          {/* Animated Glow Rings */}
          <div
            className={`absolute h-44 w-44 rounded-full transition-all duration-700 ${
              status === "listening"
                ? "bg-blue-600/30 scale-125 animate-ping"
                : status === "thinking"
                ? "bg-purple-600/30 scale-110 animate-pulse"
                : status === "speaking"
                ? "bg-emerald-500/30 scale-130 animate-pulse"
                : "bg-white/10 scale-95"
            }`}
          />

          {/* Sound Wave Bars / Fluid Circles (Exact match to ChatGPT iOS UI Kit Screenshot 2) */}
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform active:scale-95 overflow-hidden">
            {status === "speaking" ? (
              <div className="flex items-center gap-1.5 h-10 z-10">
                <span className="h-8 w-2 rounded-full bg-black animate-[bounce_0.6s_infinite_100ms]" />
                <span className="h-10 w-2 rounded-full bg-black animate-[bounce_0.6s_infinite_200ms]" />
                <span className="h-6 w-2 rounded-full bg-black animate-[bounce_0.6s_infinite_300ms]" />
                <span className="h-9 w-2 rounded-full bg-black animate-[bounce_0.6s_infinite_150ms]" />
              </div>
            ) : status === "listening" ? (
              <div className="flex flex-col items-center z-10">
                <Mic className="h-10 w-10 text-black animate-pulse" />
              </div>
            ) : status === "thinking" ? (
              <Sparkles className="h-10 w-10 text-neutral-800 animate-spin z-10" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center p-1">
                <TulparLogo size={72} variant="black" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
        </button>

        {/* Status Text & Live Transcript */}
        <div className="mt-8 max-w-md px-4">
          <p className="text-base font-medium text-neutral-200">
            {status === "listening" && "Dinliyorum, konuşun..."}
            {status === "thinking" && "Düşünüyor..."}
            {status === "speaking" && "Yanıt veriyor..."}
            {status === "idle" && "Konuşmak için ortadaki butona dokunun"}
          </p>

          {transcript && (
            <p className="mt-2 text-sm text-neutral-400 italic">
              "{transcript}"
            </p>
          )}

          {errorNotice && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>{errorNotice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls (Screenshot 2: 'Tap to cancel', Voice selection) */}
      <div className="flex flex-col items-center gap-6">
        {/* Voice Selector Pill Strip */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedVoice === voice.id
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {voice.name}
            </button>
          ))}
        </div>

        {/* Tap to Cancel (Screenshot 2) */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-6 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 active:scale-95 transition-all"
        >
          <div className="h-3 w-3 rounded-xs bg-rose-500" />
          <span>İptal etmek için dokunun</span>
        </button>
      </div>
    </div>
  );
};
