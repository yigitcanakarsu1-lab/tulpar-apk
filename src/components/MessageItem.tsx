import React, { useState } from "react";
import { Copy, Check, Volume2, RotateCcw, AlertCircle } from "lucide-react";
import { ChatMessage } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TulparLogo } from "./TulparLogo";

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  isLoading?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRetry,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = message.content
      .replace(/[*#`_~]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "tr-TR";
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find((v) => v.lang.startsWith("tr"));
    if (trVoice) utterance.voice = trVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`group flex w-full flex-col py-3 px-4 transition-colors ${
        isUser ? "items-end" : "items-start"
      }`}
    >
      <div className={`flex w-full max-w-3xl items-start gap-3 ${isUser ? "justify-end" : ""}`}>
        {/* Assistant Tulpar Emblem on Left */}
        {!isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white p-0.5 shadow-2xs mt-0.5 border border-neutral-200/90">
            <TulparLogo size={24} variant="black" className="h-full w-full object-contain" />
          </div>
        )}

        <div className={`flex flex-col ${isUser ? "items-end max-w-[85%]" : "flex-1 min-w-0"}`}>
          {/* User Attached Image Preview */}
          {isUser && message.image && (
            <div className="mb-2 overflow-hidden rounded-2xl border border-neutral-200 shadow-xs bg-white">
              <img
                src={message.image.data}
                alt={message.image.name || "Kullanıcı görseli"}
                className="max-h-60 max-w-full rounded-2xl object-cover"
              />
            </div>
          )}

          {/* User Bubble or Assistant Text */}
          {isUser ? (
            <div className="rounded-[22px] bg-neutral-100 px-4 py-2.5 text-sm sm:text-base text-neutral-900 leading-relaxed break-words shadow-2xs">
              {message.content}
            </div>
          ) : (
            <div className="w-full text-neutral-800 text-sm sm:text-base leading-relaxed">
              {message.isError ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs sm:text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                    <div className="leading-relaxed">{message.content}</div>
                  </div>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Tekrar Dene</span>
                    </button>
                  )}
                </div>
              ) : message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                /* Streaming skeleton / thinking state */
                <div className="flex items-center gap-1.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse [animation-delay:300ms]" />
                </div>
              )}

              {/* Action Buttons underneath assistant message */}
              {message.content && !message.isError && (
                <div className="mt-2 flex items-center gap-2 text-neutral-400">
                  <button
                    onClick={handleCopy}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                    title="Kopyala"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {"speechSynthesis" in window && (
                    <button
                      onClick={handleSpeak}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-100 hover:text-neutral-700 transition-colors ${
                        isSpeaking ? "text-indigo-600" : ""
                      }`}
                      title={isSpeaking ? "Durdur" : "Sesli Oku"}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
