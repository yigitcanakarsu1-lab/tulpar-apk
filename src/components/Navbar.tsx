import React from "react";
import {
  MessageSquare,
  Image as ImageIcon,
  PenTool,
  Code2,
  Wand2,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { TabType } from "../types";

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  serverStatus: "checking" | "connected" | "error";
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  serverStatus,
}) => {
  const tabs = [
    { id: "chat" as TabType, label: "Akıllı Sohbet", icon: MessageSquare },
    { id: "vision" as TabType, label: "Görsel Analizi", icon: ImageIcon },
    { id: "content" as TabType, label: "İçerik Stüdyosu", icon: PenTool },
    { id: "code" as TabType, label: "Kod Laboratuvarı", icon: Code2 },
    { id: "quick" as TabType, label: "Hızlı Araçlar", icon: Wand2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Tulpar
              </span>
              <span className="hidden rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 sm:inline-flex">
                Tulpar 3.6 Flash
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              Güçlü Türkçe Üretken Yapay Zeka Asistanı
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  isActive
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Server indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              serverStatus === "connected"
                ? "bg-emerald-500 animate-pulse"
                : serverStatus === "checking"
                ? "bg-amber-500 animate-ping"
                : "bg-rose-500"
            }`}
          />
          <span className="font-medium text-slate-600">
            {serverStatus === "connected"
              ? "Model Çevrimiçi"
              : serverStatus === "checking"
              ? "Bağlanıyor..."
              : "Bağlantı Hatası"}
          </span>
        </div>
      </div>
    </header>
  );
};
