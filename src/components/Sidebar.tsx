import React, { useState } from "react";
import {
  SquarePen,
  MessageSquare,
  Trash2,
  X,
  Search,
  Check,
  Cpu,
  Trash,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { ChatSession } from "../types";
import { TulparLogo } from "./TulparLogo";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  currentModel: string;
  onOpenPermissions?: () => void;
  onOpenAmbientMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAllSessions,
  currentModel,
  onOpenPermissions,
  onOpenAmbientMode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 sm:w-80 flex-col bg-neutral-900 text-neutral-100 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-neutral-700">
              <TulparLogo size={24} variant="black" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Tulpar Sohbetler</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Yeni Sohbet"
            >
              <SquarePen className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New Chat Primary Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            id="sidebar-new-chat-btn"
            className="flex w-full items-center justify-between rounded-xl bg-neutral-800/90 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white p-0.5">
                <TulparLogo size={16} variant="black" className="h-full w-full object-contain" />
              </div>
              <span>Yeni Sohbet</span>
            </div>
            <SquarePen className="h-4 w-4 text-neutral-400" />
          </button>
        </div>

        {/* Search */}
        {sessions.length > 2 && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Sohbetlerde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-neutral-800/50 py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Geçmiş
          </div>

          {filteredSessions.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-500">
              {searchQuery ? "Eşleşen sohbet bulunamadı." : "Henüz bir sohbet geçmişi yok."}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                    isSelected
                      ? "bg-neutral-800 text-white font-medium"
                      : "text-neutral-300 hover:bg-neutral-800/50 hover:text-white"
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex flex-1 items-center gap-2.5 truncate text-left mr-2"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-neutral-400" />
                    <span className="truncate text-xs sm:text-sm">{session.title}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-400 transition-opacity"
                    title="Sohbeti Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Profile / Settings */}
        <div className="border-t border-neutral-800 p-3 space-y-2">
          {/* Quick Voice & Ambient Actions */}
          <div className="space-y-1">
            {onOpenAmbientMode && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAmbientMode();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl bg-neutral-800/80 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Always-On Siri Ambiyans Modu</span>
              </button>
            )}

            {onOpenPermissions && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPermissions();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl bg-neutral-800/80 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Sesli Komut & Uygulama İzinleri</span>
              </button>
            )}
          </div>

          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Tüm sohbet geçmişi silinecektir. Emin misiniz?")) {
                  onClearAllSessions();
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-rose-300 transition-colors"
            >
              <Trash className="h-3.5 w-3.5" />
              <span>Tüm Geçmişi Temizle</span>
            </button>
          )}

          <div className="flex items-center justify-between rounded-xl bg-neutral-800/60 px-3 py-2 text-xs text-neutral-400">
            <div className="flex items-center gap-2 truncate">
              <Cpu className="h-4 w-4 shrink-0 text-indigo-400" />
              <span className="truncate font-medium text-neutral-300">
                {currentModel.replace("gemini-3.6-flash", "Tulpar 3.6 Flash").replace("gemini-3.5-flash-lite", "Tulpar 3.5 Hızlı").replace("gemini-3.8-flash", "Tulpar 3.8 Derin")}
              </span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Aktif" />
          </div>
        </div>
      </aside>
    </>
  );
};
