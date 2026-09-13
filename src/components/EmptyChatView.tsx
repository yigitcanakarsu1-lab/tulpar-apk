import React from "react";
import { TulparLogo } from "./TulparLogo";

interface Suggestion {
  title: string;
  subtitle: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    title: "Güncel takvim ve tarih",
    subtitle: "bugünün tarihi, günü ve zaman bilgisi",
    prompt:
      "Bugünün güncel tam tarihi, haftanın günü ve takvim bilgisi nedir?",
  },
  {
    title: "Haftalık çalışma takvimi",
    subtitle: "verimli zaman yönetimi ve odaklanma programı",
    prompt:
      "Benim için haftalık çalışma, öğrenme ve dinlenme dengesi kuran ayrıntılı ve uygulanabilir bir zaman takvimi hazırlar mısın?",
  },
  {
    title: "Performanslı Python kodu",
    subtitle: "modern veri analizi ve otomasyon betiği",
    prompt:
      "Python ile asenkron çalışan, hata yakalamalı ve temiz kod prensiplerine uygun bir veri işleme otomasyonu yazar mısın?",
  },
  {
    title: "2026 yapay zeka trendleri",
    subtitle: "en yeni teknolojik gelişmeler ve modeller",
    prompt:
      "2026 yılı itibarıyla yapay zeka alanındaki en güncel gelişmeler, yeni nesil modeller ve çığır açan trendler nelerdir?",
  },
];

interface EmptyChatViewProps {
  onSelectSuggestion: (prompt: string) => void;
}

export const EmptyChatView: React.FC<EmptyChatViewProps> = ({ onSelectSuggestion }) => {
  return (
    <div className="flex h-full min-h-[calc(100vh-14rem)] flex-col justify-between px-4 pb-2 pt-12 sm:pt-20">
      {/* Center Tulpar AI Emblem */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-white p-3 shadow-xl ring-1 ring-neutral-200/90 transition-transform hover:scale-105">
          <TulparLogo size={96} variant="black" className="h-full w-full object-contain" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
          Tulpar
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          Size bugün nasıl yardımcı olabilirim?
        </p>
      </div>

      {/* Bottom Horizontal Suggestion Cards */}
      <div className="mx-auto w-full max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUGGESTIONS.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="flex flex-col items-start justify-center rounded-2xl border border-neutral-200/90 bg-white p-3.5 text-left shadow-xs hover:border-neutral-300 hover:bg-neutral-50/80 active:scale-[0.99] transition-all"
            >
              <span className="text-sm font-semibold text-neutral-900 leading-snug">
                {item.title}
              </span>
              <span className="text-xs text-neutral-500 mt-0.5 line-clamp-1 leading-normal">
                {item.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
