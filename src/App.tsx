import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, ChatSession, AppPermissionsConfig, GroundingMetadata, AttachedDoc, AttachedImage } from "./types";
import { Header, AVAILABLE_MODELS } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { EmptyChatView } from "./components/EmptyChatView";
import { MessageItem } from "./components/MessageItem";
import { ChatInputBar } from "./components/ChatInputBar";
import { VoiceModeModal } from "./components/VoiceModeModal";
import { VoicePermissionModal } from "./components/VoicePermissionModal";
import { AmbientWakeWordScreen } from "./components/AmbientWakeWordScreen";
import { CameraCaptureModal } from "./components/CameraCaptureModal";
import { APKInstallModal } from "./components/APKInstallModal";
import { DEFAULT_PERMISSIONS } from "./utils/voiceCommandDispatcher";

const STORAGE_KEY = "chatgpt_ios_sessions_v1";
const ACTIVE_SESSION_KEY = "chatgpt_ios_active_id_v1";
const PERMISSIONS_STORAGE_KEY = "tulpar_permissions_v1";

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isAmbientModeOpen, setIsAmbientModeOpen] = useState(false);
  // Tulpar Full Internet Authority: Enabled by default across all websites and queries
  const [isWebSearchActive, setIsWebSearchActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tulpar_web_authority_v1");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const handleToggleWebSearch = () => {
    setIsWebSearchActive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tulpar_web_authority_v1", String(next));
      } catch {}
      return next;
    });
  };

  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState(false);

  // App Permissions & Voice Automation settings
  const [permissions, setPermissions] = useState<AppPermissionsConfig>(() => {
    try {
      const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_PERMISSIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PERMISSIONS;
  });

  const handleUpdatePermissions = (newPerms: AppPermissionsConfig) => {
    setPermissions(newPerms);
    try {
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(newPerms));
    } catch (e) {
      console.warn("Failed to persist permissions:", e);
    }
  };

  // Input state
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        const normalized = parsed.map((s) => ({
          ...s,
          model:
            s.model === "gemini-3.6-flash"
              ? "gemini-flash-latest"
              : s.model === "gemini-3.5-flash-lite"
              ? "gemini-3.1-flash-lite"
              : s.model || "gemini-3.8-flash",
        }));
        setSessions(normalized);
        const activeId = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (activeId && normalized.some((s) => s.id === activeId)) {
          setCurrentSessionId(activeId);
        } else if (normalized.length > 0) {
          setCurrentSessionId(normalized[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed to load sessions from storage:", e);
    }
  }, []);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      if (currentSessionId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, currentSessionId);
      }
    } catch (e) {
      console.warn("Failed to save sessions:", e);
    }
  }, [sessions, currentSessionId]);

  // Current session messages
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Start a fresh conversation
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setInput("");
    setAttachedImage(null);
    setAttachedImages([]);
    setAttachedDoc(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Select existing session
  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setInput("");
    setAttachedImage(null);
    setAttachedImages([]);
    setAttachedDoc(null);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    setSessions([]);
    setCurrentSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  };

  // Send message
  const handleSendMessage = async (
    textOverride?: string,
    imageOrImagesOverride?: AttachedImage[] | AttachedImage | null,
    docOverride?: AttachedDoc | null
  ) => {
    const textToSend = textOverride !== undefined ? textOverride : input.trim();
    let imagesToSend: AttachedImage[] = [];

    if (imageOrImagesOverride !== undefined) {
      if (Array.isArray(imageOrImagesOverride)) {
        imagesToSend = imageOrImagesOverride;
      } else if (imageOrImagesOverride) {
        imagesToSend = [imageOrImagesOverride];
      }
    } else {
      imagesToSend = attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);
    }

    const docToSend = docOverride !== undefined ? docOverride : attachedDoc;

    if (!textToSend && imagesToSend.length === 0 && !docToSend) return;
    if (isLoading) return;

    // Reset input states
    setInput("");
    setAttachedImage(null);
    setAttachedImages([]);
    setAttachedDoc(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend || (docToSend ? `${docToSend.name} belgesi analizi` : ""),
      image: imagesToSend.length > 0 ? { ...imagesToSend[0] } : undefined,
      images: imagesToSend.length > 0 ? [...imagesToSend] : undefined,
      doc: docToSend ? { ...docToSend } : undefined,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = `asst-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    let activeId = currentSessionId;

    // If new session, create session record
    if (!activeId) {
      const generatedTitle =
        textToSend.slice(0, 32) ||
        (docToSend
          ? `Belge: ${docToSend.name.slice(0, 20)}`
          : imagesToSend.length > 1
          ? `${imagesToSend.length} Görsel Analizi`
          : imagesToSend.length === 1
          ? "Görsel Analizi"
          : "Yeni Sohbet");
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: generatedTitle,
        messages: [userMessage, assistantPlaceholder],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: currentModel,
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      activeId = newSession.id;
    } else {
      // Append to current session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages, userMessage, assistantPlaceholder],
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    }

    setIsLoading(true);

    try {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {}
      }
      abortControllerRef.current = new AbortController();

      // Gather conversation history
      let promptContent = docToSend?.content
        ? `${textToSend ? textToSend + "\n\n" : ""}[Ekli Belge: ${docToSend.name}]\n${docToSend.content}`
        : textToSend;

      if (isDeepThinking) {
        promptContent = `[DERİN DÜŞÜNME / ANALİTİK MUHAKEME MODU]: Bu konuyu tüm yönleriyle derinlemesine, adım adım mantıksal olarak analiz et ve en kapsamlı sonucu çıkar.\n\n${promptContent}`;
      }

      const existingMsgs = (currentSession?.messages || []).filter((m) => !m.isError);
      const historyToSend = [
        ...existingMsgs.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: promptContent },
      ];

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: historyToSend,
          model: currentModel,
          webSearch: isWebSearchActive,
          deepThinking: isDeepThinking,
          images: imagesToSend.length > 0
            ? imagesToSend.map((img) => ({
                data: img.data,
                mimeType: img.mimeType,
                name: img.name,
              }))
            : undefined,
          image: imagesToSend.length > 0
            ? {
                data: imagesToSend[0].data,
                mimeType: imagesToSend[0].mimeType,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        let errMsg = errJson.error || `Sunucu hatası (${response.status})`;
        if (
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand")
        ) {
          errMsg =
            "Yapay zeka modeli geçici bir yoğunluk yaşıyor. Lütfen birkaç saniye sonra tekrar deneyin.";
        }
        updateAssistantMessage(activeId!, assistantMessageId, errMsg, true);
        return;
      }

      if (!response.body) {
        throw new Error("Akış yanıtı alınamadı.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";
      let currentGrounding: GroundingMetadata | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.groundingMetadata) {
              currentGrounding = parsed.groundingMetadata;
              updateAssistantMessage(
                activeId!,
                assistantMessageId,
                accumulatedText,
                false,
                currentGrounding
              );
            } else if (parsed.text) {
              accumulatedText += parsed.text;
              updateAssistantMessage(
                activeId!,
                assistantMessageId,
                accumulatedText,
                false,
                currentGrounding
              );
            } else if (parsed.error) {
              if (!accumulatedText) {
                updateAssistantMessage(activeId!, assistantMessageId, parsed.error, true);
              }
              return;
            }
          } catch {
            // Incomplete JSON or malformed line
          }
        }
      }

      if (!accumulatedText.trim()) {
        updateAssistantMessage(
          activeId!,
          assistantMessageId,
          "Yanıt üretilemedi veya bağlantı kesildi. Lütfen Tekrar Dene butonuna tıklayın.",
          true
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // user aborted
      } else {
        const rawErr = String(err?.message || "");
        let userMsg = rawErr;
        if (
          rawErr.includes("503") ||
          rawErr.includes("UNAVAILABLE") ||
          rawErr.includes("high demand")
        ) {
          userMsg =
            "Yapay zeka modeli geçici bir yoğunluk yaşıyor. Lütfen Tekrar Dene butonuna tıklayın.";
        } else if (
          rawErr.includes("429") ||
          rawErr.includes("RESOURCE_EXHAUSTED") ||
          rawErr.includes("quota") ||
          rawErr.includes("Quota")
        ) {
          userMsg =
            "İstek limitine ulaşıldı veya arama kotası geçici olarak doldu. Lütfen birkaç saniye sonra tekrar deneyin.";
        }
        updateAssistantMessage(
          activeId!,
          assistantMessageId,
          userMsg || "İstek işlenirken bir sorun oluştu.",
          true
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const updateAssistantMessage = (
    sessionId: string,
    messageId: string,
    content: string,
    isError: boolean,
    groundingMetadata?: GroundingMetadata
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content,
                  isError,
                  groundingMetadata:
                    groundingMetadata !== undefined ? groundingMetadata : m.groundingMetadata,
                }
              : m
          ),
        };
      })
    );
  };

  const handleRetryLast = () => {
    if (!currentSession) return;
    const lastUserIndex = currentSession.messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;
    const lastUser = currentSession.messages[lastUserIndex];

    // Remove the failed assistant response and last user message so retry does not duplicate it
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              messages: s.messages.slice(0, lastUserIndex),
            }
          : s
      )
    );
    const userImages = lastUser.images || (lastUser.image ? [lastUser.image] : undefined);
    handleSendMessage(lastUser.content, userImages, lastUser.doc);
  };

  // Voice mode direct query handler
  const handleSendVoiceQuery = async (
    queryText: string,
    cameraImage?: { data: string; mimeType: string } | null
  ): Promise<string> => {
    const userMessage: ChatMessage = {
      id: `voice-user-${Date.now()}`,
      role: "user",
      content: queryText,
      image: cameraImage
        ? {
            data: `data:${cameraImage.mimeType};base64,${cameraImage.data}`,
            mimeType: cameraImage.mimeType,
            name: "Asistan Canlı Kamera",
          }
        : undefined,
      timestamp: new Date().toISOString(),
    };

    let activeId = currentSessionId;
    if (!activeId) {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: queryText.slice(0, 32) || "Sesli / Görsel Sohbet",
        messages: [userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: currentModel,
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      activeId = newSession.id;
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages, userMessage],
              }
            : s
        )
      );
    }

    try {
      const historyPayload = (currentSession?.messages || [])
        .filter((m) => !m.isError && m.content)
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/voice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          history: historyPayload,
          model: currentModel,
          image: cameraImage
            ? {
                data: cameraImage.data,
                mimeType: cameraImage.mimeType,
              }
            : undefined,
        }),
      });

      let replyText = "";
      if (response.ok) {
        const data = await response.json();
        replyText = data.text || "Anladım, dinliyorum.";
      } else {
        // Fallback to /api/generate if needed
        const fallbackRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: queryText,
            model: "gemini-3.1-flash-lite",
            systemInstruction:
              "Sen Tulpar sesli asistanısın. Yanıtın kesin, kısa, net ve doğru olsun yeter. En fazla 1-2 cümleyle doğrudan yanıtla.",
          }),
        });
        const fbData = await fallbackRes.json();
        replyText = fbData.text || "Anladım, dinliyorum.";
      }

      const assistantMsg: ChatMessage = {
        id: `voice-asst-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );

      return replyText;
    } catch (e: any) {
      throw e;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[url('/wallpaper.jpg')] bg-cover bg-center text-neutral-900 font-sans antialiased selection:bg-neutral-200">
      {/* Top Header (Menu icon, Model dropdown pill, New chat icon, ambient & permission buttons) */}
      <Header
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onNewChat={handleNewChat}
        onOpenPermissions={() => setIsPermissionsOpen(true)}
        onOpenAmbientMode={() => setIsAmbientModeOpen(true)}
      />

      {/* Slide-out Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        currentModel={currentModel}
        onOpenPermissions={() => setIsPermissionsOpen(true)}
        onOpenAmbientMode={() => setIsAmbientModeOpen(true)}
        onOpenAPKModal={() => setIsAPKModalOpen(true)}
      />

      {/* Main Chat Scrollable Container */}
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty Chat State (Screenshot 1: Centered black emblem + bottom suggestions) */
          <EmptyChatView
            onSelectSuggestion={(prompt) => handleSendMessage(prompt)}
          />
        ) : (
          /* Active Conversation List */
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col divide-y divide-transparent py-4">
            {messages.map((msg, index) => {
              const isLastAssistant =
                msg.role === "assistant" && index === messages.length - 1;
              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onRetry={isLastAssistant && msg.isError ? handleRetryLast : undefined}
                  isLoading={isLoading && isLastAssistant}
                />
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </main>

      {/* Bottom Floating Pill Input Bar (Screenshot 1 & 3) */}
      <ChatInputBar
        input={input}
        setInput={setInput}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        attachedDoc={attachedDoc}
        setAttachedDoc={setAttachedDoc}
        onSendMessage={() => handleSendMessage()}
        isLoading={isLoading}
        onOpenVoiceMode={() => setIsVoiceModeOpen(true)}
        onOpenCamera={() => setIsCameraModalOpen(true)}
        isWebSearchActive={isWebSearchActive}
        onToggleWebSearch={handleToggleWebSearch}
        isDeepThinking={isDeepThinking}
        onToggleDeepThinking={() => setIsDeepThinking((prev) => !prev)}
      />

      {/* Direct Camera Photo Capture & Instant Send Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureAndSend={(img, promptText) => {
          handleSendMessage(promptText, [img]);
        }}
        onAttachOnly={(img) => {
          setAttachedImages((prev) => [...prev, img]);
        }}
      />

      {/* APK / Mobile App Install Modal */}
      <APKInstallModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
      />

      {/* ChatGPT iOS Voice Mode Modal (Screenshot 2) */}
      <VoiceModeModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        onSendVoiceQuery={handleSendVoiceQuery}
        permissions={permissions}
        onOpenPermissions={() => {
          setIsVoiceModeOpen(false);
          setIsPermissionsOpen(true);
        }}
        onOpenAmbientMode={() => {
          setIsVoiceModeOpen(false);
          setIsAmbientModeOpen(true);
        }}
      />

      {/* Voice Permissions & App Launcher Config Modal */}
      <VoicePermissionModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        permissions={permissions}
        onUpdatePermissions={handleUpdatePermissions}
        onOpenAmbientMode={() => {
          setIsPermissionsOpen(false);
          setIsAmbientModeOpen(true);
        }}
      />

      {/* Fullscreen Always-On Siri Ambient Wake-Word Screen */}
      <AmbientWakeWordScreen
        isOpen={isAmbientModeOpen}
        onClose={() => setIsAmbientModeOpen(false)}
        permissions={permissions}
        onSendVoiceQuery={handleSendVoiceQuery}
      />
    </div>
  );
}
