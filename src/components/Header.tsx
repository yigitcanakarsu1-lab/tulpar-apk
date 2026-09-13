import React, { useState, useRef, useEffect } from "react";
import { Menu, ChevronDown, SquarePen, Check, ShieldCheck, Sun } from "lucide-react";
import { ModelConfig } from "../types";
import { TulparLogo } from "./TulparLogo";

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gemini-3.8-flash",
    name: "Tulpar 3.8 Flash",
    badge: "En Yeni • Ücretsiz",
    description: "Google'ın en son nesil, en güçlü ve tamamen ücretsiz yapay zeka mimarisi. Gerçek zamanlı takvim bilinci, derin akıl yürütme ve üstün performans.",
    isDefault: true,
  },
  {
    id: "gemini-3.6-flash",
    name: "Tulpar 3.6 Flash",
    badge: "Dengeli",
    description: "Hızlı yanıtlar ve genel sohbetler için optimize edilmiş çok yönlü model.",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Tulpar 3.5 Hızlı",
    badge: "Ultra Hızlı",
    description: "Düşük gecikmeli, anlık yanıtlar ve pratik görevler için hafif model.",
  },
];

interface HeaderProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onOpenPermissions?: () => void;
  onOpenAmbientMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  onSelectModel,
  onOpenSidebar,
  onNewChat,
  onOpenPermissions,
  onOpenAmbientMode,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModelObj =
    AVAILABLE_MODELS.find((m) => m.id === currentModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-neutral-100 bg-white/95 px-4 backdrop-blur-md">
      {/* Left: Sidebar Hamburger Button */}
      <button
        onClick={onOpenSidebar}
        id="btn-sidebar-toggle"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all"
        aria-label="Menüyü Aç"
      >
        <Menu className="h-5 w-5 stroke-[2]" />
      </button>

      {/* Center: Model Selector Dropdown Pill (ChatGPT iOS style with Tulpar branding) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          id="btn-model-selector"
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 active:scale-98 transition-all"
        >
          <div className="h-5 w-5 rounded-md bg-neutral-100 p-0.5 overflow-hidden shrink-0 ring-1 ring-neutral-200">
            <TulparLogo size={18} variant="black" className="h-full w-full object-contain" />
          </div>
          <span className="tracking-tight">{selectedModelObj.name}</span>
          <ChevronDown
            className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-1/2 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Tulpar Modeli Seçin
            </div>
            <div className="space-y-1">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === currentModel;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex w-full items-start justify-between rounded-xl p-2.5 text-left transition-all ${
                      isSelected
                        ? "bg-neutral-100/90 text-neutral-900 font-medium"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{model.name}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            model.id === "gemini-3.6-flash"
                              ? "bg-emerald-100 text-emerald-800"
                              : model.id === "gemini-3.5-flash-lite"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {model.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 leading-snug">
                        {model.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-neutral-900 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1">
        {onOpenAmbientMode && (
          <button
            onClick={onOpenAmbientMode}
            id="btn-ambient-mode"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 active:scale-95 transition-all"
            aria-label="Always-On Siri Ambiyans Modu"
            title="Always-On Siri Modu (Ekran Kilitlenmez)"
          >
            <Sun className="h-4 w-4 text-amber-600 stroke-[2]" />
          </button>
        )}

        {onOpenPermissions && (
          <button
            onClick={onOpenPermissions}
            id="btn-voice-permissions"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 active:scale-95 transition-all"
            aria-label="Sesli Komut & Uygulama İzinleri"
            title="Sesli Komut & Uygulama İzinleri"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 stroke-[2]" />
          </button>
        )}

        {/* Right: New Chat Pencil Icon Button */}
        <button
          onClick={onNewChat}
          id="btn-new-chat-top"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all"
          aria-label="Yeni Sohbet Başlat"
          title="Yeni Sohbet"
        >
          <SquarePen className="h-4 w-4 stroke-[2]" />
        </button>
      </div>
    </header>
  );
};
