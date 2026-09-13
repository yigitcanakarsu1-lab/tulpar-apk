import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  ArrowUp,
  Image as ImageIcon,
  FileText,
  Mic,
  MicOff,
  Headphones,
  X,
  Camera,
  Sparkles,
} from "lucide-react";

interface ChatInputBarProps {
  input: string;
  setInput: (value: string) => void;
  attachedImage: {
    data: string;
    mimeType: string;
    name: string;
  } | null;
  setAttachedImage: (
    val: {
      data: string;
      mimeType: string;
      name: string;
    } | null
  ) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  onOpenVoiceMode: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  input,
  setInput,
  attachedImage,
  setAttachedImage,
  onSendMessage,
  isLoading,
  onOpenVoiceMode,
}) => {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef("");

  // Initialize SpeechRecognition support check
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "tr-TR";

      recog.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(baseTextRef.current ? `${baseTextRef.current} ${transcript.trim()}` : transcript.trim());
        }
      };

      recog.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, [setInput]);

  // Click outside listener for plus menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [input]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        baseTextRef.current = input.trim();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        data: reader.result as string,
        mimeType: file.type || "image/jpeg",
        name: file.name,
      });
      setIsPlusMenuOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const textContent = reader.result as string;
      const newText = input
        ? `${input}\n\n[Eklenen Belge: ${file.name}]\n${textContent}`
        : `[Eklenen Belge: ${file.name}]\n${textContent}\n\nLütfen bu belgeyi analiz et ve özetle.`;
      setInput(newText);
      setIsPlusMenuOpen(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachedImage) && !isLoading) {
        onSendMessage();
      }
    }
  };

  const canSend = Boolean(input.trim() || attachedImage) && !isLoading;

  return (
    <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-white via-white/95 to-transparent px-3 pb-3 pt-2 sm:px-6 sm:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <input
          type="file"
          ref={docInputRef}
          accept=".txt,.md,.json,.js,.ts,.html,.css,.csv,.xml,.py"
          className="hidden"
          onChange={handleDocChange}
        />

        {/* The Pill Container (Floating Capsule) */}
        <div className="relative flex flex-col rounded-[26px] border border-neutral-200/90 bg-neutral-50/90 shadow-lg backdrop-blur-md transition-all focus-within:border-neutral-300 focus-within:bg-white focus-within:shadow-xl">
          {/* Attached Image Thumbnail inside the Pill (Screenshot 3 style) */}
          {attachedImage && (
            <div className="px-4 pt-3 pb-1">
              <div className="group relative inline-flex items-center rounded-2xl border border-neutral-200 bg-white p-1 shadow-xs">
                <img
                  src={attachedImage.data}
                  alt={attachedImage.name}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white shadow-md hover:bg-neutral-800 transition-transform active:scale-95"
                  aria-label="Görseli kaldır"
                  title="Kaldır"
                >
                  <X className="h-3 w-3 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* Main Input Row */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5">
            {/* Plus Attachment Button (+) */}
            <div className="relative shrink-0" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                id="btn-input-plus"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
                  isPlusMenuOpen
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-200/80 text-neutral-700 hover:bg-neutral-300/80"
                }`}
                aria-label="Dosya Ekle"
                title="Görsel veya Belge Ekle"
              >
                <Plus
                  className={`h-4 w-4 stroke-[2.5] transition-transform duration-200 ${
                    isPlusMenuOpen ? "rotate-45" : ""
                  }`}
                />
              </button>

              {/* Plus Popup Menu */}
              {isPlusMenuOpen && (
                <div className="absolute bottom-12 left-0 w-52 rounded-2xl border border-neutral-200/90 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <span>Fotoğraf Yükle</span>
                  </button>

                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span>Belge veya Kod Ekle</span>
                  </button>
                </div>
              )}
            </div>

            {/* Expanding Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulpar'a bir mesaj yazın..."
              className="max-h-36 min-h-[26px] flex-1 resize-none bg-transparent py-1.5 text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none leading-relaxed"
            />

            {/* Right Action Buttons */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Voice Dictation (Microphone) */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  id="btn-voice-dictation"
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
                    isListening
                      ? "bg-rose-500 text-white animate-pulse"
                      : "text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900"
                  }`}
                  aria-label={isListening ? "Dinlemeyi Durdur" : "Sesle Yaz"}
                  title={isListening ? "Dinlemeyi Durdur" : "Sesle Yazdır"}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 stroke-[2]" />
                  ) : (
                    <Mic className="h-4 w-4 stroke-[2]" />
                  )}
                </button>
              )}

              {/* Conditional Send (Arrow Up) OR Voice Mode (Headphones) */}
              {canSend ? (
                /* Black Circle with White Up Arrow (Screenshot 3) */
                <button
                  type="button"
                  onClick={onSendMessage}
                  id="btn-chat-send"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white shadow-md hover:bg-neutral-800 active:scale-95 transition-all"
                  aria-label="Gönder"
                  title="Gönder"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              ) : (
                /* Headphones Voice Mode Icon (Screenshot 1) */
                <button
                  type="button"
                  onClick={onOpenVoiceMode}
                  id="btn-open-voice-mode"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition-all"
                  aria-label="Sesli Sohbet Modu"
                  title="Canlı Ses Modu"
                >
                  <Headphones className="h-4 w-4 stroke-[2]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hint text on bottom */}
        <p className="mt-1 text-center text-[11px] text-neutral-400">
          Tulpar hata yapabilir. Önemli bilgileri kontrol edin.
        </p>
      </div>
    </div>
  );
};
