import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Paperclip,
  X,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Square,
  Image as ImageIcon,
} from "lucide-react";
import { ChatMessage, Persona } from "../types";
import { PERSONAS, STARTER_PROMPTS } from "../data/constants";
import { MarkdownRenderer } from "./MarkdownRenderer";

export const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Merhaba! Ben **Tulpar Yapay Zeka Asistanınızım**. Size metin yazma, kodlama, görsel analizi, problem çözme ve aklınıza gelen her konuda yardımcı olabilirim. Size nasıl yardımcı olabilirim?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WEBP vb.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachedImage({
        data: result,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend !== undefined ? textToSend : input).trim();
    if ((!messageText && !attachedImage) || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: messageText || "Görseli incele ve detaylı analiz et.",
      image: attachedImage || undefined,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    const assistantMessageId = `asst-${Date.now()}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, placeholderAssistant]);

    try {
      abortControllerRef.current = new AbortController();

      // We send chat history + system instruction
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemInstruction: selectedPersona.systemInstruction,
          image: currentImage
            ? {
                data: currentImage.data,
                mimeType: currentImage.mimeType,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Sunucu hatası: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Yanıttan akış verisi okunamadı.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedContent += parsed.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (parsed.error) {
                accumulatedContent += `\n\n⚠️ *Hata: ${parsed.error}*`;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (err) {
              // Non-JSON line or partial
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    msg.content || "*(Yanıt kullanıcı tarafından durduruldu)*",
                }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `Bir hata meydana geldi: ${
                    err.message || "Bilinmeyen hata"
                  }. Lütfen tekrar deneyin.`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    if (window.confirm("Tüm sohbet geçmişi silinecektir. Onaylıyor musunuz?")) {
      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content:
            "Sohbet temizlendi. Yeni bir soru veya görevle başlayabilirsiniz!",
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4.25rem)] flex-col lg:flex-row max-w-7xl mx-auto w-full">
      {/* Persona Sidebar / Mobile Selector */}
      <aside className="w-full border-b border-slate-200 bg-white p-3 sm:p-4 lg:w-72 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Bot className="h-4 w-4 text-indigo-600" />
            <span>AI Asistan Rolü</span>
          </div>
          <button
            onClick={clearChat}
            id="clear-chat-btn"
            title="Sohbeti Temizle"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Temizle</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {PERSONAS.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            return (
              <button
                key={persona.id}
                id={`persona-btn-${persona.id}`}
                onClick={() => setSelectedPersona(persona)}
                className={`flex flex-col items-start rounded-xl p-2.5 text-left transition-all ${
                  isSelected
                    ? "bg-indigo-50/80 border border-indigo-200 text-indigo-900 shadow-xs"
                    : "border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {persona.name[0]}
                  </span>
                  <span className="font-semibold text-xs sm:text-sm truncate">
                    {persona.name}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                  {persona.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Info card */}
        <div className="mt-4 hidden lg:block rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 p-3 text-xs text-slate-600">
          <p className="font-semibold text-indigo-900 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            İpucu
          </p>
          <p className="mt-1 text-slate-600 leading-relaxed">
            Ataş butonunu kullanarak ekran görüntüsü, fotoğraf veya belge yükleyip
            görsel hakkında doğrudan soru sorabilirsiniz.
          </p>
        </div>
      </aside>

      {/* Main Chat Flow Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50/60">
        {/* Messages Scroll Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-2xl rounded-2xl p-4 shadow-xs transition-all ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs"
                  }`}
                >
                  {/* Message Attached Image Preview */}
                  {message.image && (
                    <div className="mb-3 overflow-hidden rounded-lg border border-white/20">
                      <img
                        src={message.image.data}
                        alt="Kullanıcı görseli"
                        className="max-h-60 w-auto object-contain rounded-lg bg-black/5"
                      />
                      {message.image.name && (
                        <p className="mt-1 text-[11px] opacity-80 truncate">
                          📎 {message.image.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    <>
                      {message.content ? (
                        <MarkdownRenderer content={message.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
                          <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-600"></span>
                          <span className="inline-block h-2 w-2 animate-bounce [animation-delay:0.2s] rounded-full bg-indigo-600"></span>
                          <span className="inline-block h-2 w-2 animate-bounce [animation-delay:0.4s] rounded-full bg-indigo-600"></span>
                          <span className="ml-1 text-xs font-medium text-slate-500">
                            Düşünüyor ve yazıyor...
                          </span>
                        </div>
                      )}

                      {/* Action buttons on message */}
                      {message.content && (
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                          <span className="text-[11px]">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() =>
                              handleCopyMessage(message.id, message.content)
                            }
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Yanıtı Kopyala"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Kopyala</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-slate-800 text-white shadow-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts (if chat is fresh) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3 sm:px-8">
            <p className="mb-2 text-xs font-medium text-slate-500">
              Hızlı Başlangıç Soruları:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  id={`starter-prompt-${i}`}
                  onClick={() => handleSendMessage(prompt.slice(2))}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 transition-all text-left shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {/* Attached image preview banner */}
          {attachedImage && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src={attachedImage.data}
                  alt="Yüklendi"
                  className="h-10 w-10 rounded object-cover border border-indigo-200"
                />
                <div className="truncate text-xs">
                  <p className="font-semibold text-indigo-900 truncate">
                    {attachedImage.name}
                  </p>
                  <p className="text-slate-500">Görsel mesaja eklendi</p>
                </div>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-indigo-100 hover:text-slate-700"
                title="Görseli Kaldır"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Image upload button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              id="chat-attach-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              title="Görsel veya Doküman Ekle"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Prompt textarea */}
            <div className="relative flex-1">
              <textarea
                id="chat-input-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Yapay zekaya bir şey sorun veya görev verin... (Enter ile gönder)"
                rows={1}
                className="max-h-36 min-h-[44px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Submit / Stop button */}
            {isLoading ? (
              <button
                id="chat-stop-btn"
                type="button"
                onClick={handleStop}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-colors"
                title="Yanıtı Durdur"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                id="chat-send-btn"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() && !attachedImage}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all"
                title="Gönder"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
